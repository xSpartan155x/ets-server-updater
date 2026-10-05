import { Button, Container } from '../components/ui.jsx'
import { useT } from '../lib/i18n.jsx'

export default function NotFound() {
  const t = useT()
  return (
    <Container className="py-32 text-center">
      <p className="text-6xl font-extrabold text-orange-500">404</p>
      <h1 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">{t('Strada sbagliata', 'Wrong turn')}</h1>
      <p className="mt-2 text-slate-500">{t('Questa pagina non esiste. Torna in carreggiata:', "This page doesn't exist. Get back on the road:")}</p>
      <Button to="/" className="mt-8">
        {t('Torna alla home', 'Back to home')}
      </Button>
    </Container>
  )
}
