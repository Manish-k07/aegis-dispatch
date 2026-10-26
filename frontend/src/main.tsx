import React from 'react';
import { createRoot } from 'react-dom/client';
import 'material-symbols/outlined.css';
import './tokens.css';
import './style.css';
import { App } from './App';

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
