import React, { useState } from 'react';
import './AdminLoginPage.css';
import { Eye, EyeOff, Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import dbService from '../services/dbService.js';
import otwjekLogo from '../assets/otwjek_logo.png';

export default function AdminLoginPage({ onBack, onSuccess }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      setErrorMessage('Silakan masukkan alamat email dan kata sandi admin.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    setTimeout(() => {
      setIsLoading(false);
      const res = dbService.admin.login(identifier, password);
      if (res.success) {
        if (onSuccess) onSuccess(res.admin);
      } else {
        setErrorMessage(res.message || 'Email atau kata sandi admin tidak sesuai.');
      }
    }, 450);
  };

  return (
    <div className="signin-page-viewport">
      {/* Main Flat Card (No shadow, flat design) */}
      <div className="signin-card-container">
        {/* Header Sambutan Admin */}
        <div className="signin-header">
          <div className="signin-logo-wrap">
            <img src={otwjekLogo} alt="OTWJek Logo" className="signin-logo" />
          </div>
          <h1 className="signin-title">Selamat Datang, Admin!</h1>
          <p className="signin-subtitle">
            Silakan masuk untuk mengelola data pelanggan serta memverifikasi mitra pengemudi OTWJek.
          </p>
        </div>

        {/* Notifikasi Error */}
        {errorMessage && (
          <div className="signin-alert-banner error">
            <AlertCircle size={15} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Formulir Masuk Admin */}
        <form onSubmit={handleLogin} className="signin-form">
          {/* Field Email */}
          <div className="signin-field-group">
            <label className="signin-field-label" htmlFor="admin-email-input">
              Alamat Email / Username Admin
            </label>
            <div className="signin-input-wrapper">
              <input
                id="admin-email-input"
                type="text"
                className="signin-input"
                placeholder="admin@otwjek.com"
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value);
                  if (errorMessage) setErrorMessage('');
                }}
                autoComplete="email"
              />
            </div>
          </div>

          {/* Field Kata Sandi */}
          <div className="signin-field-group">
            <label className="signin-field-label" htmlFor="admin-password-input">
              Kata Sandi
            </label>
            <div className="signin-input-wrapper">
              <input
                id="admin-password-input"
                type={showPassword ? 'text' : 'password'}
                className="signin-input password-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMessage) setErrorMessage('');
                }}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="btn-toggle-eye"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
              >
                {showPassword ? (
                  <EyeOff size={18} strokeWidth={2} />
                ) : (
                  <Eye size={18} strokeWidth={2} />
                )}
              </button>
            </div>
          </div>

          {/* Tombol Masuk */}
          <button
            type="submit"
            className="btn-primary-signin"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="spin-loader" />
                <span>Sedang memverifikasi...</span>
              </>
            ) : (
              'Masuk ke Dashboard'
            )}
          </button>
        </form>

        {/* Tombol Kembali ke Aplikasi di Bawah Tombol Masuk */}
        {onBack && (
          <div className="signin-back-wrapper">
            <button
              type="button"
              className="btn-back-to-customer-app"
              onClick={onBack}
            >
              <ArrowLeft size={15} />
              <span>Kembali ke Aplikasi Utama</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
