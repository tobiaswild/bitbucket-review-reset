import { useEffect, useState } from 'react';
import { initI18n, LANGUAGES, type Language, language, t } from '@/utils/i18n';
import { autoRedirectUuid } from '@/utils/settings';

const REPO_URL = 'https://github.com/tobiaswild/bitbucket-review-reset';
const PRIVACY_URL =
  'https://tobiaswild.github.io/bitbucket-review-reset/privacy';
const LINKS = [
  { href: REPO_URL, label: 'options.github' },
  { href: `${REPO_URL}/issues`, label: 'options.reportIssue' },
  { href: PRIVACY_URL, label: 'options.privacy' },
] as const;

function App() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<Language | null>(
    null,
  );

  useEffect(() => {
    autoRedirectUuid.getValue().then(setEnabled);
    language.getValue().then(setSelectedLanguage);
  }, []);

  useEffect(() => {
    if (selectedLanguage) document.title = t('optionsTitle');
  }, [selectedLanguage]);

  async function toggle(value: boolean) {
    setEnabled(value);
    await autoRedirectUuid.setValue(value);
  }

  async function changeLanguage(value: Language) {
    await language.setValue(value);
    await initI18n();
    setSelectedLanguage(value);
  }

  if (enabled === null || selectedLanguage === null) {
    return <p className="text-muted">{t('loading')}</p>;
  }

  return (
    <div className="mx-auto max-w-xl py-8">
      <h1 className="mb-4 text-xl font-semibold">{t('options.heading')}</h1>
      <label className="flex cursor-pointer items-start gap-2">
        <input
          type="checkbox"
          className="mt-0.5"
          checked={enabled}
          onChange={(event) => toggle(event.target.checked)}
        />
        <span>
          {t('options.autoRedirect')}
          <small className="block text-muted">
            {t('options.autoRedirectHelp', ['{uuid}'])}
          </small>
        </span>
      </label>
      <label className="mt-3 flex items-center gap-2">
        <span>{t('options.language')}</span>
        <select
          value={selectedLanguage}
          onChange={(event) => changeLanguage(event.target.value as Language)}
        >
          <option value="auto">{t('options.languageAuto')}</option>
          {LANGUAGES.map(({ code, label }) => (
            <option key={code} value={code}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <h2 className="mt-8 mb-2 text-base font-semibold">
        {t('options.about')}
      </h2>
      <p className="text-muted">{t('options.aboutText')}</p>
      <p className="mt-2 text-muted">
        {t('options.version', [browser.runtime.getManifest().version])}
      </p>
      <ul className="mt-3 grid list-none gap-1 p-0">
        {LINKS.map(({ href, label }) => (
          <li key={href}>
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="text-accent underline hover:text-accent-hover"
            >
              {t(label)}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
