/**
 * WhatsApp Multi-Admin Gateway Configuration
 * Follows PRD Dispatch Gateway specifications
 */
export const ADMINS = [
  {
    id: 'admin-1',
    name: 'Kak Dian',
    role: 'Admin Dispatch Utama (Pusat & Selatan)',
    phone: '6281298765432',
    displayPhone: '+62 812-9876-5432',
    status: 'online',
    statusText: 'Online (Respon ~1 Menit)',
    avatar: '👩‍💼',
    badge: 'Fast Dispatch'
  },
  {
    id: 'admin-2',
    name: 'Kak Maya',
    role: 'Admin Dispatch Pendamping (Barat, Timur & Utara)',
    phone: '6281912345678',
    displayPhone: '+62 819-1234-5678',
    status: 'online',
    statusText: 'Online (Respon ~2 Menit)',
    avatar: '👩‍💻',
    badge: 'Backup Dispatch'
  }
];
