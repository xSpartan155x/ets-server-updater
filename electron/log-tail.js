// Follows the ETS2 server log (server.log.txt) for the Console page. The server rewrites the file at every
// start, so a shorter or different file means "new session": the view is cleared and read from the top.
const fs = require('fs');
const { EventEmitter } = require('events');
const { StringDecoder } = require('string_decoder');

const MAX_LINES = 2000;
const MAX_READ = 256 * 1024; // on (re)open only the tail of a big file is shown
const POLL_MS = 1000;

class LogTail extends EventEmitter {
  constructor(file) {
    super();
    this.file = file;
    this.lines = [];
    this.offset = 0;
    this.ino = null;
    this.partial = '';
    this.decoder = new StringDecoder('utf8');
    this.rewindPending = false;
    this.timer = null;
  }

  start() {
    this.poll();
    this.timer = setInterval(() => this.poll(), POLL_MS);
  }

  stop() {
    clearInterval(this.timer);
    this.timer = null;
  }

  /** Read the file again from the top at the next poll (the server has just been started). */
  rewind() {
    this.rewindPending = true;
  }

  poll() {
    let stat;
    try {
      stat = fs.statSync(this.file);
    } catch {
      return; // not created yet
    }
    let reset = false;
    if (this.rewindPending || (this.ino !== null && stat.ino !== this.ino) || stat.size < this.offset) {
      this.rewindPending = false;
      this.offset = 0;
      this.partial = '';
      this.decoder = new StringDecoder('utf8');
      this.lines = [];
      reset = true;
    }
    this.ino = stat.ino;
    if (stat.size === this.offset) {
      if (reset) this.emit('lines', { reset, lines: [] });
      return;
    }

    let start = this.offset;
    let skipFirst = false;
    if (stat.size - start > MAX_READ) {
      start = stat.size - MAX_READ;
      skipFirst = true; // the first line is cut in half
      this.partial = '';
    }
    const buffer = Buffer.alloc(stat.size - start);
    let fd;
    try {
      fd = fs.openSync(this.file, 'r');
      fs.readSync(fd, buffer, 0, buffer.length, start);
    } catch {
      return; // locked or gone: retry at the next poll
    } finally {
      if (fd !== undefined) fs.closeSync(fd);
    }
    this.offset = stat.size;

    const parts = (this.partial + this.decoder.write(buffer)).split(/\r?\n/);
    this.partial = parts.pop();
    if (skipFirst) parts.shift();
    this.lines.push(...parts);
    if (this.lines.length > MAX_LINES) this.lines.splice(0, this.lines.length - MAX_LINES);
    if (parts.length || reset) this.emit('lines', { reset, lines: parts.slice(-MAX_LINES) });
  }
}

module.exports = { LogTail, MAX_LINES };
