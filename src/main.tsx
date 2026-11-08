import '@fontsource-variable/figtree';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ProvedorApp } from './estado/App';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ProvedorApp>
      <App />
    </ProvedorApp>
  </StrictMode>,
);
