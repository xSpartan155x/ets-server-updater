import { PageHeader } from '../components/ui';
import { useLocale, useT } from '../i18n';
import GuideEn from './guide/GuideEn';
import GuideIt from './guide/GuideIt';

const CONTENT = { en: GuideEn, it: GuideIt };

// Typography of the guide: the content is plain HTML tags (h2, p, table, code...) styled from the container
const PROSE = [
  'text-sm leading-6 text-slate-700 dark:text-slate-300',
  '[&>:first-child]:mt-0',
  '[&_h1]:mb-3 [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:text-slate-900 dark:[&_h1]:text-slate-50',
  '[&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:scroll-mt-6 [&_h2]:border-b [&_h2]:border-slate-200 [&_h2]:pb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-slate-900 dark:[&_h2]:border-slate-800 dark:[&_h2]:text-slate-100',
  '[&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:scroll-mt-6 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-slate-900 dark:[&_h3]:text-slate-100',
  '[&_p]:my-3 [&_ul]:my-3 [&_ol]:my-3 [&_table]:my-3 [&_pre]:my-3 [&_blockquote]:my-3 [&_picture]:my-3',
  '[&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1 [&_li>p]:my-1',
  '[&_a]:font-medium [&_a]:text-orange-700 [&_a]:underline [&_a]:decoration-orange-300 [&_a]:underline-offset-2 [&_a:hover]:text-orange-800',
  'dark:[&_a]:text-orange-400 dark:[&_a]:decoration-orange-500/40 dark:[&_a:hover]:text-orange-300',
  '[&_strong]:font-semibold [&_strong]:text-slate-900 dark:[&_strong]:text-slate-100',
  '[&_code]:rounded [&_code]:bg-slate-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em] [&_code]:text-slate-800 dark:[&_code]:bg-slate-800 dark:[&_code]:text-slate-200',
  '[&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:border [&_pre]:border-slate-200 [&_pre]:bg-slate-50 [&_pre]:p-3 [&_pre]:text-xs [&_pre]:leading-5 dark:[&_pre]:border-slate-800 dark:[&_pre]:bg-slate-950',
  '[&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-inherit dark:[&_pre_code]:bg-transparent',
  '[&_blockquote]:rounded-r-lg [&_blockquote]:border-l-4 [&_blockquote]:border-orange-400 [&_blockquote]:bg-orange-50 [&_blockquote]:px-4 [&_blockquote]:py-2 [&_blockquote]:text-slate-700 [&_blockquote_p]:my-1',
  'dark:[&_blockquote]:border-orange-500/60 dark:[&_blockquote]:bg-orange-500/10 dark:[&_blockquote]:text-slate-300',
  '[&_table]:w-full [&_table]:border-collapse [&_table]:text-left [&_table]:text-xs',
  '[&_th]:border [&_th]:border-slate-200 [&_th]:bg-slate-50 [&_th]:px-3 [&_th]:py-2 [&_th]:font-semibold [&_th]:text-slate-900 dark:[&_th]:border-slate-800 dark:[&_th]:bg-slate-950 dark:[&_th]:text-slate-100',
  '[&_td]:border [&_td]:border-slate-200 [&_td]:px-3 [&_td]:py-2 [&_td]:align-top dark:[&_td]:border-slate-800',
  '[&_img]:my-2 [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-lg [&_img]:border [&_img]:border-slate-200 [&_img]:shadow-sm dark:[&_img]:border-slate-700',
  '[&_hr]:my-8 [&_hr]:border-slate-200 dark:[&_hr]:border-slate-800',
].join(' ');

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
          className={`${PROSE} select-text rounded-xl border border-slate-200 bg-white px-8 py-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-none`}
          onClick={onClick}
        >
          <Content />
        </article>
      </div>
    </>
  );
}
