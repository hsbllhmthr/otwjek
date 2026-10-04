import React, { useState } from 'react';
import './SignUpPage.css';
import {
  ArrowLeft,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight
} from 'lucide-react';

export default function SignUpPage({ isDriver = false, onBack, onSuccess, onGoToSignIn }) {
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    password: '',
    agreeTerms: true
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errorMsg) setErrorMsg('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.fullName.trim()) {
      setErrorMsg('Silakan masukkan nama lengkap Anda.');
      return;
    }
    if (!formData.phone.trim()) {
      setErrorMsg('Silakan masukkan nomor handphone Anda.');
      return;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      setErrorMsg('Silakan masukkan alamat email yang valid.');
      return;
    }
    if (!formData.password || formData.password.length < 6) {
      setErrorMsg('Kata sandi minimal 6 karakter.');
      return;
    }
    if (!formData.agreeTerms) {
      setErrorMsg(isDriver ? 'Anda harus menyetujui Syarat & Ketentuan Kemitraan.' : 'Anda harus menyetujui Syarat & Ketentuan.');
      return;
    }

    setIsLoading(true);
    // Simulate swift account creation
    setTimeout(() => {
      setIsLoading(false);
      if (onSuccess) onSuccess(formData);
    }, 400);
  };

  // Password strength calculation
  const getPasswordStrength = (pass) => {
    if (!pass) return 0;
    let strength = 0;
    if (pass.length >= 6) strength += 1;
    if (pass.length >= 8) strength += 1;
    if (/[A-Z]/.test(pass) || /[0-9]/.test(pass)) strength += 1;
    if (/[^A-Za-z0-9]/.test(pass)) strength += 1;
    return strength;
  };

  const strength = getPasswordStrength(formData.password);

  return (
    <div className="signup-page-container">
      {/* Top Navigation Bar with Back Arrow */}
      <div className="signup-top-nav">
        <button
          type="button"
          className="btn-signup-back"
          onClick={onBack}
          aria-label="Kembali"
          title="Kembali"
        >
          <ArrowLeft size={24} strokeWidth={2} />
        </button>
      </div>

      {/* Main Scrollable Content */}
      <div className="signup-scroll-content">
        {/* Brand Header */}
        <div className="signup-brand-header">
          <h1 className="signup-headline">
            {isDriver ? 'Daftar sebagai Mitra Driver' : 'Buat Akun Baru'}
          </h1>
          <p className="signup-subheadline">
            {isDriver
              ? 'Mulai hasilkan pendapatan dan nikmati kemudahan bergabung bersama OTWJek.'
              : 'Mulai nikmati kemudahan bepergian dan pengiriman cepat hari ini.'}
          </p>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="signup-error-banner">
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="signup-form">
          {/* Full Name Field */}
          <div className="signup-field-group">
            <label className="signup-field-label">Nama Lengkap</label>
            <div className="signup-input-wrapper">
              <User size={18} className="signup-input-icon" />
              <input
                type="text"
                placeholder="Contoh: Siti Rahmawati"
                className="signup-input"
                value={formData.fullName}
                onChange={(e) => handleChange('fullName', e.target.value)}
                autoComplete="name"
              />
            </div>
          </div>

          {/* Phone Number Field */}
          <div className="signup-field-group">
            <label className="signup-field-label">Nomor Handphone</label>
            <div className="signup-input-wrapper">
              <div className="signup-phone-prefix">
                <span>+62</span>
              </div>
              <input
                type="tel"
                placeholder="812-3456-7890"
                className="signup-input signup-input-phone"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                autoComplete="tel"
              />
            </div>
          </div>

          {/* Email Address Field */}
          <div className="signup-field-group">
            <label className="signup-field-label">Alamat Email</label>
            <div className="signup-input-wrapper">
              <Mail size={18} className="signup-input-icon" />
              <input
                type="email"
                placeholder="nama@email.com"
                className="signup-input"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                autoComplete="email"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="signup-field-group">
            <label className="signup-field-label">Kata Sandi</label>
            <div className="signup-input-wrapper">
              <Lock size={18} className="signup-input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Minimal 6 karakter"
                className="signup-input"
                value={formData.password}
                onChange={(e) => handleChange('password', e.target.value)}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="btn-toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Tampilkan / Sembunyikan Kata Sandi"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Password strength visual meter */}
            {formData.password && (
              <div className="password-strength-container">
                <div className="strength-bars">
                  <div className={`strength-bar ${strength >= 1 ? 'bar-fill' : ''}`} />
                  <div className={`strength-bar ${strength >= 2 ? 'bar-fill' : ''}`} />
                  <div className={`strength-bar ${strength >= 3 ? 'bar-fill' : ''}`} />
                  <div className={`strength-bar ${strength >= 4 ? 'bar-fill' : ''}`} />
                </div>
                <span className="strength-label">
                  {strength <= 1 && 'Lemah'}
                  {strength === 2 && 'Cukup'}
                  {strength === 3 && 'Kuat'}
                  {strength >= 4 && 'Sangat Kuat'}
                </span>
              </div>
            )}
          </div>

          {/* Agreement Checkbox */}
          <label className="signup-terms-checkbox">
            <input
              type="checkbox"
              checked={formData.agreeTerms}
              onChange={(e) => handleChange('agreeTerms', e.target.checked)}
              className="checkbox-input"
            />
            <span className="checkbox-text">
              Saya menyetujui{' '}
              <span className="terms-highlight">
                {isDriver ? 'Syarat & Ketentuan Kemitraan' : 'Syarat & Ketentuan'}
              </span>{' '}
              serta <span className="terms-highlight">Kebijakan Privasi</span>.
            </span>
          </label>

          {/* Submit Button */}
          <button
            type="submit"
            className="btn-signup-submit"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="signup-btn-spinner" />
            ) : (
              <>
                <span>{isDriver ? 'Daftar sebagai Mitra Driver' : 'Daftar Akun'}</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* Bottom Switcher: Go to Login */}
        <div className="signup-footer-switcher">
          <span>{isDriver ? 'Sudah memiliki akun mitra? ' : 'Sudah memiliki akun? '}</span>
          <button
            type="button"
            className="btn-switch-to-signin"
            onClick={onGoToSignIn || onBack}
          >
            Masuk Sekarang
          </button>
        </div>
      </div>
    </div>
  );
}
