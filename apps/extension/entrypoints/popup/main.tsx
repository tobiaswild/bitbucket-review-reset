import React from 'react';
import ReactDOM from 'react-dom/client';
import { initI18n } from '@/utils/i18n';
import App from './App.tsx';
import '@/assets/tailwind.css';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

initI18n().then(() => {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
});
