/**
 * OTWJek Client Database Service
 * 
 * Lapisan abstraksi database lokal (Local Database Repository) yang mengimplementasikan
 * skema database OTWJek (schema.sql) untuk menyimpan dan mengelola data aplikasi secara persisten.
 * 
 * Mendukung siklus lengkap:
 * 1. Pendaftaran Pengguna & Driver Mandiri (Kendaraan, Identitas NIK, SIM, STNK, Kontak Darurat)
 * 2. Alur Verifikasi Admin: Pending -> Disetujui (Approved) / Ditolak (Rejected dengan alasan)
 * 3. Perbaikan & Pengajuan Ulang Dokumen Driver
 * 4. Filtrasi Driver Resmi untuk Pemesanan GrabNow Pelanggan
 */

import { ADMINS } from '../data/admins.js';
import { FOOD_MERCHANTS } from '../data/foodMerchants.js';

const STORAGE_KEYS = {
  USERS: 'otwjek_db_users',
  DRIVERS: 'otwjek_db_drivers',
  DRIVER_DOCS: 'otwjek_db_driver_documents',
  BOOKINGS: 'otwjek_db_ride_bookings',
  DELIVERIES: 'otwjek_db_package_deliveries',
  CURRENT_USER: 'otwjek_db_current_session',
  ADMIN_SESSION: 'otwjek_db_admin_session'
};

// Kredensial admin default dibaca dari .env / .env.local (dengan fallback default jika belum diset)
const ADMIN_EMAIL = (import.meta?.env?.VITE_ADMIN_EMAIL || 'admin@otwjek.com').trim().toLowerCase();
const ADMIN_PASSWORD = (import.meta?.env?.VITE_ADMIN_PASSWORD || 'admin123').trim();

// Helper generator UUID v4 sederhana
export function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Normalisasi nomor telepon ke digit murni tanpa prefix 62 atau 0 berulang.
 * Contoh: "+62 812-3456-7890", "081234567890", "+62081234567890", "81234567890" -> "81234567890"
 */
export function normalizePhone(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (!digits) return '';
  return digits.replace(/^(?:62|0)+/, '');
}

/**
 * Format nomor telepon standar internasional Indonesia: "+6281234567890"
 */
export function formatStandardPhone(phone) {
  const clean = normalizePhone(phone);
  return clean ? `+62${clean}` : '';
}


function getStoredArray(key, defaultData = []) {
  if (typeof localStorage === 'undefined') return defaultData;
  try {
    const data = localStorage.getItem(key);
    if (!data) {
      if (defaultData && defaultData.length > 0) {
        localStorage.setItem(key, JSON.stringify(defaultData));
      }
      return defaultData;
    }
    return JSON.parse(data);
  } catch (err) {
    console.error(`Error reading ${key} from storage:`, err);
    return defaultData;
  }
}

function setStoredArray(key, array) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(array));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('otwjek_db_change', {
          detail: { key, timestamp: Date.now(), length: array.length }
        })
      );
    }
  } catch (err) {
    console.error(`Error writing ${key} to storage:`, err);
  }
}

