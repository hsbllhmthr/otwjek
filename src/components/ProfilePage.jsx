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
import dbService, { normalizePhone } from '../services/dbService.js';
import { compressImageFile } from '../utils/imageCompressor.js';

export default function ProfilePage({ user: propUser, onBack, onLogout, isDriver: propIsDriver }) {
  // Ambil data user dari prop, session lokal, atau data pendaftaran terakhir
  const currentUser = useMemo(() => {
    if (propUser && (propUser.phone || propUser.fullName || propUser.full_name)) {
      return propUser;
    }
    const sessionUser = dbService.session.getCurrentUser();
    if (sessionUser && (sessionUser.phone || sessionUser.fullName || sessionUser.full_name)) {
      return sessionUser;
    }

    // Default fallback jika tidak ada sesi aktif
    return {
      full_name: 'Pengguna OTWJek',
      email: '',
      phone: '',
      gender: 'Perempuan',
      birth_date: '',
      role: 'customer'
    };
  }, [propUser]);

  const isDriver = typeof propIsDriver === 'boolean' ? propIsDriver : currentUser.role === 'driver';
  const [driverStateVersion, setDriverStateVersion] = useState(0);

  // Subscribe ke perubahan database agar status verifikasi & online tersinkronisasi real-time
  useEffect(() => {
    const unsub = dbService.subscribe(() => {
      setDriverStateVersion((v) => v + 1);
    });
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  // Ambil data driver spesifik jika ada
  const driverProfile = useMemo(() => {
    if (!isDriver) return null;
    const drivers = dbService.drivers.getAll();
    const cName = (currentUser.full_name || currentUser.fullName || '').toLowerCase().trim();
    return (
      drivers.find(
        (d) =>
          (currentUser.id && (d.user_id === currentUser.id || d.id === currentUser.id)) ||
          (currentUser.driver?.id && d.id === currentUser.driver.id) ||
          (currentUser.phone && normalizePhone(d.phone) === normalizePhone(currentUser.phone)) ||
          (cName && d.name?.toLowerCase().trim() === cName)
      ) ||
      currentUser.driver ||
      null
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

  const initialLetter = useMemo(() => {
    const name = (displayName || '').trim();
    return name ? name.charAt(0).toUpperCase() : 'U';
  }, [displayName]);

  // Avatar resolution: hanya gunakan foto yang valid & diunggah, jika tidak ada fallback ke inisial nama
  const avatarUrl = useMemo(() => {
    // 1. Cek langsung dari akun currentUser
    const userImg = currentUser.avatarUrl || currentUser.avatar_url;
    if (userImg && !userImg.includes('unsplash.com')) {
      return userImg;
    }

    // 2. Cek dari profil driver yang terhubung
    if (isDriver && driverProfile?.avatar && !driverProfile.avatar.includes('unsplash.com')) {
      return driverProfile.avatar;
    }

    return null;
  }, [currentUser, isDriver, driverProfile]);

  const [localAvatar, setLocalAvatar] = useState(null);
  const avatarInputRef = useRef(null);
  const displayAvatar = localAvatar || avatarUrl;

  // State untuk file dokumen yang baru diunggah di halaman ini
  const [docFiles, setDocFiles] = useState({ ktp: null, sim: null, simA: null, stnk: null, stnkCar: null });
  const [isResubmitting, setIsResubmitting] = useState(false);
  const [resubmitNotice, setResubmitNotice] = useState(false);

  const ktpRef = useRef(null);
  const simRef = useRef(null);
  const simARef = useRef(null);
  const stnkRef = useRef(null);
  const stnkCarRef = useRef(null);

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
  const [activeVehicleType, setActiveVehicleType] = useState(
    activeDriver.activeVehicleType || (activeDriver.vehicleType === 'mobil' ? 'mobil' : 'motor')
  );
  const [vehicleModel, setVehicleModel] = useState(activeDriver.vehicleModel || '');
  const [vehicleColor, setVehicleColor] = useState(activeDriver.vehicleColor || '');
  const [plateNumber, setPlateNumber] = useState(activeDriver.plateNumber || '');

  // Khusus Multi-Armada (Both)
  const [motorModel, setMotorModel] = useState(activeDriver.motorData?.model || (activeDriver.vehicleType === 'motor' ? activeDriver.vehicleModel : ''));
  const [motorColor, setMotorColor] = useState(activeDriver.motorData?.color || (activeDriver.vehicleType === 'motor' ? activeDriver.vehicleColor : ''));
  const [motorPlate, setMotorPlate] = useState(activeDriver.motorData?.plateNumber || (activeDriver.vehicleType === 'motor' ? activeDriver.plateNumber : ''));

  const [carModel, setCarModel] = useState(activeDriver.carData?.model || (activeDriver.vehicleType === 'mobil' ? activeDriver.vehicleModel : ''));
  const [carColor, setCarColor] = useState(activeDriver.carData?.color || (activeDriver.vehicleType === 'mobil' ? activeDriver.vehicleColor : ''));
  const [carPlate, setCarPlate] = useState(activeDriver.carData?.plateNumber || (activeDriver.vehicleType === 'mobil' ? activeDriver.plateNumber : ''));

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
    setActiveVehicleType(activeDriver.activeVehicleType || (activeDriver.vehicleType === 'mobil' ? 'mobil' : 'motor'));
    setVehicleModel(activeDriver.vehicleModel || '');
    setVehicleColor(activeDriver.vehicleColor || '');
    setPlateNumber(activeDriver.plateNumber || '');

    setMotorModel(activeDriver.motorData?.model || (activeDriver.vehicleType === 'motor' ? activeDriver.vehicleModel : ''));
    setMotorColor(activeDriver.motorData?.color || (activeDriver.vehicleType === 'motor' ? activeDriver.vehicleColor : ''));
    setMotorPlate(activeDriver.motorData?.plateNumber || (activeDriver.vehicleType === 'motor' ? activeDriver.plateNumber : ''));

    setCarModel(activeDriver.carData?.model || (activeDriver.vehicleType === 'mobil' ? activeDriver.vehicleModel : ''));
    setCarColor(activeDriver.carData?.color || (activeDriver.vehicleType === 'mobil' ? activeDriver.vehicleColor : ''));
    setCarPlate(activeDriver.carData?.plateNumber || (activeDriver.vehicleType === 'mobil' ? activeDriver.plateNumber : ''));

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
    setActiveVehicleType(activeDriver.activeVehicleType || (activeDriver.vehicleType === 'mobil' ? 'mobil' : 'motor'));
    setVehicleModel(activeDriver.vehicleModel || '');
    setVehicleColor(activeDriver.vehicleColor || '');
    setPlateNumber(activeDriver.plateNumber || '');

    setMotorModel(activeDriver.motorData?.model || (activeDriver.vehicleType === 'motor' ? activeDriver.vehicleModel : ''));
    setMotorColor(activeDriver.motorData?.color || (activeDriver.vehicleType === 'motor' ? activeDriver.vehicleColor : ''));
    setMotorPlate(activeDriver.motorData?.plateNumber || (activeDriver.vehicleType === 'motor' ? activeDriver.plateNumber : ''));

    setCarModel(activeDriver.carData?.model || (activeDriver.vehicleType === 'mobil' ? activeDriver.vehicleModel : ''));
    setCarColor(activeDriver.carData?.color || (activeDriver.vehicleType === 'mobil' ? activeDriver.vehicleColor : ''));
    setCarPlate(activeDriver.carData?.plateNumber || (activeDriver.vehicleType === 'mobil' ? activeDriver.plateNumber : ''));

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
        const isBoth = vehicleType === 'both';
        const isCar = vehicleType === 'mobil';

        const effMotorModel = isBoth ? motorModel.trim() : (isCar ? '' : vehicleModel.trim());
        const effMotorColor = isBoth ? motorColor.trim() : (isCar ? '' : vehicleColor.trim());
        const effMotorPlate = isBoth ? motorPlate.trim().toUpperCase() : (isCar ? '' : plateNumber.trim().toUpperCase());

        const effCarModel = isBoth ? carModel.trim() : (isCar ? vehicleModel.trim() : '');
        const effCarColor = isBoth ? carColor.trim() : (isCar ? vehicleColor.trim() : '');
        const effCarPlate = isBoth ? carPlate.trim().toUpperCase() : (isCar ? plateNumber.trim().toUpperCase() : '');

        const currentActiveType = isBoth ? activeVehicleType : (isCar ? 'mobil' : 'motor');
        const activeModel = isBoth ? (currentActiveType === 'mobil' ? effCarModel : effMotorModel) : (isCar ? effCarModel : effMotorModel);
        const activeColor = isBoth ? (currentActiveType === 'mobil' ? effCarColor : effMotorColor) : (isCar ? effCarColor : effMotorColor);
        const activePlate = isBoth ? (currentActiveType === 'mobil' ? effCarPlate : effMotorPlate) : (isCar ? effCarPlate : effMotorPlate);

        const vehicleUpdates = {
          name: name.trim(),
          phone: formattedPhone,
          vehicleType: vehicleType,
          activeVehicleType: currentActiveType,
          vehicleModel: activeModel || vehicleModel.trim(),
          vehicleColor: activeColor || vehicleColor.trim(),
          plateNumber: activePlate || plateNumber.trim().toUpperCase(),
          nik: nik.trim(),
          simCNumber: simCNumber.trim(),
          simANumber: simANumber.trim(),
          simNumber: currentActiveType === 'mobil'
            ? (simANumber.trim() || simCNumber.trim())
            : (simCNumber.trim() || simANumber.trim()),
          motorData: (vehicleType === 'motor' || isBoth) ? {
            type: 'motor',
            brand: 'Motor',
            model: effMotorModel,
            color: effMotorColor,
            plateNumber: effMotorPlate,
            simNumber: simCNumber.trim()
          } : null,
          carData: (isCar || isBoth) ? {
            type: 'mobil',
            brand: 'Mobil',
            model: effCarModel,
            color: effCarColor,
            plateNumber: effCarPlate,
            simNumber: simANumber.trim()
          } : null
        };

        if (displayAvatar) {
          vehicleUpdates.avatar = displayAvatar;
        }
        const activeDocs = {};
        ['ktp', 'sim', 'simA', 'stnk', 'stnkCar'].forEach((k) => {
          if (docFiles[k]) activeDocs[k] = docFiles[k];
        });

        if (driverProfile?.id) {
          dbService.drivers.updateDriver(driverProfile.id, vehicleUpdates, activeDocs);
        } else {
          const allDrivers = dbService.drivers.getAll();
          const existingDriver = allDrivers.find(
            (d) => d.user_id === currentUser?.id || d.name?.toLowerCase() === name.toLowerCase()
          );
          if (existingDriver) {
            dbService.drivers.updateDriver(existingDriver.id, vehicleUpdates, activeDocs);
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
      
      if (currentUser?.id) {
        dbService.users.update(currentUser.id, { avatar_url: dataUrl, avatarUrl: dataUrl });
      }
      if (isDriver && driverProfile?.id) {
        dbService.drivers.updateDriver(driverProfile.id, { avatar: dataUrl });
      }
      const sessionUser = dbService.session.getCurrentUser();
      if (sessionUser) {
        const updatedDriverObj = sessionUser.driver
          ? { ...sessionUser.driver, avatar: dataUrl }
          : sessionUser.driver;
        dbService.session.setCurrentUser({
          ...sessionUser,
          avatar_url: dataUrl,
          avatarUrl: dataUrl,
          driver: updatedDriverObj
        });
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
    if (isDriver) {
      dbService.session.clearDriverSession();
    } else {
      dbService.session.clearCustomerSession();
    }
    if (onLogout) onLogout();
  };

  const verificationStatus = driverProfile?.verification_status || currentUser?.driver?.verification_status || 'pending';
  const isApprovedDriver = verificationStatus === 'approved';

  const isDriverOnline = useMemo(() => {
    if (!isDriver || !isApprovedDriver) return false;
    if (driverProfile && typeof driverProfile.is_online === 'boolean') {
      return driverProfile.is_online;
    }
    if (currentUser?.driver && typeof currentUser.driver.is_online === 'boolean') {
      return currentUser.driver.is_online;
    }
    return true;
  }, [isDriver, isApprovedDriver, driverProfile, currentUser]);

  const handleToggleOnlineStatus = useCallback(
    (targetOnline) => {
      if (!isApprovedDriver) return;
      const nextState = typeof targetOnline === 'boolean' ? targetOnline : !isDriverOnline;
      const targetDriverId = driverProfile?.id || currentUser?.driver?.id;
      if (targetDriverId) {
        dbService.drivers.setOnlineStatus(targetDriverId, nextState);
      } else if (isDriver && currentUser) {
        // Jika objek driver belum terdaftar di tabel drivers, daftarkan & set statusnya
        const created = dbService.drivers.registerDriver(currentUser, activeDriver || {}, {});
        if (created?.driver?.id) {
          dbService.drivers.setOnlineStatus(created.driver.id, nextState);
        }
      }
      setDriverStateVersion((v) => v + 1);
    },
    [isApprovedDriver, isDriverOnline, driverProfile, currentUser, isDriver, activeDriver]
  );

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
        <h1 className="profile-flat-title">{isDriver ? 'Profil Mitra Driver' : 'Profil Saya'}</h1>
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
              <div className="profile-flat-avatar-initial">
                <span>{initialLetter}</span>
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
              <div className="driver-verify-card pending" style={{ marginBottom: 20 }}>
                <div className="driver-verify-icon-outer">
                  <div className="driver-verify-icon-inner">i</div>
                </div>
                <div className="driver-verify-body">
                  <h3 className="driver-verify-title">Menunggu Verifikasi Admin</h3>
                  <p className="driver-verify-desc">
                    Berkas KTP, SIM, dan STNK Anda sedang ditinjau oleh tim Admin OTWJek.
                  </p>
                </div>
              </div>
            )}

            {verificationStatus === 'rejected' && (
              <div className="driver-verify-card rejected" style={{ marginBottom: 20 }}>
                <div className="driver-verify-icon-outer">
                  <div className="driver-verify-icon-inner">!</div>
                </div>
                <div className="driver-verify-body">
                  <h3 className="driver-verify-title">Verifikasi Perlu Diperbaiki</h3>
                  <p className="driver-verify-desc">
                    <strong>Alasan Penolakan:</strong> {driverProfile?.rejection_reason || 'Dokumen belum lengkap atau tidak terbaca jelas.'}
                  </p>
                  <p className="driver-verify-sub-desc">
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
              </div>
            )}

            {verificationStatus === 'approved' && (
              <div className="driver-verify-card approved" style={{ marginBottom: 14 }}>
                <div className="driver-verify-icon-outer">
                  <div className="driver-verify-icon-inner">
                    <Check size={14} strokeWidth={3} />
                  </div>
                </div>
                <div className="driver-verify-body">
                  <h3 className="driver-verify-title">Mitra Resmi Terverifikasi</h3>
                  <p className="driver-verify-desc">
                    Akun Anda telah disetujui oleh Admin OTWJek.
                  </p>
                </div>
              </div>
            )}

            {resubmitNotice && (
              <div className="driver-verify-card pending" style={{ marginBottom: 20 }}>
                <div className="driver-verify-icon-outer">
                  <div className="driver-verify-icon-inner" style={{ background: '#10B981' }}>
                    <Check size={14} strokeWidth={3} />
                  </div>
                </div>
                <div className="driver-verify-body">
                  <h3 className="driver-verify-title">Permohonan Berhasil Diajukan Ulang!</h3>
                  <p className="driver-verify-desc">
                    Admin OTWJek akan segera meninjau kembali perbaikan data dan dokumen Anda.
                  </p>
                </div>
              </div>
            )}

            {/* Switch Online / Offline (Minimalist & Clean) */}
            <div
              className={`driver-online-switch-card ${isDriverOnline ? 'is-online' : 'is-offline'} ${!isApprovedDriver ? 'is-locked' : ''}`}
              onClick={() => isApprovedDriver && handleToggleOnlineStatus(!isDriverOnline)}
              role="button"
              tabIndex={isApprovedDriver ? 0 : -1}
              aria-disabled={!isApprovedDriver}
              onKeyDown={(e) => {
                if (!isApprovedDriver) return;
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleToggleOnlineStatus(!isDriverOnline);
                }
              }}
            >
              <div className="driver-online-left">
                <div className="driver-online-text-wrap">
                  <span className="driver-online-title">
                    {!isApprovedDriver
                      ? 'Belum Dapat Aktif'
                      : isDriverOnline
                      ? 'Siap Terima Order'
                      : 'Sedang Istirahat (Off)'}
                  </span>
                  <span className="driver-online-sub">
                    {!isApprovedDriver
                      ? 'Menunggu verifikasi Admin sebelum dapat menerima penugasan'
                      : isDriverOnline
                      ? 'Aktif · Dapat menerima penugasan dari Admin'
                      : 'Tidak Aktif · Admin tidak dapat menugaskan order'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={isDriverOnline}
                aria-label="Switch Status Online atau Istirahat"
                disabled={!isApprovedDriver}
                className={`driver-toggle-switch ${isDriverOnline ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isApprovedDriver) handleToggleOnlineStatus(!isDriverOnline);
                }}
              >
                <span className="driver-toggle-thumb" />
              </button>
            </div>
          </>
        )}

        {/* Form Fields: Full Name, Email, Phone Number, Gender, Date of Birth */}
        <div className="profile-flat-form">
          <div className="profile-section-subhead">Data Pribadi</div>

          {/* 1. Full Name */}
          <div className="profile-flat-field">
            <label className="profile-flat-label">Nama Lengkap</label>
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
            <label className="profile-flat-label">Alamat Email</label>
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
            <label className="profile-flat-label">Nomor Telepon / WhatsApp</label>
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
            <label className="profile-flat-label">Jenis Kelamin</label>
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
            <label className="profile-flat-label">Tanggal Lahir</label>
            <div className={`profile-flat-pill-box ${isEditing ? 'is-editing' : 'is-locked'}`}>
              <input
                type="text"
                className="profile-flat-input"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                placeholder="Contoh: 27-12-1995"
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

              {/* Quick Switch Armada Aktif jika Driver memiliki Motor & Mobil */}
              {vehicleType === 'both' && (
                <div style={{
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: 12,
                  padding: '12px 14px',
                  marginBottom: 16
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>Armada Aktif Saat Ini:</span>
                    <span style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      background: '#0F172A',
                      color: '#FFFFFF',
                      padding: '2px 8px',
                      borderRadius: 6
                    }}>
                      {activeVehicleType === 'mobil' ? 'Mobil Aktif' : 'Motor Aktif'}
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveVehicleType('motor');
                        const targetId = driverProfile?.id || currentUser?.driver?.id || activeDriver?.id || currentUser?.id || currentUser?.phone || currentUser?.full_name;
                        if (targetId) {
                          const updated = dbService.drivers.switchActiveVehicle(targetId, 'motor');
                          if (updated) {
                            if (updated.vehicleModel) setVehicleModel(updated.vehicleModel);
                            if (updated.vehicleColor) setVehicleColor(updated.vehicleColor);
                            if (updated.plateNumber) setPlateNumber(updated.plateNumber);
                          }
                        }
                      }}
                      style={{
                        padding: '8px 10px',
                        borderRadius: 8,
                        border: activeVehicleType === 'motor' ? '1.5px solid #0F172A' : '1px solid #E2E8F0',
                        background: activeVehicleType === 'motor' ? '#FFFFFF' : '#F8FAFC',
                        fontWeight: activeVehicleType === 'motor' ? 700 : 500,
                        color: activeVehicleType === 'motor' ? '#0F172A' : '#64748B',
                        boxShadow: activeVehicleType === 'motor' ? '0 1px 3px rgba(15, 23, 42, 0.06)' : 'none',
                        fontSize: 12,
                        cursor: 'pointer',
                        textAlign: 'center'
                      }}
                    >
                      Motor
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveVehicleType('mobil');
                        const targetId = driverProfile?.id || currentUser?.driver?.id || activeDriver?.id || currentUser?.id || currentUser?.phone || currentUser?.full_name;
                        if (targetId) {
                          const updated = dbService.drivers.switchActiveVehicle(targetId, 'mobil');
                          if (updated) {
                            if (updated.vehicleModel) setVehicleModel(updated.vehicleModel);
                            if (updated.vehicleColor) setVehicleColor(updated.vehicleColor);
                            if (updated.plateNumber) setPlateNumber(updated.plateNumber);
                          }
                        }
                      }}
                      style={{
                        padding: '8px 10px',
                        borderRadius: 8,
                        border: activeVehicleType === 'mobil' ? '1.5px solid #0F172A' : '1px solid #E2E8F0',
                        background: activeVehicleType === 'mobil' ? '#FFFFFF' : '#F8FAFC',
                        fontWeight: activeVehicleType === 'mobil' ? 700 : 500,
                        color: activeVehicleType === 'mobil' ? '#0F172A' : '#64748B',
                        boxShadow: activeVehicleType === 'mobil' ? '0 1px 3px rgba(15, 23, 42, 0.06)' : 'none',
                        fontSize: 12,
                        cursor: 'pointer',
                        textAlign: 'center'
                      }}
                    >
                      Mobil
                    </button>
                  </div>
                </div>
              )}

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
                    <option value="both">Motor & Mobil (Keduanya)</option>
                  </select>
                  <div className="profile-flat-trail-icon">
                    <ChevronDown size={18} strokeWidth={2} />
                  </div>
                </div>
              </div>

              {vehicleType === 'both' ? (
                <>
                  {/* Blok Kendaraan Motor */}
                  <div style={{ marginTop: 12, marginBottom: 8, fontWeight: 700, fontSize: 13, color: '#334155' }}>
                    Data Motor
                  </div>
                  <div className="profile-flat-field">
                    <label className="profile-flat-label">Model / Tipe Motor</label>
                    <div className={`profile-flat-pill-box ${isEditing ? 'is-editing' : 'is-locked'}`}>
                      <input
                        type="text"
                        className="profile-flat-input"
                        value={motorModel}
                        onChange={(e) => setMotorModel(e.target.value)}
                        placeholder="Contoh: Scoopy / Vario"
                        disabled={!isEditing}
                      />
                    </div>
                  </div>
                  <div className="profile-flat-field">
                    <label className="profile-flat-label">Warna Motor</label>
                    <div className={`profile-flat-pill-box ${isEditing ? 'is-editing' : 'is-locked'}`}>
                      <input
                        type="text"
                        className="profile-flat-input"
                        value={motorColor}
                        onChange={(e) => setMotorColor(e.target.value)}
                        placeholder="Contoh: Matte Pink"
                        disabled={!isEditing}
                      />
                    </div>
                  </div>
                  <div className="profile-flat-field">
                    <label className="profile-flat-label">Plat Nomor Motor</label>
                    <div className={`profile-flat-pill-box ${isEditing ? 'is-editing' : 'is-locked'}`}>
                      <input
                        type="text"
                        className="profile-flat-input"
                        value={motorPlate}
                        onChange={(e) => setMotorPlate(e.target.value.toUpperCase())}
                        placeholder="DD 1234 XX"
                        disabled={!isEditing}
                        style={motorPlate ? { fontWeight: 700 } : {}}
                      />
                    </div>
                  </div>

                  {/* Blok Kendaraan Mobil */}
                  <div style={{ marginTop: 16, marginBottom: 8, fontWeight: 700, fontSize: 13, color: '#334155' }}>
                    Data Mobil
                  </div>
                  <div className="profile-flat-field">
                    <label className="profile-flat-label">Model / Tipe Mobil</label>
                    <div className={`profile-flat-pill-box ${isEditing ? 'is-editing' : 'is-locked'}`}>
                      <input
                        type="text"
                        className="profile-flat-input"
                        value={carModel}
                        onChange={(e) => setCarModel(e.target.value)}
                        placeholder="Contoh: Avanza / Calya"
                        disabled={!isEditing}
                      />
                    </div>
                  </div>
                  <div className="profile-flat-field">
                    <label className="profile-flat-label">Warna Mobil</label>
                    <div className={`profile-flat-pill-box ${isEditing ? 'is-editing' : 'is-locked'}`}>
                      <input
                        type="text"
                        className="profile-flat-input"
                        value={carColor}
                        onChange={(e) => setCarColor(e.target.value)}
                        placeholder="Contoh: Putih / Hitam"
                        disabled={!isEditing}
                      />
                    </div>
                  </div>
                  <div className="profile-flat-field">
                    <label className="profile-flat-label">Plat Nomor Mobil</label>
                    <div className={`profile-flat-pill-box ${isEditing ? 'is-editing' : 'is-locked'}`}>
                      <input
                        type="text"
                        className="profile-flat-input"
                        value={carPlate}
                        onChange={(e) => setCarPlate(e.target.value.toUpperCase())}
                        placeholder="DD 5678 YY"
                        disabled={!isEditing}
                        style={carPlate ? { fontWeight: 700 } : {}}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
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
                </>
              )}

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

                {(vehicleType === 'both' ? [
                  { key: 'ktp', label: '1. Foto KTP', hint: 'Format JPG, PNG (Maksimal 5MB)', prompt: 'Klik untuk unggah foto KTP', ref: ktpRef },
                  { key: 'sim', label: '2. Foto SIM C (Motor)', hint: 'SIM C aktif yang berlaku', prompt: 'Klik untuk unggah foto SIM C', ref: simRef },
                  { key: 'simA', label: '3. Foto SIM A (Mobil)', hint: 'SIM A aktif yang berlaku', prompt: 'Klik untuk unggah foto SIM A', ref: simARef },
                  { key: 'stnk', label: '4. Foto STNK Motor', hint: 'STNK sepeda motor yang digunakan', prompt: 'Klik untuk unggah foto STNK Motor', ref: stnkRef },
                  { key: 'stnkCar', label: '5. Foto STNK Mobil', hint: 'STNK mobil penumpang yang digunakan', prompt: 'Klik untuk unggah foto STNK Mobil', ref: stnkCarRef },
                ] : [
                  { key: 'ktp', label: '1. Foto KTP', hint: 'Format JPG, PNG (Maksimal 5MB)', prompt: 'Klik untuk unggah foto KTP', ref: ktpRef },
                  { key: 'sim', label: `2. Foto ${vehicleType === 'mobil' ? 'SIM A' : 'SIM C'}`, hint: 'SIM aktif yang berlaku', prompt: 'Klik untuk unggah foto SIM', ref: simRef },
                  { key: 'stnk', label: '3. Foto STNK', hint: 'STNK kendaraan yang akan digunakan', prompt: 'Klik untuk unggah foto STNK', ref: stnkRef },
                ]).map(({ key, label, hint, prompt, ref: docRef }) => {
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
