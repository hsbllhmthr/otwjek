import React, { useState, useRef } from 'react';
import './PersonalInfoPage.css';
import {
  ArrowLeft,
  Mail,
  Calendar,
  User,
  Pencil,
  Loader2,
  Lock,
  ImageUp,
  CheckCircle2,
  X,
  Bike,
  Car,
  CreditCard,
  ShieldAlert,
  MapPin,
  Phone
} from 'lucide-react';
import { compressImageFile } from '../utils/imageCompressor.js';

export default function PersonalInfoPage({ initialData = {}, isDriver = false, onBack, onSuccess }) {
  const isDriverRegistration = Boolean(isDriver || initialData?.role === 'driver');

  // 1. Data Diri Umum
  const [fullName, setFullName] = useState(initialData.fullName || '');
  const [email, setEmail] = useState(initialData.email || '');
  const [phone, setPhone] = useState(initialData.phone ? initialData.phone.replace(/^\+?62|^0/, '') : '');
  const gender = 'Perempuan'; // Permanen terkunci khusus perempuan
  const [birthDate, setBirthDate] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(null);

  // 2. Data Kendaraan Mandiri Driver
  const [vehicleType, setVehicleType] = useState('motor'); // 'motor' | 'mobil'
  const [vehicleBrand, setVehicleBrand] = useState('Honda');
  const [vehicleModelName, setVehicleModelName] = useState('');
  const [vehicleColor, setVehicleColor] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [operationalArea, setOperationalArea] = useState('Makassar (Tamalate, Rappocini) & Gowa');

  // 3. Legalitas & Identitas Mandiri Driver
  const [nik, setNik] = useState('');
  const [simNumber, setSimNumber] = useState('');
  const [simANumber, setSimANumber] = useState('');
  const [simExpiry, setSimExpiry] = useState('');
  const [stnkExpiry, setStnkExpiry] = useState('');

  // 4. Kontak Darurat
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');

  // 5. Berkas Dokumen (KTP, SIM, STNK)
  const [docs, setDocs] = useState({
    ktp: null,
    sim: null,
    stnk: null
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fileInputRef = useRef(null);
  const ktpInputRef = useRef(null);
  const simInputRef = useRef(null);
  const stnkInputRef = useRef(null);

  const handleAvatarClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setIsCompressing(true);
        const compressedBase64 = await compressImageFile(file, 400, 400, 0.8);
        setAvatarUrl(compressedBase64);
      } catch (err) {
        console.error('Error compressing avatar:', err);
      } finally {
        setIsCompressing(false);
      }
    }
  };

  const handleDocUpload = async (type, e) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setIsCompressing(true);
        // Kompres dokumen agar ringan di storage (~60KB) dan awet tidak rusak saat refresh
        const compressedBase64 = await compressImageFile(file, 900, 900, 0.75);
        setDocs((prev) => ({
          ...prev,
          [type]: {
            url: compressedBase64,
            name: file.name
          }
        }));
      } catch (err) {
        console.error('Error compressing document:', err);
      } finally {
        setIsCompressing(false);
      }
    }
  };

  const handleRemoveDoc = (type, e) => {
    e.stopPropagation();
    setDocs((prev) => ({
      ...prev,
      [type]: null
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validasi Data Diri Umum (Wajib Bertanda *)
    if (!fullName.trim()) {
      setErrorMsg('Nama lengkap wajib diisi (*).');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Alamat email aktif yang valid wajib diisi (*).');
      return;
    }
    if (!phone.trim()) {
      setErrorMsg('Nomor WhatsApp aktif wajib diisi (*).');
      return;
    }
    if (!birthDate) {
      setErrorMsg('Tanggal lahir wajib diisi (*).');
      return;
    }

    // Validasi Khusus Pendaftaran Driver Mandiri (Opsional - admin juga dapat input dari dashboard)
    if (isDriverRegistration && nik.trim()) {
      if (nik.trim().length !== 16 || !/^\d+$/.test(nik.trim())) {
        setErrorMsg('Jika NIK diisi, NIK KTP harus berupa 16 digit angka.');
        return;
      }
    }

    setIsLoading(true);
    setErrorMsg('');

    const fullVehicleModel = vehicleModelName.trim();
    const effectiveSim = vehicleType === 'mobil' 
      ? (simANumber.trim() || simNumber.trim()) 
      : (simNumber.trim() || simANumber.trim());

    setTimeout(() => {
      setIsLoading(false);
      if (onSuccess) {
        onSuccess({
          // Data Akun
          fullName,
          email,
          phone: `+62${phone}`,
          gender: 'Perempuan',
          birthDate,
          avatarUrl,

          // Data Kendaraan & Legalitas Mandiri (khusus driver)
          vehicleData: isDriverRegistration
            ? {
                vehicleType,
                vehicleBrand: vehicleType === 'mobil' ? 'Mobil' : 'Motor',
                vehicleModel: fullVehicleModel,
                vehicleColor,
                plateNumber: plateNumber.toUpperCase().trim(),
                operationalArea,
                nik: nik.trim(),
                simNumber: effectiveSim,
                simCNumber: simNumber.trim(),
                simANumber: simANumber.trim(),
                simExpiry,
                stnkExpiry,
                emergencyContactName: emergencyContactName.trim(),
                emergencyContactPhone: emergencyContactPhone.startsWith('+62')
                  ? emergencyContactPhone.trim()
                  : `+62${emergencyContactPhone.replace(/^0/, '').trim()}`
              }
            : null,

          // Berkas Dokumen
          documents: docs
        });
      }
    }, 450);
  };

  // Cek kelengkapan data pribadi dasar akun
  const isFormComplete = Boolean(
    fullName.trim() &&
    email.trim() &&
    email.includes('@') &&
    phone.trim() &&
    birthDate
  );

  return (
    <div className="personal-info-container">
      {/* Top Navigation Bar */}
      <div className="personal-info-top-nav">
        <button
          type="button"
          className="btn-personal-back"
          onClick={onBack}
          aria-label="Kembali"
          title="Kembali"
        >
          <ArrowLeft size={24} strokeWidth={2} />
        </button>
        <span className="personal-info-nav-title">
          {isDriverRegistration ? 'Daftar Mitra Driver' : 'Lengkapi Data Diri'}
        </span>
        <div className="personal-nav-spacer" />
      </div>

      {/* Main Scrollable Content */}
      <div className="personal-info-scroll-content">

        {/* Avatar Profile Section */}
        <div className="personal-avatar-wrapper">
          <div
            className="personal-avatar-circle"
            onClick={handleAvatarClick}
            title="Unggah Foto Profil"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="personal-avatar-img" />
            ) : (
              <User size={52} strokeWidth={1.5} className="personal-avatar-icon" />
            )}
            <div className="personal-avatar-edit-badge">
              <Pencil size={14} strokeWidth={2.5} />
            </div>
          </div>
          <span className="personal-avatar-hint">
            {isDriverRegistration ? 'Unggah Foto Wajah Driver (Rapi & Jelas)' : 'Unggah Foto Profil'}
          </span>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleAvatarChange}
            accept="image/*"
            style={{ display: 'none' }}
          />
        </div>

        {/* Error notification */}
        {errorMsg && (
          <div className="personal-error-banner">
            {errorMsg}
          </div>
        )}

        {/* Personal Info Form */}
        <form onSubmit={handleSubmit} className="personal-info-form">
          {/* SECTION 1: DATA IDENTITAS DIRI */}
          <div className="personal-section-label">
            <span>1. Data Pribadi</span>
          </div>

          {/* Full Name */}
          <div className="personal-field-group">
            <label className="personal-field-label">
              Nama Lengkap Sesuai KTP <span className="required-star">*</span>
            </label>
            <div className="personal-input-box">
              <input
                type="text"
                className="personal-input-field"
                placeholder="Nama Lengkap"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
              />
            </div>
          </div>

          {/* Email */}
          <div className="personal-field-group">
            <label className="personal-field-label">
              Alamat Email Aktif <span className="required-star">*</span>
            </label>
            <div className="personal-input-box">
              <Mail size={18} className="personal-input-icon" />
              <input
                type="email"
                className="personal-input-field"
                placeholder="nama@email.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
              />
            </div>
          </div>

          {/* Phone Number */}
          <div className="personal-field-group">
            <label className="personal-field-label">
              Nomor WhatsApp Aktif <span className="required-star">*</span>
            </label>
            <div className="personal-input-box">
              <div className="personal-phone-prefix">
                <span className="personal-prefix-text">+62</span>
              </div>
              <div className="personal-prefix-divider" />
              <input
                type="tel"
                className="personal-input-field"
                placeholder="812 3456 7890"
                value={phone}
                onChange={(e) => {
                  const val = e.target.value;
                  if (/^[0-9\s-]*$/.test(val)) {
                    setPhone(val);
                    if (errorMsg) setErrorMsg('');
                  }
                }}
              />
            </div>
          </div>

          {/* Gender - Default Perempuan & LOCKED */}
          <div className="personal-field-group">
            <label className="personal-field-label">Jenis Kelamin</label>
            <div className="personal-input-box personal-input-locked">
              <input
                type="text"
                className="personal-input-field locked-field"
                value="Perempuan"
                readOnly
                disabled
              />
              <Lock size={16} className="personal-locked-icon" />
            </div>
          </div>

          {/* Date of Birth */}
          <div className="personal-field-group">
            <label className="personal-field-label">
              Tanggal Lahir <span className="required-star">*</span>
            </label>
            <div className="personal-input-box">
              <input
                type="date"
                className="personal-date-input"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
              />
            </div>
          </div>

          {/* SECTION 2: KHUSUS DRIVER - KENDARAAN & LEGALITAS */}
          {isDriverRegistration && (
            <>
              <div className="personal-section-label" style={{ marginTop: 12 }}>
                <span>2. Data Kendaraan Mandiri</span>
              </div>


              {/* Tipe Kendaraan & Model */}
              <div className="personal-form-row">
                <div className="personal-field-group">
                  <label className="personal-field-label">Tipe Kendaraan</label>
                  <div className="personal-input-box">
                    <select
                      className="personal-select-field"
                      value={vehicleType}
                      onChange={(e) => setVehicleType(e.target.value)}
                    >
                      <option value="motor">Motor</option>
                      <option value="mobil">Mobil</option>
                    </select>
                  </div>
                </div>

                <div className="personal-field-group">
                  <label className="personal-field-label">Model / Tipe</label>
                  <div className="personal-input-box">
                    <input
                      type="text"
                      className="personal-input-field"
                      placeholder={vehicleType === 'mobil' ? 'Contoh: Avanza / Calya' : 'Contoh: Scoopy / Vario'}
                      value={vehicleModelName}
                      onChange={(e) => setVehicleModelName(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Warna & Plat Nomor */}
              <div className="personal-form-row">
                <div className="personal-field-group">
                  <label className="personal-field-label">Warna Kendaraan</label>
                  <div className="personal-input-box">
                    <input
                      type="text"
                      className="personal-input-field"
                      placeholder="Contoh: Matte Pink"
                      value={vehicleColor}
                      onChange={(e) => setVehicleColor(e.target.value)}
                    />
                  </div>
                </div>

                <div className="personal-field-group">
                  <label className="personal-field-label">Plat Nomor Polisi</label>
                  <div className="personal-input-box">
                    <input
                      type="text"
                      className="personal-input-field uppercase-field"
                      placeholder="DD 1234 XX"
                      value={plateNumber}
                      onChange={(e) => setPlateNumber(e.target.value.toUpperCase())}
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: IDENTITAS & LEGALITAS */}
              <div className="personal-section-label" style={{ marginTop: 12 }}>
                <span>3. Identitas & Legalitas</span>
              </div>

              {/* NIK KTP */}
              <div className="personal-field-group">
                <label className="personal-field-label">Nomor Induk Kependudukan (NIK KTP)</label>
                <div className="personal-input-box">
                  <CreditCard size={18} className="personal-input-icon" />
                  <input
                    type="text"
                    maxLength={16}
                    className="personal-input-field"
                    placeholder="16 digit angka sesuai KTP"
                    value={nik}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setNik(val);
                    }}
                  />
                </div>
              </div>

              {/* Nomor SIM C & SIM A */}
              <div className="personal-form-row">
                <div className="personal-field-group">
                  <label className="personal-field-label">Nomor SIM C (Motor)</label>
                  <div className="personal-input-box">
                    <input
                      type="text"
                      className="personal-input-field"
                      placeholder="Nomor SIM C"
                      value={simNumber}
                      onChange={(e) => setSimNumber(e.target.value)}
                    />
                  </div>
                </div>

                <div className="personal-field-group">
                  <label className="personal-field-label">Nomor SIM A (Mobil)</label>
                  <div className="personal-input-box">
                    <input
                      type="text"
                      className="personal-input-field"
                      placeholder="Nomor SIM A"
                      value={simANumber}
                      onChange={(e) => setSimANumber(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 4: UNGGAH DOKUMEN */}
              <div className="personal-docs-section">
                <div className="personal-docs-header">
                  <h3 className="personal-docs-title">4. Unggah Berkas Dokumen Asli</h3>
                  <p className="personal-docs-desc">
                    Foto KTP, SIM, dan STNK asli untuk verifikasi admin.
                  </p>
                </div>

                {/* 1. Foto KTP */}
                <div className="personal-doc-item">
                  <div className="personal-doc-label-row">
                    <span className="personal-doc-name">1. Foto KTP Asli</span>
                    {docs.ktp && (
                      <span className="personal-doc-status-ok">
                        <CheckCircle2 size={13} /> Terunggah
                      </span>
                    )}
                  </div>

                  <div
                    className={`personal-doc-upload-box ${docs.ktp ? 'has-file' : ''}`}
                    onClick={() => ktpInputRef.current?.click()}
                  >
                    {docs.ktp ? (
                      <div className="personal-doc-preview-wrapper">
                        <img src={docs.ktp.url} alt="Foto KTP" className="personal-doc-preview-img" />
                        <div className="personal-doc-preview-overlay">
                          <span className="doc-overlay-text">Ganti Foto KTP</span>
                        </div>
                        <button
                          type="button"
                          className="btn-doc-remove"
                          onClick={(e) => handleRemoveDoc('ktp', e)}
                          title="Hapus foto"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="personal-doc-placeholder">
                        <ImageUp size={28} className="personal-doc-upload-icon" />
                        <div className="doc-text-group">
                          <span className="doc-upload-prompt">Klik untuk unggah foto KTP</span>
                          <span className="doc-upload-hint">Pastikan NIK dan nama terbaca jelas</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <input
                    type="file"
                    ref={ktpInputRef}
                    onChange={(e) => handleDocUpload('ktp', e)}
                    accept="image/*"
                    style={{ display: 'none' }}
                  />
                </div>

                {/* 2. Foto SIM */}
                <div className="personal-doc-item">
                  <div className="personal-doc-label-row">
                    <span className="personal-doc-name">
                      2. Foto {vehicleType === 'motor' ? 'SIM C' : 'SIM A'} Asli
                    </span>
                    {docs.sim && (
                      <span className="personal-doc-status-ok">
                        <CheckCircle2 size={13} /> Terunggah
                      </span>
                    )}
                  </div>

                  <div
                    className={`personal-doc-upload-box ${docs.sim ? 'has-file' : ''}`}
                    onClick={() => simInputRef.current?.click()}
                  >
                    {docs.sim ? (
                      <div className="personal-doc-preview-wrapper">
                        <img src={docs.sim.url} alt="Foto SIM" className="personal-doc-preview-img" />
                        <div className="personal-doc-preview-overlay">
                          <span className="doc-overlay-text">Ganti Foto SIM</span>
                        </div>
                        <button
                          type="button"
                          className="btn-doc-remove"
                          onClick={(e) => handleRemoveDoc('sim', e)}
                          title="Hapus foto"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="personal-doc-placeholder">
                        <ImageUp size={28} className="personal-doc-upload-icon" />
                        <div className="doc-text-group">
                          <span className="doc-upload-prompt">Klik untuk unggah foto SIM</span>
                          <span className="doc-upload-hint">SIM masih dalam masa berlaku</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <input
                    type="file"
                    ref={simInputRef}
                    onChange={(e) => handleDocUpload('sim', e)}
                    accept="image/*"
                    style={{ display: 'none' }}
                  />
                </div>

                {/* 3. Foto STNK */}
                <div className="personal-doc-item">
                  <div className="personal-doc-label-row">
                    <span className="personal-doc-name">3. Foto STNK Kendaraan</span>
                    {docs.stnk && (
                      <span className="personal-doc-status-ok">
                        <CheckCircle2 size={13} /> Terunggah
                      </span>
                    )}
                  </div>

                  <div
                    className={`personal-doc-upload-box ${docs.stnk ? 'has-file' : ''}`}
                    onClick={() => stnkInputRef.current?.click()}
                  >
                    {docs.stnk ? (
                      <div className="personal-doc-preview-wrapper">
                        <img src={docs.stnk.url} alt="Foto STNK" className="personal-doc-preview-img" />
                        <div className="personal-doc-preview-overlay">
                          <span className="doc-overlay-text">Ganti Foto STNK</span>
                        </div>
                        <button
                          type="button"
                          className="btn-doc-remove"
                          onClick={(e) => handleRemoveDoc('stnk', e)}
                          title="Hapus foto"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="personal-doc-placeholder">
                        <ImageUp size={28} className="personal-doc-upload-icon" />
                        <div className="doc-text-group">
                          <span className="doc-upload-prompt">Klik untuk unggah foto STNK</span>
                          <span className="doc-upload-hint">Plat nomor dan jenis kendaraan sesuai</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <input
                    type="file"
                    ref={stnkInputRef}
                    onChange={(e) => handleDocUpload('stnk', e)}
                    accept="image/*"
                    style={{ display: 'none' }}
                  />
                </div>
              </div>
            </>
          )}
        </form>
      </div>

      {/* Bottom Sticky Action Button */}
      <div className="personal-bottom-section">
        <button
          type="button"
          className="btn-personal-submit"
          onClick={handleSubmit}
          disabled={isLoading || isCompressing}
        >
          {isLoading || isCompressing ? (
            <>
              <Loader2 size={18} className="spin-loader" />
              <span>{isCompressing ? 'Memproses berkas...' : 'Mendaftarkan...'}</span>
            </>
          ) : isDriverRegistration ? (
            'Ajukan Pendaftaran Driver'
          ) : (
            'Simpan Data'
          )}
        </button>
      </div>
    </div>
  );
}
