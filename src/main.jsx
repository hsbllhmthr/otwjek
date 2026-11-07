import React, { Component, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import './index.css';
import App from './App.jsx';

// Daftarkan PWA service worker hanya di mode produksi.
// Di mode dev (npm run dev), unregister service worker lama agar tidak mencache/memblokir Vite HMR.
if (import.meta.env.PROD) {
  registerSW({ immediate: true });
} else if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
    }
  });
}

class RootErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('RootErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    try {
      sessionStorage.clear();
      localStorage.removeItem('otwjek_current_view');
    } catch {
      // Ignore
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '24px',
            fontFamily: 'sans-serif',
            textAlign: 'center',
            backgroundColor: '#fff',
            color: '#1c1c1e'
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>
            Terjadi Kendala Memuat Aplikasi
          </h2>
          <p style={{ fontSize: '14px', color: '#666', maxWidth: '400px', marginBottom: '20px' }}>
            {this.state.error?.message || 'Terjadi kesalahan saat memuat komponen.'}
          </p>
          <button
            onClick={this.handleReset}
            style={{
              padding: '10px 20px',
              backgroundColor: '#FF337F',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Muat Ulang Aplikasi
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </StrictMode>
);
