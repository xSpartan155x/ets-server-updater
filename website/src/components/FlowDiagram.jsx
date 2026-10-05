import { ArrowRight, Laptop, Server } from 'lucide-react'
import { GithubIcon } from './ui.jsx'
import { useT } from '../lib/i18n.jsx'

/** Client PC -> GitHub -> Server PC, the path of an export. */
export default function FlowDiagram() {
  const t = useT()
  const nodes = [
    {
      icon: Laptop,
      title: 'PC Client',
      tag: t('modalità Client', 'Client mode'),
      lines: ['export_server_packages', t('clone temporaneo', 'temporary clone'), 'commit + push'],
    },
    {
      icon: GithubIcon,
      title: 'GitHub',
      tag: 'repository',
      lines: ['server_packages.sii', 'server_packages.dat', t('storico dei commit', 'commit history')],
    },
    {
      icon: Server,
      title: 'PC Server',
      tag: t('modalità Server', 'Server mode'),
      lines: [
        t('download + verifica', 'download + verify'),
        t('stop → backup → sostituzione', 'stop → backup → replace'),
        t('start + controllo', 'start + health check'),
      ],
    },
  ]
  const links = ['git push', t('polling o webhook', 'polling or webhook')]

  return (
    <div className="flex flex-col items-stretch gap-3 md:flex-row md:items-center">
      {nodes.map((n, i) => (
        <div key={n.title} className="contents">
          <div className="flex-1 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/70">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 text-white">
                <n.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">{n.title}</p>
                <p className="text-xs text-slate-500">{n.tag}</p>
              </div>
            </div>
            <ul className="mt-4 space-y-1.5 font-mono text-xs text-slate-600 dark:text-slate-400">
              {n.lines.map((l) => (
                <li key={l} className="flex items-center gap-2">
                  <span className="h-1 w-1 rounded-full bg-orange-500" />
                  {l}
                </li>
              ))}
            </ul>
          </div>
          {i < links.length && (
            <div className="flex items-center justify-center gap-2 text-xs font-medium text-orange-600 md:flex-col dark:text-orange-400">
              <ArrowRight className="h-5 w-5 rotate-90 md:rotate-0" />
              <span className="whitespace-nowrap">{links[i]}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
