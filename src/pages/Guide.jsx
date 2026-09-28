import { PageHeader } from '../components/ui';
import { useLocale, useT } from '../i18n';
import GuideEn from './guide/GuideEn';
import GuideIt from './guide/GuideIt';

const CONTENT = { en: GuideEn, it: GuideIt };

export default function Guide() {
  const t = useT();
  const Content = CONTENT[useLocale()] || GuideEn;

  const onClick = (event) => {
    const link = event.target.closest('a');
    if (!link) return;
    const href = link.getAttribute('href') || '';
    event.preventDefault();
    if (href.startsWith('#')) document.getElementById(href.slice(1))?.scrollIntoView({ behavior: 'smooth' });
    else if (/^https:\/\//i.test(href)) window.api.openExternal(href);
  };

  return (
    <>
      <PageHeader title={t('guide.title')} subtitle={t('guide.subtitle')} />
      <div className="px-8 pb-8">
        <article
          className="guide selectable rounded-xl border border-slate-200 bg-white px-8 py-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-none"
          onClick={onClick}
        >
          <Content />
        </article>
      </div>
    </>
  );
}
