import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Register PWA service worker for full offline capability
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Registered relatively to ensure compatibility under GitHub Pages subfolders
    navigator.serviceWorker.register('./sw.js')
      .then((reg) => {
        console.log('Service Worker registered successfully under scope: ', reg.scope);
      })
      .catch((err) => {
        console.error('Service Worker registration failed: ', err);
      });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
