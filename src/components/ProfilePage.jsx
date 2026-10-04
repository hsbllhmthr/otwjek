import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import './ProfilePage.css';
import './PersonalInfoPage.css';

import {
  ArrowLeft,
  User,
  Mail,
  Calendar,
  ChevronDown,
  Pencil,
  CheckCircle2,
  AlertCircle,
  LogOut,
  ImageUp,
  X,
  Clock,
  AlertTriangle,
  Bike,
  Car,
  CreditCard,
  Phone,
  ShieldCheck,
  Check
} from 'lucide-react';
import dbService from '../services/dbService.js';
import { compressImageFile } from '../utils/imageCompressor.js';

export default function ProfilePage({ user: propUser, onBack, onLogout }) {
  // Ambil data user dari prop, session lokal, atau data pendaftaran terakhir
  const currentUser = useMemo(() => {
    if (propUser && (propUser.phone || propUser.fullName || propUser.full_name)) {
      return propUser;
    }
    const sessionUser = dbService.session.getCurrentUser();
    if (sessionUser && (sessionUser.phone || sessionUser.fullName || sessionUser.full_name)) {
      return sessionUser;
    }

    const allUsers = dbService.users.getAll();
    if (allUsers.length > 0) {
      return allUsers[allUsers.length - 1];
    }

    // Default fallback
    return {
      full_name: 'Andrew Ainsley',
      email: 'andrew.ainsley@yourdomain.com',
      phone: '+6281234567890',
      gender: 'Perempuan',
      birth_date: '12-27-1995',
      role: 'customer'
    };
  }, [propUser]);

  const isDriver = currentUser.role === 'driver';
  const [driverStateVersion, setDriverStateVersion] = useState(0);

  // Ambil data driver spesifik jika ada
  const driverProfile = useMemo(() => {
    if (!isDriver) return null;
    const drivers = dbService.drivers.getAll();
    const cName = (currentUser.full_name || currentUser.fullName || '').toLowerCase().trim();
    return (
      drivers.find(
        (d) =>
          (currentUser.id && d.user_id === currentUser.id) ||
          (cName && d.name?.toLowerCase().trim() === cName)
      ) || null
    );
  }, [isDriver, currentUser, driverStateVersion]);

  const activeDriver = useMemo(() => {
    return driverProfile || currentUser?.vehicleData || currentUser?.driver || {};
  }, [driverProfile, currentUser]);

  const displayName = currentUser.fullName || currentUser.full_name || 'Andrew Ainsley';
  const displayEmail = currentUser.email || 'andrew.ainsley@yourdomain.com';
  
  // Format nomor telepon
  const rawPhone = currentUser.phone ? currentUser.phone.replace(/^\+?62|^0/, '') : '81234567890';
  const displayPhone = `+62 ${rawPhone}`;

  // Format tanggal lahir
  const displayBirthDate = currentUser.birthDate || currentUser.birth_date || '12-27-1995';

  // Avatar resolution
  const avatarUrl = useMemo(() => {
    const userImg = currentUser.avatarUrl || currentUser.avatar_url;
    if (userImg && !userImg.includes('unsplash.com')) {
      return userImg;
    }

    try {
      const sessionStr = localStorage.getItem('otwjek_db_current_session');
      if (sessionStr) {
        const session = JSON.parse(sessionStr);
        const sessionImg = session?.user?.avatar_url || session?.avatar_url;
        if (sessionImg && !sessionImg.includes('unsplash.com')) {
          return sessionImg;
        }
      }
    } catch (_) {}

    try {
      const allUsers = JSON.parse(localStorage.getItem('otwjek_db_users') || '[]');
      const match = allUsers.find(
        (u) =>
          u.id === currentUser.id ||
          (u.full_name || u.fullName) === (currentUser.full_name || currentUser.fullName)
      );
      if (match?.avatar_url && !match.avatar_url.includes('unsplash.com')) {
        return match.avatar_url;
      }
    } catch (_) {}

    if (isDriver && driverProfile?.avatar && !driverProfile.avatar.includes('unsplash.com')) {
      return driverProfile.avatar;
    }

    return null;
  }, [currentUser, isDriver, driverProfile]);

  const [localAvatar, setLocalAvatar] = useState(null);
  const avatarInputRef = useRef(null);
  const displayAvatar = localAvatar || avatarUrl;

  // State untuk file dokumen yang baru diunggah di halaman ini
  const [docFiles, setDocFiles] = useState({ ktp: null, sim: null, stnk: null });
  const [isResubmitting, setIsResubmitting] = useState(false);
  const [resubmitNotice, setResubmitNotice] = useState(false);

  const ktpRef = useRef(null);
  const simRef = useRef(null);
  const stnkRef = useRef(null);

  // State Input Form Edit Profil & Kendaraan Mandiri
  const [name, setName] = useState(currentUser.fullName || currentUser.full_name || '');
  const [email, setEmail] = useState(currentUser.email || '');
  const [phone, setPhone] = useState(
    currentUser.phone ? currentUser.phone.replace(/^\+?62|^0/, '') : ''
  );
  const [birthDate, setBirthDate] = useState(
    currentUser.birthDate || currentUser.birth_date || ''
  );
  const [vehicleType, setVehicleType] = useState(activeDriver.vehicleType || 'motor');
  const [vehicleModel, setVehicleModel] = useState(activeDriver.vehicleModel || '');
  const [vehicleColor, setVehicleColor] = useState(activeDriver.vehicleColor || '');
  const [plateNumber, setPlateNumber] = useState(activeDriver.plateNumber || '');
  const [nik, setNik] = useState(activeDriver.nik || '');
  const [simCNumber, setSimCNumber] = useState(
    activeDriver.simCNumber || (activeDriver.vehicleType === 'motor' ? activeDriver.simNumber : '') || ''
  );
  const [simANumber, setSimANumber] = useState(
    activeDriver.simANumber || (activeDriver.vehicleType === 'mobil' ? activeDriver.simNumber : '') || ''
  );

  const [isUpdating, setIsUpdating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [updateSuccessNotice, setUpdateSuccessNotice] = useState(false);
  const [updateErrorNotice, setUpdateErrorNotice] = useState('');
  const nameInputRef = useRef(null);

  // Sinkronisasi data saat user atau driverProfile berubah
  useEffect(() => {
    setName(currentUser.fullName || currentUser.full_name || '');
    setEmail(currentUser.email || '');
    setPhone(currentUser.phone ? currentUser.phone.replace(/^\+?62|^0/, '') : '');
    setBirthDate(currentUser.birthDate || currentUser.birth_date || '');
    setVehicleType(activeDriver.vehicleType || 'motor');
    setVehicleModel(activeDriver.vehicleModel || '');
    setVehicleColor(activeDriver.vehicleColor || '');
    setPlateNumber(activeDriver.plateNumber || '');
    setNik(activeDriver.nik || '');
    setSimCNumber(
      activeDriver.simCNumber || (activeDriver.vehicleType === 'motor' ? activeDriver.simNumber : '') || ''
    );
    setSimANumber(
      activeDriver.simANumber || (activeDriver.vehicleType === 'mobil' ? activeDriver.simNumber : '') || ''
    );
  }, [currentUser, activeDriver]);

  // Handler Batal Edit
  const handleCancelEdit = () => {
    setIsEditing(false);
    setUpdateErrorNotice('');
    setName(currentUser.fullName || currentUser.full_name || '');
    setEmail(currentUser.email || '');
    setPhone(currentUser.phone ? currentUser.phone.replace(/^\+?62|^0/, '') : '');
    setBirthDate(currentUser.birthDate || currentUser.birth_date || '');
    setVehicleType(activeDriver.vehicleType || 'motor');
    setVehicleModel(activeDriver.vehicleModel || '');
    setVehicleColor(activeDriver.vehicleColor || '');
    setPlateNumber(activeDriver.plateNumber || '');
    setNik(activeDriver.nik || '');
    setSimCNumber(
      activeDriver.simCNumber || (activeDriver.vehicleType === 'motor' ? activeDriver.simNumber : '') || ''
    );
    setSimANumber(
      activeDriver.simANumber || (activeDriver.vehicleType === 'mobil' ? activeDriver.simNumber : '') || ''
    );
  };

  // Handler Perbarui Data Profil & Kendaraan
  const handleUpdateProfile = () => {
    if (!name.trim()) {
      setUpdateErrorNotice('Nama lengkap tidak boleh kosong.');
      setTimeout(() => setUpdateErrorNotice(''), 4000);
      return;
    }

    setIsUpdating(true);
    setUpdateErrorNotice('');

    try {
      const formattedPhone = phone.trim()
        ? (phone.trim().startsWith('+62') ? phone.trim() : `+62${phone.trim().replace(/^0/, '')}`)
        : '';

      const userUpdates = {
        full_name: name.trim(),
        fullName: name.trim(),
        email: email.trim(),
        phone: formattedPhone,
        birth_date: birthDate,
        birthDate: birthDate,
      };

      // 1. Update data User di DB
      if (currentUser?.id) {
        dbService.users.update(currentUser.id, userUpdates);
      }

      // 2. Update data Driver jika mitra driver
      if (isDriver) {
        const vehicleUpdates = {
          name: name.trim(),
          phone: formattedPhone,
          vehicleType: vehicleType,
          vehicleModel: vehicleModel.trim(),
          vehicleColor: vehicleColor.trim(),
          plateNumber: plateNumber.trim().toUpperCase(),
          nik: nik.trim(),
          simCNumber: simCNumber.trim(),
          simANumber: simANumber.trim(),
          simNumber: vehicleType === 'mobil'
            ? (simANumber.trim() || simCNumber.trim())
            : (simCNumber.trim() || simANumber.trim()),
        };

        if (driverProfile?.id) {
          dbService.drivers.updateDriver(driverProfile.id, vehicleUpdates);
        } else {
          const allDrivers = dbService.drivers.getAll();
          const existingDriver = allDrivers.find(
            (d) => d.user_id === currentUser?.id || d.name?.toLowerCase() === name.toLowerCase()
          );
          if (existingDriver) {
            dbService.drivers.updateDriver(existingDriver.id, vehicleUpdates);
          } else {
            dbService.drivers.registerDriver(
              { ...currentUser, ...userUpdates },
              vehicleUpdates,
              docFiles
            );
          }
        }

        const sessionUser = dbService.session.getCurrentUser();
        if (sessionUser) {
          sessionUser.vehicleData = {
            ...(sessionUser.vehicleData || {}),
            ...vehicleUpdates
          };
          dbService.session.setCurrentUser(sessionUser);
        }
      }

      // Update sesi aktif user
      const currentSession = dbService.session.getCurrentUser();
      if (currentSession) {
        dbService.session.setCurrentUser({
          ...currentSession,
          ...userUpdates
        });
      }

      setDriverStateVersion((v) => v + 1);
      setIsUpdating(false);
      setIsEditing(false);
      setUpdateSuccessNotice(true);
      setTimeout(() => setUpdateSuccessNotice(false), 4000);
    } catch (err) {
      console.error('Error updating profile:', err);
      setIsUpdating(false);
      setUpdateErrorNotice('Gagal memperbarui data. Silakan coba lagi.');
      setTimeout(() => setUpdateErrorNotice(''), 4000);
    }
  };

  const handleDocUpload = useCallback(async (docType, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImageFile(file, 900, 900, 0.75);
      const docInfo = { name: file.name, url: dataUrl, type: docType };
      setDocFiles((prev) => ({ ...prev, [docType]: docInfo }));

      // Persist ke localStorage driver documents
      const storedDocs = JSON.parse(localStorage.getItem('otwjek_db_driver_documents') || '[]');
      const existingIdx = storedDocs.findIndex(
        (d) => d.driver_id === driverProfile?.id && d.document_type === docType
      );
      const docEntry = {
        id: existingIdx >= 0 ? storedDocs[existingIdx].id : `doc-${Date.now()}`,
        driver_id: driverProfile?.id,
        document_type: docType,
        document_url: dataUrl,
        file_name: file.name,
        verification_status: 'pending',
        created_at: new Date().toISOString()
      };
      if (existingIdx >= 0) {
        storedDocs[existingIdx] = docEntry;
      } else {
        storedDocs.push(docEntry);
      }
      localStorage.setItem('otwjek_db_driver_documents', JSON.stringify(storedDocs));
    } catch (err) {
      console.error('Error uploading doc:', err);
    }
    e.target.value = '';
  }, [driverProfile]);

  const handleRemoveDoc = useCallback((docType, e) => {
    e.stopPropagation();
    setDocFiles((prev) => ({ ...prev, [docType]: null }));
    try {
      const storedDocs = JSON.parse(localStorage.getItem('otwjek_db_driver_documents') || '[]');
      const filtered = storedDocs.filter(
        (d) => !(d.driver_id === driverProfile?.id && d.document_type === docType)
      );
      localStorage.setItem('otwjek_db_driver_documents', JSON.stringify(filtered));
    } catch (_) {}
  }, [driverProfile]);

  // Cek per-dokumen apakah sudah diunggah
  const getDocStatus = useCallback((docType) => {
    if (docFiles[docType]) return docFiles[docType];
    const userDocs = currentUser?.documents;
    if (userDocs?.[docType]) {
      const d = userDocs[docType];
      return { name: d.name || `${docType.toUpperCase()}.jpg`, url: d.url || d };
    }
    if (driverProfile?.id) {
      try {
        const storedDocs = JSON.parse(localStorage.getItem('otwjek_db_driver_documents') || '[]');
        const found = storedDocs.find(
          (d) => d.driver_id === driverProfile.id && d.document_type === docType && d.document_url
        );
        if (found) return { name: found.file_name || `${docType}.jpg`, url: found.document_url };
      } catch (_) {}
    }
    return null;
  }, [docFiles, currentUser, driverProfile]);

  const handleAvatarBadgeClick = () => {
    avatarInputRef.current?.click();
  };

  const handleAvatarChange = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImageFile(file, 400, 400, 0.8);
      setLocalAvatar(dataUrl);
      
      const allUsers = dbService.users.getAll();
      const idx = allUsers.findIndex(
        (u) =>
          u.id === currentUser.id ||
          (u.full_name || u.fullName) === (currentUser.full_name || currentUser.fullName)
      );
      if (idx !== -1) {
        allUsers[idx] = { ...allUsers[idx], avatar_url: dataUrl };
        localStorage.setItem('otwjek_db_users', JSON.stringify(allUsers));
      }
      const sessionUser = dbService.session.getCurrentUser();
      if (sessionUser) {
        dbService.session.setCurrentUser({ ...sessionUser, avatar_url: dataUrl });
      }
    } catch (err) {
      console.error(err);
    }
    e.target.value = '';
  }, [currentUser]);

  // Ajukan ulang verifikasi jika ditolak
  const handleResubmitVerification = () => {
    if (!driverProfile?.id) return;
    setIsResubmitting(true);

    setTimeout(() => {
      const docsToUpdate = {};
      ['ktp', 'sim', 'stnk'].forEach((k) => {
        const d = getDocStatus(k);
        if (d) docsToUpdate[k] = d;
      });

      dbService.drivers.resubmitVerification(driverProfile.id, {}, docsToUpdate);
      setDriverStateVersion((v) => v + 1);
      setIsResubmitting(false);
      setResubmitNotice(true);
      setTimeout(() => setResubmitNotice(false), 5000);
    }, 600);
  };

  const handleLogoutClick = () => {
    dbService.session.logout();
    if (onLogout) onLogout();
  };

  const verificationStatus = driverProfile?.verification_status || 'approved';

  return (
    <div className="profile-page-flat">
      {/* Top Header */}
      <div className="profile-flat-top-nav">
        <button
          className="btn-flat-back"
          onClick={onBack}
          aria-label="Kembali"
          title="Kembali"
        >
          <ArrowLeft size={24} strokeWidth={2.2} />
        </button>
        <h1 className="profile-flat-title">Personal Info</h1>
        <div className="profile-flat-spacer" />
      </div>

      {/* Main Form Content */}
      <div className="profile-flat-scroll-content">
        {/* Avatar Profile */}
        <div className="profile-flat-avatar-wrapper">
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleAvatarChange}
          />
          <div
            className={`profile-flat-avatar-circle ${isEditing ? 'is-editing' : ''}`}
            onClick={() => isEditing && handleAvatarBadgeClick()}
            title={isEditing ? 'Ubah Foto Profil' : displayName}
            style={{ cursor: isEditing ? 'pointer' : 'default' }}
          >
            {displayAvatar ? (
              <img src={displayAvatar} alt={displayName} className="profile-flat-avatar-img" />
            ) : (
              <div className="profile-flat-avatar-fallback">
                <User size={50} strokeWidth={1.5} />
              </div>
            )}
            {isEditing && (
              <div className="profile-flat-edit-badge" title="Ubah Foto">
                <Pencil size={13} strokeWidth={2.5} />
              </div>
            )}
          </div>
        </div>

        {/* Banner Status Verifikasi Khusus Mitra Driver */}
        {isDriver && (
          <>
            {verificationStatus === 'pending' && (
              <div className="profile-verification-banner pending">
                <div className="banner-icon-title">
                  <Clock size={18} className="banner-icon" />
                  <span className="banner-title">Menunggu Verifikasi Admin</span>
                </div>
                <p className="banner-desc">
                  Data diri, kendaraan, dan dokumen KTP/SIM/STNK Anda sedang ditinjau oleh Admin OTWJek.
                </p>
              </div>
            )}

            {verificationStatus === 'rejected' && (
              <div className="profile-verification-banner rejected">
                <div className="banner-icon-title">
                  <AlertTriangle size={18} className="banner-icon" />
                  <span className="banner-title">Pendaftaran Belum Disetujui</span>
                </div>
                <p className="banner-desc">
                  <strong>Alasan Penolakan:</strong> {driverProfile?.rejection_reason || 'Dokumen belum lengkap atau tidak terbaca jelas.'}
                </p>
                <p className="banner-sub-desc">
                  Silakan periksa atau unggah ulang foto KTP, SIM, atau STNK Anda di bawah ini, kemudian klik tombol ajukan ulang.
                </p>
                <button
                  type="button"
                  className="btn-resubmit-verification"
                  onClick={handleResubmitVerification}
                  disabled={isResubmitting}
                >
                  {isResubmitting ? 'Mengirim permohonan...' : 'Ajukan Ulang Verifikasi'}
                </button>
              </div>
            )}

            {verificationStatus === 'approved' && (
              <div className="profile-verification-banner approved">
                <div className="banner-icon-title">
                  <CheckCircle2 size={18} className="banner-icon" />
                  <span className="banner-title">Mitra Pengemudi Resmi Terverifikasi</span>
                </div>
                <p className="banner-desc">
                  Akun Anda telah diverifikasi resmi oleh Admin OTWJek. Profil Anda aktif dan dapat dipilih oleh penumpang wanita di Mamminasata.
                </p>
              </div>
            )}

            {resubmitNotice && (
              <div className="profile-verification-banner pending" style={{ marginTop: 0 }}>
                <div className="banner-icon-title">
                  <Check size={18} className="banner-icon" />
                  <span className="banner-title">Permohonan Berhasil Diajukan Ulang!</span>
                </div>
                <p className="banner-desc">
                  Admin OTWJek akan segera meninjau kembali perbaikan data dan dokumen Anda.
                </p>
              </div>
            )}
          </>
        )}

        {/* Form Fields: Full Name, Email, Phone Number, Gender, Date of Birth */}
        <div className="profile-flat-form">
          <div className="profile-section-subhead">Data Pribadi</div>

          {/* 1. Full Name */}
          <div className="profile-flat-field">
            <label className="profile-flat-label">Full Name</label>
            <div className={`profile-flat-pill-box ${isEditing ? 'is-editing' : 'is-locked'}`}>
              <input
                ref={nameInputRef}
                type="text"
                className="profile-flat-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nama Lengkap"
                disabled={!isEditing}
              />
            </div>
          </div>

          {/* 2. Email */}
          <div className="profile-flat-field">
            <label className="profile-flat-label">Email</label>
            <div className={`profile-flat-pill-box ${isEditing ? 'is-editing' : 'is-locked'}`}>
              <div className="profile-flat-lead-icon">
                <Mail size={18} strokeWidth={2} />
              </div>
              <input
                type="email"
                className="profile-flat-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alamat@email.com"
                disabled={!isEditing}
              />
            </div>
          </div>

          {/* 3. Phone Number */}
          <div className="profile-flat-field">
            <label className="profile-flat-label">Phone Number</label>
            <div className={`profile-flat-pill-box ${isEditing ? 'is-editing' : 'is-locked'}`}>
              <div className="profile-flat-phone-prefix">
                <span className="profile-flag-emoji">🇮🇩</span>
                <ChevronDown size={14} />
              </div>
              <input
                type="tel"
                className="profile-flat-input"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, ''))}
                placeholder="81234567890"
                disabled={!isEditing}
              />
            </div>
          </div>

          {/* 4. Gender */}
          <div className="profile-flat-field">
            <label className="profile-flat-label">Gender</label>
            <div className="profile-flat-pill-box is-readonly is-locked">
              <input
                type="text"
                className="profile-flat-input"
                value="Perempuan"
                readOnly
                disabled
              />
              <div className="profile-flat-trail-icon">
                <ChevronDown size={18} strokeWidth={2} />
              </div>
            </div>
          </div>

          {/* 5. Date of Birth */}
          <div className="profile-flat-field">
            <label className="profile-flat-label">Date of Birth</label>
            <div className={`profile-flat-pill-box ${isEditing ? 'is-editing' : 'is-locked'}`}>
              <input
                type="text"
                className="profile-flat-input"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                placeholder="MM-DD-YYYY atau YYYY-MM-DD"
                disabled={!isEditing}
              />
              <div className="profile-flat-trail-icon">
                <Calendar size={18} strokeWidth={2} />
              </div>
            </div>
          </div>

          {/* DATA KENDARAAN & LEGALITAS DRIVER */}
          {isDriver && (
            <>
              <div className="profile-section-subhead">Data Kendaraan Mandiri</div>

              {/* Tipe Kendaraan */}
              <div className="profile-flat-field">
                <label className="profile-flat-label">Tipe Kendaraan</label>
                <div className={`profile-flat-pill-box ${isEditing ? 'is-editing' : 'is-locked'}`}>
                  <select
                    className="profile-flat-input profile-flat-select"
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                    disabled={!isEditing}
                  >
                    <option value="motor">Motor</option>
                    <option value="mobil">Mobil</option>
                  </select>
                  <div className="profile-flat-trail-icon">
                    <ChevronDown size={18} strokeWidth={2} />
                  </div>
                </div>
              </div>

              {/* Model / Tipe */}
              <div className="profile-flat-field">
                <label className="profile-flat-label">Model / Tipe</label>
                <div className={`profile-flat-pill-box ${isEditing ? 'is-editing' : 'is-locked'}`}>
                  <input
                    type="text"
                    className="profile-flat-input"
                    value={vehicleModel}
                    onChange={(e) => setVehicleModel(e.target.value)}
                    placeholder="Contoh: Scoopy / Avanza"
                    disabled={!isEditing}
                  />
                </div>
              </div>

              {/* Warna Kendaraan */}
              <div className="profile-flat-field">
                <label className="profile-flat-label">Warna Kendaraan</label>
                <div className={`profile-flat-pill-box ${isEditing ? 'is-editing' : 'is-locked'}`}>
                  <input
                    type="text"
                    className="profile-flat-input"
                    value={vehicleColor}
                    onChange={(e) => setVehicleColor(e.target.value)}
                    placeholder="Contoh: Matte Pink"
                    disabled={!isEditing}
                  />
                </div>
              </div>

              {/* Plat Nomor Polisi */}
              <div className="profile-flat-field">
                <label className="profile-flat-label">Plat Nomor Polisi</label>
                <div className={`profile-flat-pill-box ${isEditing ? 'is-editing' : 'is-locked'}`}>
                  <input
                    type="text"
                    className="profile-flat-input"
                    value={plateNumber}
                    onChange={(e) => setPlateNumber(e.target.value.toUpperCase())}
                    placeholder="Contoh: DD 1234 XX"
                    disabled={!isEditing}
                    style={plateNumber ? { fontWeight: 700 } : {}}
                  />
                </div>
              </div>

              <div className="profile-section-subhead">Identitas & Legalitas Surat</div>

              {/* NIK KTP */}
              <div className="profile-flat-field">
                <label className="profile-flat-label">Nomor Induk Kependudukan (NIK KTP)</label>
                <div className={`profile-flat-pill-box ${isEditing ? 'is-editing' : 'is-locked'}`}>
                  <input
                    type="text"
                    className="profile-flat-input"
                    value={nik}
                    maxLength={16}
                    onChange={(e) => setNik(e.target.value.replace(/[^\d]/g, ''))}
                    placeholder="16 digit angka sesuai KTP"
                    disabled={!isEditing}
                  />
                </div>
              </div>

              {/* Nomor SIM C */}
              <div className="profile-flat-field">
                <label className="profile-flat-label">Nomor SIM C (Motor)</label>
                <div className={`profile-flat-pill-box ${isEditing ? 'is-editing' : 'is-locked'}`}>
                  <input
                    type="text"
                    className="profile-flat-input"
                    value={simCNumber}
                    onChange={(e) => setSimCNumber(e.target.value)}
                    placeholder="Nomor SIM C"
                    disabled={!isEditing}
                  />
                </div>
              </div>

              {/* Nomor SIM A */}
              <div className="profile-flat-field">
                <label className="profile-flat-label">Nomor SIM A (Mobil)</label>
                <div className={`profile-flat-pill-box ${isEditing ? 'is-editing' : 'is-locked'}`}>
                  <input
                    type="text"
                    className="profile-flat-input"
                    value={simANumber}
                    onChange={(e) => setSimANumber(e.target.value)}
                    placeholder="Nomor SIM A"
                    disabled={!isEditing}
                  />
                </div>
              </div>

              {/* Upload Dokumen per-file: KTP, SIM, STNK */}
              <div className="personal-docs-section" style={{ borderTop: 'none', paddingTop: 0, marginTop: 10 }}>
                <div className="personal-docs-header">
                  <h3 className="personal-docs-title">Dokumen Verifikasi Driver</h3>
                  <p className="personal-docs-desc">
                    {verificationStatus === 'rejected'
                      ? 'Silakan unggah ulang dokumen yang perlu diperbaiki di bawah ini:'
                      : 'Foto dokumen KTP, SIM, dan STNK asli Anda:'}
                  </p>
                </div>

                {[
                  { key: 'ktp', label: '1. Foto KTP', hint: 'Format JPG, PNG (Maksimal 5MB)', prompt: 'Klik untuk unggah foto KTP', ref: ktpRef },
                  { key: 'sim', label: '2. Foto SIM', hint: 'SIM C / SIM A aktif yang berlaku', prompt: 'Klik untuk unggah foto SIM', ref: simRef },
                  { key: 'stnk', label: '3. Foto STNK', hint: 'STNK kendaraan yang akan digunakan', prompt: 'Klik untuk unggah foto STNK', ref: stnkRef },
                ].map(({ key, label, hint, prompt, ref: docRef }) => {
                  const uploaded = getDocStatus(key);
                  return (
                    <div key={key} className="personal-doc-item">
                      <div className="personal-doc-label-row">
                        <span className="personal-doc-name">{label}</span>
                        {uploaded && (
                          <span className="personal-doc-status-ok">
                            <CheckCircle2 size={13} /> Terunggah
                          </span>
                        )}
                      </div>

                      <div
                        className={`personal-doc-upload-box ${uploaded ? 'has-file' : ''} ${!isEditing ? 'is-disabled' : ''}`}
                        onClick={() => {
                          if (isEditing) {
                            docRef.current?.click();
                          }
                        }}
                        style={{ cursor: isEditing ? 'pointer' : 'default' }}
                      >
                        {uploaded ? (
                          <div className="personal-doc-preview-wrapper">
                            <img src={uploaded.url} alt={label} className="personal-doc-preview-img" />
                            {isEditing && (
                              <div className="personal-doc-preview-overlay">
                                <span className="doc-overlay-text">Ganti {label.replace(/^\d+\.\s*/, '')}</span>
                              </div>
                            )}
                            {isEditing && (
                              <button
                                type="button"
                                className="btn-doc-remove"
                                onClick={(e) => handleRemoveDoc(key, e)}
                                title="Hapus foto"
                              >
                                <X size={14} />
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="personal-doc-placeholder">
                            <ImageUp size={28} className="personal-doc-upload-icon" />
                            <div className="doc-text-group">
                              <span className="doc-upload-prompt">{prompt}</span>
                              <span className="doc-upload-hint">{hint}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      <input
                        type="file"
                        ref={docRef}
                        onChange={(e) => handleDocUpload(key, e)}
                        accept="image/*"
                        style={{ display: 'none' }}
                      />
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Notifikasi Status Update Data */}
          {updateSuccessNotice && (
            <div className="profile-update-notice success">
              <CheckCircle2 size={18} className="notice-icon" />
              <span>Data profil dan kendaraan berhasil diperbarui!</span>
            </div>
          )}

          {updateErrorNotice && (
            <div className="profile-update-notice error">
              <AlertCircle size={18} className="notice-icon" />
              <span>{updateErrorNotice}</span>
            </div>
          )}

          {/* Tombol Aksi / Ubah Data (Simpan Data saat diklik) & Logout */}
          <div className="profile-flat-actions">
            <button
              type="button"
              className={`btn-flat-update ${isEditing ? 'is-save' : ''}`}
              onClick={() => {
                if (!isEditing) {
                  setIsEditing(true);
                  setTimeout(() => nameInputRef.current?.focus(), 50);
                } else {
                  handleUpdateProfile();
                }
              }}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <>
                  <div className="profile-spinner" />
                  <span>Menyimpan Data...</span>
                </>
              ) : isEditing ? (
                <>
                  <Check size={18} strokeWidth={2.5} />
                  <span>Simpan Data</span>
                </>
              ) : (
                <>
                  <Pencil size={16} strokeWidth={2.2} />
                  <span>Ubah Data</span>
                </>
              )}
            </button>

            <button
              type="button"
              className="btn-flat-logout"
              onClick={handleLogoutClick}
            >
              <LogOut size={16} />
              <span>Keluar dari Akun</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
