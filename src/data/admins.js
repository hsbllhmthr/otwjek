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
    phone: '62882021942470',
    displayPhone: '+62 882-0219-42470',
    status: 'online',
    statusText: 'Online (Respon ~1 Menit)',
    avatar: '👩‍💼',
    badge: 'Utama'
  },
  {
    id: 'admin-2',
    name: 'Admin 2',
    role: 'Dispatch Pendamping',
    phone: '6281354613984',
    displayPhone: '+62 813-5461-3984',
    status: 'online',
    statusText: 'Online (Respon ~2 Menit)',
    avatar: '👩‍💻',
    badge: 'Cadangan'
  },
  {
    id: 'admin-3',
    name: 'Admin 3',
    role: 'Dispatch Area Barat',
    phone: '6282345614803',
    displayPhone: '+62 823-4561-4803',
    status: 'online',
    statusText: 'Online',
    avatar: '👩‍🦱',
    badge: 'Cadangan'
  },
  {
    id: 'admin-4',
    name: 'Admin 4',
    role: 'Dispatch Area Timur',
    phone: '6281545629713',
    displayPhone: '+62 815-4562-9713',
    status: 'online',
    statusText: 'Online',
    avatar: '👩‍🦳',
    badge: 'Cadangan'
  }
];
