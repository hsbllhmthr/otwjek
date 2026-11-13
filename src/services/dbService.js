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
  CUSTOMER_USER: 'otwjek_db_customer_session',
  DRIVER_USER: 'otwjek_db_driver_session',
  ADMIN_SESSION: 'otwjek_db_admin_session'
};

/**
 * Deteksi konteks portal aktif berdasarkan URL saat ini: 'driver' | 'admin' | 'customer'
 */
export function detectPortal() {
  if (typeof window === 'undefined') return 'customer';
  const p = window.location.pathname.toLowerCase();
  const h = window.location.hash.toLowerCase();
  if (p === '/driver' || p.startsWith('/driver/') || h === '#/driver' || h.startsWith('#/driver/')) {
    return 'driver';
  }
  if (p === '/admin' || p.startsWith('/admin/') || h === '#/admin' || h.startsWith('#/admin/')) {
    return 'admin';
  }
  return 'customer';
}

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
      const detail = { key, timestamp: Date.now(), length: array.length };
      window.dispatchEvent(
        new CustomEvent('otwjek_db_change', { detail })
      );
      try {
        if (typeof BroadcastChannel !== 'undefined') {
          const bc = new BroadcastChannel('otwjek_broadcast');
          bc.postMessage(detail);
          bc.close();
        }
      } catch (_) {}
    }
  } catch (err) {
    console.error(`Error writing ${key} to storage:`, err);
  }
}

export const DB_PURGE_VERSION_KEY = 'otwjek_db_purge_all_v4';

/**
 * Membersihkan seluruh database lokal:
 * - Menghapus seluruh data mitra driver
 * - Menghapus seluruh berkas dokumen
 * - Menghapus seluruh pengguna/pelanggan (hanya mempertahankan Super Admin)
 * - Menghapus seluruh riwayat pesanan & pengiriman
 * - Mengosongkan sesi aktif pengguna
 */
export function clearEntireDatabase() {
  if (typeof localStorage === 'undefined') return;

  // 1. Dapatkan atau buat akun superadmin
  const existingUsers = getStoredArray(STORAGE_KEYS.USERS, []);
  const superAdmin = existingUsers.find(
    (u) => u.role === 'admin' || u.id === 'admin-master-01' || (ADMIN_EMAIL && u.email === ADMIN_EMAIL)
  ) || {
    id: 'admin-master-01',
    full_name: 'Admin Verifikasi OTWJek',
    email: ADMIN_EMAIL,
    phone: '+62882021942470',
    gender: 'Perempuan',
    role: 'admin',
    status: 'active',
    created_at: new Date().toISOString()
  };

  // 2. Simpan hanya akun superadmin ke tabel USERS
  setStoredArray(STORAGE_KEYS.USERS, [superAdmin]);

  // 3. Kosongkan tabel DRIVERS
  setStoredArray(STORAGE_KEYS.DRIVERS, []);

  // 4. Kosongkan tabel DRIVER_DOCS
  setStoredArray(STORAGE_KEYS.DRIVER_DOCS, []);

  // 5. Kosongkan tabel BOOKINGS & DELIVERIES
  setStoredArray(STORAGE_KEYS.BOOKINGS, []);
  setStoredArray(STORAGE_KEYS.DELIVERIES, []);

  // 6. Bersihkan sesi user jika bukan admin
  try {
    const sessionStr = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (sessionStr) {
      const sess = JSON.parse(sessionStr);
      if (sess && sess.role !== 'admin') {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      }
    }
    localStorage.removeItem(STORAGE_KEYS.CUSTOMER_USER);
    localStorage.removeItem(STORAGE_KEYS.DRIVER_USER);
  } catch (_) {}

  // 7. Tandai versi purge
  try {
    localStorage.setItem(DB_PURGE_VERSION_KEY, 'done');
  } catch (_) {}

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('otwjek_db_change', {
        detail: { key: 'all', timestamp: Date.now() }
      })
    );
  }
}

