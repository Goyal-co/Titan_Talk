// src/main.jsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from "./App.jsx"; 
import './index.css';
import { GoogleOAuthProvider } from '@react-oauth/google';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId="912244998647-to25vdsgcudh44ioguvet42h31aldg55.apps.googleusercontent.com">
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>
);
