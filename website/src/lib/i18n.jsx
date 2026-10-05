import { Link as RouterLink, NavLink as RouterNavLink, Navigate as RouterNavigate, useLocation } from 'react-router'

// Italian lives at /, English at /en. The language comes from the URL, so every page can be linked and shared in either.

export const langFromPath = (pathname) => (pathname === '/en' || pathname.startsWith('/en/') ? 'en' : 'it')

/** "/en/features/" -> "/features" (GitHub Pages adds the trailing slash to folder URLs) */
export const stripLang = (pathname) => pathname.replace(/^\/en(?=\/|$)/, '').replace(/\/+$/, '') || '/'

export const localize = (to, lang) => (lang === 'en' ? (to === '/' ? '/en' : `/en${to}`) : to)

export function useLang() {
  return langFromPath(useLocation().pathname)
}

/** t('testo', 'text'): the string (or JSX) of the current language. */
export function useT() {
  const lang = useLang()
  return (it, en) => (lang === 'en' ? en : it)
}

export function Link({ to, ...props }) {
  return <RouterLink to={localize(to, useLang())} {...props} />
}

export function NavLink({ to, ...props }) {
  return <RouterNavLink to={localize(to, useLang())} {...props} />
}

export function Navigate({ to, ...props }) {
  return <RouterNavigate to={localize(to, useLang())} {...props} />
}

export function rememberLang(lang) {
  try {
    localStorage.setItem('lang', lang)
  } catch {
    // storage blocked: the language stays in the URL anyway
  }
}

export function storedLang() {
  try {
    return localStorage.getItem('lang')
  } catch {
    return null
  }
}