// Inisialisasi awal database lokal & pembersihan data dummy bawaan
export function initializeLocalDatabase() {
  // 1. Bersihkan tabel USERS: hapus sample dummy pelanggan, pertahankan data riil & superadmin
  const existingUsers = getStoredArray(STORAGE_KEYS.USERS, []);
  const dummyCustomerPhones = ['81234567890', '85712348901', '89698765432', '82133445566'];
  
  const realUsers = existingUsers.filter((u) => {
    if (!u) return false;
    // Pertahankan superadmin
    if (u.role === 'admin' || u.id === 'admin-master-01' || (ADMIN_EMAIL && u.email === ADMIN_EMAIL)) {
      return true;
    }
    // Hapus dummy bawaan (cust-001 s/d cust-004 atau berawalan cust-)
    if (typeof u.id === 'string' && u.id.startsWith('cust-')) {
      return false;
    }
    // Hapus nomor dummy sample
    if (dummyCustomerPhones.includes(normalizePhone(u.phone))) {
      return false;
    }
    return true;
  });

  // Pastikan akun superadmin default tersedia untuk akses portal admin
  const adminExists = realUsers.some(
    (u) => u.role === 'admin' || (ADMIN_EMAIL && u.email === ADMIN_EMAIL)
  );

  if (!adminExists && ADMIN_EMAIL && ADMIN_PASSWORD) {
    realUsers.unshift({
      id: 'admin-master-01',
      full_name: 'Admin Verifikasi OTWJek',
      email: ADMIN_EMAIL,
      phone: '+62882021942470',
      gender: 'Perempuan',
      role: 'admin',
      status: 'active',
      created_at: new Date().toISOString()
    });
  }

  setStoredArray(STORAGE_KEYS.USERS, realUsers);

  // 2. Bersihkan tabel DRIVERS dari data dummy bawaan (drv-1 s/d drv-4 atau berawalan drv-)
  const existingDrivers = getStoredArray(STORAGE_KEYS.DRIVERS, []);
  const realDrivers = existingDrivers.filter((d) => {
    if (!d) return false;
    if (typeof d.id === 'string' && d.id.startsWith('drv-')) {
      return false;
    }
    return true;
  });
  setStoredArray(STORAGE_KEYS.DRIVERS, realDrivers);

  // 3. Bersihkan tabel DRIVER_DOCS yang terikat dengan driver dummy
  const existingDocs = getStoredArray(STORAGE_KEYS.DRIVER_DOCS, []);
  const realDocs = existingDocs.filter((doc) => {
    if (!doc) return false;
    if (typeof doc.driver_id === 'string' && doc.driver_id.startsWith('drv-')) {
      return false;
    }
    return true;
  });
  setStoredArray(STORAGE_KEYS.DRIVER_DOCS, realDocs);
}

// Inisialisasi saat file di-load
initializeLocalDatabase();

