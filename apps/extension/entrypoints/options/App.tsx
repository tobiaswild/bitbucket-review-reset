import { useEffect, useState } from 'react';
import { i18n } from '#i18n';
import { autoRedirectUuid } from '@/utils/settings';

function App() {
  const [enabled, setEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    autoRedirectUuid.getValue().then(setEnabled);
  }, []);

  useEffect(() => {
    document.documentElement.lang = browser.i18n.getUILanguage();
    document.title = i18n.t('optionsTitle');
  }, []);

  async function toggle(value: boolean) {
    setEnabled(value);
    await autoRedirectUuid.setValue(value);
  }

  if (enabled === null) return <p className="muted">{i18n.t('loading')}</p>;

  return (
    <label className="setting">
      <input
        type="checkbox"
        checked={enabled}
        onChange={(event) => toggle(event.target.checked)}
      />
      <span>
        {i18n.t('options.autoRedirect')}
        <small>{i18n.t('options.autoRedirectHelp', ['{uuid}'])}</small>
      </span>
    </label>
  );
}

export default App;
