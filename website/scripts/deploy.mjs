// Builds the site and publishes dist/ as the only content of the gh-pages branch of the repository's origin.
import { execSync } from 'node:child_process'
import { rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const run = (cmd, cwd) => execSync(cmd, { cwd, stdio: 'inherit' })
const out = (cmd) => execSync(cmd, { encoding: 'utf8' }).trim()

const remote = out('git remote get-url origin')
const commit = out('git rev-parse --short HEAD')
const dist = join(import.meta.dirname, '..', 'dist')

run('npm run build') // vite build + scripts/pages.mjs (one HTML per page, 404.html, sitemap)
writeFileSync(join(dist, '.nojekyll'), '') // serve files as they are, no Jekyll processing

rmSync(join(dist, '.git'), { recursive: true, force: true })
run('git init -q -b gh-pages', dist)
run('git -c core.autocrlf=false add -A', dist)
run(`git commit -q -m "Deploy website from ${commit}"`, dist)
run(`git push -f ${remote} gh-pages`, dist)
rmSync(join(dist, '.git'), { recursive: true, force: true })

console.log('\nPublished to gh-pages.')
