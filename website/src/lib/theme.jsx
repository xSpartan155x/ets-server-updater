import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext(null)
const media = window.matchMedia('(prefers-color-scheme: dark)')

function readStored() {
  try {
    return localStorage.getItem('theme') || 'system'
  } catch {
    return 'system'
  }
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(readStored)
  const [systemDark, setSystemDark] = useState(media.matches)
  const dark = theme === 'dark' || (theme === 'system' && systemDark)

  useEffect(() => {
    const onChange = (e) => setSystemDark(e.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    try {
      localStorage.setItem('theme', theme)
    } catch {
      // storage blocked: the choice lasts for this visit only
    }
  }, [theme, dark])

  return <ThemeContext.Provider value={{ theme, setTheme, dark }}>{children}</ThemeContext.Provider>
}

export const useTheme = () => useContext(ThemeContext)
