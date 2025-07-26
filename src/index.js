import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { GoogleOAuthProvider } from '@react-oauth/google';

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <GoogleOAuthProvider clientId="192421229704-j9g1n59opv4h8tn19lu6bp9943k4d8f4.apps.googleusercontent.com">
    <App />
  </GoogleOAuthProvider>
);
