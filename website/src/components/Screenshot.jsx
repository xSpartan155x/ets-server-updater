import { useTheme } from '../lib/theme.jsx'

const shots = import.meta.glob('../assets/shots/*.png', { eager: true, import: 'default' })

/** A screenshot of the app in a window frame, in the variant (light/dark) of the current theme. */
export default function Screenshot({ name, alt, className = '' }) {
  const { dark } = useTheme()
  const src = shots[`../assets/shots/${name}${dark ? '-dark' : ''}.png`] ?? shots[`../assets/shots/${name}.png`]
  return (
    <figure
      className={`overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-2xl shadow-slate-900/10 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/40 ${className}`}
    >
      <div className="flex items-center gap-1.5 border-b border-slate-200 px-4 py-2.5 dark:border-slate-800">
        <span className="h-3 w-3 rounded-full bg-slate-300 dark:bg-slate-700" />
        <span className="h-3 w-3 rounded-full bg-slate-300 dark:bg-slate-700" />
        <span className="h-3 w-3 rounded-full bg-slate-300 dark:bg-slate-700" />
        <span className="ml-3 truncate text-xs text-slate-500">ETS2 Package Sync</span>
      </div>
      <img src={src} alt={alt} loading="lazy" className="block w-full" />
    </figure>
  )
}
