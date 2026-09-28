// Translations of the UI. The language is chosen in the sidebar ('system' follows Windows) and resolved
// by the main process, which also translates the texts it sends (status, errors, tray, dialogs).
import { createContext, Fragment, useContext, useMemo } from 'react';
import en from './locales/en';
import it from './locales/it';

const DICTIONARIES = { en, it };

const I18nContext = createContext('en');

export const I18nProvider = I18nContext.Provider;

export function useLocale() {
  return useContext(I18nContext);
}

/** Plain text: t('key', { name: value }) replaces {name}. */
export function useT() {
  const locale = useLocale();
  return useMemo(() => (key, params = {}) => {
    const text = DICTIONARIES[locale]?.[key] ?? en[key] ?? key;
    return text.replace(/\{(\w+)\}/g, (match, name) => (name in params ? String(params[name]) : match));
  }, [locale]);
}

const DEFAULT_TAGS = {
  b: (content) => <b>{content}</b>,
  code: (content) => <code>{content}</code>,
};

/**
 * Text with markup: <b>...</b> and <code>...</code> tags (styled through `tags`) and {name} placeholders
 * that can also be React nodes.
 */
export function Trans({ k, params = {}, tags = {} }) {
  const locale = useLocale();
  const text = DICTIONARIES[locale]?.[k] ?? en[k] ?? k;
  const render = { ...DEFAULT_TAGS, ...tags };
  const parts = [];
  const pattern = /<(\w+)>(.*?)<\/\1>|\{(\w+)\}/g;
  let last = 0;
  let match;
  while ((match = pattern.exec(text))) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    const [whole, tag, content, param] = match;
    if (tag) parts.push(render[tag] ? render[tag](content) : content);
    else parts.push(param in params ? params[param] : whole);
    last = pattern.lastIndex;
  }
  parts.push(text.slice(last));
  return parts.map((part, i) => <Fragment key={i}>{part}</Fragment>);
}
