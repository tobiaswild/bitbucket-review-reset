import { useEffect, useState } from 'react';
import { autoRedirectUuid } from '@/utils/settings';

function App() {
  const [enabled, setEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    autoRedirectUuid.getValue().then(setEnabled);
  }, []);

  async function toggle(value: boolean) {
    setEnabled(value);
    await autoRedirectUuid.setValue(value);
  }

  if (enabled === null) return <p className="muted">Loading…</p>;

  return (
    <label className="setting">
      <input
        type="checkbox"
        checked={enabled}
        onChange={(event) => toggle(event.target.checked)}
      />
      <span>
        Automatically open the regular URL for UUID links
        <small>
          Pull request links using {'{uuid}'} segments are redirected to
          workspace/repo, where your review progress is stored.
        </small>
      </span>
    </label>
  );
}

export default App;
