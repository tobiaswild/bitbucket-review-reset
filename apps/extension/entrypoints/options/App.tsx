import { useEffect, useState } from 'react';
import { initI18n, LANGUAGES, type Language, language, t } from '@/utils/i18n';
import { autoRedirectUuid } from '@/utils/settings';

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
    return <p className="muted">{t('loading')}</p>;
  }

  return (
    <>
      <label className="setting">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => toggle(event.target.checked)}
        />
        <span>
          {t('options.autoRedirect')}
          <small>{t('options.autoRedirectHelp', ['{uuid}'])}</small>
        </span>
      </label>
      <label className="setting language">
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
    </>
  );
}

export default App;
