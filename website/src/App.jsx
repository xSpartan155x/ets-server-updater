import { Routes, Route } from 'react-router'
import Layout from './components/Layout.jsx'
import Home from './pages/Home.jsx'
import Features from './pages/Features.jsx'
import HowItWorks from './pages/HowItWorks.jsx'
import Docs from './pages/Docs.jsx'
import Download from './pages/Download.jsx'
import Changelog from './pages/Changelog.jsx'
import Faq from './pages/Faq.jsx'
import About from './pages/About.jsx'
import NotFound from './pages/NotFound.jsx'

// The same pages under / (Italian) and /en (English)
const pages = (
  <>
    <Route index element={<Home />} />
    <Route path="features" element={<Features />} />
    <Route path="how-it-works" element={<HowItWorks />} />
    <Route path="guide" element={<Docs />} />
    <Route path="guide/:section" element={<Docs />} />
    <Route path="download" element={<Download />} />
    <Route path="changelog" element={<Changelog />} />
    <Route path="faq" element={<Faq />} />
    <Route path="about" element={<About />} />
    <Route path="*" element={<NotFound />} />
  </>
)

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/">{pages}</Route>
        <Route path="/en">{pages}</Route>
      </Route>
    </Routes>
  )
}
