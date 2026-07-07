import * as Flex from '@twilio/flex-ui';

// Locale string dictionaries are imported *statically* so webpack bundles them
// directly into the single plugin JS file. Flex plugins are served as one
// bundle and do NOT support lazy-loaded chunks — a dynamic `import()` would
// produce a separate chunk that Flex can't serve (resulting in a
// "Loading chunk N failed" error at runtime).
import afLocale from './locales/af.json';
import arLocale from './locales/ar.json';
import hiLocale from './locales/hi.json';
import idLocale from './locales/id.json';
import jaLocale from './locales/ja.json';
import koLocale from './locales/ko.json';
import swLocale from './locales/sw.json';
import thLocale from './locales/th.json';
import tlLocale from './locales/tl.json';
import viLocale from './locales/vi.json';
import yueLocale from './locales/yue.json';
import zhCNLocale from './locales/zh-CN.json';

/**
 * Shape of a Flex locale entry. Flex UI 2.17.1 does not re-export its internal
 * `AvailableLocale` interface from the package entry point, so we mirror it here
 * (it is simply `{ tag, name }`).
 */
export interface AvailableLocale {
  tag: string;
  name: string;
}

/**
 * Shape of the locale JSON files in `./locales`. Each file mirrors Twilio's
 * exported locale format: metadata plus a full `strings` dictionary.
 */
interface LocaleFile {
  name: string;
  tag: string;
  strings: Record<string, string>;
}

/** Map of locale tag → bundled string dictionary. */
const LOCALE_STRINGS: Record<string, Record<string, string>> = {
  'zh-CN': (zhCNLocale as LocaleFile).strings,
  sw: (swLocale as LocaleFile).strings,
  af: (afLocale as LocaleFile).strings,
  ar: (arLocale as LocaleFile).strings,
  hi: (hiLocale as LocaleFile).strings,
  id: (idLocale as LocaleFile).strings,
  ja: (jaLocale as LocaleFile).strings,
  ko: (koLocale as LocaleFile).strings,
  th: (thLocale as LocaleFile).strings,
  tl: (tlLocale as LocaleFile).strings,
  vi: (viLocale as LocaleFile).strings,
  yue: (yueLocale as LocaleFile).strings,
};

/**
 * Custom locales we ship with this plugin, in addition to whatever Flex offers
 * out of the box. The `tag` must match the corresponding file in `./locales`
 * (e.g. tag `"zh-CN"` → `./locales/zh-CN.json`) and be a valid BCP-47 tag.
 *
 * `name` is the label shown in the Flex language selector.
 */
export const customAvailableLocales: AvailableLocale[] = [
  { tag: 'zh-CN', name: '中文（简体）' },
  { tag: 'yue', name: '粵語（繁體）' },
  { tag: 'ja', name: '日本語' },
  { tag: 'ko', name: '한국어' },
  { tag: 'sw', name: 'Kiswahili' },
  { tag: 'af', name: 'Afrikaans' },
  { tag: 'ar', name: 'العربية' },
  { tag: 'hi', name: 'हिन्दी' },
  { tag: 'id', name: 'Bahasa Indonesia' },
  { tag: 'th', name: 'ไทย' },
  { tag: 'tl', name: 'Tagalog' },
  { tag: 'vi', name: 'Tiếng Việt' },
];

/**
 * Returns the bundled string dictionary for a locale, or `undefined` if this
 * plugin doesn't ship that locale. Strings are already bundled (see the static
 * imports above), so this is a synchronous lookup.
 */
export const getCustomStrings = (localeTag: string): Record<string, string> | undefined => {
  return LOCALE_STRINGS[localeTag];
};

/**
 * Right-to-left locales among the ones we ship. Used to flip the document
 * direction so the UI mirrors correctly (e.g. for Arabic).
 */
export const RTL_LOCALES = new Set<string>(['ar']);

/**
 * Convenience re-export of the Flex strings type for consumers that want to
 * type-check custom keys against the real Flex string names.
 */
export type CustomStrings = Partial<Flex.Strings> & Record<string, string>;
