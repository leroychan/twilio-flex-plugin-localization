import * as Flex from '@twilio/flex-ui';
import { FlexPlugin } from '@twilio/flex-plugin';

import { customAvailableLocales, getCustomStrings, RTL_LOCALES } from './strings';

const PLUGIN_NAME = 'LocalizationPlugin';

export default class LocalizationPlugin extends FlexPlugin {
  constructor() {
    super(PLUGIN_NAME);
  }

  /**
   * This code is run when your plugin is being started
   * Use this to modify any UI components or attach to the actions framework
   *
   * @param flex { typeof Flex }
   */
  async init(flex: typeof Flex, manager: Flex.Manager): Promise<void> {
    await this.setupLocalization(manager);
  }

  /**
   * Registers our bundled locales in the language selector and merges the
   * active locale's translated strings into the Flex string dictionary.
   */
  private async setupLocalization(manager: Flex.Manager): Promise<void> {
    const localization = manager.localization;

    // 1. Expose our locales in the language selector, in addition to whatever
    //    Flex already offers. De-dupe by tag in case Flex ships one natively.
    //
    //    NOTE: `manager.localization` is a getter that returns a fresh object on
    //    every read, and its `availableLocales` is a *reference* to Flex's
    //    internal (shared) array. Re-assigning the property therefore has no
    //    effect — the LocaleSelector reads the internal array directly. We must
    //    mutate that array in place instead.
    const locales = localization.availableLocales;
    const existingTags = new Set(locales.map((l) => l.tag));
    customAvailableLocales
      .filter((l) => !existingTags.has(l.tag))
      .forEach((l) => locales.push(l));

    // 2. Load the translated strings for the currently-active locale (if it is
    //    one we ship) and merge them into the Manager's dictionary. Setting
    //    `manager.strings` adds/updates entries — it does not wipe existing ones.
    const activeLocale = localization.localeTag; // e.g. "zh-CN"
    const custom = getCustomStrings(activeLocale);

    if (custom) {
      // Cast: spreading over `Strings` widens Flex's dynamic `tr_activity_*`
      // index signature to `string | undefined`, so we assert back to `Strings`.
      manager.strings = {
        ...manager.strings,
        ...custom,
      } as Flex.Strings;
    }

    // 3. Flip the document direction for right-to-left locales (e.g. Arabic).
    this.applyTextDirection(activeLocale);
  }

  /**
   * Sets the document `dir`/`lang` attributes so RTL locales render mirrored.
   */
  private applyTextDirection(localeTag: string): void {
    const isRtl = RTL_LOCALES.has(localeTag);
    document.documentElement.setAttribute('dir', isRtl ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', localeTag);
  }
}

/**
 * Programmatically switch (and persist) the user's locale — e.g. from a custom
 * language-picker button. `setLocalePreference` reloads Flex with the new
 * locale, at which point `init()` runs again and applies the matching strings.
 */
export const changeLocale = async (localeTag: string): Promise<void> => {
  await Flex.Manager.getInstance().localization.setLocalePreference(localeTag);
};
