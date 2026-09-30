/**
 * WhatsApp Multi-Admin Gateway Configuration
 * Follows PRD Dispatch Gateway specifications
 * Ganti nomor phone dengan nomor WA admin yang sebenarnya (format: 62XXXXXXXXXX)
 */
export const ADMINS = [
  {
    id: 'admin-1',
    name: 'Admin 1',
    role: 'Dispatch Utama',
    phone: '6281298765432',       // ← Ganti dengan nomor WA admin 1
    displayPhone: '+62 812-9876-5432',
    status: 'online',
    statusText: 'Online (Respon ~1 Menit)',
    avatar: '👩‍💼',
    badge: 'Utama'
  },
  {
    id: 'admin-2',
    name: 'Admin 2',
    role: 'Dispatch Pendamping',
    phone: '6281912345678',       // ← Ganti dengan nomor WA admin 2
    displayPhone: '+62 819-1234-5678',
    status: 'online',
    statusText: 'Online (Respon ~2 Menit)',
    avatar: '👩‍💻',
    badge: 'Cadangan'
  },
  {
    id: 'admin-3',
    name: 'Admin 3',
    role: 'Dispatch Area Barat',
    phone: '6285678901234',       // ← Ganti dengan nomor WA admin 3
    displayPhone: '+62 856-7890-1234',
    status: 'online',
    statusText: 'Online',
    avatar: '👩‍🦱',
    badge: 'Cadangan'
  },
  {
    id: 'admin-4',
    name: 'Admin 4',
    role: 'Dispatch Area Timur',
    phone: '6283412345678',       // ← Ganti dengan nomor WA admin 4
    displayPhone: '+62 834-1234-5678',
    status: 'online',
    statusText: 'Online',
    avatar: '👩‍🦳',
    badge: 'Cadangan'
  }
];