// Inisialisasi awal database lokal & pembersihan data dummy bawaan
export function initializeLocalDatabase() {
  if (typeof localStorage === 'undefined') return;

  // Eksekusi pembersihan menyeluruh jika purge versi saat ini belum berjalan
  const isPurged = localStorage.getItem(DB_PURGE_VERSION_KEY);
  if (isPurged !== 'done') {
    clearEntireDatabase();
    return;
  }

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
  }).map((u) => {
    if (typeof u.avatar_url === 'string' && u.avatar_url.includes('unsplash.com')) {
      return { ...u, avatar_url: null, avatarUrl: null };
    }
    return u;
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
  // dan pastikan driver tanpa unggahan foto riil tidak menggunakan foto dummy/unsplash
  const existingDrivers = getStoredArray(STORAGE_KEYS.DRIVERS, []);
  const realDrivers = existingDrivers
    .filter((d) => {
      if (!d) return false;
      if (typeof d.id === 'string' && d.id.startsWith('drv-')) {
        return false;
      }
      return true;
    })
    .map((d) => {
      if (typeof d.avatar === 'string' && d.avatar.includes('unsplash.com')) {
        return { ...d, avatar: null };
      }
      return d;
    });
  setStoredArray(STORAGE_KEYS.DRIVERS, realDrivers);

  // Bersihkan sesi aktif dari avatar dummy unsplash jika ada
  try {
    const sessionStr = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (sessionStr) {
      const sess = JSON.parse(sessionStr);
      let changed = false;
      if (sess?.avatar_url && sess.avatar_url.includes('unsplash.com')) {
        sess.avatar_url = null;
        sess.avatarUrl = null;
        changed = true;
      }
      if (sess?.driver?.avatar && sess.driver.avatar.includes('unsplash.com')) {
        sess.driver.avatar = null;
        changed = true;
      }
      if (changed) {
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(sess));
      }
    }
  } catch (_) {}

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

  // 4. Bersihkan tabel BOOKINGS dari dummy seed bawaan (book-seed- atau ord-ref-)
  const existingBookings = getStoredArray(STORAGE_KEYS.BOOKINGS, []);
  const realBookings = existingBookings.filter((b) => {
    if (!b) return false;
    if (typeof b.id === 'string' && (b.id.startsWith('book-seed-') || b.id.startsWith('ord-ref-'))) {
      return false;
    }
    return true;
  });
  setStoredArray(STORAGE_KEYS.BOOKINGS, realBookings);
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

    let bc = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        bc = new BroadcastChannel('otwjek_broadcast');
        bc.onmessage = (event) => {
          callback(event.data || {});
        };
      }
    } catch (_) {}

    return () => {
      window.removeEventListener('otwjek_db_change', handleEvent);
      window.removeEventListener('storage', handleEvent);
      if (bc) {
        try {
          bc.close();
        } catch (_) {}
      }
    };
  },

  notifyChange(key = 'all') {
    if (typeof window !== 'undefined') {
      const detail = { key, timestamp: Date.now() };
      window.dispatchEvent(
        new CustomEvent('otwjek_db_change', { detail })
      );
      try {
        if (typeof BroadcastChannel !== 'undefined') {
          const bc = new BroadcastChannel('otwjek_broadcast');
          bc.postMessage(detail);
          bc.close();
        }
      } catch (_) {}
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
          const incomingAvatar = userData.avatarUrl || userData.avatar_url || null;
          const updated = {
            ...users[existingIdx],
            ...userData,
            phone: standardPhone || users[existingIdx].phone,
            full_name: rawName,
            fullName: rawName,
            birth_date: userData.birthDate || userData.birth_date || users[existingIdx].birth_date || users[existingIdx].birthDate || null,
            birthDate: userData.birthDate || userData.birth_date || users[existingIdx].birthDate || users[existingIdx].birthDate || null,
            avatar_url: incomingAvatar,
            avatarUrl: incomingAvatar,
            role: userData.role || users[existingIdx].role || 'customer',
            updated_at: new Date().toISOString()
          };
          users[existingIdx] = updated;
          setStoredArray(STORAGE_KEYS.USERS, users);
          dbService.notifyChange('users');
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
      dbService.notifyChange('users');
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
      dbService.notifyChange('users');

      // Sinkronisasi dengan sesi aktif jika user yang diubah adalah sesi yang sedang tersimpan
      const custUser = dbService.session.getCustomerUser();
      if (custUser && (custUser.id === id || normalizePhone(custUser.phone) === normalizePhone(updated.phone))) {
        dbService.session.setCustomerUser({ ...custUser, ...updated });
      }
      const drvUser = dbService.session.getDriverUser();
      if (drvUser && (drvUser.id === id || normalizePhone(drvUser.phone) === normalizePhone(updated.phone))) {
        dbService.session.setDriverUser({ ...drvUser, ...updated });
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
      dbService.notifyChange('users');
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
      return drivers.filter((d) => d.verification_status === 'approved');
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
      const incomingAvatar = userData.avatarUrl || userData.avatar_url || null;
      // 1. Buat data user akun driver jika belum ada
      let user = dbService.users.findByPhone(userData.phone);
      if (!user) {
        user = dbService.users.create({
          ...userData,
          avatarUrl: incomingAvatar,
          avatar_url: incomingAvatar,
          role: 'driver'
        });
      } else {
        user = dbService.users.update(user.id, {
          ...userData,
          role: 'driver',
          full_name: userData.fullName || userData.full_name || user.full_name,
          fullName: userData.fullName || userData.full_name || user.fullName,
          email: userData.email || user.email,
          avatar_url: incomingAvatar,
          avatarUrl: incomingAvatar,
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
        avatar: incomingAvatar,
        
        // Data Kendaraan Mandiri
        vehicleType: vehicleData.vehicleType || 'motor', // 'motor' | 'mobil' | 'both'
        activeVehicleType: vehicleData.activeVehicleType || (vehicleData.vehicleType === 'mobil' ? 'mobil' : 'motor'),
        vehicleBrand: vehicleData.vehicleBrand || '',
        vehicleModel: vehicleData.vehicleModel || `${vehicleData.vehicleBrand || ''} ${vehicleData.vehicleModelName || ''}`.trim(),
        vehicleColor: vehicleData.vehicleColor || '',
        plateNumber: (vehicleData.plateNumber || '').toUpperCase().trim(),
        operationalArea: vehicleData.operationalArea || 'Makassar dan sekitarnya',
        motorData: vehicleData.motorData || null,
        carData: vehicleData.carData || null,

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

        // Status Verifikasi & Operasional: Setiap pendaftaran baru/permohonan ulang wajib diverifikasi admin
        rating: existingIdx !== -1 ? (drivers[existingIdx].rating || 5.0) : 5.0,
        tripsCount: existingIdx !== -1 ? (drivers[existingIdx].tripsCount || 0) : 0,
        status: 'Menunggu Verifikasi',
        verification_status: 'pending',
        rejection_reason: null,
        is_online: false,
        badge: 'Calon Mitra 🌸',
        bio: vehicleData.bio || 'Mitra Pengemudi Amanah OTWJek Khusus Perempuan.'
      };

      let activeDriver;
      if (existingIdx !== -1) {
        activeDriver = {
          ...drivers[existingIdx],
          ...driverPayload,
          avatar: incomingAvatar,
          updated_at: new Date().toISOString()
        };
        drivers[existingIdx] = activeDriver;
      } else {
        activeDriver = {
          id: generateUUID(),
          ...driverPayload,
          avatar: incomingAvatar,
          created_at: new Date().toISOString()
        };
        drivers.push(activeDriver);
      }

      setStoredArray(STORAGE_KEYS.DRIVERS, drivers);

      // 3. Simpan berkas dokumen (KTP, SIM C, SIM A, STNK Motor, STNK Mobil)
      if (documents && Object.keys(documents).length > 0) {
        const storedDocs = getStoredArray(STORAGE_KEYS.DRIVER_DOCS, []);
        ['ktp', 'sim', 'simA', 'stnk', 'stnkCar'].forEach((docType) => {
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
      dbService.notifyChange('drivers');
      return { user, driver: activeDriver };
    },

    /**
     * Memperbarui / Melengkapi Data Driver oleh Admin atau Sistem
     * Dapat mengupdate identitas, kendaraan, legalitas, dokumen foto, dan status verifikasi.
     */
    updateDriver(driverId, updateData = {}, documents = {}, reviewerName = 'Admin OTWJek') {
      const drivers = this.getAll();
      const targetPhone = normalizePhone(driverId);
      const idx = drivers.findIndex((d) => {
        if (!d) return false;
        if (d.id === driverId || d.user_id === driverId) return true;
        if (targetPhone && normalizePhone(d.phone) === targetPhone) return true;
        if (typeof driverId === 'string' && d.name && d.name.toLowerCase().trim() === driverId.toLowerCase().trim()) return true;
        return false;
      });
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
          is_online: false,
          status: updateData.status || 'Verifikasi Ditolak',
          rejection_reason: updateData.rejection_reason || 'Dokumen belum lengkap atau tidak sesuai.',
          reviewed_by: reviewerName,
          reviewed_at: new Date().toISOString()
        };
      } else if (updateData.verification_status === 'pending') {
        extraStatusFields = {
          verification_status: 'pending',
          is_online: false,
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

      // Sinkronisasi dokumen (KTP, SIM C, SIM A, STNK Motor, STNK Mobil) jika diunggah atau diupdate
      if (documents && Object.keys(documents).length > 0) {
        const storedDocs = getStoredArray(STORAGE_KEYS.DRIVER_DOCS, []);
        ['ktp', 'sim', 'simA', 'stnk', 'stnkCar'].forEach((docType) => {
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
      const sessionUser = dbService.session.getDriverUser();
      if (sessionUser && (sessionUser.id === drivers[idx].user_id || sessionUser.driver?.id === driverId)) {
        sessionUser.driver = drivers[idx];
        sessionUser.vehicleData = {
          ...(sessionUser.vehicleData || {}),
          ...updateData
        };
        dbService.session.setDriverUser(sessionUser);
      }

      dbService.notifyChange('drivers');
      return drivers[idx];
    },

    /**
     * Mengganti Armada Aktif Driver (Motor <-> Mobil)
     * Digunakan ketika driver mendaftarkan kedua kendaraan (both)
     */
    switchActiveVehicle(driverId, targetType = 'motor') {
      const drivers = this.getAll();
      const targetPhone = normalizePhone(driverId);
      const idx = drivers.findIndex((d) => {
        if (!d) return false;
        if (d.id === driverId || d.user_id === driverId) return true;
        if (targetPhone && normalizePhone(d.phone) === targetPhone) return true;
        if (typeof driverId === 'string' && d.name && d.name.toLowerCase().trim() === driverId.toLowerCase().trim()) return true;
        return false;
      });
      if (idx === -1) return null;
      const driver = { ...drivers[idx] };
      const newActive = targetType === 'mobil' ? 'mobil' : 'motor';
      driver.activeVehicleType = newActive;

      // Jika berpindah armada, pastikan vehicleType diset 'both' jika belum
      if (driver.vehicleType !== 'both') {
        driver.vehicleType = 'both';
      }

      // Update vehicleModel, vehicleColor, plateNumber agar sinkron dengan armada aktif
      if (newActive === 'mobil') {
        if (driver.carData) {
          if (driver.carData.model) driver.vehicleModel = driver.carData.model;
          if (driver.carData.color) driver.vehicleColor = driver.carData.color;
          if (driver.carData.plateNumber) driver.plateNumber = driver.carData.plateNumber;
        }
      } else if (newActive === 'motor') {
        if (driver.motorData) {
          if (driver.motorData.model) driver.vehicleModel = driver.motorData.model;
          if (driver.motorData.color) driver.vehicleColor = driver.motorData.color;
          if (driver.motorData.plateNumber) driver.plateNumber = driver.motorData.plateNumber;
        }
      }

      driver.updated_at = new Date().toISOString();
      drivers[idx] = driver;
      setStoredArray(STORAGE_KEYS.DRIVERS, drivers);

      // Sinkronkan sesi aktif jika driver tersebut sedang login
      const currentSession = dbService.session.getDriverUser();
      const sessionPhone = currentSession ? normalizePhone(currentSession.phone) : null;
      if (
        currentSession &&
        (currentSession.driver?.id === driver.id ||
          currentSession.id === driver.user_id ||
          (targetPhone && sessionPhone === targetPhone) ||
          (driver.phone && sessionPhone === normalizePhone(driver.phone)))
      ) {
        currentSession.driver = driver;
        if (!currentSession.vehicleData) currentSession.vehicleData = {};
        currentSession.vehicleData.activeVehicleType = newActive;
        currentSession.vehicleData.vehicleType = driver.vehicleType;
        if (newActive === 'mobil' && driver.carData) {
          if (driver.carData.model) currentSession.vehicleData.vehicleModel = driver.carData.model;
          if (driver.carData.color) currentSession.vehicleData.vehicleColor = driver.carData.color;
          if (driver.carData.plateNumber) currentSession.vehicleData.plateNumber = driver.carData.plateNumber;
        } else if (newActive === 'motor' && driver.motorData) {
          if (driver.motorData.model) currentSession.vehicleData.vehicleModel = driver.motorData.model;
          if (driver.motorData.color) currentSession.vehicleData.vehicleColor = driver.motorData.color;
          if (driver.motorData.plateNumber) currentSession.vehicleData.plateNumber = driver.motorData.plateNumber;
        }
        dbService.session.setDriverUser(currentSession);
      }

      dbService.notifyChange('drivers');
      return driver;
    },

    /**
     * Admin Menyetujui Driver (Approve)
     */
    approveDriver(driverId, reviewerName = 'Admin OTWJek') {
      const drivers = this.getAll();
      const idx = drivers.findIndex((d) => d.id === driverId);
      if (idx === -1) return null;

      const nextOnline = drivers[idx].is_online !== undefined ? Boolean(drivers[idx].is_online) : true;
      drivers[idx] = {
        ...drivers[idx],
        verification_status: 'approved',
        is_online: nextOnline,
        status: nextOnline ? 'Siap Terima Order' : 'Istirahat (Offline)',
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
      const sessionUser = dbService.session.getDriverUser();
      if (sessionUser && (sessionUser.id === drivers[idx].user_id || sessionUser.driver?.id === drivers[idx].id)) {
        sessionUser.driver = drivers[idx];
        dbService.session.setDriverUser(sessionUser);
      }

      dbService.notifyChange('drivers');
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
        is_online: false,
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
      const sessionUser = dbService.session.getDriverUser();
      if (sessionUser && (sessionUser.id === drivers[idx].user_id || sessionUser.driver?.id === drivers[idx].id)) {
        sessionUser.driver = drivers[idx];
        dbService.session.setDriverUser(sessionUser);
      }

      dbService.notifyChange('drivers');
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
        is_online: false,
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
      dbService.notifyChange('drivers');

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
      dbService.notifyChange('drivers');
      return drivers[idx];
    },

    /**
     * Mengubah Status Operasional Online / Offline (Siap Terima Order vs Istirahat)
     * Langsung tersinkronisasi ke Admin Dashboard dan Session Driver
     */
    setOnlineStatus(driverId, isOnline) {
      const drivers = this.getAll();
      const idx = drivers.findIndex((d) => d.id === driverId);
      if (idx === -1) return null;

      const isApproved = drivers[idx].verification_status === 'approved';
      // Driver yang belum disetujui admin tidak dapat mengaktifkan status siap terima order
      const nextOnline = isApproved ? Boolean(isOnline) : false;
      const nextStatusLabel = isApproved
        ? nextOnline
          ? 'Siap Terima Order'
          : 'Istirahat (Offline)'
        : drivers[idx].status || 'Menunggu Verifikasi';

      drivers[idx] = {
        ...drivers[idx],
        is_online: nextOnline,
        status: nextStatusLabel,
        online_updated_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      setStoredArray(STORAGE_KEYS.DRIVERS, drivers);

      // Sinkronisasi session lokal jika sedang login sebagai driver tersebut
      const sessionUser = dbService.session.getDriverUser();
      const isMatchingPhone =
        sessionUser?.phone &&
        drivers[idx].phone &&
        normalizePhone(sessionUser.phone) === normalizePhone(drivers[idx].phone);
      if (
        sessionUser &&
        (sessionUser.id === drivers[idx].user_id || sessionUser.driver?.id === driverId || isMatchingPhone)
      ) {
        sessionUser.driver = drivers[idx];
        dbService.session.setDriverUser(sessionUser);
      }

      dbService.notifyChange('drivers');
      return drivers[idx];
    },

    getDocuments(driverId) {
      const storedDocs = getStoredArray(STORAGE_KEYS.DRIVER_DOCS, []);
      return storedDocs.filter((d) => d.driver_id === driverId);
    },

    delete(driverId) {
      let drivers = getStoredArray(STORAGE_KEYS.DRIVERS, []);
      const targetDriver = drivers.find((d) => d.id === driverId);
      drivers = drivers.filter((d) => d.id !== driverId);
      setStoredArray(STORAGE_KEYS.DRIVERS, drivers);

      // Hapus berkas dokumen driver
      let storedDocs = getStoredArray(STORAGE_KEYS.DRIVER_DOCS, []);
      storedDocs = storedDocs.filter((d) => d.driver_id !== driverId);
      setStoredArray(STORAGE_KEYS.DRIVER_DOCS, storedDocs);

      // Hapus user terkait jika ada
      if (targetDriver && targetDriver.user_id) {
        let users = getStoredArray(STORAGE_KEYS.USERS, []);
        users = users.filter((u) => u.id !== targetDriver.user_id);
        setStoredArray(STORAGE_KEYS.USERS, users);
      }

      dbService.notifyChange('all');
      return true;
    },

    deleteAll() {
      setStoredArray(STORAGE_KEYS.DRIVERS, []);
      setStoredArray(STORAGE_KEYS.DRIVER_DOCS, []);
      let users = getStoredArray(STORAGE_KEYS.USERS, []);
      users = users.filter((u) => u.role === 'admin' || u.id === 'admin-master-01');
      setStoredArray(STORAGE_KEYS.USERS, users);
      dbService.notifyChange('all');
      return true;
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
  // 4. PEMESANAN PERJALANAN & PAKET (BOOKINGS)
  // ==========================================
  bookings: {
    create(rideData) {
      const bookings = getStoredArray(STORAGE_KEYS.BOOKINGS, []);
      const now = new Date();
      const codeSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      const orderCode = `#${codeSuffix}`;
      const randomOrderNum = '3301447' + Date.now().toString().slice(-12);
      
      const sType = rideData.serviceType === 'car' || rideData.serviceType === 'mobil'
        ? 'mobil'
        : (rideData.serviceType === 'send' || rideData.serviceType === 'paket' || rideData.serviceType === 'package' || rideData.serviceType === 'food'
          ? 'paket'
          : 'motor');
      const sName = sType === 'mobil' ? 'Mobil' : (sType === 'paket' ? 'Paket' : 'Motor');
      
      const fare = Number(rideData.fareAmount || rideData.fare || 15000);
      const deliveryFee = Math.round((fare * 0.85) / 100) * 100;
      const isCash = (rideData.paymentMethod || 'cash').toLowerCase() === 'cash';

      // Hitung timeline perjalanan realistis berdasarkan durasi
      const duration = Number(rideData.durationMinutes || 15);
      const completionTime = now;
      const pickupTime = new Date(completionTime.getTime() - Math.round(duration * 0.4 * 60000));
      const arrivalTime = new Date(completionTime.getTime() - Math.round(duration * 0.6 * 60000));
      const receivedTime = new Date(completionTime.getTime() - Math.round(duration * 60000));

      const formatTime = (d) =>
        d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':');

      const sessionUser = rideData.user || dbService.session.getCurrentUser();
      const resolvedCustomerId = rideData.customerId || sessionUser?.id || null;
      const resolvedCustomerPhone = rideData.customerPhone || sessionUser?.phone || null;
      const resolvedCustomerName =
        rideData.customerName ||
        sessionUser?.fullName ||
        sessionUser?.full_name ||
        sessionUser?.name ||
        'Pelanggan OTWJek';

      const defaultDriver = sType === 'mobil'
        ? {
            id: 'drv-calya-01',
            name: 'Nurul Hidayah',
            rating: 4.9,
            tripsCount: '1.420+ perjalanan',
            vehicleType: 'mobil',
            vehicleModel: 'Toyota Calya (Silver)',
            plateNumber: 'DD 1289 AZ',
            phone: '085255655084'
          }
        : {
            id: 'drv-vario-01',
            name: 'Siti Rahmawati',
            rating: 4.9,
            tripsCount: '2.150+ perjalanan',
            vehicleType: 'motor',
            vehicleModel: 'Honda Vario 160 (Hitam)',
            plateNumber: 'DD 4521 XY',
            phone: '085255655084'
          };

      const existingIdx = rideData.id ? bookings.findIndex((b) => b.id === rideData.id) : -1;
      const existingBooking = existingIdx !== -1 ? bookings[existingIdx] : null;

      const hasExplicitDriver = Boolean(
        rideData.driver?.id ||
        rideData.driverId ||
        existingBooking?.assignment_status === 'assigned'
      );

      const sourceDriver = rideData.driver || (existingBooking?.assignment_status === 'assigned' ? existingBooking.driver : null);

      const assignedDriver = sourceDriver
        ? {
            id: sourceDriver.id || rideData.driverId || defaultDriver.id,
            user_id: sourceDriver.user_id || existingBooking?.driver_user_id || null,
            name: sourceDriver.name || rideData.driverName || defaultDriver.name,
            rating: sourceDriver.rating || rideData.driverRating || defaultDriver.rating,
            tripsCount: sourceDriver.tripsCount
              ? typeof sourceDriver.tripsCount === 'number'
                ? `${sourceDriver.tripsCount}+ perjalanan`
                : sourceDriver.tripsCount
              : defaultDriver.tripsCount,
            vehicleType: sourceDriver.vehicleType || rideData.vehicleType || defaultDriver.vehicleType,
            vehicleModel:
              sourceDriver.vehicleModel ||
              `${sourceDriver.vehicleBrand || ''} ${sourceDriver.vehicleColor ? `(${sourceDriver.vehicleColor})` : ''}`.trim() ||
              defaultDriver.vehicleModel,
            plateNumber: sourceDriver.plateNumber || rideData.plateNumber || defaultDriver.plateNumber,
            phone: sourceDriver.phone || rideData.driverPhone || defaultDriver.phone,
            avatar: sourceDriver.avatar || null
          }
        : {
            id: rideData.driverId || defaultDriver.id,
            user_id: null,
            name: rideData.driverName || defaultDriver.name,
            rating: rideData.driverRating || defaultDriver.rating,
            tripsCount: rideData.driverTrips || defaultDriver.tripsCount,
            vehicleType: rideData.vehicleType || defaultDriver.vehicleType,
            vehicleModel: rideData.vehicleModel || defaultDriver.vehicleModel,
            plateNumber: rideData.plateNumber || defaultDriver.plateNumber,
            phone: rideData.driverPhone || defaultDriver.phone,
            avatar: null
          };

      const resolvedPickupName = rideData.pickup?.name || rideData.pickupName || 'Titik Penjemputan';
      const resolvedPickupAddress = rideData.pickup?.address || rideData.pickupAddress || resolvedPickupName;
      const resolvedDropoffName = rideData.dropoff?.name || rideData.dropoffName || (sType === 'mobil' ? 'Bandara Internasional Sultan Hasanuddin' : sType === 'paket' ? 'Ruko Pettarani Indah No. 14' : 'Mall Panakkukang (MP)');
      const resolvedDropoffAddress = rideData.dropoff?.address || rideData.dropoffAddress || (sType === 'mobil' ? 'Mandai, Maros, Makassar' : sType === 'paket' ? 'Jl. AP Pettarani Blok C2, Makassar' : 'Jl. Pengayoman, Panakkukang, Makassar');

      const newBooking = {
        id: existingBooking?.id || rideData.id || generateUUID(),
        booking_code: existingBooking?.booking_code || `RIDE-${codeSuffix}`,
        order_code: existingBooking?.order_code || orderCode,
        order_number: existingBooking?.order_number || randomOrderNum,
        customer_id: resolvedCustomerId,
        customer_phone: resolvedCustomerPhone,
        customer_name: resolvedCustomerName,
        driver_id: assignedDriver.id,
        driver_user_id: assignedDriver.user_id || existingBooking?.driver_user_id || null,
        driver_name: assignedDriver.name,
        driver_phone: assignedDriver.phone,
        driver_vehicle: assignedDriver.vehicleModel,
        driver_plate: assignedDriver.plateNumber,
        driver_rating: assignedDriver.rating,
        driver: assignedDriver,
        assignment_status: hasExplicitDriver ? 'assigned' : 'unassigned',
        assigned_by: existingBooking?.assigned_by || (hasExplicitDriver ? 'Pilihan Pelanggan' : null),
        assigned_at: existingBooking?.assigned_at || (hasExplicitDriver ? now.toISOString() : null),
        service_type: sType,
        service_name: sName,
        pickup_name: resolvedPickupName,
        pickup_address: resolvedPickupAddress,
        dropoff_name: resolvedDropoffName,
        dropoff_address: resolvedDropoffAddress,
        distance_km: rideData.distanceKm || 3.2,
        duration_minutes: duration,
        fare_amount: fare,
        delivery_fee: deliveryFee,
        total_earnings: deliveryFee,
        payment_method: isCash ? 'cash' : 'qris',
        cash_collected: isCash ? -fare : 0,
        adjustment: isCash ? -fare : 0,
        discount: rideData.discount || 0,
        customer_notes: rideData.customerNotes || existingBooking?.customer_notes || '',
        package_info: rideData.packageInfo || existingBooking?.package_info || null,
        incentives: [
          { name: 'Bonus Harian - Makassar', points: 100 },
          { name: 'MISI SIGAP', points: 100 }
        ],
        timeline: existingBooking?.timeline || {
          received: formatTime(receivedTime),
          arrived: formatTime(arrivalTime),
          pickedUp: formatTime(pickupTime),
          completed: formatTime(completionTime)
        },
        booking_status: rideData.bookingStatus || existingBooking?.booking_status || 'completed',
        is_read: rideData.isRead !== undefined ? Boolean(rideData.isRead) : (existingBooking?.is_read ?? false),
        is_read_driver: rideData.isReadDriver !== undefined ? Boolean(rideData.isReadDriver) : (existingBooking?.is_read_driver ?? false),
        created_at: existingBooking?.created_at || now.toISOString()
      };

      if (existingIdx !== -1) {
        bookings[existingIdx] = newBooking;
      } else {
        bookings.unshift(newBooking);
      }
      setStoredArray(STORAGE_KEYS.BOOKINGS, bookings);
      dbService.notifyChange('bookings');
      return newBooking;
    },

    /**
     * Admin Menugaskan Akun Driver pada Pesanan Pelanggan (Order Dispatch)
     * Menolak penugasan apabila driver sedang istirahat (off/tidak aktif) atau belum disetujui.
     */
    assignDriver(bookingId, driver, reviewerName = 'Admin OTWJek') {
      if (!bookingId || !driver) return null;

      // Verifikasi status terbaru driver langsung dari storage agar tidak menerima kondisi stale
      const storedDrivers = getStoredArray(STORAGE_KEYS.DRIVERS, []);
      const liveDriver =
        storedDrivers.find((d) => d && driver.id && d.id === driver.id) || driver;
      const isDriverApproved = liveDriver.verification_status
        ? liveDriver.verification_status === 'approved'
        : true;
      const isDriverOnline =
        typeof liveDriver.is_online === 'boolean' ? liveDriver.is_online : isDriverApproved;

      if (!isDriverApproved || !isDriverOnline) {
        return null;
      }

      const bookings = getStoredArray(STORAGE_KEYS.BOOKINGS, []);
      const idx = bookings.findIndex((b) => b && b.id === bookingId);
      if (idx === -1) return null;

      const existing = bookings[idx];
      const prevDriverId = existing.driver_id;

      const isBoth = driver.vehicleType === 'both';
      const effectiveVehType = isBoth
        ? (driver.activeVehicleType || (existing.service_type === 'mobil' ? 'mobil' : 'motor'))
        : (driver.vehicleType || existing.service_type || 'motor');

      let activePlate = driver.plateNumber || 'DD - MKS';
      let activeModel =
        driver.vehicleModel ||
        `${driver.vehicleBrand || ''} ${driver.vehicleColor ? `(${driver.vehicleColor})` : ''}`.trim() ||
        (effectiveVehType === 'mobil' ? 'Mobil Mitra Resmi' : 'Motor Mitra Resmi');

      if (isBoth) {
        if (effectiveVehType === 'mobil' && driver.carData) {
          if (driver.carData.plateNumber) activePlate = driver.carData.plateNumber;
          if (driver.carData.model) {
            activeModel = `${driver.carData.model} ${driver.carData.color ? `(${driver.carData.color})` : ''}`.trim();
          }
        } else if (effectiveVehType === 'motor' && driver.motorData) {
          if (driver.motorData.plateNumber) activePlate = driver.motorData.plateNumber;
          if (driver.motorData.model) {
            activeModel = `${driver.motorData.model} ${driver.motorData.color ? `(${driver.motorData.color})` : ''}`.trim();
          }
        }
      }

      const assignedDriverObj = {
        id: driver.id,
        user_id: driver.user_id || null,
        name: driver.name || 'Mitra Driver OTWJek',
        rating: Number(driver.rating || 5.0),
        tripsCount: driver.tripsCount
          ? typeof driver.tripsCount === 'number'
            ? `${driver.tripsCount + 1}+ perjalanan`
            : driver.tripsCount
          : 'Mitra Resmi 🌸',
        vehicleType: effectiveVehType,
        vehicleModel: activeModel,
        plateNumber: activePlate,
        phone: driver.phone || '085255655084',
        avatar: driver.avatar || null
      };

      const updatedBooking = {
        ...existing,
        driver_id: assignedDriverObj.id,
        driver_user_id: assignedDriverObj.user_id,
        driver_name: assignedDriverObj.name,
        driver_phone: assignedDriverObj.phone,
        driver_vehicle: assignedDriverObj.vehicleModel,
        driver_plate: assignedDriverObj.plateNumber,
        driver_rating: assignedDriverObj.rating,
        driver: assignedDriverObj,
        assignment_status: 'assigned',
        driver_step: existing.booking_status === 'cancelled' ? 'cancelled' : 'assigned',
        booking_status: existing.booking_status === 'cancelled' ? 'cancelled' : 'in_progress',
        assigned_by: reviewerName,
        assigned_at: new Date().toISOString(),
        timeline: {
          ...(existing.timeline || {}),
          received: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':'),
          arrived: '--:--',
          pickedUp: '--:--',
          completed: '--:--'
        },
        is_read_driver: false,
        is_read: false,
        updated_at: new Date().toISOString()
      };

      bookings[idx] = updatedBooking;
      setStoredArray(STORAGE_KEYS.BOOKINGS, bookings);

      // Tambahkan jumlah perjalanan (tripsCount) pada profil driver jika baru ditugaskan
      if (prevDriverId !== driver.id) {
        const drivers = getStoredArray(STORAGE_KEYS.DRIVERS, []);
        const dIdx = drivers.findIndex((d) => d && d.id === driver.id);
        if (dIdx !== -1) {
          const currentTrips = Number(drivers[dIdx].tripsCount) || 0;
          drivers[dIdx] = {
            ...drivers[dIdx],
            tripsCount: currentTrips + 1,
            updated_at: new Date().toISOString()
          };
          setStoredArray(STORAGE_KEYS.DRIVERS, drivers);
        }
      }

      dbService.notifyChange('bookings');
      return updatedBooking;
    },

    updateBookingStatus(bookingId, status, note = '') {
      if (!bookingId || !status) return null;
      const bookings = getStoredArray(STORAGE_KEYS.BOOKINGS, []);
      const idx = bookings.findIndex((b) => b && b.id === bookingId);
      if (idx === -1) return null;

      const updated = {
        ...bookings[idx],
        booking_status: status,
        driver_step:
          status === 'completed'
            ? 'completed'
            : status === 'cancelled'
            ? 'cancelled'
            : bookings[idx].driver_step,
        status_note: note || bookings[idx].status_note || null,
        updated_at: new Date().toISOString()
      };

      bookings[idx] = updated;
      setStoredArray(STORAGE_KEYS.BOOKINGS, bookings);
      dbService.notifyChange('bookings');
      return updated;
    },

    advanceDriverStep(bookingId, nextStep) {
      if (!bookingId || !nextStep) return null;
      const bookings = getStoredArray(STORAGE_KEYS.BOOKINGS, []);
      const idx = bookings.findIndex((b) => b && b.id === bookingId);
      if (idx === -1) return null;

      const existing = bookings[idx];
      const nowTime = new Date()
        .toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
        .replace('.', ':');
      const prevTimeline = existing.timeline || { received: nowTime };
      let nextTimeline = { ...prevTimeline };

      if (nextStep === 'assigned') {
        nextTimeline = {
          received: prevTimeline.received || nowTime,
          arrived: '--:--',
          pickedUp: '--:--',
          completed: '--:--'
        };
      } else if (nextStep === 'arrived') {
        nextTimeline = {
          ...prevTimeline,
          arrived: nowTime,
          pickedUp: '--:--',
          completed: '--:--'
        };
      } else if (nextStep === 'picked_up') {
        nextTimeline = {
          ...prevTimeline,
          arrived: prevTimeline.arrived && prevTimeline.arrived !== '--:--' ? prevTimeline.arrived : nowTime,
          pickedUp: nowTime,
          completed: '--:--'
        };
      } else if (nextStep === 'completed') {
        nextTimeline = {
          ...prevTimeline,
          arrived: prevTimeline.arrived && prevTimeline.arrived !== '--:--' ? prevTimeline.arrived : nowTime,
          pickedUp: prevTimeline.pickedUp && prevTimeline.pickedUp !== '--:--' ? prevTimeline.pickedUp : nowTime,
          completed: nowTime
        };
      }

      const updated = {
        ...existing,
        driver_step: nextStep,
        booking_status:
          nextStep === 'cancelled'
            ? 'cancelled'
            : nextStep === 'completed'
            ? 'completed'
            : 'in_progress',
        timeline: nextTimeline,
        updated_at: new Date().toISOString()
      };

      bookings[idx] = updated;
      setStoredArray(STORAGE_KEYS.BOOKINGS, bookings);
      dbService.notifyChange('bookings');
      return updated;
    },

    getAllAdmin() {
      const rawBookings = getStoredArray(STORAGE_KEYS.BOOKINGS, []);
      return rawBookings.filter((b) => {
        if (!b) return false;
        if (typeof b.id === 'string' && (b.id.startsWith('book-seed-') || b.id.startsWith('ord-ref-'))) {
          return false;
        }
        return true;
      });
    },

    getAll(accountUser = null) {
      const activeUser = accountUser || dbService.session.getCurrentUser();
      const rawBookings = getStoredArray(STORAGE_KEYS.BOOKINGS, []);
      
      // Hapus data dummy bawaan lama jika tersisa
      const realBookings = rawBookings.filter((b) => {
        if (!b) return false;
        if (typeof b.id === 'string' && (b.id.startsWith('book-seed-') || b.id.startsWith('ord-ref-'))) {
          return false;
        }
        return true;
      });

      // Jika ada akun yang login, sinkronkan pesanan milik akun tersebut (baik sebagai Driver maupun Pelanggan)
      if (activeUser) {
        const uId = activeUser.id;
        const uPhone = activeUser.phone ? normalizePhone(activeUser.phone) : null;
        const uName = (activeUser.fullName || activeUser.full_name || activeUser.name || '').trim().toLowerCase();

        // Jika akun yang sedang aktif adalah Mitra Driver, tampilkan pesanan yang ditugaskan ke driver tersebut
        if (activeUser.role === 'driver') {
          const allDrivers = getStoredArray(STORAGE_KEYS.DRIVERS, []);
          const matchedDriver = allDrivers.find(
            (d) =>
              d &&
              ((uId && (d.user_id === uId || d.id === uId || d.id === activeUser.driver?.id)) ||
                (uPhone && d.phone && normalizePhone(d.phone) === uPhone))
          );
          const dId = matchedDriver?.id || activeUser.driver?.id || null;
          const dPhone = matchedDriver?.phone ? normalizePhone(matchedDriver.phone) : uPhone;
          const dName = (matchedDriver?.name || uName || '').trim().toLowerCase();

          const seenIds = new Set();
          return realBookings.filter((b) => {
            if (b.assignment_status !== 'assigned') return false;
            let isMatch = false;
            if (dId && b.driver_id === dId) isMatch = true;
            else if (uId && (b.driver_user_id === uId || b.driver_id === uId)) isMatch = true;
            else if (dPhone && b.driver_phone && normalizePhone(b.driver_phone) === dPhone) isMatch = true;
            else if (dName && b.driver_name && b.driver_name.trim().toLowerCase() === dName) isMatch = true;
            if (!isMatch) return false;
            if (b.id && seenIds.has(b.id)) return false;
            if (b.id) seenIds.add(b.id);
            return true;
          });
        }

        return realBookings.filter((b) => {
          if (uId && b.customer_id && b.customer_id === uId) return true;
          if (uPhone && b.customer_phone && normalizePhone(b.customer_phone) === uPhone) return true;
          if (uName && b.customer_name && b.customer_name.trim().toLowerCase() === uName && uName !== 'pelanggan otwjek') return true;
          if (b.package_info) {
            const sPhone = b.package_info.senderPhone ? normalizePhone(b.package_info.senderPhone) : null;
            const rPhone = b.package_info.recipientPhone ? normalizePhone(b.package_info.recipientPhone) : null;
            const sName = (b.package_info.senderName || '').trim().toLowerCase();
            if (uPhone && (sPhone === uPhone || rPhone === uPhone)) return true;
            if (uName && sName === uName) return true;
          }
          if (!b.customer_id) return true;
          return false;
        });
      }

      // Jika belum ada akun login (sesi tamu), tampilkan pesanan pada sesi perangkat ini
      return realBookings.filter((b) => !b.customer_id);
    },

    getUnreadCount(accountUser = null) {
      const activeUser = accountUser || dbService.session.getCurrentUser();
      const isDriver = activeUser?.role === 'driver';
      const userBookings = this.getAll(activeUser);
      return userBookings.filter((b) => (isDriver ? !b.is_read_driver : !b.is_read)).length;
    },

    markAllAsRead(accountUser = null) {
      const activeUser = accountUser || dbService.session.getCurrentUser();
      const isDriver = activeUser?.role === 'driver';
      const rawBookings = getStoredArray(STORAGE_KEYS.BOOKINGS, []);
      const userBookings = this.getAll(activeUser);
      if (!userBookings.length) return;

      const userBookingIds = new Set(userBookings.map((b) => b.id));
      let hasChanges = false;

      const updatedBookings = rawBookings.map((b) => {
        if (!b || !userBookingIds.has(b.id)) return b;
        if (isDriver && !b.is_read_driver) {
          hasChanges = true;
          return { ...b, is_read_driver: true };
        }
        if (!isDriver && !b.is_read) {
          hasChanges = true;
          return { ...b, is_read: true };
        }
        return b;
      });

      if (hasChanges) {
        setStoredArray(STORAGE_KEYS.BOOKINGS, updatedBookings);
      }
    },

    getSeedBookings() {
      // Data riwayat pesanan awal dinamis khas Makassar sesuai fitur: Motor, Mobil, dan Paket
      return [
        {
          id: 'book-seed-001',
          booking_code: 'RIDE-8L9A',
          order_code: '#8L9A',
          order_number: '3301447308559872213',
          service_type: 'paket',
          service_name: 'Paket',
          pickup_name: 'Warung Megarasa - Rappocini',
          pickup_address: 'Jl. Rappocini Raya No. 112, Makassar',
          dropoff_name: 'Alamat Pelanggan disembunyikan',
          dropoff_address: 'Jl. AP Pettarani Blok C2, Makassar',
          distance_km: 3.2,
          duration_minutes: 18,
          fare_amount: 15200,
          delivery_fee: 9600,
          total_earnings: 9600,
          payment_method: 'cash',
          cash_collected: -282062,
          adjustment: -282062,
          incentives: [
            { name: 'Bonus Harian - Makassar', points: 100 },
            { name: 'MISI SIGAP', points: 100 }
          ],
          timeline: {
            received: '13:31',
            arrived: '13:45',
            pickedUp: '13:47',
            completed: '14:00'
          },
          booking_status: 'completed',
          created_at: '2026-10-11T13:31:00.000Z'
        },
        {
          id: 'book-seed-002',
          booking_code: 'RIDE-4X2K',
          order_code: '#4X2K',
          order_number: '3301447308559871104',
          service_type: 'motor',
          service_name: 'Motor',
          pickup_name: 'Indo Mode Tamalate',
          pickup_address: 'Jl. Tamalate 1 No. 8, Rappocini',
          dropoff_name: 'Mall Panakkukang (MP)',
          dropoff_address: 'Jl. Boulevard, Panakkukang, Makassar',
          distance_km: 4.8,
          duration_minutes: 20,
          fare_amount: 17000,
          delivery_fee: 14000,
          total_earnings: 14000,
          payment_method: 'cash',
          cash_collected: -17000,
          adjustment: -17000,
          incentives: [
            { name: 'Bonus Harian - Makassar', points: 100 },
            { name: 'MISI SIGAP', points: 100 }
          ],
          timeline: {
            received: '08:05',
            arrived: '08:14',
            pickedUp: '08:16',
            completed: '08:25'
          },
          booking_status: 'completed',
          created_at: '2026-10-11T08:05:00.000Z'
        },
        {
          id: 'book-seed-003',
          booking_code: 'RIDE-9C7B',
          order_code: '#9C7B',
          order_number: '3301447308559868940',
          service_type: 'mobil',
          service_name: 'Mobil',
          pickup_name: 'Mall Ratu Indah (MaRi)',
          pickup_address: 'Jl. DR. Ratulangi No. 35, Mamajang',
          dropoff_name: 'Bandara Sultan Hasanuddin',
          dropoff_address: 'Terminal Keberangkatan Bandara UPG, Maros',
          distance_km: 21.5,
          duration_minutes: 38,
          fare_amount: 58000,
          delivery_fee: 48000,
          total_earnings: 48000,
          payment_method: 'qris',
          cash_collected: 0,
          adjustment: -48000,
          incentives: [
            { name: 'Bonus Harian - Makassar', points: 150 },
            { name: 'MISI SIGAP', points: 100 }
          ],
          timeline: {
            received: '14:05',
            arrived: '14:15',
            pickedUp: '14:18',
            completed: '14:40'
          },
          booking_status: 'completed',
          created_at: '2026-10-10T14:05:00.000Z'
        },
        {
          id: 'book-seed-004',
          booking_code: 'RIDE-2M5R',
          order_code: '#2M5R',
          order_number: '3301447308559850122',
          service_type: 'paket',
          service_name: 'Paket',
          pickup_name: 'Ayam Geprek Juara Samata',
          pickup_address: 'Jl. H.M. Yasin Limpo, Romangpolong',
          dropoff_name: 'Alamat Pelanggan disembunyikan',
          dropoff_address: 'Perumahan Dosen Unhas, Tamalanrea',
          distance_km: 7.1,
          duration_minutes: 24,
          fare_amount: 24500,
          delivery_fee: 0,
          total_earnings: 0,
          payment_method: 'cash',
          cash_collected: 0,
          adjustment: 0,
          incentives: [],
          timeline: {
            received: '16:10',
            arrived: '16:15',
            pickedUp: '-',
            completed: '-'
          },
          booking_status: 'cancelled',
          cancel_reason: 'Dibatalkan oleh Pelanggan',
          created_at: '2026-10-11T16:10:00.000Z'
        }
      ];
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
    clearEntireDatabase();
    return true;
  },

  // Bersihkan seluruh database secara menyeluruh (hapus semua user & driver)
  clearAllData() {
    clearEntireDatabase();
    return true;
  },

  clearEntireDatabase() {
    clearEntireDatabase();
    return true;
  },

  // Sesi Pengguna Biasa / Driver dengan isolasi multi-tab per peran (Customer vs Driver)
  session: {
    getCustomerUser() {
      try {
        const data = localStorage.getItem(STORAGE_KEYS.CUSTOMER_USER);
        if (data) {
          const u = JSON.parse(data);
          if (u && u.role !== 'driver') return u;
          if (u) return { ...u, role: 'customer' };
        }
        // Fallback ke CURRENT_USER hanya jika BUKAN akun driver
        const legacyData = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
        if (legacyData) {
          const legacy = JSON.parse(legacyData);
          if (legacy && legacy.role !== 'driver') {
            return legacy;
          }
        }
        return null;
      } catch (e) {
        return null;
      }
    },

    getDriverUser() {
      try {
        const data = localStorage.getItem(STORAGE_KEYS.DRIVER_USER);
        if (data) {
          const u = JSON.parse(data);
          if (u) return u;
        }
        // Fallback ke CURRENT_USER jika akun driver
        const legacyData = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
        if (legacyData) {
          const legacy = JSON.parse(legacyData);
          if (legacy && legacy.role === 'driver') {
            return legacy;
          }
        }
        return null;
      } catch (e) {
        return null;
      }
    },

    getCurrentUser(portal = null) {
      const resolvedPortal = portal || detectPortal();
      if (resolvedPortal === 'driver') {
        return this.getDriverUser();
      }
      if (resolvedPortal === 'customer') {
        return this.getCustomerUser();
      }
      return this.getCustomerUser() || this.getDriverUser();
    },

    setCustomerUser(user) {
      try {
        if (!user) {
          this.clearCustomerSession();
          return;
        }
        const customerData = { ...user };
        if (customerData.role === 'driver') {
          customerData.role = 'customer';
        }
        localStorage.setItem(STORAGE_KEYS.CUSTOMER_USER, JSON.stringify(customerData));
        if (detectPortal() !== 'driver') {
          localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(customerData));
        }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('otwjek_session_change', {
              detail: { role: 'customer', user: customerData, timestamp: Date.now() }
            })
          );
        }
      } catch (e) {
        console.error(e);
      }
    },

    setDriverUser(user) {
      try {
        if (!user) {
          this.clearDriverSession();
          return;
        }
        const driverData = { ...user, role: 'driver' };
        localStorage.setItem(STORAGE_KEYS.DRIVER_USER, JSON.stringify(driverData));
        if (detectPortal() === 'driver') {
          localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(driverData));
        }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('otwjek_session_change', {
              detail: { role: 'driver', user: driverData, timestamp: Date.now() }
            })
          );
        }
      } catch (e) {
        console.error(e);
      }
    },

    setCurrentUser(user, targetPortal = null) {
      if (!user) {
        this.logout(targetPortal);
        return;
      }
      const isDriverTarget =
        targetPortal === 'driver' ||
        user?.role === 'driver' ||
        (targetPortal !== 'customer' && detectPortal() === 'driver');
      if (isDriverTarget) {
        this.setDriverUser(user);
      } else {
        this.setCustomerUser(user);
      }
    },

    clearCustomerSession() {
      try {
        localStorage.removeItem(STORAGE_KEYS.CUSTOMER_USER);
        const current = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
        if (current) {
          const u = JSON.parse(current);
          if (u?.role !== 'driver') {
            localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
          }
        }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('otwjek_session_change', {
              detail: { role: 'customer', user: null, timestamp: Date.now() }
            })
          );
        }
      } catch (e) {
        console.error(e);
      }
    },

    clearDriverSession() {
      try {
        localStorage.removeItem(STORAGE_KEYS.DRIVER_USER);
        const current = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
        if (current) {
          const u = JSON.parse(current);
          if (u?.role === 'driver') {
            localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
          }
        }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('otwjek_session_change', {
              detail: { role: 'driver', user: null, timestamp: Date.now() }
            })
          );
        }
      } catch (e) {
        console.error(e);
      }
    },

    logout(portal = null) {
      const resolvedPortal = portal || detectPortal();
      if (resolvedPortal === 'driver') {
        this.clearDriverSession();
      } else if (resolvedPortal === 'customer') {
        this.clearCustomerSession();
      } else {
        this.clearCustomerSession();
        this.clearDriverSession();
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('otwjek_session_change', {
              detail: { role: 'all', user: null, timestamp: Date.now() }
            })
          );
        }
      }
    }
  }
};

export default dbService;
