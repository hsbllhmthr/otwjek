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

import { VERIFIED_DRIVERS } from '../data/drivers.js';
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

// Kredensial admin default dibaca dari .env.local (tidak di-commit)
const ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL || '').trim().toLowerCase();
const ADMIN_PASSWORD = (import.meta.env.VITE_ADMIN_PASSWORD || '').trim();

// Helper generator UUID v4 sederhana
export function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getStoredArray(key, defaultData = []) {
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

// Inisialisasi awal database lokal jika belum ada
export function initializeLocalDatabase() {
  const existingDrivers = getStoredArray(STORAGE_KEYS.DRIVERS, []);
  if (existingDrivers.length === 0) {
    // Pastikan data awal memiliki status approved
    const initialized = VERIFIED_DRIVERS.map((d) => ({
      ...d,
      verification_status: d.verification_status || 'approved'
    }));
    setStoredArray(STORAGE_KEYS.DRIVERS, initialized);
  }

  // Buat akun admin default jika belum ada di tabel users
  const existingUsers = getStoredArray(STORAGE_KEYS.USERS, []);
  const adminExists = existingUsers.some(
    (u) => u.role === 'admin' || (ADMIN_EMAIL && u.email === ADMIN_EMAIL)
  );

  if (!adminExists && ADMIN_EMAIL && ADMIN_PASSWORD) {
    existingUsers.push({
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

  // Buat data pelanggan contoh awal jika belum ada data pelanggan
  const hasCustomers = existingUsers.some((u) => u.role === 'customer' || !u.role);
  if (!hasCustomers) {
    const sampleCustomers = [
      {
        id: 'cust-001',
        full_name: 'Siti Rahmawati',
        email: 'siti.rahmawati@gmail.com',
        phone: '+6281234567890',
        gender: 'Perempuan',
        birth_date: '1998-05-14',
        role: 'customer',
        status: 'active',
        created_at: '2026-09-10T08:30:00.000Z'
      },
      {
        id: 'cust-002',
        full_name: 'Dian Permata Sari',
        email: 'dian.permata@gmail.com',
        phone: '+6285712348901',
        gender: 'Perempuan',
        birth_date: '2001-11-22',
        role: 'customer',
        status: 'active',
        created_at: '2026-09-18T10:15:00.000Z'
      },
      {
        id: 'cust-003',
        full_name: 'Aisyah Putri Azzahra',
        email: 'aisyah.azzahra@yahoo.com',
        phone: '+6289698765432',
        gender: 'Perempuan',
        birth_date: '1999-03-08',
        role: 'customer',
        status: 'active',
        created_at: '2026-09-28T14:40:00.000Z'
      },
      {
        id: 'cust-004',
        full_name: 'Nurlaila Hanum',
        email: 'laila.hanum@gmail.com',
        phone: '+6282133445566',
        gender: 'Perempuan',
        birth_date: '1997-07-19',
        role: 'customer',
        status: 'suspended',
        created_at: '2026-10-02T16:20:00.000Z'
      }
    ];
    existingUsers.push(...sampleCustomers);
  }

  setStoredArray(STORAGE_KEYS.USERS, existingUsers);
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
      const cleanPhone = phone.replace(/^\+?62|^0/, '');
      const users = getStoredArray(STORAGE_KEYS.USERS, []);
      return users.find((u) => {
        const uClean = (u.phone || '').replace(/^\+?62|^0/, '');
        return uClean === cleanPhone;
      });
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
      const newUser = {
        id: generateUUID(),
        full_name: userData.fullName || userData.full_name || '',
        email: userData.email || '',
        phone: userData.phone?.startsWith('+62')
          ? userData.phone
          : `+62${(userData.phone || '').replace(/^0/, '')}`,
        password: userData.password || '',
        password_hash: userData.password ? `hashed_${userData.password}` : 'mock_hash',
        gender: 'Perempuan',
        birth_date: userData.birthDate || userData.birth_date || null,
        avatar_url: userData.avatarUrl || userData.avatar_url || null,
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

      const updated = {
        ...users[index],
        ...updates,
        updated_at: new Date().toISOString()
      };
      users[index] = updated;
      setStoredArray(STORAGE_KEYS.USERS, users);

      // Sinkronisasi dengan sesi aktif jika user yang diubah adalah currentUser
      const currentUser = dbService.session.getCurrentUser();
      if (currentUser && currentUser.id === id) {
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
      return getStoredArray(STORAGE_KEYS.DRIVERS, VERIFIED_DRIVERS);
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
          role: 'driver',
          full_name: userData.fullName || userData.full_name || user.full_name,
          email: userData.email || user.email,
          avatar_url: userData.avatarUrl || userData.avatar_url || user.avatar_url,
          birth_date: userData.birthDate || userData.birth_date || user.birth_date
        });
      }

      // 2. Buat profil driver baru
      const drivers = getStoredArray(STORAGE_KEYS.DRIVERS, VERIFIED_DRIVERS);
      const newDriver = {
        id: generateUUID(),
        user_id: user.id,
        name: user.full_name,
        phone: user.phone,
        avatar: user.avatar_url || null,
        
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
        emergencyContactPhone: vehicleData.emergencyContactPhone || '',

        // Status Verifikasi & Operasional
        rating: 5.0,
        tripsCount: 0,
        status: 'Menunggu Verifikasi',
        verification_status: 'pending',
        rejection_reason: null,
        is_online: false,
        badge: 'Calon Mitra 🌸',
        bio: vehicleData.bio || 'Mitra Pengemudi Amanah OTWJek Khusus Perempuan.',
        created_at: new Date().toISOString()
      };

      drivers.push(newDriver);
      setStoredArray(STORAGE_KEYS.DRIVERS, drivers);

      // 3. Simpan berkas dokumen (KTP, SIM, STNK)
      if (documents && Object.keys(documents).length > 0) {
        const storedDocs = getStoredArray(STORAGE_KEYS.DRIVER_DOCS, []);
        ['ktp', 'sim', 'stnk'].forEach((docType) => {
          if (documents[docType]) {
            const docObj = documents[docType];
            storedDocs.push({
              id: generateUUID(),
              driver_id: newDriver.id,
              document_type: docType,
              document_url: docObj.url || docObj,
              file_name: docObj.name || `${docType}_document.jpg`,
              verification_status: 'pending',
              created_at: new Date().toISOString()
            });
          }
        });
        setStoredArray(STORAGE_KEYS.DRIVER_DOCS, storedDocs);
      }

      user.documents = documents || {};
      return { user, driver: newDriver };
    },

    /**
     * Memperbarui Data Driver (Kendaraan, Identitas, dll)
     */
    updateDriver(driverId, updateData) {
      const drivers = this.getAll();
      const idx = drivers.findIndex((d) => d.id === driverId);
      if (idx === -1) return null;

      drivers[idx] = {
        ...drivers[idx],
        ...updateData
      };
      setStoredArray(STORAGE_KEYS.DRIVERS, drivers);

      // Sinkronisasi session lokal
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
        ((ADMIN_EMAIL && cleanIdent === ADMIN_EMAIL) || cleanIdent === '0882021942470' || cleanIdent === '62882021942470')
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
