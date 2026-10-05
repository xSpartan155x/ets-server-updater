import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Loader2, Tag } from 'lucide-react'
import { Button, Container, PageHeader } from '../components/ui.jsx'
import { formatDate, useReleases, version } from '../lib/github.js'
import { RELEASES_URL } from '../lib/site.js'
import { useLang, useT } from '../lib/i18n.jsx'

// GitHub renders :shortcode: emoji in release notes, react-markdown does not
const EMOJI = { tools: '🛠️', sparkles: '✨', package: '📦', bug: '🐛', arrow_up: '⬆️', rocket: '🚀', wrench: '🔧', warning: '⚠️', tada: '🎉', memo: '📝' }
const emojify = (text) => text.replace(/:([a-z_]+):/g, (m, name) => EMOJI[name] ?? m)

export default function Changelog() {
  const t = useT()
  const lang = useLang()
  const { loading, error, releases } = useReleases()

  return (
    <>
      <PageHeader eyebrow="Changelog" title={t('Novità di ogni versione', "What's new in every version")}>
        {t('Le note di rilascio, lette in diretta dalle release di GitHub.', 'Release notes, read live from the GitHub releases.')}
      </PageHeader>
      <section className="py-16">
        <Container className="max-w-4xl">
          {loading && (
            <p className="flex items-center gap-2 text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" /> {t('Carico le release…', 'Loading releases…')}
            </p>
          )}
          {error && (
            <div className="text-center">
              <p className="text-slate-500">
                {t('Non riesco a leggere le release da GitHub', "Can't read the releases from GitHub")} ({error.message}).
              </p>
              <Button href={RELEASES_URL} className="mt-4">{t('Apri le release su GitHub', 'Open the releases on GitHub')}</Button>
            </div>
          )}
          <ol className="relative border-l border-slate-200 dark:border-slate-800">
            {releases.map((r, i) => (
              <li key={r.id} className="relative pb-12 pl-8 last:pb-0">
                <span
                  className={`absolute top-1.5 -left-[7px] h-3.5 w-3.5 rounded-full ring-4 ring-white dark:ring-slate-950 ${
                    i === 0 ? 'bg-orange-500' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                />
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">v{version(r)}</h2>
                  {i === 0 && (
                    <span className="rounded-full bg-orange-500/10 px-2.5 py-0.5 text-xs font-semibold text-orange-700 ring-1 ring-orange-500/30 dark:text-orange-300">
                      {t('Ultima', 'Latest')}
                    </span>
                  )}
                  <span className="text-sm text-slate-500">{formatDate(r.published_at, lang)}</span>
                  <a href={r.html_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-orange-500">
                    <Tag className="h-3.5 w-3.5" /> {r.tag_name}
                  </a>
                </div>
                <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900/60">
                  {r.body ? (
                    <div className="prose-md text-slate-600 dark:text-slate-400">
                      <Markdown remarkPlugins={[remarkGfm]}>{emojify(r.body)}</Markdown>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">{t('Nessuna nota di rilascio per questa versione.', 'No release notes for this version.')}</p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </Container>
      </section>
    </>
  )
}
