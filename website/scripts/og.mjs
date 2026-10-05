// Renders scripts/og/og.html to public/og-it.png and public/og-en.png (1200x630) with headless Chrome.
// Run again after changing the template or the screenshot: npm run og
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const chrome = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].find((p) => p && existsSync(p))
if (!chrome) throw new Error('Chrome not found: set CHROME_PATH')

const root = join(import.meta.dirname, '..')
const template = pathToFileURL(join(import.meta.dirname, 'og', 'og.html')).href
const profile = mkdtempSync(join(tmpdir(), 'og-'))

for (const lang of ['it', 'en']) {
  const out = join(root, 'public', `og-${lang}.png`)
  execFileSync(chrome, [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    `--user-data-dir=${profile}`,
    '--window-size=1200,630',
    '--virtual-time-budget=5000',
    `--screenshot=${out}`,
    `${template}?lang=${lang}`,
  ])
  console.log(`Wrote ${out}`)
}
rmSync(profile, { recursive: true, force: true })
