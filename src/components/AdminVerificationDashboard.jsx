import React, { useState, useEffect, useMemo, useCallback } from 'react';
import './AdminVerificationDashboard.css';
import {
  LayoutDashboard,
  Menu,
  LogOut,
  Search,
  CheckCircle2,
  XCircle,
  User,
  Users,
  UserCheck,
  UserX,
  Bike,
  ExternalLink,
  Eye,
  X,
  AlertTriangle,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Trash2,
  Bell,
  Moon,
  Edit3,
  ArrowUpDown,
  Check
} from 'lucide-react';
import dbService from '../services/dbService.js';
import driverPlaceholder from '../assets/driver_placeholder.svg';
import otwjekLogo from '../assets/otwjek_logo.png';
import { compressImageFile } from '../utils/imageCompressor.js';

export default function AdminVerificationDashboard({ admin, onLogout, onGoToCustomerApp }) {
  // Navigation Section: 'overview' | 'drivers' | 'customers'
  const [mainSection, setMainSection] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // =========================================================================
  // STATE DRIVER
  // =========================================================================
  const [drivers, setDrivers] = useState([]);
  const [driverTab, setDriverTab] = useState('pending'); // 'all' | 'pending' | 'approved' | 'rejected'
  const [driverSearchQuery, setDriverSearchQuery] = useState('');
  // Filter & sorting per kolom driver
  const [driverSortKey, setDriverSortKey] = useState('created_at'); // 'created_at' | 'name' | 'vehicleType' | 'docs' | 'operationalArea' | 'status'
  const [driverSortDir, setDriverSortDir] = useState('desc'); // 'desc' | 'asc'
  const [driverServiceFilter, setDriverServiceFilter] = useState('all'); // 'all' | 'motor' | 'mobil'
  const [driverDocFilter, setDriverDocFilter] = useState('all'); // 'all' | 'complete' | 'incomplete'

  // Active column menu dropdown popover
  const [activeColumnMenu, setActiveColumnMenu] = useState(null);
  
  // Driver Modals
  const [previewDoc, setPreviewDoc] = useState(null); // { type, url, title, driverName }
  const [rejectModalDriver, setRejectModalDriver] = useState(null); // driver object
  const [rejectReason, setRejectReason] = useState('Foto dokumen buram atau tidak terbaca dengan jelas.');
  const [customRejectReason, setCustomRejectReason] = useState('');
  const [approveConfirmDriver, setApproveConfirmDriver] = useState(null);
  
  // State Edit & Lengkapi Data Driver oleh Admin
  const [editingDriver, setEditingDriver] = useState(null);
  const [editDriverForm, setEditDriverForm] = useState(null);
  const [editDriverActiveTab, setEditDriverActiveTab] = useState('identitas'); // 'identitas' | 'kendaraan' | 'legalitas' | 'verifikasi'
  const [isSavingDriver, setIsSavingDriver] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // =========================================================================
  // STATE CUSTOMER
  // =========================================================================
  const [customers, setCustomers] = useState([]);
  const [customerTab, setCustomerTab] = useState('all'); // 'all' | 'active' | 'suspended'
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  // Filter & sorting per kolom pelanggan
  const [customerSortKey, setCustomerSortKey] = useState('created_at'); // 'created_at' | 'name' | 'phone' | 'orders' | 'status'
  const [customerSortDir, setCustomerSortDir] = useState('desc'); // 'desc' | 'asc'
  const [selectedCustomerDetail, setSelectedCustomerDetail] = useState(null);
  const [customerStatusConfirm, setCustomerStatusConfirm] = useState(null);
  const [customerDeleteConfirm, setCustomerDeleteConfirm] = useState(null);

  // =========================================================================
  // DATA LOADERS & REALTIME SUBSCRIPTION
  // =========================================================================
  const [bookings, setBookings] = useState(() => {
    try {
      const stored = localStorage.getItem('otwjek_db_ride_bookings');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const loadDrivers = () => {
    const all = dbService.drivers.getAll();
    setDrivers((prev) => {
      if (prev.length !== all.length) return [...all];
      const hasChanged = all.some((d, idx) => {
        const p = prev[idx];
        return (
          !p ||
          p.id !== d.id ||
          p.verification_status !== d.verification_status ||
          p.status !== d.status ||
          p.name !== d.name ||
          p.phone !== d.phone ||
          p.avatar !== d.avatar ||
          p.plateNumber !== d.plateNumber ||
          p.operationalArea !== d.operationalArea
        );
      });
      return hasChanged ? [...all] : prev;
    });
  };

  const loadCustomers = () => {
    const allCustomers = dbService.users.getCustomers();
    setCustomers((prev) => {
      if (prev.length !== allCustomers.length) return [...allCustomers];
      const hasChanged = allCustomers.some((c, idx) => {
        const p = prev[idx];
        return !p || p.id !== c.id || p.status !== c.status || p.full_name !== c.full_name;
      });
      return hasChanged ? [...allCustomers] : prev;
    });
  };

  const loadBookings = () => {
    try {
      const stored = localStorage.getItem('otwjek_db_ride_bookings');
      if (stored) {
        const parsed = JSON.parse(stored);
        setBookings((prev) => (prev.length !== parsed.length ? parsed : prev));
      }
    } catch (e) {
      console.error('Error loading bookings:', e);
    }
  };

  useEffect(() => {
    loadDrivers();
    loadCustomers();
    loadBookings();

    // 1. Subscribe to instant reactive updates from dbService (intra-tab and cross-tab storage events)
    const unsubscribe = dbService.subscribe(() => {
      loadDrivers();
      loadCustomers();
      loadBookings();
    });

    // 2. Real-time background sync interval (heartbeat every 1500ms)
    const pollInterval = setInterval(() => {
      loadDrivers();
      loadCustomers();
      loadBookings();
    }, 1500);

    return () => {
      unsubscribe();
      clearInterval(pollInterval);
    };
  }, []);

  // Tutup dropdown menu kolom saat klik di luar
  useEffect(() => {
    const handleGlobalClick = (e) => {
      if (activeColumnMenu && !e.target.closest('.th-filter-dropdown-container')) {
        setActiveColumnMenu(null);
      }
    };
    document.addEventListener('mousedown', handleGlobalClick);
    return () => document.removeEventListener('mousedown', handleGlobalClick);
  }, [activeColumnMenu]);

  const toggleColumnMenu = (menuKey) => {
    setActiveColumnMenu((prev) => (prev === menuKey ? null : menuKey));
  };

  const handleSetDriverSort = (key, dir) => {
    setDriverSortKey(key);
    setDriverSortDir(dir);
    setActiveColumnMenu(null);
  };

  const handleSetCustomerSort = (key, dir) => {
    setCustomerSortKey(key);
    setCustomerSortDir(dir);
    setActiveColumnMenu(null);
  };

  // Helper hitung jumlah pesanan per customer
  const getCustomerOrderCount = useCallback((customer) => {
    if (!customer) return 0;
    const cleanPhone = (customer.phone || '').replace(/^\+?62|^0/, '');
    const bookingList = Array.isArray(bookings) ? bookings : [];
    return bookingList.filter(
      (b) =>
        b.user_id === customer.id ||
        (b.customer_phone && b.customer_phone.replace(/^\+?62|^0/, '') === cleanPhone)
    ).length;
  }, [bookings]);

  // =========================================================================
  // OVERVIEW TABLES PAGINATION (5 DATA TERBARU PER HALAMAN) & FILTER/SORTING
  // =========================================================================
  const TABLE_PAGE_SIZE = 5;
  const [driverTablePage, setDriverTablePage] = useState(1);
  const [customerTablePage, setCustomerTablePage] = useState(1);

  // Filter & sorting per kolom Overview Driver
  const [overviewDriverSortKey, setOverviewDriverSortKey] = useState('created_at'); // 'created_at' | 'name' | 'vehicleType' | 'operationalArea' | 'status'
  const [overviewDriverSortDir, setOverviewDriverSortDir] = useState('desc'); // 'desc' | 'asc'
  const [overviewDriverServiceFilter, setOverviewDriverServiceFilter] = useState('all'); // 'all' | 'motor' | 'mobil'
  const [overviewDriverStatusFilter, setOverviewDriverStatusFilter] = useState('all'); // 'all' | 'pending' | 'approved' | 'rejected'

  const handleSetOverviewDriverSort = (key, dir) => {
    setOverviewDriverSortKey(key);
    setOverviewDriverSortDir(dir);
    setDriverTablePage(1);
    setActiveColumnMenu(null);
  };

  // Filter & sorting per kolom Overview Pelanggan
  const [overviewCustomerSortKey, setOverviewCustomerSortKey] = useState('created_at'); // 'created_at' | 'name' | 'phone' | 'orders' | 'status'
  const [overviewCustomerSortDir, setOverviewCustomerSortDir] = useState('desc'); // 'desc' | 'asc'
  const [overviewCustomerStatusFilter, setOverviewCustomerStatusFilter] = useState('all'); // 'all' | 'active' | 'suspended'

  const handleSetOverviewCustomerSort = (key, dir) => {
    setOverviewCustomerSortKey(key);
    setOverviewCustomerSortDir(dir);
    setCustomerTablePage(1);
    setActiveColumnMenu(null);
  };

  // Drivers diurutkan dari yang terbaru (pending diutamakan lalu created_at) serta mendukung filter & sort
  const sortedOverviewDrivers = useMemo(() => {
    let result = [...drivers];

    // Filter Status
    if (overviewDriverStatusFilter !== 'all') {
      if (overviewDriverStatusFilter === 'pending') {
        result = result.filter((d) => d.verification_status === 'pending');
      } else if (overviewDriverStatusFilter === 'approved') {
        result = result.filter((d) => (d.verification_status || 'approved') === 'approved');
      } else if (overviewDriverStatusFilter === 'rejected') {
        result = result.filter((d) => d.verification_status === 'rejected');
      }
    }

    // Filter Layanan
    if (overviewDriverServiceFilter !== 'all') {
      result = result.filter((d) => (d.vehicleType || 'motor') === overviewDriverServiceFilter);
    }

    // Sorting
    result.sort((a, b) => {
      if (overviewDriverSortKey === 'name') {
        const nameA = (a.name || '').toLowerCase();
        const nameB = (b.name || '').toLowerCase();
        return overviewDriverSortDir === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
      }
      if (overviewDriverSortKey === 'vehicleType') {
        const typeA = (a.vehicleType || 'motor').toLowerCase();
        const typeB = (b.vehicleType || 'motor').toLowerCase();
        return overviewDriverSortDir === 'asc' ? typeA.localeCompare(typeB) : typeB.localeCompare(typeA);
      }
      if (overviewDriverSortKey === 'operationalArea') {
        const areaA = (a.operationalArea || '').toLowerCase();
        const areaB = (b.operationalArea || '').toLowerCase();
        return overviewDriverSortDir === 'asc' ? areaA.localeCompare(areaB) : areaB.localeCompare(areaA);
      }
      if (overviewDriverSortKey === 'status') {
        const sA = a.verification_status || 'approved';
        const sB = b.verification_status || 'approved';
        return overviewDriverSortDir === 'asc' ? sA.localeCompare(sB) : sB.localeCompare(sA);
      }
      // Default: 'created_at'
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      if (overviewDriverSortDir === 'asc') {
        return timeA - timeB;
      }
      if (timeA !== timeB) return timeB - timeA;
      // Pending diutamakan jika waktu sama
      if (a.verification_status === 'pending' && b.verification_status !== 'pending') return -1;
      if (b.verification_status === 'pending' && a.verification_status !== 'pending') return 1;
      return 0;
    });

    return result;
  }, [drivers, overviewDriverStatusFilter, overviewDriverServiceFilter, overviewDriverSortKey, overviewDriverSortDir]);

  const totalDriverPages = Math.max(1, Math.ceil(sortedOverviewDrivers.length / TABLE_PAGE_SIZE));
  const currentDriverPage = Math.min(driverTablePage, totalDriverPages);
  const paginatedDrivers = useMemo(() => {
    const startIndex = (currentDriverPage - 1) * TABLE_PAGE_SIZE;
    return sortedOverviewDrivers.slice(startIndex, startIndex + TABLE_PAGE_SIZE);
  }, [sortedOverviewDrivers, currentDriverPage]);

  // Customers diurutkan dan difilter untuk overview
  const sortedOverviewCustomers = useMemo(() => {
    let result = [...customers];

    // Filter Status
    if (overviewCustomerStatusFilter !== 'all') {
      result = result.filter((c) => (c.status || 'active') === overviewCustomerStatusFilter);
    }

    // Sorting
    result.sort((a, b) => {
      if (overviewCustomerSortKey === 'name') {
        const nameA = (a.full_name || a.name || '').toLowerCase();
        const nameB = (b.full_name || b.name || '').toLowerCase();
        return overviewCustomerSortDir === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
      }
      if (overviewCustomerSortKey === 'phone') {
        const phoneA = a.phone || '';
        const phoneB = b.phone || '';
        return overviewCustomerSortDir === 'asc' ? phoneA.localeCompare(phoneB) : phoneB.localeCompare(phoneA);
      }
      if (overviewCustomerSortKey === 'orders') {
        const ordersA = getCustomerOrderCount(a);
        const ordersB = getCustomerOrderCount(b);
        return overviewCustomerSortDir === 'asc' ? ordersA - ordersB : ordersB - ordersA;
      }
      if (overviewCustomerSortKey === 'status') {
        const statusA = a.status === 'suspended' ? 'suspended' : 'active';
        const statusB = b.status === 'suspended' ? 'suspended' : 'active';
        return overviewCustomerSortDir === 'asc' ? statusA.localeCompare(statusB) : statusB.localeCompare(statusA);
      }
      // Default: 'created_at'
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return overviewCustomerSortDir === 'asc' ? timeA - timeB : timeB - timeA;
    });

    return result;
  }, [customers, overviewCustomerStatusFilter, overviewCustomerSortKey, overviewCustomerSortDir, getCustomerOrderCount]);

  const totalCustomerPages = Math.max(1, Math.ceil(sortedOverviewCustomers.length / TABLE_PAGE_SIZE));
  const currentCustomerPage = Math.min(customerTablePage, totalCustomerPages);
  const paginatedCustomers = useMemo(() => {
    const startIndex = (currentCustomerPage - 1) * TABLE_PAGE_SIZE;
    return sortedOverviewCustomers.slice(startIndex, startIndex + TABLE_PAGE_SIZE);
  }, [sortedOverviewCustomers, currentCustomerPage]);

  // Helper render tombol nomor halaman dengan ellipsis cerdas
  const renderPaginationPages = (currentPage, totalPages, onSelectPage) => {
    if (totalPages <= 1) {
      return (
        <button type="button" className="btn-pagination-page active" disabled>
          1
        </button>
      );
    }

    const pages = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }

    return pages.map((page, idx) => {
      if (page === '...') {
        return (
          <span key={`ellipsis-${idx}`} className="pagination-ellipsis">
            …
          </span>
        );
      }
      return (
        <button
          key={page}
          type="button"
          className={`btn-pagination-page ${page === currentPage ? 'active' : ''}`}
          onClick={() => onSelectPage(page)}
        >
          {page}
        </button>
      );
    });
  };

  // =========================================================================
  // DRIVER COUNTS & FILTERS
  // =========================================================================
  const driverCounts = useMemo(() => {
    const pending = drivers.filter((d) => d.verification_status === 'pending').length;
    const approved = drivers.filter((d) => (d.verification_status || 'approved') === 'approved').length;
    const rejected = drivers.filter((d) => d.verification_status === 'rejected').length;
    return { all: drivers.length, pending, approved, rejected };
  }, [drivers]);

  const filteredDrivers = useMemo(() => {
    let result = drivers;

    if (driverTab === 'pending') {
      result = result.filter((d) => d.verification_status === 'pending');
    } else if (driverTab === 'approved') {
      result = result.filter((d) => (d.verification_status || 'approved') === 'approved');
    } else if (driverTab === 'rejected') {
      result = result.filter((d) => d.verification_status === 'rejected');
    }

    if (driverServiceFilter && driverServiceFilter !== 'all') {
      result = result.filter((d) => (d.vehicleType || 'motor') === driverServiceFilter);
    }

    if (driverDocFilter && driverDocFilter !== 'all') {
      result = result.filter((d) => {
        const docs = getDriverDocs(d.id);
        const hasKtp = Boolean(docs.find((x) => x.document_type === 'ktp')?.document_url || d.ktpUrl);
        const hasSim = Boolean(docs.find((x) => x.document_type === 'sim')?.document_url || d.simUrl);
        const hasStnk = Boolean(docs.find((x) => x.document_type === 'stnk')?.document_url || d.stnkUrl);
        const isComplete = hasKtp && hasSim && hasStnk;
        return driverDocFilter === 'complete' ? isComplete : !isComplete;
      });
    }

    if (driverSearchQuery.trim()) {
      const q = driverSearchQuery.toLowerCase().trim();
      result = result.filter(
        (d) =>
          d.name?.toLowerCase().includes(q) ||
          d.plateNumber?.toLowerCase().includes(q) ||
          d.phone?.toLowerCase().includes(q) ||
          d.nik?.toLowerCase().includes(q) ||
          d.vehicleModel?.toLowerCase().includes(q) ||
          d.operationalArea?.toLowerCase().includes(q)
      );
    }

    result = [...result].sort((a, b) => {
      if (driverSortKey === 'name') {
        const nameA = (a.name || '').toLowerCase();
        const nameB = (b.name || '').toLowerCase();
        return driverSortDir === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
      }
      if (driverSortKey === 'vehicleType') {
        const typeA = (a.vehicleType || 'motor').toLowerCase();
        const typeB = (b.vehicleType || 'motor').toLowerCase();
        return driverSortDir === 'asc' ? typeA.localeCompare(typeB) : typeB.localeCompare(typeA);
      }
      if (driverSortKey === 'docs') {
        const docsA = getDriverDocs(a.id);
        const docsB = getDriverDocs(b.id);
        const completeA = Boolean(docsA.find((x) => x.document_type === 'ktp')?.document_url || a.ktpUrl) &&
                          Boolean(docsA.find((x) => x.document_type === 'sim')?.document_url || a.simUrl) &&
                          Boolean(docsA.find((x) => x.document_type === 'stnk')?.document_url || a.stnkUrl);
        const completeB = Boolean(docsB.find((x) => x.document_type === 'ktp')?.document_url || b.ktpUrl) &&
                          Boolean(docsB.find((x) => x.document_type === 'sim')?.document_url || b.simUrl) &&
                          Boolean(docsB.find((x) => x.document_type === 'stnk')?.document_url || b.stnkUrl);
        return driverSortDir === 'asc' ? (completeA ? 1 : -1) : (completeB ? 1 : -1);
      }
      if (driverSortKey === 'status') {
        const statusA = a.verification_status || 'approved';
        const statusB = b.verification_status || 'approved';
        return driverSortDir === 'asc' ? statusA.localeCompare(statusB) : statusB.localeCompare(statusA);
      }
      if (driverSortKey === 'operationalArea') {
        const areaA = (a.operationalArea || '').toLowerCase();
        const areaB = (b.operationalArea || '').toLowerCase();
        return driverSortDir === 'asc' ? areaA.localeCompare(areaB) : areaB.localeCompare(areaA);
      }
      // Default: 'created_at'
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return driverSortDir === 'asc' ? timeA - timeB : timeB - timeA;
    });

    return result;
  }, [drivers, driverTab, driverServiceFilter, driverDocFilter, driverSearchQuery, driverSortKey, driverSortDir]);

  // =========================================================================
  // CUSTOMER COUNTS & FILTERS
  // =========================================================================
  const customerCounts = useMemo(() => {
    const total = customers.length;
    const active = customers.filter((c) => c.status === 'active' || !c.status).length;
    const suspended = customers.filter((c) => c.status === 'suspended').length;
    return { total, active, suspended };
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    let result = customers;

    if (customerTab === 'active') {
      result = result.filter((c) => c.status === 'active' || !c.status);
    } else if (customerTab === 'suspended') {
      result = result.filter((c) => c.status === 'suspended');
    }

    if (customerSearchQuery.trim()) {
      const q = customerSearchQuery.toLowerCase().trim();
      result = result.filter(
        (c) =>
          c.full_name?.toLowerCase().includes(q) ||
          c.phone?.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q)
      );
    }

    result = [...result].sort((a, b) => {
      if (customerSortKey === 'name') {
        const nameA = (a.full_name || a.name || '').toLowerCase();
        const nameB = (b.full_name || b.name || '').toLowerCase();
        return customerSortDir === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
      }
      if (customerSortKey === 'phone') {
        const phoneA = a.phone || '';
        const phoneB = b.phone || '';
        return customerSortDir === 'asc' ? phoneA.localeCompare(phoneB) : phoneB.localeCompare(phoneA);
      }
      if (customerSortKey === 'orders') {
        const ordersA = getCustomerOrderCount(a);
        const ordersB = getCustomerOrderCount(b);
        return customerSortDir === 'asc' ? ordersA - ordersB : ordersB - ordersA;
      }
      if (customerSortKey === 'status') {
        const statusA = a.status === 'suspended' ? 'suspended' : 'active';
        const statusB = b.status === 'suspended' ? 'suspended' : 'active';
        return customerSortDir === 'asc' ? statusA.localeCompare(statusB) : statusB.localeCompare(statusA);
      }
      // Default: 'created_at'
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return customerSortDir === 'asc' ? timeA - timeB : timeB - timeA;
    });

    return result;
  }, [customers, customerTab, customerSearchQuery, customerSortKey, customerSortDir, getCustomerOrderCount]);

  // =========================================================================
  // PAGINATION UNTUK HALAMAN VERIFIKASI DRIVER & DATA PELANGGAN (5 DATA / HALAMAN)
  // =========================================================================
  const [driversViewPage, setDriversViewPage] = useState(1);
  useEffect(() => {
    setDriversViewPage(1);
  }, [driverTab, driverSearchQuery, driverSortKey, driverSortDir, driverServiceFilter, driverDocFilter]);

  const totalDriversViewPages = Math.max(1, Math.ceil(filteredDrivers.length / TABLE_PAGE_SIZE));
  const currentDriversViewPage = Math.min(driversViewPage, totalDriversViewPages);
  const paginatedDriversView = useMemo(() => {
    const start = (currentDriversViewPage - 1) * TABLE_PAGE_SIZE;
    return filteredDrivers.slice(start, start + TABLE_PAGE_SIZE);
  }, [filteredDrivers, currentDriversViewPage]);

  const [customersViewPage, setCustomersViewPage] = useState(1);
  useEffect(() => {
    setCustomersViewPage(1);
  }, [customerTab, customerSearchQuery, customerSortKey, customerSortDir]);

  const totalCustomersViewPages = Math.max(1, Math.ceil(filteredCustomers.length / TABLE_PAGE_SIZE));
  const currentCustomersViewPage = Math.min(customersViewPage, totalCustomersViewPages);
  const paginatedCustomersView = useMemo(() => {
    const start = (currentCustomersViewPage - 1) * TABLE_PAGE_SIZE;
    return filteredCustomers.slice(start, start + TABLE_PAGE_SIZE);
  }, [filteredCustomers, currentCustomersViewPage]);

  // =========================================================================
  // HANDLERS DRIVER
  // =========================================================================
  const handleApprove = (driver) => {
    const reviewerName = admin?.name || 'Admin OTWJEK';
    dbService.drivers.approveDriver(driver.id, reviewerName);
    loadDrivers();
    setApproveConfirmDriver(null);
  };

  const handleConfirmReject = () => {
    if (!rejectModalDriver) return;
    const finalReason = rejectReason === 'custom' ? customRejectReason : rejectReason;
    const reviewerName = admin?.name || 'Admin OTWJEK';
    dbService.drivers.rejectDriver(rejectModalDriver.id, finalReason, reviewerName);
    loadDrivers();
    setRejectModalDriver(null);
    setCustomRejectReason('');
  };

  const formatOperationalArea = (area) => {
    if (!area) return 'Makassar & sekitarnya';
    const trimmed = area.trim();
    if (trimmed.length > 20) {
      return `${trimmed.slice(0, 18)}...`;
    }
    return trimmed;
  };

  const getDriverDocs = (driverId) => {
    try {
      const storedDocs = JSON.parse(localStorage.getItem('otwjek_db_driver_documents') || '[]');
      return storedDocs.filter((d) => d.driver_id === driverId);
    } catch {
      return [];
    }
  };

  const handleOpenEditDriver = (driver, initialTab = 'identitas') => {
    if (!driver) return;
    const docs = getDriverDocs(driver.id) || [];
    const ktpDoc = docs.find((d) => d.document_type === 'ktp');
    const simDoc = docs.find((d) => d.document_type === 'sim');
    const stnkDoc = docs.find((d) => d.document_type === 'stnk');

    setEditingDriver(driver);
    setEditDriverForm({
      name: driver.name || '',
      phone: driver.phone || '',
      nik: driver.nik || '',
      gender: driver.gender || 'Perempuan',
      avatar: driver.avatar || '',
      bio: driver.bio || '',

      vehicleType: driver.vehicleType || 'motor',
      vehicleBrand: driver.vehicleBrand || '',
      vehicleModel: driver.vehicleModel || '',
      plateNumber: driver.plateNumber || '',
      vehicleColor: driver.vehicleColor || '',
      operationalArea: driver.operationalArea || 'Makassar dan sekitarnya',
      badge: driver.badge || (driver.verification_status === 'approved' ? 'Mitra Resmi 🌸' : 'Calon Mitra 🌸'),

      simNumber: driver.simNumber || driver.simCNumber || driver.simANumber || '',
      simExpiry: driver.simExpiry || '',
      stnkExpiry: driver.stnkExpiry || '',

      emergencyContactName: driver.emergencyContactName || '',
      emergencyContactPhone: driver.emergencyContactPhone || '',

      verification_status: driver.verification_status || 'pending',
      rejection_reason: driver.rejection_reason || '',

      // Dokumen
      ktpUrl: ktpDoc?.document_url || '',
      simUrl: simDoc?.document_url || '',
      stnkUrl: stnkDoc?.document_url || ''
    });
    setEditDriverActiveTab(initialTab);
  };

  const handleAvatarFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await compressImageFile(file, 400, 400, 0.8);
      setEditDriverForm((prev) => ({ ...prev, avatar: base64 }));
    } catch (err) {
      alert('Gagal membaca gambar profil: ' + err.message);
    }
  };

  const handleDocFile = async (docType, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await compressImageFile(file, 1000, 1000, 0.75);
      if (docType === 'ktp') setEditDriverForm((prev) => ({ ...prev, ktpUrl: base64 }));
      if (docType === 'sim') setEditDriverForm((prev) => ({ ...prev, simUrl: base64 }));
      if (docType === 'stnk') setEditDriverForm((prev) => ({ ...prev, stnkUrl: base64 }));
    } catch (err) {
      alert('Gagal membaca gambar berkas: ' + err.message);
    }
  };

  const handleSaveDriver = (overrideStatus = null) => {
    if (!editingDriver || !editDriverForm) return;

    if (!editDriverForm.name.trim()) {
      alert('Nama lengkap driver tidak boleh kosong.');
      return;
    }

    setIsSavingDriver(true);

    const targetVerificationStatus = overrideStatus || editDriverForm.verification_status || 'pending';

    const updatedData = {
      name: editDriverForm.name.trim(),
      phone: editDriverForm.phone.trim(),
      nik: editDriverForm.nik.trim(),
      gender: editDriverForm.gender || 'Perempuan',
      avatar: editDriverForm.avatar,
      bio: editDriverForm.bio.trim(),

      vehicleType: editDriverForm.vehicleType,
      vehicleBrand: editDriverForm.vehicleBrand.trim(),
      vehicleModel: editDriverForm.vehicleModel.trim(),
      plateNumber: editDriverForm.plateNumber.toUpperCase().trim(),
      vehicleColor: editDriverForm.vehicleColor.trim(),
      operationalArea: editDriverForm.operationalArea.trim(),
      badge: editDriverForm.badge.trim(),

      simNumber: editDriverForm.simNumber.trim(),
      simExpiry: editDriverForm.simExpiry,
      stnkExpiry: editDriverForm.stnkExpiry,

      emergencyContactName: editDriverForm.emergencyContactName.trim(),
      emergencyContactPhone: editDriverForm.emergencyContactPhone.trim(),

      verification_status: targetVerificationStatus,
      rejection_reason: targetVerificationStatus === 'rejected' ? (editDriverForm.rejection_reason || 'Dokumen belum lengkap atau tidak sesuai.') : null
    };

    const docUpdates = {};
    if (editDriverForm.ktpUrl) {
      docUpdates.ktp = { url: editDriverForm.ktpUrl, name: 'ktp_document.jpg', verification_status: targetVerificationStatus === 'approved' ? 'approved' : 'pending' };
    }
    if (editDriverForm.simUrl) {
      docUpdates.sim = { url: editDriverForm.simUrl, name: 'sim_document.jpg', verification_status: targetVerificationStatus === 'approved' ? 'approved' : 'pending' };
    }
    if (editDriverForm.stnkUrl) {
      docUpdates.stnk = { url: editDriverForm.stnkUrl, name: 'stnk_document.jpg', verification_status: targetVerificationStatus === 'approved' ? 'approved' : 'pending' };
    }

    setTimeout(() => {
      dbService.drivers.updateDriver(editingDriver.id, updatedData, docUpdates, admin?.name || 'Admin OTWJek');
      loadDrivers();
      setIsSavingDriver(false);
      setEditingDriver(null);
      setToastMessage('Data driver berhasil disimpan dan diperbarui!');
      setTimeout(() => setToastMessage(null), 4000);
    }, 200);
  };

  // =========================================================================
  // HANDLERS CUSTOMER
  // =========================================================================
  const handleToggleCustomerStatus = (customer) => {
    dbService.users.toggleStatus(customer.id);
    loadCustomers();
    setCustomerStatusConfirm(null);
    if (selectedCustomerDetail?.id === customer.id) {
      setSelectedCustomerDetail((prev) => ({
        ...prev,
        status: prev.status === 'suspended' ? 'active' : 'suspended'
      }));
    }
  };

  const handleDeleteCustomer = (customer) => {
    dbService.users.delete(customer.id);
    loadCustomers();
    setCustomerDeleteConfirm(null);
    if (selectedCustomerDetail?.id === customer.id) {
      setSelectedCustomerDetail(null);
    }
  };


  // Helper format tanggal lahir customer
  const formatBirthDate = (val) => {
    if (!val) return 'Belum diisi';
    try {
      const parts = String(val).split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const d = new Date(year, month, day);
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          });
        }
      }
      const d = new Date(val);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
      }
      return val;
    } catch {
      return val;
    }
  };

  return (
    <div className="admin-dash-layout">
      {/* Mobile Drawer Overlay */}
      {sidebarOpen && (
        <div
          className="admin-sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Left Sidebar - TailAdmin Dark Theme */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'is-open' : ''} ${sidebarCollapsed ? 'is-collapsed' : ''}`}>
        <div className="admin-sidebar-header">
          <div className="admin-sidebar-brand">
            <img src={otwjekLogo} alt="OTWJek Logo" className="sidebar-brand-img" />
            <span className="sidebar-app-name">OTWJEK</span>
          </div>
          <button
            type="button"
            className="btn-sidebar-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Tutup Menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="admin-sidebar-nav">
          <div className="sidebar-section-title">MENU</div>

          <button
            type="button"
            className={`sidebar-nav-item ${mainSection === 'overview' ? 'active' : ''}`}
            onClick={() => {
              setMainSection('overview');
              setSidebarOpen(false);
            }}
          >
            <div className="sidebar-nav-left">
              <LayoutDashboard size={18} />
              <span className="nav-item-label">Dashboard</span>
            </div>
          </button>

          <button
            type="button"
            className={`sidebar-nav-item ${mainSection === 'drivers' ? 'active' : ''}`}
            onClick={() => {
              setMainSection('drivers');
              setSidebarOpen(false);
            }}
          >
            <div className="sidebar-nav-left">
              <Bike size={18} />
              <span className="nav-item-label">Verifikasi Driver</span>
            </div>
            {driverCounts.pending > 0 ? (
              <span className="sidebar-badge-alert">{driverCounts.pending}</span>
            ) : (
              <span className="sidebar-badge-count">{driverCounts.all}</span>
            )}
          </button>

          <button
            type="button"
            className={`sidebar-nav-item ${mainSection === 'customers' ? 'active' : ''}`}
            onClick={() => {
              setMainSection('customers');
              setSidebarOpen(false);
            }}
          >
            <div className="sidebar-nav-left">
              <Users size={18} />
              <span className="nav-item-label">Data Pelanggan</span>
            </div>
            <span className="sidebar-badge-count">{customerCounts.total}</span>
          </button>

          <div className="sidebar-section-title">LAYANAN & LAINNYA</div>

          {onGoToCustomerApp && (
            <button
              type="button"
              className="sidebar-nav-item"
              onClick={onGoToCustomerApp}
              title="Buka Aplikasi Pelanggan"
            >
              <div className="sidebar-nav-left">
                <ExternalLink size={18} />
                <span className="nav-item-label">Aplikasi Pelanggan</span>
              </div>
            </button>
          )}
        </nav>

        <div className="admin-sidebar-footer">
          <button
            type="button"
            className="btn-sidebar-logout"
            onClick={onLogout}
            title="Keluar dari Admin"
          >
            <LogOut size={16} />
            <span>Keluar Akun</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="admin-main-wrapper">
        <header className="admin-topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="btn-topbar-hamburger"
              onClick={() => {
                if (window.innerWidth < 1024) {
                  setSidebarOpen(!sidebarOpen);
                } else {
                  setSidebarCollapsed(!sidebarCollapsed);
                }
              }}
              aria-label="Toggle Sidebar"
              title="Toggle Sidebar"
            >
              <Menu size={18} />
            </button>
          </div>

          <div className="topbar-right">
            {/* Dark Mode Button */}
            <button
              type="button"
              className="topbar-circle-btn"
              onClick={() => setDarkMode(!darkMode)}
              title={darkMode ? 'Mode Terang' : 'Mode Gelap'}
              aria-label="Toggle Dark Mode"
            >
              <Moon size={18} />
            </button>

            {/* Notification Bell */}
            <button
              type="button"
              className="topbar-circle-btn notification-btn"
              onClick={() => {
                setMainSection('drivers');
                setDriverTab('pending');
              }}
              title={
                driverCounts.pending > 0
                  ? `${driverCounts.pending} calon mitra menunggu verifikasi`
                  : 'Notifikasi'
              }
              aria-label="Notifikasi"
            >
              <Bell size={18} />
              <span className="topbar-notification-dot" />
            </button>

            {/* User Profile Capsule */}
            <div className="topbar-user-profile" title="Admin OTWJEK">
              <div className="topbar-user-avatar">
                <User size={18} className="topbar-empty-avatar-icon" />
              </div>
              <span className="topbar-user-name">Admin OTWJEK</span>
              <ChevronDown size={14} className="topbar-user-chevron" />
            </div>
          </div>
        </header>

        {/* Main Content Container */}
        <main className="admin-dash-main">
          {/* TailAdmin Page Header & Breadcrumb */}
          <div className="tailadmin-page-header">
            <div className="page-header-title-box">
              <h2 className="page-header-title">
                {mainSection === 'overview'
                  ? 'Dashboard Overview'
                  : mainSection === 'drivers'
                  ? 'Verifikasi Mitra Driver'
                  : 'Data Pelanggan'}
              </h2>
            </div>
            <div className="page-header-breadcrumb">
              <span className="breadcrumb-lead">Dashboard</span>
              <span className="breadcrumb-slash">/</span>
              <span className="breadcrumb-active-tag">
                {mainSection === 'overview'
                  ? 'Overview'
                  : mainSection === 'drivers'
                  ? 'Verifikasi Driver'
                  : 'Customer Data'}
              </span>
            </div>
          </div>

          {/* ================================================================= */}
          {/* VIEW 0: RINGKASAN / OVERVIEW                                      */}
          {/* ================================================================= */}
          {mainSection === 'overview' && (
            <div className="dash-overview-container">
              {/* TailAdmin KPI Cards */}
              <section className="dash-metrics-grid">
                <div
                  className="metric-card"
                  onClick={() => {
                    setMainSection('drivers');
                    setDriverTab('pending');
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <span className="metric-label">Menunggu Verifikasi</span>
                  <div className="metric-bottom-row">
                    <span className="metric-num">{driverCounts.pending}</span>
                    <div className="metric-trend-wrap">
                      <span className={`metric-trend-badge ${driverCounts.pending > 0 ? 'warning' : 'success'}`}>
                        {driverCounts.pending > 0 ? '+20%' : '0%'}
                      </span>
                      <span className="metric-trend-text">Vs last month</span>
                    </div>
                  </div>
                </div>

                <div
                  className="metric-card"
                  onClick={() => {
                    setMainSection('drivers');
                    setDriverTab('approved');
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <span className="metric-label">Mitra Driver Aktif</span>
                  <div className="metric-bottom-row">
                    <span className="metric-num">{driverCounts.approved}</span>
                    <div className="metric-trend-wrap">
                      <span className="metric-trend-badge success">+4%</span>
                      <span className="metric-trend-text">Vs last month</span>
                    </div>
                  </div>
                </div>

                <div
                  className="metric-card"
                  onClick={() => {
                    setMainSection('customers');
                    setCustomerTab('all');
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <span className="metric-label">Total Pelanggan</span>
                  <div className="metric-bottom-row">
                    <span className="metric-num">{customerCounts.total}</span>
                    <div className="metric-trend-wrap">
                      <span className="metric-trend-badge success">+12%</span>
                      <span className="metric-trend-text">Vs last month</span>
                    </div>
                  </div>
                </div>

                <div className="metric-card">
                  <span className="metric-label">Total Perjalanan</span>
                  <div className="metric-bottom-row">
                    <span className="metric-num">{bookings.length}</span>
                    <div className="metric-trend-wrap">
                      <span className="metric-trend-badge success">+7%</span>
                      <span className="metric-trend-text">Vs last month</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Alert Banner if driver pending */}
              {driverCounts.pending > 0 && (
                <div className="overview-alert-banner">
                  <div className="overview-alert-left">
                    <AlertTriangle size={18} className="alert-icon" />
                    <div>
                      <strong className="alert-title">{driverCounts.pending} Calon Mitra Driver Menunggu Review</strong>
                      <p className="alert-desc">Segera periksa dan setujui berkas KTP, SIM, dan STNK pendaftar agar dapat segera beroperasi.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-overview-action"
                    onClick={() => {
                      setMainSection('drivers');
                      setDriverTab('pending');
                    }}
                  >
                    <span>Tinjau Sekarang</span>
                    <ChevronRight size={15} />
                  </button>
                </div>
              )}

              {/* Recent Tables Grid: Drivers & Customers */}
              <div className="overview-splits-grid">
                {/* Left Split: Driver Pendaftar Terbaru */}
                <div className="overview-split-card tailadmin-table-card">
                  <div className="split-card-header">
                    <h3 className="split-title">Pendaftaran Driver Terbaru</h3>
                  </div>

                  <div className="tailadmin-table-responsive">
                    <table className="tailadmin-project-table">
                      <thead>
                        <tr className="tailadmin-th-row">
                          <th className="tailadmin-th text-left">
                            <div className="th-header-inner">
                              <span>Driver</span>
                              <div className="th-filter-dropdown-container">
                                <button
                                  type="button"
                                  className={`th-filter-btn ${overviewDriverSortKey === 'name' || overviewDriverSortKey === 'created_at' ? 'is-active' : ''}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleColumnMenu('ov_driver_name');
                                  }}
                                  title="Filter & Urutkan Driver"
                                  aria-label="Filter & Urutkan Driver"
                                >
                                  <ArrowUpDown size={12} />
                                </button>
                                {activeColumnMenu === 'ov_driver_name' && (
                                  <div className="th-filter-popover" onClick={(e) => e.stopPropagation()}>
                                    <div className="th-popover-title">Urutkan Driver</div>
                                    <button
                                      type="button"
                                      className={`th-popover-item ${overviewDriverSortKey === 'created_at' && overviewDriverSortDir === 'desc' ? 'active' : ''}`}
                                      onClick={() => handleSetOverviewDriverSort('created_at', 'desc')}
                                    >
                                      <span>Data Terbaru (Daftar)</span>
                                      {overviewDriverSortKey === 'created_at' && overviewDriverSortDir === 'desc' && <Check size={13} />}
                                    </button>
                                    <button
                                      type="button"
                                      className={`th-popover-item ${overviewDriverSortKey === 'created_at' && overviewDriverSortDir === 'asc' ? 'active' : ''}`}
                                      onClick={() => handleSetOverviewDriverSort('created_at', 'asc')}
                                    >
                                      <span>Data Terlama (Daftar)</span>
                                      {overviewDriverSortKey === 'created_at' && overviewDriverSortDir === 'asc' && <Check size={13} />}
                                    </button>
                                    <div className="th-popover-divider" />
                                    <button
                                      type="button"
                                      className={`th-popover-item ${overviewDriverSortKey === 'name' && overviewDriverSortDir === 'asc' ? 'active' : ''}`}
                                      onClick={() => handleSetOverviewDriverSort('name', 'asc')}
                                    >
                                      <span>Nama (A → Z)</span>
                                      {overviewDriverSortKey === 'name' && overviewDriverSortDir === 'asc' && <Check size={13} />}
                                    </button>
                                    <button
                                      type="button"
                                      className={`th-popover-item ${overviewDriverSortKey === 'name' && overviewDriverSortDir === 'desc' ? 'active' : ''}`}
                                      onClick={() => handleSetOverviewDriverSort('name', 'desc')}
                                    >
                                      <span>Nama (Z → A)</span>
                                      {overviewDriverSortKey === 'name' && overviewDriverSortDir === 'desc' && <Check size={13} />}
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </th>
                          <th className="tailadmin-th text-left">
                            <div className="th-header-inner">
                              <span>Layanan & Kendaraan</span>
                              <div className="th-filter-dropdown-container">
                                <button
                                  type="button"
                                  className={`th-filter-btn ${overviewDriverServiceFilter !== 'all' || overviewDriverSortKey === 'vehicleType' ? 'is-active' : ''}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleColumnMenu('ov_driver_service');
                                  }}
                                  title="Filter & Urutkan Layanan"
                                  aria-label="Filter & Urutkan Layanan"
                                >
                                  <ArrowUpDown size={12} />
                                </button>
                                {activeColumnMenu === 'ov_driver_service' && (
                                  <div className="th-filter-popover" onClick={(e) => e.stopPropagation()}>
                                    <div className="th-popover-title">Filter Layanan</div>
                                    <button
                                      type="button"
                                      className={`th-popover-item ${overviewDriverServiceFilter === 'all' && overviewDriverSortKey !== 'vehicleType' ? 'active' : ''}`}
                                      onClick={() => {
                                        setOverviewDriverServiceFilter('all');
                                        setOverviewDriverSortKey('created_at');
                                        setDriverTablePage(1);
                                        setActiveColumnMenu(null);
                                      }}
                                    >
                                      <span>Semua Layanan</span>
                                      {overviewDriverServiceFilter === 'all' && overviewDriverSortKey !== 'vehicleType' && <Check size={13} />}
                                    </button>
                                    <button
                                      type="button"
                                      className={`th-popover-item ${overviewDriverServiceFilter === 'motor' ? 'active' : ''}`}
                                      onClick={() => {
                                        setOverviewDriverServiceFilter('motor');
                                        setDriverTablePage(1);
                                        setActiveColumnMenu(null);
                                      }}
                                    >
                                      <span>SheRide (Motor)</span>
                                      {overviewDriverServiceFilter === 'motor' && <Check size={13} />}
                                    </button>
                                    <button
                                      type="button"
                                      className={`th-popover-item ${overviewDriverServiceFilter === 'mobil' ? 'active' : ''}`}
                                      onClick={() => {
                                        setOverviewDriverServiceFilter('mobil');
                                        setDriverTablePage(1);
                                        setActiveColumnMenu(null);
                                      }}
                                    >
                                      <span>SheCar (Mobil)</span>
                                      {overviewDriverServiceFilter === 'mobil' && <Check size={13} />}
                                    </button>
                                    <div className="th-popover-divider" />
                                    <div className="th-popover-title">Urutkan Kendaraan</div>
                                    <button
                                      type="button"
                                      className={`th-popover-item ${overviewDriverSortKey === 'vehicleType' && overviewDriverSortDir === 'asc' ? 'active' : ''}`}
                                      onClick={() => handleSetOverviewDriverSort('vehicleType', 'asc')}
                                    >
                                      <span>Motor Dahulu</span>
                                      {overviewDriverSortKey === 'vehicleType' && overviewDriverSortDir === 'asc' && <Check size={13} />}
                                    </button>
                                    <button
                                      type="button"
                                      className={`th-popover-item ${overviewDriverSortKey === 'vehicleType' && overviewDriverSortDir === 'desc' ? 'active' : ''}`}
                                      onClick={() => handleSetOverviewDriverSort('vehicleType', 'desc')}
                                    >
                                      <span>Mobil Dahulu</span>
                                      {overviewDriverSortKey === 'vehicleType' && overviewDriverSortDir === 'desc' && <Check size={13} />}
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </th>
                          <th className="tailadmin-th text-left">
                            <div className="th-header-inner">
                              <span>Wilayah Operasional</span>
                              <div className="th-filter-dropdown-container">
                                <button
                                  type="button"
                                  className={`th-filter-btn ${overviewDriverSortKey === 'operationalArea' ? 'is-active' : ''}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleColumnMenu('ov_driver_area');
                                  }}
                                  title="Filter & Urutkan Wilayah"
                                  aria-label="Filter & Urutkan Wilayah"
                                >
                                  <ArrowUpDown size={12} />
                                </button>
                                {activeColumnMenu === 'ov_driver_area' && (
                                  <div className="th-filter-popover" onClick={(e) => e.stopPropagation()}>
                                    <div className="th-popover-title">Urutkan Wilayah / Waktu</div>
                                    <button
                                      type="button"
                                      className={`th-popover-item ${overviewDriverSortKey === 'created_at' && overviewDriverSortDir === 'desc' ? 'active' : ''}`}
                                      onClick={() => handleSetOverviewDriverSort('created_at', 'desc')}
                                    >
                                      <span>Tanggal Terbaru</span>
                                      {overviewDriverSortKey === 'created_at' && overviewDriverSortDir === 'desc' && <Check size={13} />}
                                    </button>
                                    <button
                                      type="button"
                                      className={`th-popover-item ${overviewDriverSortKey === 'created_at' && overviewDriverSortDir === 'asc' ? 'active' : ''}`}
                                      onClick={() => handleSetOverviewDriverSort('created_at', 'asc')}
                                    >
                                      <span>Tanggal Terlama</span>
                                      {overviewDriverSortKey === 'created_at' && overviewDriverSortDir === 'asc' && <Check size={13} />}
                                    </button>
                                    <div className="th-popover-divider" />
                                    <button
                                      type="button"
                                      className={`th-popover-item ${overviewDriverSortKey === 'operationalArea' && overviewDriverSortDir === 'asc' ? 'active' : ''}`}
                                      onClick={() => handleSetOverviewDriverSort('operationalArea', 'asc')}
                                    >
                                      <span>Wilayah (A → Z)</span>
                                      {overviewDriverSortKey === 'operationalArea' && overviewDriverSortDir === 'asc' && <Check size={13} />}
                                    </button>
                                    <button
                                      type="button"
                                      className={`th-popover-item ${overviewDriverSortKey === 'operationalArea' && overviewDriverSortDir === 'desc' ? 'active' : ''}`}
                                      onClick={() => handleSetOverviewDriverSort('operationalArea', 'desc')}
                                    >
                                      <span>Wilayah (Z → A)</span>
                                      {overviewDriverSortKey === 'operationalArea' && overviewDriverSortDir === 'desc' && <Check size={13} />}
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </th>
                          <th className="tailadmin-th text-left">
                            <div className="th-header-inner">
                              <span>Status</span>
                              <div className="th-filter-dropdown-container">
                                <button
                                  type="button"
                                  className={`th-filter-btn ${overviewDriverStatusFilter !== 'all' || overviewDriverSortKey === 'status' ? 'is-active' : ''}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleColumnMenu('ov_driver_status');
                                  }}
                                  title="Filter & Urutkan Status"
                                  aria-label="Filter & Urutkan Status"
                                >
                                  <ArrowUpDown size={12} />
                                </button>
                                {activeColumnMenu === 'ov_driver_status' && (
                                  <div className="th-filter-popover popover-align-right" onClick={(e) => e.stopPropagation()}>
                                    <div className="th-popover-title">Filter Status Driver</div>
                                    <button
                                      type="button"
                                      className={`th-popover-item ${overviewDriverStatusFilter === 'all' && overviewDriverSortKey !== 'status' ? 'active' : ''}`}
                                      onClick={() => {
                                        setOverviewDriverStatusFilter('all');
                                        setOverviewDriverSortKey('created_at');
                                        setDriverTablePage(1);
                                        setActiveColumnMenu(null);
                                      }}
                                    >
                                      <span>Semua Status</span>
                                      {overviewDriverStatusFilter === 'all' && overviewDriverSortKey !== 'status' && <Check size={13} />}
                                    </button>
                                    <button
                                      type="button"
                                      className={`th-popover-item ${overviewDriverStatusFilter === 'pending' ? 'active' : ''}`}
                                      onClick={() => {
                                        setOverviewDriverStatusFilter('pending');
                                        setDriverTablePage(1);
                                        setActiveColumnMenu(null);
                                      }}
                                    >
                                      <span>Menunggu Review</span>
                                      {overviewDriverStatusFilter === 'pending' && <Check size={13} />}
                                    </button>
                                    <button
                                      type="button"
                                      className={`th-popover-item ${overviewDriverStatusFilter === 'approved' ? 'active' : ''}`}
                                      onClick={() => {
                                        setOverviewDriverStatusFilter('approved');
                                        setDriverTablePage(1);
                                        setActiveColumnMenu(null);
                                      }}
                                    >
                                      <span>Disetujui</span>
                                      {overviewDriverStatusFilter === 'approved' && <Check size={13} />}
                                    </button>
                                    <button
                                      type="button"
                                      className={`th-popover-item ${overviewDriverStatusFilter === 'rejected' ? 'active' : ''}`}
                                      onClick={() => {
                                        setOverviewDriverStatusFilter('rejected');
                                        setDriverTablePage(1);
                                        setActiveColumnMenu(null);
                                      }}
                                    >
                                      <span>Ditolak</span>
                                      {overviewDriverStatusFilter === 'rejected' && <Check size={13} />}
                                    </button>
                                    <div className="th-popover-divider" />
                                    <div className="th-popover-title">Urutkan Status</div>
                                    <button
                                      type="button"
                                      className={`th-popover-item ${overviewDriverSortKey === 'status' && overviewDriverSortDir === 'asc' ? 'active' : ''}`}
                                      onClick={() => handleSetOverviewDriverSort('status', 'asc')}
                                    >
                                      <span>Status (A → Z)</span>
                                      {overviewDriverSortKey === 'status' && overviewDriverSortDir === 'asc' && <Check size={13} />}
                                    </button>
                                    <button
                                      type="button"
                                      className={`th-popover-item ${overviewDriverSortKey === 'status' && overviewDriverSortDir === 'desc' ? 'active' : ''}`}
                                      onClick={() => handleSetOverviewDriverSort('status', 'desc')}
                                    >
                                      <span>Status (Z → A)</span>
                                      {overviewDriverSortKey === 'status' && overviewDriverSortDir === 'desc' && <Check size={13} />}
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </th>
                          <th className="tailadmin-th text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedOverviewDrivers.length === 0 ? (
                          <tr>
                            <td colSpan="5" style={{ textAlign: 'center', padding: '32px 16px', color: '#64748B' }}>
                              {overviewDriverServiceFilter !== 'all' || overviewDriverStatusFilter !== 'all'
                                ? 'Tidak ada data driver yang sesuai dengan filter yang dipilih.'
                                : 'Belum ada pendaftaran driver di database.'}
                            </td>
                          </tr>
                        ) : (
                          paginatedDrivers.map((d) => {
                            const isPending = d.verification_status === 'pending';
                            const isRejected = d.verification_status === 'rejected';
                            const statusClass = isPending ? 'pending' : isRejected ? 'cancel' : 'active';
                            const statusLabel = isPending ? 'Menunggu Review' : isRejected ? 'Ditolak' : 'Disetujui';

                            return (
                              <tr
                                key={d.id}
                                className="tailadmin-tr"
                                onClick={() => {
                                  setMainSection('drivers');
                                  setDriverSearchQuery(d.name);
                                }}
                                title={`Klik untuk melihat detail ${d.name}`}
                              >
                                <td className="tailadmin-td user-td">
                                  <div className="table-user-cell">
                                    <div className="table-user-avatar">
                                      <img
                                        src={d.avatar || driverPlaceholder}
                                        alt={d.name}
                                        className="table-avatar-photo"
                                        onError={(e) => {
                                          e.currentTarget.onerror = null;
                                          e.currentTarget.src = driverPlaceholder;
                                        }}
                                      />
                                    </div>
                                    <div className="table-user-meta">
                                      <span className="table-user-name">{d.name}</span>
                                      <span className="table-user-sub">
                                        {d.phone || '-'}
                                      </span>
                                    </div>
                                  </div>
                                </td>
                                <td className="tailadmin-td service-td">
                                  <div className="table-cell-meta">
                                    <span className="table-primary-text">
                                      {d.vehicleType === 'mobil' ? 'SheCar (Mobil)' : 'SheRide (Motor)'}
                                    </span>
                                    <span className="table-secondary-text">
                                      {d.vehicleModel || (d.vehicleType === 'mobil' ? 'Mobil' : 'Motor')}
                                      {d.plateNumber ? ` • ${d.plateNumber}` : ''}
                                      {d.vehicleColor ? ` (${d.vehicleColor})` : ''}
                                    </span>
                                  </div>
                                </td>
                                <td className="tailadmin-td area-td">
                                  <div className="table-cell-meta">
                                    <span
                                      className="table-primary-text area-truncate"
                                      title={d.operationalArea || 'Makassar dan sekitarnya'}
                                    >
                                      {formatOperationalArea(d.operationalArea)}
                                    </span>
                                    <span className="table-secondary-text">
                                      {d.created_at
                                        ? `Daftar: ${new Date(d.created_at).toLocaleDateString('id-ID', {
                                            day: 'numeric',
                                            month: 'short',
                                            year: 'numeric'
                                          })}`
                                        : 'Mitra Terdaftar'}
                                    </span>
                                  </div>
                                </td>
                                <td className="tailadmin-td status-td">
                                  <span className={`table-status-pill ${statusClass}`}>
                                    {statusLabel}
                                  </span>
                                </td>
                                <td className="tailadmin-td action-td text-right">
                                  <div className="table-action-group table-action-icons-row">
                                    <button
                                      type="button"
                                      className="btn-table-icon-action btn-icon-edit"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenEditDriver(d);
                                      }}
                                      title={isPending ? 'Lengkapi & Verifikasi Berkas Driver' : 'Edit & Lengkapi Data Driver'}
                                      aria-label="Edit Data Driver"
                                    >
                                      <Edit3 size={15} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* TailAdmin Table Footer Pagination Driver */}
                  <div className="tailadmin-table-footer">
                    <div className="table-pagination-info">
                      Menampilkan{' '}
                      <strong>
                        {sortedOverviewDrivers.length === 0
                          ? 0
                          : (currentDriverPage - 1) * TABLE_PAGE_SIZE + 1}
                        {' - '}
                        {Math.min(currentDriverPage * TABLE_PAGE_SIZE, sortedOverviewDrivers.length)}
                      </strong>{' '}
                      dari <strong>{sortedOverviewDrivers.length}</strong> driver
                    </div>

                    <div className="table-pagination-controls">
                      <button
                        type="button"
                        className="btn-pagination-nav"
                        disabled={currentDriverPage <= 1}
                        onClick={() => setDriverTablePage((p) => Math.max(1, p - 1))}
                        title="Halaman sebelumnya"
                      >
                        <ChevronLeft size={15} />
                        <span>Sebelumnya</span>
                      </button>

                      <div className="table-pagination-pages">
                        {renderPaginationPages(currentDriverPage, totalDriverPages, setDriverTablePage)}
                      </div>

                      <button
                        type="button"
                        className="btn-pagination-nav"
                        disabled={currentDriverPage >= totalDriverPages}
                        onClick={() => setDriverTablePage((p) => Math.min(totalDriverPages, p + 1))}
                        title="Halaman berikutnya"
                      >
                        <span>Berikutnya</span>
                        <ChevronRight size={15} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right Split: Pelanggan Terdaftar Terbaru - TailAdmin Table Style */}
                <div className="overview-split-card tailadmin-table-card">
                  <div className="split-card-header">
                    <h3 className="split-title">Pelanggan Terdaftar Terbaru</h3>
                  </div>

                  <div className="tailadmin-table-responsive">
                    <table className="tailadmin-project-table">
                      <thead>
                        <tr className="tailadmin-th-row">
                          <th className="tailadmin-th text-left">
                            <div className="th-header-inner">
                              <span>Pelanggan</span>
                              <div className="th-filter-dropdown-container">
                                <button
                                  type="button"
                                  className={`th-filter-btn ${overviewCustomerSortKey === 'name' || overviewCustomerSortKey === 'created_at' ? 'is-active' : ''}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleColumnMenu('ov_cust_name');
                                  }}
                                  title="Filter & Urutkan Pelanggan"
                                  aria-label="Filter & Urutkan Pelanggan"
                                >
                                  <ArrowUpDown size={12} />
                                </button>
                                {activeColumnMenu === 'ov_cust_name' && (
                                  <div className="th-filter-popover" onClick={(e) => e.stopPropagation()}>
                                    <div className="th-popover-title">Urutkan Pelanggan</div>
                                    <button
                                      type="button"
                                      className={`th-popover-item ${overviewCustomerSortKey === 'created_at' && overviewCustomerSortDir === 'desc' ? 'active' : ''}`}
                                      onClick={() => handleSetOverviewCustomerSort('created_at', 'desc')}
                                    >
                                      <span>Data Terbaru (Bergabung)</span>
                                      {overviewCustomerSortKey === 'created_at' && overviewCustomerSortDir === 'desc' && <Check size={13} />}
                                    </button>
                                    <button
                                      type="button"
                                      className={`th-popover-item ${overviewCustomerSortKey === 'created_at' && overviewCustomerSortDir === 'asc' ? 'active' : ''}`}
                                      onClick={() => handleSetOverviewCustomerSort('created_at', 'asc')}
                                    >
                                      <span>Data Terlama (Bergabung)</span>
                                      {overviewCustomerSortKey === 'created_at' && overviewCustomerSortDir === 'asc' && <Check size={13} />}
                                    </button>
                                    <div className="th-popover-divider" />
                                    <button
                                      type="button"
                                      className={`th-popover-item ${overviewCustomerSortKey === 'name' && overviewCustomerSortDir === 'asc' ? 'active' : ''}`}
                                      onClick={() => handleSetOverviewCustomerSort('name', 'asc')}
                                    >
                                      <span>Nama (A → Z)</span>
                                      {overviewCustomerSortKey === 'name' && overviewCustomerSortDir === 'asc' && <Check size={13} />}
                                    </button>
                                    <button
                                      type="button"
                                      className={`th-popover-item ${overviewCustomerSortKey === 'name' && overviewCustomerSortDir === 'desc' ? 'active' : ''}`}
                                      onClick={() => handleSetOverviewCustomerSort('name', 'desc')}
                                    >
                                      <span>Nama (Z → A)</span>
                                      {overviewCustomerSortKey === 'name' && overviewCustomerSortDir === 'desc' && <Check size={13} />}
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </th>
                          <th className="tailadmin-th text-left">
                            <div className="th-header-inner">
                              <span>Kontak</span>
                              <div className="th-filter-dropdown-container">
                                <button
                                  type="button"
                                  className={`th-filter-btn ${overviewCustomerSortKey === 'phone' ? 'is-active' : ''}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleColumnMenu('ov_cust_phone');
                                  }}
                                  title="Urutkan Kontak"
                                  aria-label="Urutkan Kontak"
                                >
                                  <ArrowUpDown size={12} />
                                </button>
                                {activeColumnMenu === 'ov_cust_phone' && (
                                  <div className="th-filter-popover" onClick={(e) => e.stopPropagation()}>
                                    <div className="th-popover-title">Urutkan Nomor Kontak</div>
                                    <button
                                      type="button"
                                      className={`th-popover-item ${overviewCustomerSortKey === 'phone' && overviewCustomerSortDir === 'asc' ? 'active' : ''}`}
                                      onClick={() => handleSetOverviewCustomerSort('phone', 'asc')}
                                    >
                                      <span>Nomor HP (0 → 9)</span>
                                      {overviewCustomerSortKey === 'phone' && overviewCustomerSortDir === 'asc' && <Check size={13} />}
                                    </button>
                                    <button
                                      type="button"
                                      className={`th-popover-item ${overviewCustomerSortKey === 'phone' && overviewCustomerSortDir === 'desc' ? 'active' : ''}`}
                                      onClick={() => handleSetOverviewCustomerSort('phone', 'desc')}
                                    >
                                      <span>Nomor HP (9 → 0)</span>
                                      {overviewCustomerSortKey === 'phone' && overviewCustomerSortDir === 'desc' && <Check size={13} />}
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </th>
                          <th className="tailadmin-th text-left">
                            <div className="th-header-inner">
                              <span>Aktivitas & Bergabung</span>
                              <div className="th-filter-dropdown-container">
                                <button
                                  type="button"
                                  className={`th-filter-btn ${overviewCustomerSortKey === 'created_at' || overviewCustomerSortKey === 'orders' ? 'is-active' : ''}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleColumnMenu('ov_cust_activity');
                                  }}
                                  title="Filter & Urutkan Aktivitas"
                                  aria-label="Filter & Urutkan Aktivitas"
                                >
                                  <ArrowUpDown size={12} />
                                </button>
                                {activeColumnMenu === 'ov_cust_activity' && (
                                  <div className="th-filter-popover popover-align-right" onClick={(e) => e.stopPropagation()}>
                                    <div className="th-popover-title">Waktu Bergabung</div>
                                    <button
                                      type="button"
                                      className={`th-popover-item ${overviewCustomerSortKey === 'created_at' && overviewCustomerSortDir === 'desc' ? 'active' : ''}`}
                                      onClick={() => handleSetOverviewCustomerSort('created_at', 'desc')}
                                    >
                                      <span>Data Terbaru (Bergabung)</span>
                                      {overviewCustomerSortKey === 'created_at' && overviewCustomerSortDir === 'desc' && <Check size={13} />}
                                    </button>
                                    <button
                                      type="button"
                                      className={`th-popover-item ${overviewCustomerSortKey === 'created_at' && overviewCustomerSortDir === 'asc' ? 'active' : ''}`}
                                      onClick={() => handleSetOverviewCustomerSort('created_at', 'asc')}
                                    >
                                      <span>Data Terlama (Bergabung)</span>
                                      {overviewCustomerSortKey === 'created_at' && overviewCustomerSortDir === 'asc' && <Check size={13} />}
                                    </button>
                                    <div className="th-popover-divider" />
                                    <div className="th-popover-title">Jumlah Pesanan</div>
                                    <button
                                      type="button"
                                      className={`th-popover-item ${overviewCustomerSortKey === 'orders' && overviewCustomerSortDir === 'desc' ? 'active' : ''}`}
                                      onClick={() => handleSetOverviewCustomerSort('orders', 'desc')}
                                    >
                                      <span>Pesanan Terbanyak</span>
                                      {overviewCustomerSortKey === 'orders' && overviewCustomerSortDir === 'desc' && <Check size={13} />}
                                    </button>
                                    <button
                                      type="button"
                                      className={`th-popover-item ${overviewCustomerSortKey === 'orders' && overviewCustomerSortDir === 'asc' ? 'active' : ''}`}
                                      onClick={() => handleSetOverviewCustomerSort('orders', 'asc')}
                                    >
                                      <span>Pesanan Tersedikit</span>
                                      {overviewCustomerSortKey === 'orders' && overviewCustomerSortDir === 'asc' && <Check size={13} />}
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </th>
                          <th className="tailadmin-th text-left">
                            <div className="th-header-inner">
                              <span>Status</span>
                              <div className="th-filter-dropdown-container">
                                <button
                                  type="button"
                                  className={`th-filter-btn ${overviewCustomerStatusFilter !== 'all' || overviewCustomerSortKey === 'status' ? 'is-active' : ''}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleColumnMenu('ov_cust_status');
                                  }}
                                  title="Filter & Urutkan Status"
                                  aria-label="Filter & Urutkan Status"
                                >
                                  <ArrowUpDown size={12} />
                                </button>
                                {activeColumnMenu === 'ov_cust_status' && (
                                  <div className="th-filter-popover popover-align-right" onClick={(e) => e.stopPropagation()}>
                                    <div className="th-popover-title">Filter Status Pelanggan</div>
                                    <button
                                      type="button"
                                      className={`th-popover-item ${overviewCustomerStatusFilter === 'all' && overviewCustomerSortKey !== 'status' ? 'active' : ''}`}
                                      onClick={() => {
                                        setOverviewCustomerStatusFilter('all');
                                        setOverviewCustomerSortKey('created_at');
                                        setCustomerTablePage(1);
                                        setActiveColumnMenu(null);
                                      }}
                                    >
                                      <span>Semua Status</span>
                                      {overviewCustomerStatusFilter === 'all' && overviewCustomerSortKey !== 'status' && <Check size={13} />}
                                    </button>
                                    <button
                                      type="button"
                                      className={`th-popover-item ${overviewCustomerStatusFilter === 'active' ? 'active' : ''}`}
                                      onClick={() => {
                                        setOverviewCustomerStatusFilter('active');
                                        setCustomerTablePage(1);
                                        setActiveColumnMenu(null);
                                      }}
                                    >
                                      <span>Hanya Aktif</span>
                                      {overviewCustomerStatusFilter === 'active' && <Check size={13} />}
                                    </button>
                                    <button
                                      type="button"
                                      className={`th-popover-item ${overviewCustomerStatusFilter === 'suspended' ? 'active' : ''}`}
                                      onClick={() => {
                                        setOverviewCustomerStatusFilter('suspended');
                                        setCustomerTablePage(1);
                                        setActiveColumnMenu(null);
                                      }}
                                    >
                                      <span>Hanya Ditangguhkan</span>
                                      {overviewCustomerStatusFilter === 'suspended' && <Check size={13} />}
                                    </button>
                                    <div className="th-popover-divider" />
                                    <div className="th-popover-title">Urutkan Status</div>
                                    <button
                                      type="button"
                                      className={`th-popover-item ${overviewCustomerSortKey === 'status' && overviewCustomerSortDir === 'asc' ? 'active' : ''}`}
                                      onClick={() => handleSetOverviewCustomerSort('status', 'asc')}
                                    >
                                      <span>Status (A → Z)</span>
                                      {overviewCustomerSortKey === 'status' && overviewCustomerSortDir === 'asc' && <Check size={13} />}
                                    </button>
                                    <button
                                      type="button"
                                      className={`th-popover-item ${overviewCustomerSortKey === 'status' && overviewCustomerSortDir === 'desc' ? 'active' : ''}`}
                                      onClick={() => handleSetOverviewCustomerSort('status', 'desc')}
                                    >
                                      <span>Status (Z → A)</span>
                                      {overviewCustomerSortKey === 'status' && overviewCustomerSortDir === 'desc' && <Check size={13} />}
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </th>
                          <th className="tailadmin-th text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedOverviewCustomers.length === 0 ? (
                          <tr>
                            <td colSpan="5" style={{ textAlign: 'center', padding: '32px 16px', color: '#64748B' }}>
                              {overviewCustomerStatusFilter !== 'all'
                                ? 'Tidak ada data pelanggan yang sesuai dengan filter yang dipilih.'
                                : 'Belum ada data pelanggan di database.'}
                            </td>
                          </tr>
                        ) : (
                          paginatedCustomers.map((c) => {
                            const isSuspended = c.status === 'suspended';
                            const statusClass = isSuspended ? 'cancel' : 'active';
                            const statusLabel = isSuspended ? 'Ditangguhkan' : 'Aktif';
                            const orderCount = getCustomerOrderCount(c);
                            const formattedDate = c.created_at
                              ? new Date(c.created_at).toLocaleDateString('id-ID', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric'
                                })
                              : '10 Sep 2026';

                            return (
                              <tr
                                key={c.id}
                                className="tailadmin-tr"
                                onClick={() => setSelectedCustomerDetail(c)}
                                title={`Klik untuk melihat detail ${c.full_name || 'Pelanggan'}`}
                              >
                                <td className="tailadmin-td user-td">
                                  <div className="table-user-cell">
                                    <div className="table-user-avatar customer-initial-avatar">
                                      {c.avatar_url ? (
                                        <img
                                          src={c.avatar_url}
                                          alt={c.full_name || 'Pelanggan'}
                                          onError={(e) => {
                                            e.currentTarget.style.display = 'none';
                                            const fallback = e.currentTarget.parentElement.querySelector('.customer-initial-text');
                                            if (fallback) fallback.style.display = 'flex';
                                          }}
                                        />
                                      ) : null}
                                      <span
                                        className="customer-initial-text"
                                        style={{ display: c.avatar_url ? 'none' : 'flex' }}
                                      >
                                        {c.full_name ? c.full_name.charAt(0).toUpperCase() : 'P'}
                                      </span>
                                    </div>
                                    <div className="table-user-meta">
                                      <span className="table-user-name">{c.full_name || 'Pelanggan'}</span>
                                      <span className="table-user-sub">
                                        {c.gender || 'Perempuan'} • Pelanggan
                                      </span>
                                    </div>
                                  </div>
                                </td>
                                <td className="tailadmin-td contact-td">
                                  <div className="table-cell-meta">
                                    <span className="table-primary-text">{c.phone || '-'}</span>
                                    <span className="table-secondary-text">{c.email || 'Tanpa email'}</span>
                                  </div>
                                </td>
                                <td className="tailadmin-td area-td">
                                  <div className="table-cell-meta">
                                    <span className="table-primary-text">
                                      {orderCount > 0 ? `${orderCount}x Pesanan` : 'Pelanggan Baru'}
                                    </span>
                                    <span className="table-secondary-text">
                                      Daftar: {formattedDate}
                                    </span>
                                  </div>
                                </td>
                                <td className="tailadmin-td status-td">
                                  <span className={`table-status-pill ${statusClass}`}>
                                    {statusLabel}
                                  </span>
                                </td>
                                <td className="tailadmin-td action-td text-right">
                                  <div className="table-action-group table-action-icons-row">
                                    <button
                                      type="button"
                                      className="btn-table-icon-action btn-icon-detail"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedCustomerDetail(c);
                                      }}
                                      title="Lihat Detail Profil Pelanggan"
                                      aria-label="Detail Pelanggan"
                                    >
                                      <Eye size={15} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* TailAdmin Table Footer Pagination Customer */}
                  <div className="tailadmin-table-footer">
                    <div className="table-pagination-info">
                      Menampilkan{' '}
                      <strong>
                        {sortedOverviewCustomers.length === 0
                          ? 0
                          : (currentCustomerPage - 1) * TABLE_PAGE_SIZE + 1}
                        {' - '}
                        {Math.min(currentCustomerPage * TABLE_PAGE_SIZE, sortedOverviewCustomers.length)}
                      </strong>{' '}
                      dari <strong>{sortedOverviewCustomers.length}</strong> pelanggan
                    </div>

                    <div className="table-pagination-controls">
                      <button
                        type="button"
                        className="btn-pagination-nav"
                        disabled={currentCustomerPage <= 1}
                        onClick={() => setCustomerTablePage((p) => Math.max(1, p - 1))}
                        title="Halaman sebelumnya"
                      >
                        <ChevronLeft size={15} />
                        <span>Sebelumnya</span>
                      </button>

                      <div className="table-pagination-pages">
                        {renderPaginationPages(currentCustomerPage, totalCustomerPages, setCustomerTablePage)}
                      </div>

                      <button
                        type="button"
                        className="btn-pagination-nav"
                        disabled={currentCustomerPage >= totalCustomerPages}
                        onClick={() => setCustomerTablePage((p) => Math.min(totalCustomerPages, p + 1))}
                        title="Halaman berikutnya"
                      >
                        <span>Berikutnya</span>
                        <ChevronRight size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* VIEW 1: VERIFIKASI MITRA DRIVER                                   */}
          {/* ================================================================= */}
          {mainSection === 'drivers' && (
          <>
            {/* KPI Summary Cards Driver */}
            <section className="dash-metrics-grid">
              <div
                className={`metric-card ${driverTab === 'pending' ? 'active' : ''}`}
                onClick={() => setDriverTab('pending')}
              >
                <span className="metric-label">Menunggu Verifikasi</span>
                <div className="metric-bottom-row">
                  <span className="metric-num">{driverCounts.pending}</span>
                  <div className="metric-trend-wrap">
                    <span className={`metric-trend-badge ${driverCounts.pending > 0 ? 'warning' : 'success'}`}>
                      {driverCounts.pending > 0 ? '+20%' : '0%'}
                    </span>
                    <span className="metric-trend-text">Vs last month</span>
                  </div>
                </div>
              </div>

              <div
                className={`metric-card ${driverTab === 'approved' ? 'active' : ''}`}
                onClick={() => setDriverTab('approved')}
              >
                <span className="metric-label">Mitra Disetujui (Aktif)</span>
                <div className="metric-bottom-row">
                  <span className="metric-num">{driverCounts.approved}</span>
                  <div className="metric-trend-wrap">
                    <span className="metric-trend-badge success">+4%</span>
                    <span className="metric-trend-text">Vs last month</span>
                  </div>
                </div>
              </div>

              <div
                className={`metric-card ${driverTab === 'rejected' ? 'active' : ''}`}
                onClick={() => setDriverTab('rejected')}
              >
                <span className="metric-label">Pengajuan Ditolak</span>
                <div className="metric-bottom-row">
                  <span className="metric-num">{driverCounts.rejected}</span>
                  <div className="metric-trend-wrap">
                    <span className="metric-trend-badge danger">-1.59%</span>
                    <span className="metric-trend-text">Vs last month</span>
                  </div>
                </div>
              </div>

              <div
                className={`metric-card ${driverTab === 'all' ? 'active' : ''}`}
                onClick={() => setDriverTab('all')}
              >
                <span className="metric-label">Total Semua Pendaftar</span>
                <div className="metric-bottom-row">
                  <span className="metric-num">{driverCounts.all}</span>
                  <div className="metric-trend-wrap">
                    <span className="metric-trend-badge success">+8%</span>
                    <span className="metric-trend-text">Vs last month</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Filter and Search Bar Driver */}
            <section className="dash-filter-row">
              <div className="dash-tabs">
                <button
                  className={`dash-tab-btn ${driverTab === 'pending' ? 'active' : ''}`}
                  onClick={() => setDriverTab('pending')}
                >
                  Menunggu Review
                  {driverCounts.pending > 0 && (
                    <span className="tab-counter-badge">{driverCounts.pending}</span>
                  )}
                </button>
                <button
                  className={`dash-tab-btn ${driverTab === 'approved' ? 'active' : ''}`}
                  onClick={() => setDriverTab('approved')}
                >
                  Disetujui ({driverCounts.approved})
                </button>
                <button
                  className={`dash-tab-btn ${driverTab === 'rejected' ? 'active' : ''}`}
                  onClick={() => setDriverTab('rejected')}
                >
                  Ditolak ({driverCounts.rejected})
                </button>
                <button
                  className={`dash-tab-btn ${driverTab === 'all' ? 'active' : ''}`}
                  onClick={() => setDriverTab('all')}
                >
                  Semua ({driverCounts.all})
                </button>
              </div>

              <div className="dash-search-box">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  placeholder="Cari nama driver, plat motor, NIK, atau no HP..."
                  value={driverSearchQuery}
                  onChange={(e) => setDriverSearchQuery(e.target.value)}
                />
                {driverSearchQuery && (
                  <button
                    type="button"
                    className="btn-clear-search"
                    onClick={() => setDriverSearchQuery('')}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </section>

            {/* Driver Table Section - TailAdmin Table Style */}
            <section className="dash-driver-list-section">
              <div className="overview-split-card tailadmin-table-card">
                <div className="tailadmin-table-responsive">
                  <table className="tailadmin-project-table">
                    <thead>
                      <tr className="tailadmin-th-row">
                        <th className="tailadmin-th text-left">
                          <div className="th-header-inner">
                            <span>Driver</span>
                            <div className="th-filter-dropdown-container">
                              <button
                                type="button"
                                className={`th-filter-btn ${driverSortKey === 'name' || driverSortKey === 'created_at' ? 'is-active' : ''}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleColumnMenu('driver_name');
                                }}
                                title="Filter & Urutkan Driver"
                                aria-label="Filter & Urutkan Driver"
                              >
                                <ArrowUpDown size={12} />
                              </button>
                              {activeColumnMenu === 'driver_name' && (
                                <div className="th-filter-popover" onClick={(e) => e.stopPropagation()}>
                                  <div className="th-popover-title">Urutkan Driver</div>
                                  <button
                                    type="button"
                                    className={`th-popover-item ${driverSortKey === 'created_at' && driverSortDir === 'desc' ? 'active' : ''}`}
                                    onClick={() => handleSetDriverSort('created_at', 'desc')}
                                  >
                                    <span>Data Terbaru (Daftar)</span>
                                    {driverSortKey === 'created_at' && driverSortDir === 'desc' && <Check size={13} />}
                                  </button>
                                  <button
                                    type="button"
                                    className={`th-popover-item ${driverSortKey === 'created_at' && driverSortDir === 'asc' ? 'active' : ''}`}
                                    onClick={() => handleSetDriverSort('created_at', 'asc')}
                                  >
                                    <span>Data Terlama (Daftar)</span>
                                    {driverSortKey === 'created_at' && driverSortDir === 'asc' && <Check size={13} />}
                                  </button>
                                  <div className="th-popover-divider" />
                                  <button
                                    type="button"
                                    className={`th-popover-item ${driverSortKey === 'name' && driverSortDir === 'asc' ? 'active' : ''}`}
                                    onClick={() => handleSetDriverSort('name', 'asc')}
                                  >
                                    <span>Nama (A → Z)</span>
                                    {driverSortKey === 'name' && driverSortDir === 'asc' && <Check size={13} />}
                                  </button>
                                  <button
                                    type="button"
                                    className={`th-popover-item ${driverSortKey === 'name' && driverSortDir === 'desc' ? 'active' : ''}`}
                                    onClick={() => handleSetDriverSort('name', 'desc')}
                                  >
                                    <span>Nama (Z → A)</span>
                                    {driverSortKey === 'name' && driverSortDir === 'desc' && <Check size={13} />}
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </th>
                        <th className="tailadmin-th text-left">
                          <div className="th-header-inner">
                            <span>Layanan & Kendaraan</span>
                            <div className="th-filter-dropdown-container">
                              <button
                                type="button"
                                className={`th-filter-btn ${driverServiceFilter !== 'all' || driverSortKey === 'vehicleType' ? 'is-active' : ''}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleColumnMenu('driver_service');
                                }}
                                title="Filter & Urutkan Layanan"
                                aria-label="Filter & Urutkan Layanan"
                              >
                                <ArrowUpDown size={12} />
                              </button>
                              {activeColumnMenu === 'driver_service' && (
                                <div className="th-filter-popover" onClick={(e) => e.stopPropagation()}>
                                  <div className="th-popover-title">Filter Layanan</div>
                                  <button
                                    type="button"
                                    className={`th-popover-item ${driverServiceFilter === 'all' && driverSortKey !== 'vehicleType' ? 'active' : ''}`}
                                    onClick={() => { setDriverServiceFilter('all'); setDriverSortKey('created_at'); setActiveColumnMenu(null); }}
                                  >
                                    <span>Semua Layanan</span>
                                    {driverServiceFilter === 'all' && driverSortKey !== 'vehicleType' && <Check size={13} />}
                                  </button>
                                  <button
                                    type="button"
                                    className={`th-popover-item ${driverServiceFilter === 'motor' ? 'active' : ''}`}
                                    onClick={() => { setDriverServiceFilter('motor'); setActiveColumnMenu(null); }}
                                  >
                                    <span>SheRide (Motor)</span>
                                    {driverServiceFilter === 'motor' && <Check size={13} />}
                                  </button>
                                  <button
                                    type="button"
                                    className={`th-popover-item ${driverServiceFilter === 'mobil' ? 'active' : ''}`}
                                    onClick={() => { setDriverServiceFilter('mobil'); setActiveColumnMenu(null); }}
                                  >
                                    <span>SheCar (Mobil)</span>
                                    {driverServiceFilter === 'mobil' && <Check size={13} />}
                                  </button>
                                  <div className="th-popover-divider" />
                                  <div className="th-popover-title">Urutkan Kendaraan</div>
                                  <button
                                    type="button"
                                    className={`th-popover-item ${driverSortKey === 'vehicleType' && driverSortDir === 'asc' ? 'active' : ''}`}
                                    onClick={() => handleSetDriverSort('vehicleType', 'asc')}
                                  >
                                    <span>Motor Dahulu</span>
                                    {driverSortKey === 'vehicleType' && driverSortDir === 'asc' && <Check size={13} />}
                                  </button>
                                  <button
                                    type="button"
                                    className={`th-popover-item ${driverSortKey === 'vehicleType' && driverSortDir === 'desc' ? 'active' : ''}`}
                                    onClick={() => handleSetDriverSort('vehicleType', 'desc')}
                                  >
                                    <span>Mobil Dahulu</span>
                                    {driverSortKey === 'vehicleType' && driverSortDir === 'desc' && <Check size={13} />}
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </th>
                        <th className="tailadmin-th text-left">
                          <div className="th-header-inner">
                            <span>Berkas Dokumen</span>
                            <div className="th-filter-dropdown-container">
                              <button
                                type="button"
                                className={`th-filter-btn ${driverDocFilter !== 'all' || driverSortKey === 'docs' ? 'is-active' : ''}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleColumnMenu('driver_docs');
                                }}
                                title="Filter & Urutkan Berkas Dokumen"
                                aria-label="Filter & Urutkan Berkas Dokumen"
                              >
                                <ArrowUpDown size={12} />
                              </button>
                              {activeColumnMenu === 'driver_docs' && (
                                <div className="th-filter-popover" onClick={(e) => e.stopPropagation()}>
                                  <div className="th-popover-title">Filter Kelengkapan</div>
                                  <button
                                    type="button"
                                    className={`th-popover-item ${driverDocFilter === 'all' && driverSortKey !== 'docs' ? 'active' : ''}`}
                                    onClick={() => { setDriverDocFilter('all'); setDriverSortKey('created_at'); setActiveColumnMenu(null); }}
                                  >
                                    <span>Semua Dokumen</span>
                                    {driverDocFilter === 'all' && driverSortKey !== 'docs' && <Check size={13} />}
                                  </button>
                                  <button
                                    type="button"
                                    className={`th-popover-item ${driverDocFilter === 'complete' ? 'active' : ''}`}
                                    onClick={() => { setDriverDocFilter('complete'); setActiveColumnMenu(null); }}
                                  >
                                    <span>Hanya Dokumen Lengkap</span>
                                    {driverDocFilter === 'complete' && <Check size={13} />}
                                  </button>
                                  <button
                                    type="button"
                                    className={`th-popover-item ${driverDocFilter === 'incomplete' ? 'active' : ''}`}
                                    onClick={() => { setDriverDocFilter('incomplete'); setActiveColumnMenu(null); }}
                                  >
                                    <span>Hanya Belum Lengkap</span>
                                    {driverDocFilter === 'incomplete' && <Check size={13} />}
                                  </button>
                                  <div className="th-popover-divider" />
                                  <div className="th-popover-title">Urutkan Dokumen</div>
                                  <button
                                    type="button"
                                    className={`th-popover-item ${driverSortKey === 'docs' && driverSortDir === 'desc' ? 'active' : ''}`}
                                    onClick={() => handleSetDriverSort('docs', 'desc')}
                                  >
                                    <span>Lengkap Dahulu</span>
                                    {driverSortKey === 'docs' && driverSortDir === 'desc' && <Check size={13} />}
                                  </button>
                                  <button
                                    type="button"
                                    className={`th-popover-item ${driverSortKey === 'docs' && driverSortDir === 'asc' ? 'active' : ''}`}
                                    onClick={() => handleSetDriverSort('docs', 'asc')}
                                  >
                                    <span>Belum Lengkap Dahulu</span>
                                    {driverSortKey === 'docs' && driverSortDir === 'asc' && <Check size={13} />}
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </th>
                        <th className="tailadmin-th text-left">
                          <div className="th-header-inner">
                            <span>Wilayah Operasional</span>
                            <div className="th-filter-dropdown-container">
                              <button
                                type="button"
                                className={`th-filter-btn ${driverSortKey === 'operationalArea' ? 'is-active' : ''}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleColumnMenu('driver_area');
                                }}
                                title="Filter & Urutkan Wilayah"
                                aria-label="Filter & Urutkan Wilayah"
                              >
                                <ArrowUpDown size={12} />
                              </button>
                              {activeColumnMenu === 'driver_area' && (
                                <div className="th-filter-popover popover-align-right" onClick={(e) => e.stopPropagation()}>
                                  <div className="th-popover-title">Urutkan Tanggal / Wilayah</div>
                                  <button
                                    type="button"
                                    className={`th-popover-item ${driverSortKey === 'created_at' && driverSortDir === 'desc' ? 'active' : ''}`}
                                    onClick={() => handleSetDriverSort('created_at', 'desc')}
                                  >
                                    <span>Tanggal Terbaru</span>
                                    {driverSortKey === 'created_at' && driverSortDir === 'desc' && <Check size={13} />}
                                  </button>
                                  <button
                                    type="button"
                                    className={`th-popover-item ${driverSortKey === 'created_at' && driverSortDir === 'asc' ? 'active' : ''}`}
                                    onClick={() => handleSetDriverSort('created_at', 'asc')}
                                  >
                                    <span>Tanggal Terlama</span>
                                    {driverSortKey === 'created_at' && driverSortDir === 'asc' && <Check size={13} />}
                                  </button>
                                  <div className="th-popover-divider" />
                                  <button
                                    type="button"
                                    className={`th-popover-item ${driverSortKey === 'operationalArea' && driverSortDir === 'asc' ? 'active' : ''}`}
                                    onClick={() => handleSetDriverSort('operationalArea', 'asc')}
                                  >
                                    <span>Wilayah (A → Z)</span>
                                    {driverSortKey === 'operationalArea' && driverSortDir === 'asc' && <Check size={13} />}
                                  </button>
                                  <button
                                    type="button"
                                    className={`th-popover-item ${driverSortKey === 'operationalArea' && driverSortDir === 'desc' ? 'active' : ''}`}
                                    onClick={() => handleSetDriverSort('operationalArea', 'desc')}
                                  >
                                    <span>Wilayah (Z → A)</span>
                                    {driverSortKey === 'operationalArea' && driverSortDir === 'desc' && <Check size={13} />}
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </th>
                        <th className="tailadmin-th text-left">
                          <div className="th-header-inner">
                            <span>Status</span>
                            <div className="th-filter-dropdown-container">
                              <button
                                type="button"
                                className={`th-filter-btn ${driverTab !== 'all' || driverSortKey === 'status' ? 'is-active' : ''}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleColumnMenu('driver_status');
                                }}
                                title="Filter & Urutkan Status"
                                aria-label="Filter & Urutkan Status"
                              >
                                <ArrowUpDown size={12} />
                              </button>
                              {activeColumnMenu === 'driver_status' && (
                                <div className="th-filter-popover popover-align-right" onClick={(e) => e.stopPropagation()}>
                                  <div className="th-popover-title">Filter Status Driver</div>
                                  <button
                                    type="button"
                                    className={`th-popover-item ${driverTab === 'all' && driverSortKey !== 'status' ? 'active' : ''}`}
                                    onClick={() => { setDriverTab('all'); setDriverSortKey('created_at'); setActiveColumnMenu(null); }}
                                  >
                                    <span>Semua Status</span>
                                    {driverTab === 'all' && driverSortKey !== 'status' && <Check size={13} />}
                                  </button>
                                  <button
                                    type="button"
                                    className={`th-popover-item ${driverTab === 'pending' ? 'active' : ''}`}
                                    onClick={() => { setDriverTab('pending'); setActiveColumnMenu(null); }}
                                  >
                                    <span>Menunggu Review</span>
                                    {driverTab === 'pending' && <Check size={13} />}
                                  </button>
                                  <button
                                    type="button"
                                    className={`th-popover-item ${driverTab === 'approved' ? 'active' : ''}`}
                                    onClick={() => { setDriverTab('approved'); setActiveColumnMenu(null); }}
                                  >
                                    <span>Disetujui</span>
                                    {driverTab === 'approved' && <Check size={13} />}
                                  </button>
                                  <button
                                    type="button"
                                    className={`th-popover-item ${driverTab === 'rejected' ? 'active' : ''}`}
                                    onClick={() => { setDriverTab('rejected'); setActiveColumnMenu(null); }}
                                  >
                                    <span>Ditolak</span>
                                    {driverTab === 'rejected' && <Check size={13} />}
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </th>
                        <th className="tailadmin-th text-right">Aksi Verifikasi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDrivers.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="table-empty-td">
                            <div className="table-empty-content">
                              <Sparkles size={28} className="empty-icon" />
                              <span>
                                {driverTab === 'pending'
                                  ? 'Semua permohonan mitra pengemudi sudah diproses!'
                                  : 'Tidak ditemukan data pengemudi pada filter ini.'}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        paginatedDriversView.map((driver) => {
                          const driverDocs = getDriverDocs(driver.id);
                          const ktpDoc = driverDocs.find((d) => d.document_type === 'ktp');
                          const simDoc = driverDocs.find((d) => d.document_type === 'sim');
                          const stnkDoc = driverDocs.find((d) => d.document_type === 'stnk');

                          const hasKtp = Boolean(ktpDoc?.document_url || driver.ktpUrl);
                          const hasSim = Boolean(simDoc?.document_url || driver.simUrl);
                          const hasStnk = Boolean(stnkDoc?.document_url || driver.stnkUrl);
                          const isDocsComplete = hasKtp && hasSim && hasStnk;
                          const missingDocs = [
                            !hasKtp && 'KTP',
                            !hasSim && 'SIM',
                            !hasStnk && 'STNK'
                          ].filter(Boolean);

                          const isPending = driver.verification_status === 'pending';
                          const isApproved = (driver.verification_status || 'approved') === 'approved';
                          const isRejected = driver.verification_status === 'rejected';
                          const statusClass = isPending ? 'pending' : isRejected ? 'cancel' : 'active';
                          const statusLabel = isPending ? 'Menunggu Review' : isRejected ? 'Ditolak' : 'Disetujui';

                          const waPhone = (driver.phone || '').replace(/^\+?62|^0/, '62');

                          return (
                            <tr key={driver.id} className="tailadmin-tr">
                              <td className="tailadmin-td user-td">
                                <div className="table-user-cell">
                                  <div className="table-user-avatar">
                                    <img
                                      src={driver.avatar || driverPlaceholder}
                                      alt={driver.name}
                                      className="table-avatar-photo"
                                      onError={(e) => {
                                        e.currentTarget.onerror = null;
                                        e.currentTarget.src = driverPlaceholder;
                                      }}
                                    />
                                  </div>
                                  <div className="table-user-meta">
                                    <span className="table-user-name">{driver.name}</span>
                                    <span className="table-user-sub">
                                      {driver.phone || '-'}
                                      {driver.phone && (
                                        <a
                                          href={`https://wa.me/${waPhone}?text=Halo%20Kak%20${encodeURIComponent(driver.name)},%20kami%20dari%20Admin%20OTWJek%20terkait%20verifikasi%20mitra%20driver%20wanita.`}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="table-wa-link"
                                          onClick={(e) => e.stopPropagation()}
                                          title="Chat WhatsApp Driver"
                                        >
                                          WA <ExternalLink size={10} />
                                        </a>
                                      )}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className="tailadmin-td service-td">
                                <div className="table-cell-meta">
                                  <span className="table-primary-text">
                                    {driver.vehicleType === 'mobil' ? 'SheCar (Mobil)' : 'SheRide (Motor)'}
                                  </span>
                                  <span className="table-secondary-text">
                                    {driver.vehicleModel || (driver.vehicleType === 'mobil' ? 'Mobil' : 'Motor')}
                                    {driver.plateNumber ? ` • ${driver.plateNumber}` : ''}
                                    {driver.vehicleColor ? ` (${driver.vehicleColor})` : ''}
                                  </span>
                                </div>
                              </td>
                              <td className="tailadmin-td docs-td">
                                <span
                                  className={`table-status-pill docs-status-pill ${isDocsComplete ? 'active' : 'pending'}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenEditDriver(driver, 'dokumen');
                                  }}
                                  role="button"
                                  tabIndex={0}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleOpenEditDriver(driver, 'dokumen');
                                    }
                                  }}
                                  title={
                                    isDocsComplete
                                      ? 'Dokumen KTP, SIM, dan STNK lengkap. Klik untuk kelola berkas.'
                                      : `Dokumen belum lengkap (Belum ada: ${missingDocs.join(', ')}). Klik untuk lengkapi berkas.`
                                  }
                                >
                                  {isDocsComplete ? 'Dokumen Lengkap' : 'Belum Lengkap'}
                                </span>
                              </td>
                              <td className="tailadmin-td area-td">
                                <div className="table-cell-meta">
                                  <span
                                    className="table-primary-text area-truncate"
                                    title={driver.operationalArea || 'Makassar dan sekitarnya'}
                                  >
                                    {formatOperationalArea(driver.operationalArea)}
                                  </span>
                                  <span className="table-secondary-text">
                                    {driver.created_at
                                      ? `Daftar: ${new Date(driver.created_at).toLocaleDateString('id-ID', {
                                          day: 'numeric',
                                          month: 'short',
                                          year: 'numeric'
                                        })}`
                                      : 'Mitra Terdaftar'}
                                  </span>
                                </div>
                              </td>
                              <td className="tailadmin-td status-td">
                                <span className={`table-status-pill ${statusClass}`}>
                                  {statusLabel}
                                </span>
                              </td>
                              <td className="tailadmin-td action-td text-right">
                                <div className="table-action-group table-action-icons-row">
                                  <button
                                    type="button"
                                    className="btn-table-icon-action btn-icon-edit"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenEditDriver(driver);
                                    }}
                                    title="Edit & Lengkapi Data Driver"
                                    aria-label="Edit Data Driver"
                                  >
                                    <Edit3 size={15} />
                                  </button>

                                  {isPending && (
                                    <>
                                      <button
                                        type="button"
                                        className="btn-table-icon-action btn-icon-approve"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setApproveConfirmDriver(driver);
                                        }}
                                        title="Setujui Permohonan Driver"
                                        aria-label="Setujui Driver"
                                      >
                                        <CheckCircle2 size={15} />
                                      </button>
                                      <button
                                        type="button"
                                        className="btn-table-icon-action btn-icon-reject"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setRejectModalDriver(driver);
                                        }}
                                        title="Tolak Berkas Driver"
                                        aria-label="Tolak Driver"
                                      >
                                        <XCircle size={15} />
                                      </button>
                                    </>
                                  )}

                                  {isApproved && (
                                    <button
                                      type="button"
                                      className="btn-table-icon-action btn-icon-revoke"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setRejectModalDriver(driver);
                                      }}
                                      title="Cabut Status Persetujuan"
                                      aria-label="Cabut Status Persetujuan"
                                    >
                                      <XCircle size={15} />
                                    </button>
                                  )}

                                  {isRejected && (
                                    <button
                                      type="button"
                                      className="btn-table-icon-action btn-icon-approve"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setApproveConfirmDriver(driver);
                                      }}
                                      title="Tinjau Ulang & Setujui"
                                      aria-label="Setujui Ulang"
                                    >
                                      <CheckCircle2 size={15} />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* TailAdmin Table Footer Pagination Driver View */}
                <div className="tailadmin-table-footer">
                  <div className="table-pagination-info">
                    Menampilkan{' '}
                    <strong>
                      {filteredDrivers.length === 0
                        ? 0
                        : (currentDriversViewPage - 1) * TABLE_PAGE_SIZE + 1}
                      {' - '}
                      {Math.min(currentDriversViewPage * TABLE_PAGE_SIZE, filteredDrivers.length)}
                    </strong>{' '}
                    dari <strong>{filteredDrivers.length}</strong> driver
                  </div>

                  <div className="table-pagination-controls">
                    <button
                      type="button"
                      className="btn-pagination-nav"
                      disabled={currentDriversViewPage <= 1}
                      onClick={() => setDriversViewPage((p) => Math.max(1, p - 1))}
                      title="Halaman sebelumnya"
                    >
                      <ChevronLeft size={15} />
                      <span>Sebelumnya</span>
                    </button>

                    <div className="table-pagination-pages">
                      {renderPaginationPages(currentDriversViewPage, totalDriversViewPages, setDriversViewPage)}
                    </div>

                    <button
                      type="button"
                      className="btn-pagination-nav"
                      disabled={currentDriversViewPage >= totalDriversViewPages}
                      onClick={() => setDriversViewPage((p) => Math.min(totalDriversViewPages, p + 1))}
                      title="Halaman berikutnya"
                    >
                      <span>Berikutnya</span>
                      <ChevronRight size={15} />
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        {/* ================================================================= */}
        {/* VIEW 2: DATA PELANGGAN (CUSTOMER)                                */}
        {/* ================================================================= */}
        {mainSection === 'customers' && (
          <>
            {/* KPI Summary Cards Customer */}
            <section className="dash-metrics-grid">
              <div
                className={`metric-card ${customerTab === 'all' ? 'active' : ''}`}
                onClick={() => setCustomerTab('all')}
              >
                <span className="metric-label">Total Pelanggan Terdaftar</span>
                <div className="metric-bottom-row">
                  <span className="metric-num">{customerCounts.total}</span>
                  <div className="metric-trend-wrap">
                    <span className="metric-trend-badge success">+12%</span>
                    <span className="metric-trend-text">Vs last month</span>
                  </div>
                </div>
              </div>

              <div
                className={`metric-card ${customerTab === 'active' ? 'active' : ''}`}
                onClick={() => setCustomerTab('active')}
              >
                <span className="metric-label">Pelanggan Aktif</span>
                <div className="metric-bottom-row">
                  <span className="metric-num">{customerCounts.active}</span>
                  <div className="metric-trend-wrap">
                    <span className="metric-trend-badge success">+4%</span>
                    <span className="metric-trend-text">Vs last month</span>
                  </div>
                </div>
              </div>

              <div
                className={`metric-card ${customerTab === 'suspended' ? 'active' : ''}`}
                onClick={() => setCustomerTab('suspended')}
              >
                <span className="metric-label">Akun Ditangguhkan</span>
                <div className="metric-bottom-row">
                  <span className="metric-num">{customerCounts.suspended}</span>
                  <div className="metric-trend-wrap">
                    <span className="metric-trend-badge danger">-1.59%</span>
                    <span className="metric-trend-text">Vs last month</span>
                  </div>
                </div>
              </div>

              <div className="metric-card static-info">
                <span className="metric-label">Pelanggan Wanita Terverifikasi</span>
                <div className="metric-bottom-row">
                  <span className="metric-num">100%</span>
                  <div className="metric-trend-wrap">
                    <span className="metric-trend-badge success">+7%</span>
                    <span className="metric-trend-text">Vs last month</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Filter and Search Bar Customer */}
            <section className="dash-filter-row">
              <div className="dash-tabs">
                <button
                  className={`dash-tab-btn ${customerTab === 'all' ? 'active' : ''}`}
                  onClick={() => setCustomerTab('all')}
                >
                  Semua Pelanggan ({customerCounts.total})
                </button>
                <button
                  className={`dash-tab-btn ${customerTab === 'active' ? 'active' : ''}`}
                  onClick={() => setCustomerTab('active')}
                >
                  Aktif ({customerCounts.active})
                </button>
                <button
                  className={`dash-tab-btn ${customerTab === 'suspended' ? 'active' : ''}`}
                  onClick={() => setCustomerTab('suspended')}
                >
                  Ditangguhkan ({customerCounts.suspended})
                </button>
              </div>

              <div className="dash-search-box">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  placeholder="Cari nama pelanggan, nomor WhatsApp, atau email..."
                  value={customerSearchQuery}
                  onChange={(e) => setCustomerSearchQuery(e.target.value)}
                />
                {customerSearchQuery && (
                  <button
                    type="button"
                    className="btn-clear-search"
                    onClick={() => setCustomerSearchQuery('')}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </section>

            {/* Customer Table Section - TailAdmin Table Style */}
            <section className="dash-customer-list-section">
              <div className="overview-split-card tailadmin-table-card">
                <div className="tailadmin-table-responsive">
                  <table className="tailadmin-project-table">
                    <thead>
                      <tr className="tailadmin-th-row">
                        <th className="tailadmin-th text-left">
                          <div className="th-header-inner">
                            <span>Pelanggan</span>
                            <div className="th-filter-dropdown-container">
                              <button
                                type="button"
                                className={`th-filter-btn ${customerSortKey === 'name' || customerSortKey === 'created_at' ? 'is-active' : ''}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleColumnMenu('cust_name');
                                }}
                                title="Filter & Urutkan Pelanggan"
                                aria-label="Filter & Urutkan Pelanggan"
                              >
                                <ArrowUpDown size={12} />
                              </button>
                              {activeColumnMenu === 'cust_name' && (
                                <div className="th-filter-popover" onClick={(e) => e.stopPropagation()}>
                                  <div className="th-popover-title">Urutkan Pelanggan</div>
                                  <button
                                    type="button"
                                    className={`th-popover-item ${customerSortKey === 'created_at' && customerSortDir === 'desc' ? 'active' : ''}`}
                                    onClick={() => handleSetCustomerSort('created_at', 'desc')}
                                  >
                                    <span>Data Terbaru (Bergabung)</span>
                                    {customerSortKey === 'created_at' && customerSortDir === 'desc' && <Check size={13} />}
                                  </button>
                                  <button
                                    type="button"
                                    className={`th-popover-item ${customerSortKey === 'created_at' && customerSortDir === 'asc' ? 'active' : ''}`}
                                    onClick={() => handleSetCustomerSort('created_at', 'asc')}
                                  >
                                    <span>Data Terlama (Bergabung)</span>
                                    {customerSortKey === 'created_at' && customerSortDir === 'asc' && <Check size={13} />}
                                  </button>
                                  <div className="th-popover-divider" />
                                  <button
                                    type="button"
                                    className={`th-popover-item ${customerSortKey === 'name' && customerSortDir === 'asc' ? 'active' : ''}`}
                                    onClick={() => handleSetCustomerSort('name', 'asc')}
                                  >
                                    <span>Nama (A → Z)</span>
                                    {customerSortKey === 'name' && customerSortDir === 'asc' && <Check size={13} />}
                                  </button>
                                  <button
                                    type="button"
                                    className={`th-popover-item ${customerSortKey === 'name' && customerSortDir === 'desc' ? 'active' : ''}`}
                                    onClick={() => handleSetCustomerSort('name', 'desc')}
                                  >
                                    <span>Nama (Z → A)</span>
                                    {customerSortKey === 'name' && customerSortDir === 'desc' && <Check size={13} />}
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </th>
                        <th className="tailadmin-th text-left">
                          <div className="th-header-inner">
                            <span>Kontak & WhatsApp</span>
                            <div className="th-filter-dropdown-container">
                              <button
                                type="button"
                                className={`th-filter-btn ${customerSortKey === 'phone' ? 'is-active' : ''}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleColumnMenu('cust_phone');
                                }}
                                title="Urutkan Kontak"
                                aria-label="Urutkan Kontak"
                              >
                                <ArrowUpDown size={12} />
                              </button>
                              {activeColumnMenu === 'cust_phone' && (
                                <div className="th-filter-popover" onClick={(e) => e.stopPropagation()}>
                                  <div className="th-popover-title">Urutkan Nomor Kontak</div>
                                  <button
                                    type="button"
                                    className={`th-popover-item ${customerSortKey === 'phone' && customerSortDir === 'asc' ? 'active' : ''}`}
                                    onClick={() => handleSetCustomerSort('phone', 'asc')}
                                  >
                                    <span>Nomor HP (0 → 9)</span>
                                    {customerSortKey === 'phone' && customerSortDir === 'asc' && <Check size={13} />}
                                  </button>
                                  <button
                                    type="button"
                                    className={`th-popover-item ${customerSortKey === 'phone' && customerSortDir === 'desc' ? 'active' : ''}`}
                                    onClick={() => handleSetCustomerSort('phone', 'desc')}
                                  >
                                    <span>Nomor HP (9 → 0)</span>
                                    {customerSortKey === 'phone' && customerSortDir === 'desc' && <Check size={13} />}
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </th>
                        <th className="tailadmin-th text-left">
                          <div className="th-header-inner">
                            <span>Aktivitas & Bergabung</span>
                            <div className="th-filter-dropdown-container">
                              <button
                                type="button"
                                className={`th-filter-btn ${customerSortKey === 'created_at' || customerSortKey === 'orders' ? 'is-active' : ''}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleColumnMenu('cust_activity');
                                }}
                                title="Filter & Urutkan Aktivitas"
                                aria-label="Filter & Urutkan Aktivitas"
                              >
                                <ArrowUpDown size={12} />
                              </button>
                              {activeColumnMenu === 'cust_activity' && (
                                <div className="th-filter-popover popover-align-right" onClick={(e) => e.stopPropagation()}>
                                  <div className="th-popover-title">Waktu Bergabung</div>
                                  <button
                                    type="button"
                                    className={`th-popover-item ${customerSortKey === 'created_at' && customerSortDir === 'desc' ? 'active' : ''}`}
                                    onClick={() => handleSetCustomerSort('created_at', 'desc')}
                                  >
                                    <span>Data Terbaru (Bergabung)</span>
                                    {customerSortKey === 'created_at' && customerSortDir === 'desc' && <Check size={13} />}
                                  </button>
                                  <button
                                    type="button"
                                    className={`th-popover-item ${customerSortKey === 'created_at' && customerSortDir === 'asc' ? 'active' : ''}`}
                                    onClick={() => handleSetCustomerSort('created_at', 'asc')}
                                  >
                                    <span>Data Terlama (Bergabung)</span>
                                    {customerSortKey === 'created_at' && customerSortDir === 'asc' && <Check size={13} />}
                                  </button>
                                  <div className="th-popover-divider" />
                                  <div className="th-popover-title">Jumlah Pesanan</div>
                                  <button
                                    type="button"
                                    className={`th-popover-item ${customerSortKey === 'orders' && customerSortDir === 'desc' ? 'active' : ''}`}
                                    onClick={() => handleSetCustomerSort('orders', 'desc')}
                                  >
                                    <span>Pesanan Terbanyak</span>
                                    {customerSortKey === 'orders' && customerSortDir === 'desc' && <Check size={13} />}
                                  </button>
                                  <button
                                    type="button"
                                    className={`th-popover-item ${customerSortKey === 'orders' && customerSortDir === 'asc' ? 'active' : ''}`}
                                    onClick={() => handleSetCustomerSort('orders', 'asc')}
                                  >
                                    <span>Pesanan Tersedikit</span>
                                    {customerSortKey === 'orders' && customerSortDir === 'asc' && <Check size={13} />}
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </th>
                        <th className="tailadmin-th text-left">
                          <div className="th-header-inner">
                            <span>Status</span>
                            <div className="th-filter-dropdown-container">
                              <button
                                type="button"
                                className={`th-filter-btn ${customerTab !== 'all' || customerSortKey === 'status' ? 'is-active' : ''}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleColumnMenu('cust_status');
                                }}
                                title="Filter & Urutkan Status"
                                aria-label="Filter & Urutkan Status"
                              >
                                <ArrowUpDown size={12} />
                              </button>
                              {activeColumnMenu === 'cust_status' && (
                                <div className="th-filter-popover popover-align-right" onClick={(e) => e.stopPropagation()}>
                                  <div className="th-popover-title">Filter Status Pelanggan</div>
                                  <button
                                    type="button"
                                    className={`th-popover-item ${customerTab === 'all' && customerSortKey !== 'status' ? 'active' : ''}`}
                                    onClick={() => { setCustomerTab('all'); setCustomerSortKey('created_at'); setActiveColumnMenu(null); }}
                                  >
                                    <span>Semua Status</span>
                                    {customerTab === 'all' && <Check size={13} />}
                                  </button>
                                  <button
                                    type="button"
                                    className={`th-popover-item ${customerTab === 'active' ? 'active' : ''}`}
                                    onClick={() => { setCustomerTab('active'); setActiveColumnMenu(null); }}
                                  >
                                    <span>Hanya Aktif</span>
                                    {customerTab === 'active' && <Check size={13} />}
                                  </button>
                                  <button
                                    type="button"
                                    className={`th-popover-item ${customerTab === 'suspended' ? 'active' : ''}`}
                                    onClick={() => { setCustomerTab('suspended'); setActiveColumnMenu(null); }}
                                  >
                                    <span>Hanya Ditangguhkan</span>
                                    {customerTab === 'suspended' && <Check size={13} />}
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </th>
                        <th className="tailadmin-th text-right">Aksi Kelola</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCustomers.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="table-empty-td">
                            <div className="table-empty-content">
                              <Users size={28} className="empty-icon" />
                              <span>
                                {customerSearchQuery
                                  ? `Tidak ditemukan pelanggan yang cocok dengan "${customerSearchQuery}".`
                                  : 'Belum ada data pelanggan yang terdaftar.'}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        paginatedCustomersView.map((cust) => {
                          const waPhone = (cust.phone || '').replace(/^\+?62|^0/, '62');
                          const isSuspended = cust.status === 'suspended';
                          const statusClass = isSuspended ? 'cancel' : 'active';
                          const statusLabel = isSuspended ? 'Ditangguhkan' : 'Aktif';
                          const orderCount = getCustomerOrderCount(cust);
                          const formattedDate = cust.created_at
                            ? new Date(cust.created_at).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })
                            : 'Baru ini';

                          return (
                            <tr
                              key={cust.id}
                              className="tailadmin-tr"
                              onClick={() => setSelectedCustomerDetail(cust)}
                              title={`Klik untuk melihat detail ${cust.full_name || 'Pelanggan'}`}
                            >
                              <td className="tailadmin-td user-td">
                                <div className="table-user-cell">
                                  <div className="table-user-avatar customer-initial-avatar">
                                    {cust.avatar_url ? (
                                      <img
                                        src={cust.avatar_url}
                                        alt={cust.full_name || 'Pelanggan'}
                                        onError={(e) => {
                                          e.currentTarget.style.display = 'none';
                                          const fallback = e.currentTarget.parentElement.querySelector('.customer-initial-text');
                                          if (fallback) fallback.style.display = 'flex';
                                        }}
                                      />
                                    ) : null}
                                    <span
                                      className="customer-initial-text"
                                      style={{ display: cust.avatar_url ? 'none' : 'flex' }}
                                    >
                                      {cust.full_name ? cust.full_name.charAt(0).toUpperCase() : 'P'}
                                    </span>
                                  </div>
                                  <div className="table-user-meta">
                                    <span className="table-user-name">{cust.full_name || 'Pelanggan OTWJek'}</span>
                                    <span className="table-user-sub">
                                      {cust.gender || 'Perempuan'} • Pelanggan Resmi
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className="tailadmin-td contact-td">
                                <div className="table-cell-meta">
                                  <span className="table-primary-text">
                                    {cust.phone || '-'}
                                    {cust.phone && (
                                      <a
                                        href={`https://wa.me/${waPhone}?text=Halo%20Kak%20${encodeURIComponent(cust.full_name || 'Pelanggan')},%20kami%20dari%20Customer%20Care%20OTWJek.`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="table-wa-link"
                                        onClick={(e) => e.stopPropagation()}
                                        title="Chat WhatsApp Pelanggan"
                                      >
                                        WA <ExternalLink size={10} />
                                      </a>
                                    )}
                                  </span>
                                  <span className="table-secondary-text">{cust.email || 'Tanpa email'}</span>
                                </div>
                              </td>
                              <td className="tailadmin-td area-td">
                                <div className="table-cell-meta">
                                  <span className="table-primary-text">
                                    {orderCount > 0 ? `${orderCount}x Pesanan` : 'Pelanggan Baru'}
                                  </span>
                                  <span className="table-secondary-text">
                                    Bergabung: {formattedDate}
                                  </span>
                                </div>
                              </td>
                              <td className="tailadmin-td status-td">
                                <span className={`table-status-pill ${statusClass}`}>
                                  {statusLabel}
                                </span>
                              </td>
                              <td className="tailadmin-td action-td text-right">
                                <div className="table-action-group table-action-icons-row">
                                  <button
                                    type="button"
                                    className="btn-table-icon-action btn-icon-detail"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedCustomerDetail(cust);
                                    }}
                                    title="Lihat Detail Profil Pelanggan"
                                    aria-label="Detail Pelanggan"
                                  >
                                    <Eye size={15} />
                                  </button>

                                  <button
                                    type="button"
                                    className={`btn-table-icon-action ${isSuspended ? 'btn-icon-activate' : 'btn-icon-suspend'}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setCustomerStatusConfirm(cust);
                                    }}
                                    title={isSuspended ? 'Aktifkan Kembali Akun Pelanggan' : 'Tangguhkan Akun Pelanggan'}
                                    aria-label={isSuspended ? 'Aktifkan Akun' : 'Tangguhkan Akun'}
                                  >
                                    {isSuspended ? <UserCheck size={15} /> : <UserX size={15} />}
                                  </button>

                                  <button
                                    type="button"
                                    className="btn-table-icon-action btn-icon-delete"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setCustomerDeleteConfirm(cust);
                                    }}
                                    title="Hapus Data Pelanggan Ini"
                                    aria-label="Hapus Pelanggan"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* TailAdmin Table Footer Pagination Customer View */}
                <div className="tailadmin-table-footer">
                  <div className="table-pagination-info">
                    Menampilkan{' '}
                    <strong>
                      {filteredCustomers.length === 0
                        ? 0
                        : (currentCustomersViewPage - 1) * TABLE_PAGE_SIZE + 1}
                      {' - '}
                      {Math.min(currentCustomersViewPage * TABLE_PAGE_SIZE, filteredCustomers.length)}
                    </strong>{' '}
                    dari <strong>{filteredCustomers.length}</strong> pelanggan
                  </div>

                  <div className="table-pagination-controls">
                    <button
                      type="button"
                      className="btn-pagination-nav"
                      disabled={currentCustomersViewPage <= 1}
                      onClick={() => setCustomersViewPage((p) => Math.max(1, p - 1))}
                      title="Halaman sebelumnya"
                    >
                      <ChevronLeft size={15} />
                      <span>Sebelumnya</span>
                    </button>

                    <div className="table-pagination-pages">
                      {renderPaginationPages(currentCustomersViewPage, totalCustomersViewPages, setCustomersViewPage)}
                    </div>

                    <button
                      type="button"
                      className="btn-pagination-nav"
                      disabled={currentCustomersViewPage >= totalCustomersViewPages}
                      onClick={() => setCustomersViewPage((p) => Math.min(totalCustomersViewPages, p + 1))}
                      title="Halaman berikutnya"
                    >
                      <span>Berikutnya</span>
                      <ChevronRight size={15} />
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </main>
    </div>

      {/* ================================================================= */}
      {/* MODAL 1: LIGHTBOX PREVIEW DOKUMEN DRIVER                          */}
      {/* ================================================================= */}
      {previewDoc && (
        <div className="admin-modal-backdrop" onClick={() => setPreviewDoc(null)}>
          <div className="admin-modal-lightbox" onClick={(e) => e.stopPropagation()}>
            <div className="lightbox-header">
              <div>
                <h3 className="lightbox-title">{previewDoc.title}</h3>
                <span className="lightbox-sub">Mitra: {previewDoc.driverName}</span>
              </div>
              <button
                type="button"
                className="btn-close-lightbox"
                onClick={() => setPreviewDoc(null)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="lightbox-body">
              <img src={previewDoc.url} alt={previewDoc.title} className="lightbox-full-img" />
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL 2: TOLAK PENGAJUAN DRIVER (REJECT DENGAN ALASAN)            */}
      {/* ================================================================= */}
      {rejectModalDriver && (
        <div className="admin-modal-backdrop" onClick={() => setRejectModalDriver(null)}>
          <div className="admin-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <div className="dialog-icon-wrap reject">
                <XCircle size={22} />
              </div>
              <div>
                <h3 className="dialog-title">Tolak Pendaftaran Driver</h3>
                <span className="dialog-sub">Calon: {rejectModalDriver.name}</span>
              </div>
              <button
                type="button"
                className="btn-close-dialog"
                onClick={() => setRejectModalDriver(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="dialog-body">
              <p className="dialog-instruction">
                Pilih alasan penolakan agar calon pengemudi dapat memperbaiki dokumennya:
              </p>

              <div className="reason-options-list">
                {[
                  'Foto KTP buram atau tidak terbaca dengan jelas.',
                  'Masa berlaku SIM sudah kadaluarsa.',
                  'Masa berlaku pajak STNK sudah habis / Plat nomor tidak sesuai.',
                  'Foto KTP/SIM terpotong atau bukan dokumen asli.',
                  'Foto wajah driver tidak jelas atau bukan perempuan.'
                ].map((reason) => (
                  <label key={reason} className="reason-radio-item">
                    <input
                      type="radio"
                      name="rejectReason"
                      value={reason}
                      checked={rejectReason === reason}
                      onChange={(e) => setRejectReason(e.target.value)}
                    />
                    <span>{reason}</span>
                  </label>
                ))}

                <label className="reason-radio-item">
                  <input
                    type="radio"
                    name="rejectReason"
                    value="custom"
                    checked={rejectReason === 'custom'}
                    onChange={() => setRejectReason('custom')}
                  />
                  <span>Tulis alasan khusus lainnya:</span>
                </label>
              </div>

              {rejectReason === 'custom' && (
                <textarea
                  className="dialog-custom-textarea"
                  placeholder="Ketikkan alasan penolakan secara spesifik..."
                  rows={3}
                  value={customRejectReason}
                  onChange={(e) => setCustomRejectReason(e.target.value)}
                />
              )}
            </div>

            <div className="dialog-footer">
              <button
                type="button"
                className="btn-dialog-cancel"
                onClick={() => setRejectModalDriver(null)}
              >
                Batal
              </button>
              <button
                type="button"
                className="btn-dialog-confirm-reject"
                onClick={handleConfirmReject}
                disabled={rejectReason === 'custom' && !customRejectReason.trim()}
              >
                Kirim Penolakan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL 3: KONFIRMASI APPROVE DRIVER                                */}
      {/* ================================================================= */}
      {approveConfirmDriver && (
        <div className="admin-modal-backdrop" onClick={() => setApproveConfirmDriver(null)}>
          <div className="admin-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <div className="dialog-icon-wrap approve">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <h3 className="dialog-title">Setujui Mitra Pengemudi?</h3>
                <span className="dialog-sub">Calon: {approveConfirmDriver.name}</span>
              </div>
              <button
                type="button"
                className="btn-close-dialog"
                onClick={() => setApproveConfirmDriver(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="dialog-body">
              <p className="dialog-instruction">
                Dengan menyetujui, akun pengemudi <strong>{approveConfirmDriver.name}</strong> ({approveConfirmDriver.plateNumber}) akan aktif secara resmi dan muncul di katalog pesanan SheRide / SheCar untuk pelanggan wanita.
              </p>
            </div>

            <div className="dialog-footer">
              <button
                type="button"
                className="btn-dialog-cancel"
                onClick={() => setApproveConfirmDriver(null)}
              >
                Batal
              </button>
              <button
                type="button"
                className="btn-dialog-confirm-approve"
                onClick={() => handleApprove(approveConfirmDriver)}
              >
                Ya, Setujui Mitra Ini
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL 4: DETAIL AKUN PELANGGAN (CUSTOMER DETAIL)                  */}
      {/* ================================================================= */}
      {selectedCustomerDetail && (
        <div className="admin-modal-backdrop" onClick={() => setSelectedCustomerDetail(null)}>
          <div className="admin-modal-dialog customer-detail-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <div>
                <h3 className="dialog-title">Detail Profil Pelanggan</h3>
              </div>
              <button
                type="button"
                className="btn-close-dialog"
                onClick={() => setSelectedCustomerDetail(null)}
                title="Tutup dialog"
              >
                <X size={16} />
              </button>
            </div>

            <div className="dialog-body customer-dialog-body">
              {/* Profile Card */}
              <div className="customer-modal-profile">
                <div className="customer-modal-avatar-wrapper">
                  <div className="customer-modal-avatar">
                    {selectedCustomerDetail.avatar_url ? (
                      <img src={selectedCustomerDetail.avatar_url} alt={selectedCustomerDetail.full_name} />
                    ) : (
                      <div className="modal-initials">
                        {selectedCustomerDetail.full_name ? selectedCustomerDetail.full_name.charAt(0).toUpperCase() : 'P'}
                      </div>
                    )}
                  </div>
                  <span
                    className={`cust-avatar-status-dot ${selectedCustomerDetail.status === 'suspended' ? 'suspended' : 'active'}`}
                    title={selectedCustomerDetail.status === 'suspended' ? 'Akun Ditangguhkan' : 'Akun Aktif'}
                  />
                </div>
                <div className="customer-modal-name-group">
                  <h4 className="modal-cust-name">{selectedCustomerDetail.full_name || 'Pelanggan'}</h4>
                  <div className="customer-modal-meta">
                    {selectedCustomerDetail.status === 'suspended' && (
                      <span className="cust-status-badge suspended">
                        Akun Ditangguhkan
                      </span>
                    )}
                    <span className="cust-meta-text">Perempuan (Khusus Wanita)</span>
                  </div>
                </div>
              </div>

              {/* Clean Key-Value List */}
              <div className="customer-details-list">
                <div className="cust-detail-row">
                  <span className="cust-detail-label">Nomor WhatsApp</span>
                  <div className="cust-detail-value-group">
                    <span className="cust-detail-value">{selectedCustomerDetail.phone || '-'}</span>
                    {selectedCustomerDetail.phone && (
                      <a
                        href={`https://wa.me/${(selectedCustomerDetail.phone || '').replace(/^\+?62|^0/, '62')}?text=Halo%20Kak%20${encodeURIComponent(selectedCustomerDetail.full_name || 'Pelanggan')},%20kami%20dari%20Customer%20Care%20OTWJek.`}
                        target="_blank"
                        rel="noreferrer"
                        className="cust-wa-link"
                        title="Buka WhatsApp"
                        aria-label="Buka WhatsApp"
                      >
                        <ExternalLink size={13} />
                      </a>
                    )}
                  </div>
                </div>

                <div className="cust-detail-row">
                  <span className="cust-detail-label">Alamat Email</span>
                  <span className="cust-detail-value">{selectedCustomerDetail.email || '-'}</span>
                </div>

                <div className="cust-detail-row">
                  <span className="cust-detail-label">Jenis Kelamin</span>
                  <span className="cust-detail-value">
                    {selectedCustomerDetail.gender || 'Perempuan'}
                  </span>
                </div>

                <div className="cust-detail-row">
                  <span className="cust-detail-label">Tanggal Lahir</span>
                  <span className="cust-detail-value">
                    {formatBirthDate(selectedCustomerDetail.birth_date || selectedCustomerDetail.birthDate)}
                  </span>
                </div>

                <div className="cust-detail-row">
                  <span className="cust-detail-label">Tanggal Bergabung</span>
                  <span className="cust-detail-value">
                    {selectedCustomerDetail.created_at
                      ? new Date(selectedCustomerDetail.created_at).toLocaleString('id-ID', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) + ' WITA'
                      : '-'}
                  </span>
                </div>

                <div className="cust-detail-row">
                  <span className="cust-detail-label">Total Pesanan</span>
                  <span className="cust-detail-value">
                    {getCustomerOrderCount(selectedCustomerDetail)} kali order
                  </span>
                </div>
              </div>
            </div>

            <div className="dialog-footer">
              <button
                type="button"
                className="btn-dialog-cancel"
                onClick={() => setSelectedCustomerDetail(null)}
              >
                Tutup
              </button>
              <button
                type="button"
                className={`btn-dialog-action-toggle ${selectedCustomerDetail.status === 'suspended' ? 'activate' : 'suspend'}`}
                onClick={() => {
                  handleToggleCustomerStatus(selectedCustomerDetail);
                }}
              >
                {selectedCustomerDetail.status === 'suspended' ? 'Aktifkan Akun Ini' : 'Tangguhkan Akun Ini'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL 5: KONFIRMASI STATUS PELANGGAN (AKTIFKAN/TANGGUHKAN)        */}
      {/* ================================================================= */}
      {customerStatusConfirm && (
        <div className="admin-modal-backdrop" onClick={() => setCustomerStatusConfirm(null)}>
          <div className="admin-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <div className={`dialog-icon-wrap ${customerStatusConfirm.status === 'suspended' ? 'approve' : 'reject'}`}>
                {customerStatusConfirm.status === 'suspended' ? (
                  <UserCheck size={22} />
                ) : (
                  <UserX size={22} />
                )}
              </div>
              <div>
                <h3 className="dialog-title">
                  {customerStatusConfirm.status === 'suspended'
                    ? 'Aktifkan Akun Pelanggan?'
                    : 'Tangguhkan Akun Pelanggan?'}
                </h3>
                <span className="dialog-sub">Pelanggan: {customerStatusConfirm.full_name}</span>
              </div>
              <button
                type="button"
                className="btn-close-dialog"
                onClick={() => setCustomerStatusConfirm(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="dialog-body">
              <p className="dialog-instruction">
                {customerStatusConfirm.status === 'suspended'
                  ? `Akun ${customerStatusConfirm.full_name} akan diaktifkan kembali sehingga dapat masuk dan melakukan pemesanan layanan OTWJek.`
                  : `Apakah Anda yakin ingin menangguhkan akun ${customerStatusConfirm.full_name}? Pelanggan tidak akan dapat memesan sampai akun diaktifkan kembali.`}
              </p>
            </div>

            <div className="dialog-footer">
              <button
                type="button"
                className="btn-dialog-cancel"
                onClick={() => setCustomerStatusConfirm(null)}
              >
                Batal
              </button>
              <button
                type="button"
                className={`btn-dialog-confirm-${customerStatusConfirm.status === 'suspended' ? 'approve' : 'reject'}`}
                onClick={() => handleToggleCustomerStatus(customerStatusConfirm)}
              >
                {customerStatusConfirm.status === 'suspended'
                  ? 'Ya, Aktifkan Akun'
                  : 'Ya, Tangguhkan Akun'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL 6: KONFIRMASI HAPUS PELANGGAN                               */}
      {/* ================================================================= */}
      {customerDeleteConfirm && (
        <div className="admin-modal-backdrop" onClick={() => setCustomerDeleteConfirm(null)}>
          <div className="admin-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <div className="dialog-icon-wrap reject">
                <Trash2 size={22} />
              </div>
              <div>
                <h3 className="dialog-title">Hapus Akun Pelanggan?</h3>
                <span className="dialog-sub">Pelanggan: {customerDeleteConfirm.full_name}</span>
              </div>
              <button
                type="button"
                className="btn-close-dialog"
                onClick={() => setCustomerDeleteConfirm(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="dialog-body">
              <p className="dialog-instruction">
                Tindakan ini akan menghapus data akun <strong>{customerDeleteConfirm.full_name}</strong> ({customerDeleteConfirm.phone}) secara permanen dari basis data pelanggan OTWJek.
              </p>
            </div>

            <div className="dialog-footer">
              <button
                type="button"
                className="btn-dialog-cancel"
                onClick={() => setCustomerDeleteConfirm(null)}
              >
                Batal
              </button>
              <button
                type="button"
                className="btn-dialog-confirm-reject"
                onClick={() => handleDeleteCustomer(customerDeleteConfirm)}
              >
                Ya, Hapus Permanen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL 7: EDIT & LENGKAPI DATA DRIVER (SIMPLE, CLEAN & MINIMALIST) */}
      {/* ================================================================= */}
      {editingDriver && editDriverForm && (
        <div className="admin-modal-backdrop" onClick={() => !isSavingDriver && setEditingDriver(null)}>
          <div className="admin-modal-dialog driver-edit-dialog-minimal" onClick={(e) => e.stopPropagation()}>
            {/* Header: Clean & Uncluttered */}
            <div className="dialog-header edit-dialog-header-minimal">
              <div>
                <div className="edit-dialog-title-row">
                  <h3 className="dialog-title">Edit Data Mitra Driver</h3>
                  <span className={`table-status-pill ${
                    editDriverForm.verification_status === 'pending'
                      ? 'pending'
                      : editDriverForm.verification_status === 'rejected'
                      ? 'cancel'
                      : 'active'
                  }`}>
                    {editDriverForm.verification_status === 'pending'
                      ? 'Menunggu Review'
                      : editDriverForm.verification_status === 'rejected'
                      ? 'Ditolak'
                      : 'Disetujui'}
                  </span>
                </div>
                <span className="dialog-sub">{editingDriver.name}</span>
              </div>
              <button
                type="button"
                className="btn-close-dialog"
                disabled={isSavingDriver}
                onClick={() => setEditingDriver(null)}
                title="Tutup dialog"
              >
                <X size={16} />
              </button>
            </div>

            {/* Clean Text-Only Tabs */}
            <div className="driver-edit-tabs-minimal">
              <button
                type="button"
                className={`tab-btn-minimal ${editDriverActiveTab === 'identitas' ? 'active' : ''}`}
                onClick={() => setEditDriverActiveTab('identitas')}
              >
                Identitas
              </button>
              <button
                type="button"
                className={`tab-btn-minimal ${editDriverActiveTab === 'kendaraan' ? 'active' : ''}`}
                onClick={() => setEditDriverActiveTab('kendaraan')}
              >
                Kendaraan
              </button>
              <button
                type="button"
                className={`tab-btn-minimal ${editDriverActiveTab === 'dokumen' ? 'active' : ''}`}
                onClick={() => setEditDriverActiveTab('dokumen')}
              >
                Dokumen
              </button>
              <button
                type="button"
                className={`tab-btn-minimal ${editDriverActiveTab === 'status' ? 'active' : ''}`}
                onClick={() => setEditDriverActiveTab('status')}
              >
                Status & Darurat
              </button>
            </div>

            {/* Modal Body */}
            <div className="dialog-body edit-body-minimal">
              {/* TAB 1: IDENTITAS */}
              {editDriverActiveTab === 'identitas' && (
                <div className="edit-section-stack">
                  {/* Avatar minimal */}
                  <div className="avatar-row-minimal">
                    <img
                      src={editDriverForm.avatar || driverPlaceholder}
                      alt="Driver Avatar"
                      className="avatar-thumb-minimal"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = driverPlaceholder;
                      }}
                    />
                    <div className="avatar-info-minimal">
                      <span className="avatar-label-minimal">Foto Profil Mitra</span>
                      <label className="btn-file-text-minimal">
                        <span>Pilih Foto Baru</span>
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={handleAvatarFile}
                        />
                      </label>
                    </div>
                  </div>

                  <div className="minimal-grid">
                    <div className="minimal-field">
                      <label>Nama Lengkap</label>
                      <input
                        type="text"
                        placeholder="Nama lengkap driver"
                        value={editDriverForm.name}
                        onChange={(e) => setEditDriverForm({ ...editDriverForm, name: e.target.value })}
                      />
                    </div>

                    <div className="minimal-field">
                      <label>Nomor WhatsApp</label>
                      <input
                        type="text"
                        placeholder="08xxxxxxxxxx"
                        value={editDriverForm.phone}
                        onChange={(e) => setEditDriverForm({ ...editDriverForm, phone: e.target.value })}
                      />
                    </div>

                    <div className="minimal-field">
                      <label>NIK (KTP)</label>
                      <input
                        type="text"
                        maxLength={16}
                        placeholder="16 digit NIK"
                        value={editDriverForm.nik}
                        onChange={(e) => setEditDriverForm({ ...editDriverForm, nik: e.target.value })}
                      />
                    </div>

                    <div className="minimal-field">
                      <label>Jenis Kelamin</label>
                      <input
                        type="text"
                        value="Perempuan (Khusus Wanita)"
                        readOnly
                        className="readonly"
                      />
                    </div>

                    <div className="minimal-field full">
                      <label>Bio / Catatan Pelayanan</label>
                      <textarea
                        rows={2}
                        placeholder="Catatan pelayanan driver..."
                        value={editDriverForm.bio}
                        onChange={(e) => setEditDriverForm({ ...editDriverForm, bio: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: KENDARAAN */}
              {editDriverActiveTab === 'kendaraan' && (
                <div className="edit-section-stack">
                  <div className="minimal-grid">
                    <div className="minimal-field">
                      <label>Jenis Layanan</label>
                      <select
                        value={editDriverForm.vehicleType}
                        onChange={(e) => setEditDriverForm({ ...editDriverForm, vehicleType: e.target.value })}
                      >
                        <option value="motor">SheRide (Sepeda Motor)</option>
                        <option value="mobil">SheCar (Mobil Penumpang)</option>
                      </select>
                    </div>

                    <div className="minimal-field">
                      <label>Merk Kendaraan</label>
                      <input
                        type="text"
                        placeholder="Honda, Yamaha, Toyota..."
                        value={editDriverForm.vehicleBrand}
                        onChange={(e) => setEditDriverForm({ ...editDriverForm, vehicleBrand: e.target.value })}
                      />
                    </div>

                    <div className="minimal-field">
                      <label>Model & Tipe</label>
                      <input
                        type="text"
                        placeholder="Scoopy, Fazzio, Calya..."
                        value={editDriverForm.vehicleModel}
                        onChange={(e) => setEditDriverForm({ ...editDriverForm, vehicleModel: e.target.value })}
                      />
                    </div>

                    <div className="minimal-field">
                      <label>Plat Nomor</label>
                      <input
                        type="text"
                        placeholder="DD 1234 XX"
                        value={editDriverForm.plateNumber}
                        onChange={(e) => setEditDriverForm({ ...editDriverForm, plateNumber: e.target.value.toUpperCase() })}
                      />
                    </div>

                    <div className="minimal-field">
                      <label>Warna Kendaraan</label>
                      <input
                        type="text"
                        placeholder="Warna kendaraan"
                        value={editDriverForm.vehicleColor}
                        onChange={(e) => setEditDriverForm({ ...editDriverForm, vehicleColor: e.target.value })}
                      />
                    </div>

                    <div className="minimal-field">
                      <label>Area Operasional</label>
                      <input
                        type="text"
                        placeholder="Makassar, Gowa..."
                        value={editDriverForm.operationalArea}
                        onChange={(e) => setEditDriverForm({ ...editDriverForm, operationalArea: e.target.value })}
                      />
                    </div>

                    <div className="minimal-field full">
                      <label>Badge Mitra</label>
                      <input
                        type="text"
                        placeholder="Mitra Resmi 🌸"
                        value={editDriverForm.badge}
                        onChange={(e) => setEditDriverForm({ ...editDriverForm, badge: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: DOKUMEN & LEGALITAS */}
              {editDriverActiveTab === 'dokumen' && (
                <div className="edit-section-stack">
                  <div className="minimal-grid">
                    <div className="minimal-field">
                      <label>Nomor SIM</label>
                      <input
                        type="text"
                        placeholder="Nomor SIM"
                        value={editDriverForm.simNumber}
                        onChange={(e) => setEditDriverForm({ ...editDriverForm, simNumber: e.target.value })}
                      />
                    </div>

                    <div className="minimal-field">
                      <label>Masa Berlaku SIM</label>
                      <input
                        type="date"
                        value={editDriverForm.simExpiry || ''}
                        onChange={(e) => setEditDriverForm({ ...editDriverForm, simExpiry: e.target.value })}
                      />
                    </div>

                    <div className="minimal-field full">
                      <label>Masa Berlaku STNK</label>
                      <input
                        type="date"
                        value={editDriverForm.stnkExpiry || ''}
                        onChange={(e) => setEditDriverForm({ ...editDriverForm, stnkExpiry: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Clean Minimal Document Rows */}
                  <div className="docs-list-minimal">
                    <div className="doc-row-minimal">
                      <div className="doc-info-minimal">
                        <span className="doc-name-minimal">Foto KTP Asli</span>
                        <span className={`doc-status-badge ${editDriverForm.ktpUrl ? 'ready' : 'empty'}`}>
                          {editDriverForm.ktpUrl ? 'Tersedia' : 'Belum Ada'}
                        </span>
                      </div>
                      <div className="doc-actions-minimal">
                        {editDriverForm.ktpUrl && (
                          <button
                            type="button"
                            className="btn-doc-link-minimal"
                            onClick={() => setPreviewDoc({ type: 'KTP', title: 'Foto KTP', url: editDriverForm.ktpUrl, driverName: editDriverForm.name })}
                          >
                            Lihat Foto
                          </button>
                        )}
                        <label className="btn-doc-upload-minimal">
                          <span>{editDriverForm.ktpUrl ? 'Ganti File' : 'Unggah File'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={(e) => handleDocFile('ktp', e)}
                          />
                        </label>
                      </div>
                    </div>

                    <div className="doc-row-minimal">
                      <div className="doc-info-minimal">
                        <span className="doc-name-minimal">Foto SIM Asli</span>
                        <span className={`doc-status-badge ${editDriverForm.simUrl ? 'ready' : 'empty'}`}>
                          {editDriverForm.simUrl ? 'Tersedia' : 'Belum Ada'}
                        </span>
                      </div>
                      <div className="doc-actions-minimal">
                        {editDriverForm.simUrl && (
                          <button
                            type="button"
                            className="btn-doc-link-minimal"
                            onClick={() => setPreviewDoc({ type: 'SIM', title: 'Foto SIM', url: editDriverForm.simUrl, driverName: editDriverForm.name })}
                          >
                            Lihat Foto
                          </button>
                        )}
                        <label className="btn-doc-upload-minimal">
                          <span>{editDriverForm.simUrl ? 'Ganti File' : 'Unggah File'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={(e) => handleDocFile('sim', e)}
                          />
                        </label>
                      </div>
                    </div>

                    <div className="doc-row-minimal">
                      <div className="doc-info-minimal">
                        <span className="doc-name-minimal">Foto STNK Kendaraan</span>
                        <span className={`doc-status-badge ${editDriverForm.stnkUrl ? 'ready' : 'empty'}`}>
                          {editDriverForm.stnkUrl ? 'Tersedia' : 'Belum Ada'}
                        </span>
                      </div>
                      <div className="doc-actions-minimal">
                        {editDriverForm.stnkUrl && (
                          <button
                            type="button"
                            className="btn-doc-link-minimal"
                            onClick={() => setPreviewDoc({ type: 'STNK', title: 'Foto STNK', url: editDriverForm.stnkUrl, driverName: editDriverForm.name })}
                          >
                            Lihat Foto
                          </button>
                        )}
                        <label className="btn-doc-upload-minimal">
                          <span>{editDriverForm.stnkUrl ? 'Ganti File' : 'Unggah File'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={(e) => handleDocFile('stnk', e)}
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: STATUS & DARURAT */}
              {editDriverActiveTab === 'status' && (
                <div className="edit-section-stack">
                  <div className="minimal-grid">
                    <div className="minimal-field">
                      <label>Kontak Darurat (Nama)</label>
                      <input
                        type="text"
                        placeholder="Nama keluarga / kerabat"
                        value={editDriverForm.emergencyContactName}
                        onChange={(e) => setEditDriverForm({ ...editDriverForm, emergencyContactName: e.target.value })}
                      />
                    </div>

                    <div className="minimal-field">
                      <label>Nomor HP Darurat</label>
                      <input
                        type="text"
                        placeholder="08xxxxxxxxxx"
                        value={editDriverForm.emergencyContactPhone}
                        onChange={(e) => setEditDriverForm({ ...editDriverForm, emergencyContactPhone: e.target.value })}
                      />
                    </div>

                    <div className="minimal-field full">
                      <label>Status Verifikasi Akun</label>
                      <select
                        value={editDriverForm.verification_status}
                        onChange={(e) => setEditDriverForm({ ...editDriverForm, verification_status: e.target.value })}
                      >
                        <option value="approved">Disetujui (Approved / Aktif)</option>
                        <option value="pending">Menunggu Review (Pending)</option>
                        <option value="rejected">Ditolak (Rejected)</option>
                      </select>
                    </div>

                    {editDriverForm.verification_status === 'rejected' && (
                      <div className="minimal-field full">
                        <label>Alasan Penolakan</label>
                        <textarea
                          rows={2}
                          placeholder="Jelaskan alasan penolakan berkas..."
                          value={editDriverForm.rejection_reason}
                          onChange={(e) => setEditDriverForm({ ...editDriverForm, rejection_reason: e.target.value })}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Clean Footer Buttons (No Icons) */}
            <div className="dialog-footer edit-footer-minimal">
              <button
                type="button"
                className="btn-dialog-cancel"
                disabled={isSavingDriver}
                onClick={() => setEditingDriver(null)}
              >
                Batal
              </button>

              <div className="footer-actions-group-minimal">
                {editDriverForm.verification_status !== 'approved' && (
                  <button
                    type="button"
                    className="btn-dialog-confirm-approve"
                    disabled={isSavingDriver}
                    onClick={() => handleSaveDriver('approved')}
                  >
                    Simpan & Setujui
                  </button>
                )}

                <button
                  type="button"
                  className="btn-dialog-save-driver"
                  disabled={isSavingDriver}
                  onClick={() => handleSaveDriver()}
                >
                  {isSavingDriver ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="admin-toast-banner">
          <CheckCircle2 size={16} />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
