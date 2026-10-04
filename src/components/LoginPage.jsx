import React, { useState } from 'react';
import './LoginPage.css';
import { ArrowLeft, Check, Loader2 } from 'lucide-react';
import dbService from '../services/dbService.js';

export default function LoginPage({ onBack, onSuccess, onGoToSignUp }) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handlePhoneChange = (e) => {
    let val = e.target.value;
    // Allow digits, spaces, and hyphens
    if (/^[0-9\s-]*$/.test(val)) {
      // If user accidentally types starting with 0 or 62, handle gracefully or keep clean
      setPhoneNumber(val);
      if (errorMessage) setErrorMessage('');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanNumber = phoneNumber.replace(/[\s-]/g, '');
    if (!cleanNumber) {
      setErrorMessage('Silakan masukkan nomor telepon Anda.');
      return;
    }

    setIsLoading(true);
    // Simulate authentication processing with dbService
    setTimeout(() => {
      setIsLoading(false);
      let existingUser = dbService.users.findByPhone(cleanNumber);
      if (!existingUser) {
        // Create user session if first time logging in
        existingUser = dbService.users.create({
          fullName: 'Pelanggan SheRide',
          phone: cleanNumber,
          role: 'customer'
        });
      }
      dbService.session.setCurrentUser(existingUser);
      if (onSuccess) onSuccess(existingUser);
    }, 600);
  };

  return (
    <div className="login-page-container">
      {/* Top Navigation Bar with Back Arrow */}
      <div className="login-top-nav">
        <button
          type="button"
          className="btn-login-back"
          onClick={onBack}
          aria-label="Kembali"
          title="Kembali"
        >
          <ArrowLeft size={24} strokeWidth={2} />
        </button>
      </div>

      {/* Main Scrollable Content */}
      <div className="login-scroll-content">
        {/* Header Text */}
        <div className="login-header-group">
          <h1 className="login-headline">
            Selamat Datang Kembali!
          </h1>
          <p className="login-subheadline">
            Silakan masukkan nomor telepon Anda untuk masuk ke akun OTWJek.
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="login-form-group">
          <label className="login-field-label" htmlFor="login-phone-field">
            Nomor Telepon
          </label>

          {/* Input Box with Country Code Prefix +62 */}
          <div className="login-phone-input-box">
            <div className="login-country-prefix">
              <span className="country-code-text">+62</span>
            </div>
            <div className="login-prefix-divider" />

            <input
              id="login-phone-field"
              type="tel"
              className="login-phone-input"
              placeholder="812 3456 7890"
              value={phoneNumber}
              onChange={handlePhoneChange}
              autoFocus
            />
          </div>

          {errorMessage && (
            <div className="login-error-text">
              {errorMessage}
            </div>
          )}

          {/* Remember Me Checkbox */}
          <div
            className={`remember-me-row ${rememberMe ? 'checked' : ''}`}
            onClick={() => setRememberMe(!rememberMe)}
            role="checkbox"
            aria-checked={rememberMe}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                setRememberMe(!rememberMe);
              }
            }}
          >
            <div className="custom-checkbox">
              {rememberMe && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
            </div>
            <span className="remember-me-label">Ingat saya</span>
          </div>
        </form>
      </div>

      {/* Bottom Sticky Action Bar */}
      <div className="login-bottom-section">
        <button
          type="button"
          className="btn-login-submit"
          onClick={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 size={18} className="spin-loader" />
              <span>Sedang masuk...</span>
            </>
          ) : (
            'Masuk'
          )}
        </button>

        {/* Helper switcher to Sign up if user doesn't have an account */}
        {onGoToSignUp && (
          <div className="login-footer-switcher">
            <span className="login-switcher-text">Belum punya akun?</span>
            <button
              type="button"
              className="btn-link-signup"
              onClick={onGoToSignUp}
            >
              Daftar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
