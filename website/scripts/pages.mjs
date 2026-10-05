// Runs after `vite build`: writes dist/<page>/index.html for every page in both languages, each with its own
// title, description, Open Graph / Twitter card, canonical and hreflang. GitHub Pages then answers 200 on every
// clean URL; 404.html (a copy of the home) catches the rest. Also writes sitemap.xml and robots.txt.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { ALL_PATHS, SITE_NAME, SITE_URL, pageMeta } from '../src/lib/meta.js'

const dist = join(import.meta.dirname, '..', 'dist')
const template = readFileSync(join(dist, 'index.html'), 'utf8')
const LANGS = ['it', 'en']
const LOCALE = { it: 'it_IT', en: 'en_US' }

const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const urlPath = (path, lang) => (lang === 'en' ? (path === '/' ? '/en/' : `/en${path}/`) : path === '/' ? '/' : `${path}/`)
const url = (path, lang) => SITE_URL + urlPath(path, lang)

function head(path, lang) {
  const { title, description } = pageMeta(path, lang)
  const image = `${SITE_URL}/og-${lang}.png`
  const other = lang === 'it' ? 'en' : 'it'
  const tags = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}" />`,
    `<link rel="canonical" href="${url(path, lang)}" />`,
    ...LANGS.map((l) => `<link rel="alternate" hreflang="${l}" href="${url(path, l)}" />`),
    `<link rel="alternate" hreflang="x-default" href="${url(path, 'it')}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:url" content="${url(path, lang)}" />`,
    `<meta property="og:image" content="${image}" />`,
    `<meta property="og:image:type" content="image/png" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="${esc(pageMeta('/', lang).title)}" />`,
    `<meta property="og:locale" content="${LOCALE[lang]}" />`,
    `<meta property="og:locale:alternate" content="${LOCALE[other]}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(title)}" />`,
    `<meta name="twitter:description" content="${esc(description)}" />`,
    `<meta name="twitter:image" content="${image}" />`,
  ]
  if (path === '/') {
    const app = {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: SITE_NAME,
      description,
      url: url('/', lang),
      image,
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Windows 10, Windows 11',
      inLanguage: ['it', 'en'],
      license: 'https://opensource.org/licenses/MIT',
      downloadUrl: 'https://github.com/xSpartan155x/ets-server-updater/releases/latest',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
      author: { '@type': 'Person', name: 'xSpartan155x', url: 'https://github.com/xSpartan155x' },
    }
    tags.push(`<script type="application/ld+json">${JSON.stringify(app)}</script>`)
  }
  return tags.join('\n    ')
}

function page(path, lang) {
  return template
    .replace('<html lang="it">', `<html lang="${lang}">`)
    .replace(/<!-- meta:start[\s\S]*?<!-- meta:end -->/, head(path, lang))
}

for (const lang of LANGS) {
  for (const path of ALL_PATHS) {
    const file = join(dist, urlPath(path, lang), 'index.html')
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, page(path, lang))
  }
}
writeFileSync(join(dist, '404.html'), page('/', 'it').replace('<head>', '<head>\n    <meta name="robots" content="noindex" />'))

const today = new Date().toISOString().slice(0, 10)
const entries = ALL_PATHS.flatMap((path) =>
  LANGS.map(
    (lang) => `  <url>
    <loc>${url(path, lang)}</loc>
    <lastmod>${today}</lastmod>
${LANGS.map((l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${url(path, l)}" />`).join('\n')}
  </url>`,
  ),
)
writeFileSync(
  join(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.join('\n')}
</urlset>
`,
)
writeFileSync(join(dist, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`)

console.log(`Wrote ${ALL_PATHS.length * LANGS.length} pages, 404.html, sitemap.xml, robots.txt`)
