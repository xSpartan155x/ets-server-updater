// File logger with size rotation; also keeps the last lines in memory for the Logs view.
const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');

const MAX_BYTES = 1_000_000;
const MEMORY_LINES = 500;

class Logger extends EventEmitter {
  constructor() {
    super();
    this.file = null;
    this.lines = [];
    this.console = false; // also print to stdout (development)
  }

  init(dir) {
    fs.mkdirSync(dir, { recursive: true });
    this.file = path.join(dir, 'ets2sync.log');
  }

  write(level, message, detail = '') {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const time = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ` +
      `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    const entry = { time, level, message: String(message) };

    this.lines.push(entry);
    if (this.lines.length > MEMORY_LINES) this.lines.shift();
    this.emit('line', entry);
    if (this.console) console.log(`${time} [${level}] ${message}`);

    if (!this.file) return;
    try {
      if (fs.existsSync(this.file) && fs.statSync(this.file).size > MAX_BYTES) {
        fs.renameSync(this.file, `${this.file}.1`);
      }
      fs.appendFileSync(this.file, `${time} [${level}] ${message}${detail ? `\n${detail}` : ''}\n`);
    } catch {
      // logging must never crash the app
    }
  }

  info(message) { this.write('INFO', message); }
  warn(message) { this.write('WARN', message); }
  error(message, err) {
    if (!err) return this.write('ERROR', message);
    // the UI shows the message; the stack trace goes to the log file only for unexpected errors
    const expected = ['UpdateError', 'GitError'].includes(err.name);
    return this.write('ERROR', `${message}: ${err.message || err}`, expected ? '' : err.stack);
  }
}

module.exports = new Logger();
