import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/lovingle.css';
import './styles/lovingle-print.css';
import './styles/booklet.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

const renderApp = (El: React.ComponentType) => {
  root.render(
    <React.StrictMode>
      <El />
    </React.StrictMode>
  );
};
const renderLoadError = () => {
  rootElement.innerHTML =
    '<div style="padding:2rem;font-family:ui-monospace,monospace;font-size:14px;color:#b91c1c">' +
    'Failed to load the report bundle — please reload the page.</div>';
};

// SHARE MODE (compile-time constant off VITE_SHARE_MODE, default OFF): a
// snapshot-fed, read-only, single-project deployment. Both shells sit behind
// dynamic imports in a constant-folded branch, so a share build ships no
// App/Data Studio code and a normal build ships no share snapshot.
if (__SHARE_MODE__) {
  import('./components/share/ShareApp').then(m => renderApp(m.default), renderLoadError);
} else {
  import('./App').then(m => renderApp(m.default), renderLoadError);
}
