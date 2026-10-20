import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { isNative } from './lib/native';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// The iPad app ships its assets in the bundle, so it doesn't need (and can't
// register, under the capacitor:// scheme) the offline service worker.
if (!isNative && 'serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  });
}