export const dbService = {
  // ==========================================
  // REAL-TIME EVENT SUBSCRIPTION (INTRA & CROSS-TAB)
  // ==========================================
  subscribe(callback) {
    if (typeof window === 'undefined') return () => {};
    const handleEvent = (e) => {
      callback(e.detail || { key: e.key, newValue: e.newValue });
    };
    window.addEventListener('otwjek_db_change', handleEvent);
    window.addEventListener('storage', handleEvent);
    return () => {
      window.removeEventListener('otwjek_db_change', handleEvent);
      window.removeEventListener('storage', handleEvent);
    };
  },

  notifyChange(key = 'all') {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('otwjek_db_change', {
          detail: { key, timestamp: Date.now() }
        })
      );
    }
  },

  // ==========================================
  // 1. PENGGUNA (USERS)
  // ==========================================
  users: {
    getAll() {
      return getStoredArray(STORAGE_KEYS.USERS, []);
    },

    findByPhone(phone) {
      if (!phone) return null;
      const target = normalizePhone(phone);
      if (!target) return null;
      const users = getStoredArray(STORAGE_KEYS.USERS, []);
      // Cari semua akun yang cocok nomornya
      const matches = users.filter((u) => normalizePhone(u.phone) === target);
      if (matches.length === 0) return null;
      // Jika ada lebih dari satu (misal ada akun dummy 'Pelanggan SheRide' dan akun riil),
      // prioritaskan akun yang memiliki nama asli
      const realUser = matches.find((u) => {
        const name = (u.full_name || u.fullName || '').trim().toLowerCase();
        return name && name !== 'pelanggan sheride' && name !== 'pelanggan perempuan';
      });
      return realUser || matches[matches.length - 1];
    },

    findByEmail(email) {
      if (!email) return null;
      const users = getStoredArray(STORAGE_KEYS.USERS, []);
      return users.find((u) => (u.email || '').toLowerCase() === email.toLowerCase().trim());
    },

    findById(id) {
      const users = getStoredArray(STORAGE_KEYS.USERS, []);
      return users.find((u) => u.id === id);
    },

    create(userData) {
      const users = getStoredArray(STORAGE_KEYS.USERS, []);
      const standardPhone = formatStandardPhone(userData.phone);
      const targetDigits = normalizePhone(standardPhone);

      // Jika akun dengan nomor ini sudah ada, perbarui datanya daripada membuat duplikat
      if (targetDigits) {
        const existingIdx = users.findIndex((u) => normalizePhone(u.phone) === targetDigits);
        if (existingIdx !== -1) {
          const rawName = (userData.fullName || userData.full_name || users[existingIdx].full_name || users[existingIdx].fullName || '').trim();
          const updated = {
            ...users[existingIdx],
            ...userData,
            phone: standardPhone || users[existingIdx].phone,
            full_name: rawName,
            fullName: rawName,
            birth_date: userData.birthDate || userData.birth_date || users[existingIdx].birth_date || users[existingIdx].birthDate || null,
            birthDate: userData.birthDate || userData.birth_date || users[existingIdx].birthDate || users[existingIdx].birth_date || null,
            avatar_url: userData.avatarUrl || userData.avatar_url || users[existingIdx].avatar_url || users[existingIdx].avatarUrl || null,
            avatarUrl: userData.avatarUrl || userData.avatar_url || users[existingIdx].avatarUrl || users[existingIdx].avatar_url || null,
            role: userData.role || users[existingIdx].role || 'customer',
            updated_at: new Date().toISOString()
          };
          users[existingIdx] = updated;
          setStoredArray(STORAGE_KEYS.USERS, users);
          return updated;
        }
      }

      const rawName = (userData.fullName || userData.full_name || '').trim();
      const newUser = {
        id: generateUUID(),
        full_name: rawName,
        fullName: rawName,
        email: userData.email || '',
        phone: standardPhone,
        password: userData.password || '',
        password_hash: userData.password ? `hashed_${userData.password}` : 'mock_hash',
        gender: 'Perempuan',
        birth_date: userData.birthDate || userData.birth_date || null,
        birthDate: userData.birthDate || userData.birth_date || null,
        avatar_url: userData.avatarUrl || userData.avatar_url || null,
        avatarUrl: userData.avatarUrl || userData.avatar_url || null,
        role: userData.role || 'customer',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      users.push(newUser);
      setStoredArray(STORAGE_KEYS.USERS, users);
      return newUser;
    },

    update(id, updates) {
      const users = getStoredArray(STORAGE_KEYS.USERS, []);
      const index = users.findIndex((u) => u.id === id);
      if (index === -1) return null;

      const rawName = (updates.fullName || updates.full_name || users[index].full_name || users[index].fullName || '').trim();
      const updated = {
        ...users[index],
        ...updates,
        phone: updates.phone ? formatStandardPhone(updates.phone) : users[index].phone,
        full_name: rawName,
        fullName: rawName,
        birth_date: updates.birthDate || updates.birth_date || users[index].birth_date || users[index].birthDate || null,
        birthDate: updates.birthDate || updates.birth_date || users[index].birthDate || users[index].birth_date || null,
        avatar_url: updates.avatarUrl || updates.avatar_url || users[index].avatar_url || users[index].avatarUrl || null,
        avatarUrl: updates.avatarUrl || updates.avatar_url || users[index].avatarUrl || users[index].avatar_url || null,
        updated_at: new Date().toISOString()
      };
      users[index] = updated;
      setStoredArray(STORAGE_KEYS.USERS, users);

      // Sinkronisasi dengan sesi aktif jika user yang diubah adalah currentUser
      const currentUser = dbService.session.getCurrentUser();
      if (currentUser && (currentUser.id === id || normalizePhone(currentUser.phone) === normalizePhone(updated.phone))) {
        dbService.session.setCurrentUser({ ...currentUser, ...updated });
      }

      return updated;
    },

    getCustomers() {
      const users = this.getAll();
      return users.filter((u) => u.role === 'customer' || (!u.role && u.email !== ADMIN_EMAIL));
    },

    toggleStatus(id) {
      const users = this.getAll();
      const user = users.find((u) => u.id === id);
      if (!user) return null;
      const newStatus = user.status === 'suspended' ? 'active' : 'suspended';
      return this.update(id, { status: newStatus });
    },

    delete(id) {
      let users = getStoredArray(STORAGE_KEYS.USERS, []);
      users = users.filter((u) => u.id !== id);
      setStoredArray(STORAGE_KEYS.USERS, users);
      return true;
    }
  },

  // ==========================================
  // 2. MITRA DRIVER & VERIFIKASI (DRIVERS & DOCS)
  // ==========================================
  drivers: {
    getAll() {
      return getStoredArray(STORAGE_KEYS.DRIVERS, []);
    },

    // Driver yang disetujui (Approved) untuk katalog GrabNow & Order Pelanggan
    getApprovedDrivers() {
      const drivers = this.getAll();
      return drivers.filter((d) => (d.verification_status || 'approved') === 'approved');
    },

    // Driver yang menunggu verifikasi (Pending) untuk dashboard admin
    getPendingDrivers() {
      const drivers = this.getAll();
      return drivers.filter((d) => d.verification_status === 'pending');
    },

    // Driver yang ditolak (Rejected)
    getRejectedDrivers() {
      const drivers = this.getAll();
      return drivers.filter((d) => d.verification_status === 'rejected');
    },

    getDriverById(id) {
      const drivers = this.getAll();
      return drivers.find((d) => d.id === id) || null;
    },

    getDriverByUserId(userId) {
      const drivers = this.getAll();
      return drivers.find((d) => d.user_id === userId) || null;
    },

    /**
     * Mendaftarkan Driver Baru secara Mandiri
     * Driver baru otomatis berstatus 'pending' dan 'offline'
     */
    registerDriver(userData, vehicleData = {}, documents = {}) {
      // 1. Buat data user akun driver jika belum ada
      let user = dbService.users.findByPhone(userData.phone);
      if (!user) {
        user = dbService.users.create({
          ...userData,
          role: 'driver'
        });
      } else {
        user = dbService.users.update(user.id, {
          ...userData,
          role: 'driver',
          full_name: userData.fullName || userData.full_name || user.full_name,
          fullName: userData.fullName || userData.full_name || user.fullName,
          email: userData.email || user.email,
          avatar_url: userData.avatarUrl || userData.avatar_url || user.avatar_url,
          avatarUrl: userData.avatarUrl || userData.avatar_url || user.avatarUrl,
          birth_date: userData.birthDate || userData.birth_date || user.birth_date,
          birthDate: userData.birthDate || userData.birth_date || user.birthDate
        });
      }

      // 2. Buat atau perbarui profil driver
      const drivers = getStoredArray(STORAGE_KEYS.DRIVERS, []);
      const existingIdx = drivers.findIndex(
        (d) => d.user_id === user.id || normalizePhone(d.phone) === normalizePhone(user.phone)
      );

      const driverPayload = {
        user_id: user.id,
        name: user.full_name || user.fullName,
        phone: user.phone,
        avatar: user.avatar_url || user.avatarUrl || null,
        
        // Data Kendaraan Mandiri
        vehicleType: vehicleData.vehicleType || 'motor', // 'motor' | 'mobil'
        vehicleBrand: vehicleData.vehicleBrand || '',
        vehicleModel: vehicleData.vehicleModel || `${vehicleData.vehicleBrand || ''} ${vehicleData.vehicleModelName || ''}`.trim(),
        vehicleColor: vehicleData.vehicleColor || '',
        plateNumber: (vehicleData.plateNumber || '').toUpperCase().trim(),
        operationalArea: vehicleData.operationalArea || 'Makassar dan sekitarnya',

        // Legalitas & Identitas Mandiri
        nik: vehicleData.nik || '',
        simNumber: vehicleData.simNumber || '',
        simCNumber: vehicleData.simCNumber || '',
        simANumber: vehicleData.simANumber || '',
        simExpiry: vehicleData.simExpiry || '',
        stnkExpiry: vehicleData.stnkExpiry || '',

        // Kontak Darurat
        emergencyContactName: vehicleData.emergencyContactName || '',
        emergencyContactPhone: vehicleData.emergencyContactPhone ? formatStandardPhone(vehicleData.emergencyContactPhone) : '',

        // Status Verifikasi & Operasional
        rating: existingIdx !== -1 ? (drivers[existingIdx].rating || 5.0) : 5.0,
        tripsCount: existingIdx !== -1 ? (drivers[existingIdx].tripsCount || 0) : 0,
        status: existingIdx !== -1 ? drivers[existingIdx].status : 'Menunggu Verifikasi',
        verification_status: existingIdx !== -1 ? drivers[existingIdx].verification_status : 'pending',
        rejection_reason: null,
        is_online: false,
        badge: existingIdx !== -1 ? (drivers[existingIdx].badge || 'Calon Mitra 🌸') : 'Calon Mitra 🌸',
        bio: vehicleData.bio || 'Mitra Pengemudi Amanah OTWJek Khusus Perempuan.'
      };

      let activeDriver;
      if (existingIdx !== -1) {
        activeDriver = {
          ...drivers[existingIdx],
          ...driverPayload,
          updated_at: new Date().toISOString()
        };
        drivers[existingIdx] = activeDriver;
      } else {
        activeDriver = {
          id: generateUUID(),
          ...driverPayload,
          created_at: new Date().toISOString()
        };
        drivers.push(activeDriver);
      }

      setStoredArray(STORAGE_KEYS.DRIVERS, drivers);

      // 3. Simpan berkas dokumen (KTP, SIM, STNK)
      if (documents && Object.keys(documents).length > 0) {
        const storedDocs = getStoredArray(STORAGE_KEYS.DRIVER_DOCS, []);
        ['ktp', 'sim', 'stnk'].forEach((docType) => {
          if (documents[docType]) {
            const docObj = documents[docType];
            const existingDocIdx = storedDocs.findIndex(
              (d) => d.driver_id === activeDriver.id && d.document_type === docType
            );
            const docEntry = {
              id: existingDocIdx !== -1 ? storedDocs[existingDocIdx].id : generateUUID(),
              driver_id: activeDriver.id,
              document_type: docType,
              document_url: docObj.url || docObj,
              file_name: docObj.name || `${docType}_document.jpg`,
              verification_status: 'pending',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            if (existingDocIdx !== -1) {
              storedDocs[existingDocIdx] = docEntry;
            } else {
              storedDocs.push(docEntry);
            }
          }
        });
        setStoredArray(STORAGE_KEYS.DRIVER_DOCS, storedDocs);
      }

      user.driver = activeDriver;
      user.vehicleData = vehicleData || {};
      user.documents = documents || {};
      return { user, driver: activeDriver };
    },

    /**
     * Memperbarui / Melengkapi Data Driver oleh Admin atau Sistem
     * Dapat mengupdate identitas, kendaraan, legalitas, dokumen foto, dan status verifikasi.
     */
    updateDriver(driverId, updateData = {}, documents = {}, reviewerName = 'Admin OTWJek') {
      const drivers = this.getAll();
      const idx = drivers.findIndex((d) => d.id === driverId);
      if (idx === -1) return null;

      // Persiapkan status & badge jika ada perubahan verification_status
      let extraStatusFields = {};
      if (updateData.verification_status === 'approved') {
        extraStatusFields = {
          verification_status: 'approved',
          status: updateData.status || 'Tersedia',
          badge: updateData.badge || drivers[idx].badge || 'Mitra Resmi 🌸',
          reviewed_by: reviewerName,
          reviewed_at: new Date().toISOString(),
          rejection_reason: null
        };
      } else if (updateData.verification_status === 'rejected') {
        extraStatusFields = {
          verification_status: 'rejected',
          status: updateData.status || 'Verifikasi Ditolak',
          rejection_reason: updateData.rejection_reason || 'Dokumen belum lengkap atau tidak sesuai.',
          reviewed_by: reviewerName,
          reviewed_at: new Date().toISOString()
        };
      } else if (updateData.verification_status === 'pending') {
        extraStatusFields = {
          verification_status: 'pending',
          status: updateData.status || 'Menunggu Verifikasi',
          rejection_reason: null
        };
      }

      drivers[idx] = {
        ...drivers[idx],
        ...updateData,
        ...extraStatusFields,
        updated_at: new Date().toISOString()
      };
      setStoredArray(STORAGE_KEYS.DRIVERS, drivers);

      // Sinkronisasi akun user jika ada perubahan nama/telepon/avatar
      if (drivers[idx].user_id) {
        const users = getStoredArray(STORAGE_KEYS.USERS, []);
        const uIdx = users.findIndex((u) => u.id === drivers[idx].user_id);
        if (uIdx !== -1) {
          users[uIdx] = {
            ...users[uIdx],
            full_name: updateData.name || users[uIdx].full_name,
            phone: updateData.phone || users[uIdx].phone,
            avatar_url: updateData.avatar || users[uIdx].avatar_url,
            updated_at: new Date().toISOString()
          };
          setStoredArray(STORAGE_KEYS.USERS, users);
        }
      }

      // Sinkronisasi dokumen (KTP, SIM, STNK) jika diunggah atau diupdate
      if (documents && Object.keys(documents).length > 0) {
        const storedDocs = getStoredArray(STORAGE_KEYS.DRIVER_DOCS, []);
        ['ktp', 'sim', 'stnk'].forEach((docType) => {
          if (documents[docType]) {
            const docVal = documents[docType];
            const docUrl = typeof docVal === 'string' ? docVal : docVal.url;
            const docName = (typeof docVal === 'object' && docVal.name) ? docVal.name : `${docType}_document.jpg`;
            const docStatus = updateData.verification_status === 'approved' ? 'approved' : (docVal.verification_status || 'pending');

            const existingIdx = storedDocs.findIndex(
              (d) => d.driver_id === driverId && d.document_type === docType
            );

            const docEntry = {
              id: existingIdx !== -1 ? storedDocs[existingIdx].id : generateUUID(),
              driver_id: driverId,
              document_type: docType,
              document_url: docUrl,
              file_name: docName,
              verification_status: docStatus,
              rejection_reason: null,
              updated_at: new Date().toISOString()
            };

            if (existingIdx !== -1) {
              storedDocs[existingIdx] = docEntry;
            } else {
              storedDocs.push(docEntry);
            }
          }
        });
        setStoredArray(STORAGE_KEYS.DRIVER_DOCS, storedDocs);
      }

      // Sinkronisasi session lokal jika sedang login sebagai driver tersebut
      const sessionUser = dbService.session.getCurrentUser();
      if (sessionUser && (sessionUser.id === drivers[idx].user_id || sessionUser.driver?.id === driverId)) {
        sessionUser.driver = drivers[idx];
        sessionUser.vehicleData = {
          ...(sessionUser.vehicleData || {}),
          ...updateData
        };
        dbService.session.setCurrentUser(sessionUser);
      }

      return drivers[idx];
    },

    /**
     * Admin Menyetujui Driver (Approve)
     */
    approveDriver(driverId, reviewerName = 'Admin OTWJek') {
      const drivers = this.getAll();
      const idx = drivers.findIndex((d) => d.id === driverId);
      if (idx === -1) return null;

      drivers[idx] = {
        ...drivers[idx],
        verification_status: 'approved',
        status: 'Tersedia',
        badge: 'Mitra Resmi 🌸',
        reviewed_by: reviewerName,
        reviewed_at: new Date().toISOString(),
        rejection_reason: null
      };

      setStoredArray(STORAGE_KEYS.DRIVERS, drivers);

      // Update seluruh status dokumen driver menjadi approved
      const storedDocs = getStoredArray(STORAGE_KEYS.DRIVER_DOCS, []);
      const updatedDocs = storedDocs.map((doc) => {
        if (doc.driver_id === driverId) {
          return {
            ...doc,
            verification_status: 'approved',
            reviewed_by: reviewerName,
            reviewed_at: new Date().toISOString(),
            rejection_reason: null
          };
        }
        return doc;
      });
      setStoredArray(STORAGE_KEYS.DRIVER_DOCS, updatedDocs);

      // Update session jika sedang login
      const sessionUser = dbService.session.getCurrentUser();
      if (sessionUser && sessionUser.id === drivers[idx].user_id) {
        sessionUser.driver = drivers[idx];
        dbService.session.setCurrentUser(sessionUser);
      }

      return drivers[idx];
    },

    /**
     * Admin Menolak Pengajuan Driver (Reject) dengan Alasan Penolakan
     */
    rejectDriver(driverId, reason = 'Dokumen tidak jelas atau tidak sesuai persyaratan.', reviewerName = 'Admin OTWJek') {
      const drivers = this.getAll();
      const idx = drivers.findIndex((d) => d.id === driverId);
      if (idx === -1) return null;

      drivers[idx] = {
        ...drivers[idx],
        verification_status: 'rejected',
        status: 'Verifikasi Ditolak',
        rejection_reason: reason,
        reviewed_by: reviewerName,
        reviewed_at: new Date().toISOString()
      };

      setStoredArray(STORAGE_KEYS.DRIVERS, drivers);

      // Update status dokumen menjadi rejected
      const storedDocs = getStoredArray(STORAGE_KEYS.DRIVER_DOCS, []);
      const updatedDocs = storedDocs.map((doc) => {
        if (doc.driver_id === driverId) {
          return {
            ...doc,
            verification_status: 'rejected',
            rejection_reason: reason,
            reviewed_by: reviewerName,
            reviewed_at: new Date().toISOString()
          };
        }
        return doc;
      });
      setStoredArray(STORAGE_KEYS.DRIVER_DOCS, updatedDocs);

      // Update session jika sedang login
      const sessionUser = dbService.session.getCurrentUser();
      if (sessionUser && sessionUser.id === drivers[idx].user_id) {
        sessionUser.driver = drivers[idx];
        dbService.session.setCurrentUser(sessionUser);
      }

      return drivers[idx];
    },

    /**
     * Driver Memperbaiki Dokumen/Data dan Mengajukan Ulang (Resubmit)
     */
    resubmitVerification(driverId, updatedVehicleData = {}, updatedDocs = {}) {
      const drivers = this.getAll();
      const idx = drivers.findIndex((d) => d.id === driverId);
      if (idx === -1) return null;

      drivers[idx] = {
        ...drivers[idx],
        ...updatedVehicleData,
        verification_status: 'pending',
        status: 'Menunggu Verifikasi',
        rejection_reason: null,
        resubmitted_at: new Date().toISOString()
      };

      setStoredArray(STORAGE_KEYS.DRIVERS, drivers);

      // Perbarui atau tambahkan dokumen yang diunggah ulang
      const storedDocs = getStoredArray(STORAGE_KEYS.DRIVER_DOCS, []);
      ['ktp', 'sim', 'stnk'].forEach((docType) => {
        if (updatedDocs[docType]) {
          const docObj = updatedDocs[docType];
          const existingIdx = storedDocs.findIndex(
            (d) => d.driver_id === driverId && d.document_type === docType
          );

          const docEntry = {
            id: existingIdx !== -1 ? storedDocs[existingIdx].id : generateUUID(),
            driver_id: driverId,
            document_type: docType,
            document_url: docObj.url || docObj,
            file_name: docObj.name || `${docType}_document.jpg`,
            verification_status: 'pending',
            rejection_reason: null,
            updated_at: new Date().toISOString()
          };

          if (existingIdx !== -1) {
            storedDocs[existingIdx] = docEntry;
          } else {
            storedDocs.push(docEntry);
          }
        }
      });
      setStoredArray(STORAGE_KEYS.DRIVER_DOCS, storedDocs);

      return drivers[idx];
    },

    update(driverId, updates) {
      const drivers = this.getAll();
      const idx = drivers.findIndex((d) => d.id === driverId);
      if (idx === -1) return null;

      drivers[idx] = {
        ...drivers[idx],
        ...updates,
        updated_at: new Date().toISOString()
      };

      setStoredArray(STORAGE_KEYS.DRIVERS, drivers);
      return drivers[idx];
    },

    getDocuments(driverId) {
      const storedDocs = getStoredArray(STORAGE_KEYS.DRIVER_DOCS, []);
      return storedDocs.filter((d) => d.driver_id === driverId);
    }
  },

  // ==========================================
  // 3. AUTENTIKASI ADMIN & PORTAL VERIFIKASI
  // ==========================================
  admin: {
    login(identifier, password) {
      const cleanIdent = (identifier || '').trim().toLowerCase();
      const cleanPass = (password || '').trim();

      // Cek akun superadmin default
      const isValidPassword = Boolean(ADMIN_PASSWORD) && cleanPass === ADMIN_PASSWORD;

      if (
        isValidPassword &&
        ((ADMIN_EMAIL && cleanIdent === ADMIN_EMAIL) || cleanIdent === 'admin' || cleanIdent === '0882021942470' || cleanIdent === '62882021942470')
      ) {
        const adminObj = {
          id: 'admin-master-01',
          name: 'Super Admin Verifikasi',
          email: ADMIN_EMAIL,
          role: 'superadmin',
          avatar: '👩‍💼'
        };
        this.setCurrentAdmin(adminObj);
        return { success: true, admin: adminObj };
      }

      // Cek daftar admin WhatsApp resmi dari admins.js
      const matchedAdmin = ADMINS.find((a) => {
        const aPhone = (a.phone || '').replace(/^\+?62|^0/, '');
        const inPhone = cleanIdent.replace(/^\+?62|^0/, '');
        return aPhone === inPhone || a.id === cleanIdent;
      });

      if (matchedAdmin && isValidPassword) {
        const adminObj = {
          id: matchedAdmin.id,
          name: matchedAdmin.name,
          role: matchedAdmin.role,
          phone: matchedAdmin.phone,
          avatar: matchedAdmin.avatar
        };
        this.setCurrentAdmin(adminObj);
        return { success: true, admin: adminObj };
      }

      return { success: false, message: 'Email/Nomor Telepon atau Password admin salah.' };
    },

    getCurrentAdmin() {
      try {
        const data = localStorage.getItem(STORAGE_KEYS.ADMIN_SESSION);
        return data ? JSON.parse(data) : null;
      } catch {
        return null;
      }
    },

    setCurrentAdmin(admin) {
      try {
        localStorage.setItem(STORAGE_KEYS.ADMIN_SESSION, JSON.stringify(admin));
      } catch (e) {
        console.error(e);
      }
    },

    logout() {
      localStorage.removeItem(STORAGE_KEYS.ADMIN_SESSION);
    }
  },

  // ==========================================
  // 4. PEMESANAN PERJALANAN (RIDE BOOKINGS)
  // ==========================================
  bookings: {
    create(rideData) {
      const bookings = getStoredArray(STORAGE_KEYS.BOOKINGS, []);
      const newBooking = {
        id: generateUUID(),
        booking_code: `RIDE-${Date.now().toString().slice(-6)}`,
        customer_id: rideData.customerId || null,
        driver_id: rideData.driverId || null,
        service_type: rideData.serviceType || 'motor',
        pickup_name: rideData.pickup?.name || '',
        pickup_address: rideData.pickup?.address || '',
        dropoff_name: rideData.dropoff?.name || '',
        dropoff_address: rideData.dropoff?.address || '',
        distance_km: rideData.distanceKm || 0,
        duration_minutes: rideData.durationMinutes || 0,
        fare_amount: rideData.fareAmount || 0,
        payment_method: rideData.paymentMethod || 'cash',
        booking_status: 'pending',
        created_at: new Date().toISOString()
      };

      bookings.push(newBooking);
      setStoredArray(STORAGE_KEYS.BOOKINGS, bookings);
      return newBooking;
    },

    getAll() {
      return getStoredArray(STORAGE_KEYS.BOOKINGS, []);
    }
  },

  // ==========================================
  // 5. OPERATOR ADMIN & MITRA KULINER
  // ==========================================
  getAdmins() {
    return ADMINS;
  },

  getMerchants() {
    return FOOD_MERCHANTS;
  },

  // Bersihkan data dummy bawaan secara manual dan sinkronisasi realtime
  clearDummyData() {
    initializeLocalDatabase();
    this.notifyChange('all');
    return true;
  },

  // Sesi Pengguna Biasa / Driver
  session: {
    setCurrentUser(user) {
      try {
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
      } catch (e) {
        console.error(e);
      }
    },
    getCurrentUser() {
      try {
        const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
        return data ? JSON.parse(data) : null;
      } catch (e) {
        return null;
      }
    },
    logout() {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
  }
};

export default dbService;
