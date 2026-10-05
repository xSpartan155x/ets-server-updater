import { useEffect, useState } from 'react'
import { REPO } from './site.js'

// Releases are read live from the public GitHub API (60 requests/hour per IP), once per visit.
let cache = null

function fetchReleases() {
  cache ??= fetch(`https://api.github.com/repos/${REPO}/releases?per_page=50`, {
    headers: { Accept: 'application/vnd.github+json' },
  }).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    return r.json()
  })
  cache.catch(() => (cache = null))
  return cache
}

export function useReleases() {
  const [state, setState] = useState({ loading: true, error: null, releases: [] })
  useEffect(() => {
    let alive = true
    fetchReleases()
      .then((all) => alive && setState({ loading: false, error: null, releases: all.filter((r) => !r.draft && !r.prerelease) }))
      .catch((error) => alive && setState({ loading: false, error, releases: [] }))
    return () => {
      alive = false
    }
  }, [])
  return state
}

export const version = (release) => release.tag_name.replace(/^v/, '')

export const formatDate = (iso, lang) =>
  new Date(iso).toLocaleDateString(lang === 'en' ? 'en-GB' : 'it-IT', { day: 'numeric', month: 'long', year: 'numeric' })

export const formatSize = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)} MB`
