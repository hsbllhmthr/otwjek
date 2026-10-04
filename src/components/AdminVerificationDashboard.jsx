import React, { useState, useEffect, useMemo } from 'react';
import './AdminVerificationDashboard.css';
import {
  LayoutDashboard,
  Menu,
  ShieldCheck,
  LogOut,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Users,
  UserCheck,
  UserX,
  Bike,
  Car,
  CreditCard,
  FileText,
  Calendar,
  Phone,
  Mail,
  MapPin,
  ExternalLink,
  Eye,
  X,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Trash2,
  Shield,
  MessageSquare,
  TrendingUp,
  Bell,
  Moon
} from 'lucide-react';
import dbService from '../services/dbService.js';
import driverPlaceholder from '../assets/driver_placeholder.svg';

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
  
  // Driver Modals
  const [previewDoc, setPreviewDoc] = useState(null); // { type, url, title, driverName }
  const [rejectModalDriver, setRejectModalDriver] = useState(null); // driver object
  const [rejectReason, setRejectReason] = useState('Foto dokumen buram atau tidak terbaca dengan jelas.');
  const [customRejectReason, setCustomRejectReason] = useState('');
  const [approveConfirmDriver, setApproveConfirmDriver] = useState(null);

  // =========================================================================
  // STATE CUSTOMER
  // =========================================================================
  const [customers, setCustomers] = useState([]);
  const [customerTab, setCustomerTab] = useState('all'); // 'all' | 'active' | 'suspended'
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
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

  // =========================================================================
  // OVERVIEW TABLES PAGINATION (5 DATA TERBARU PER HALAMAN)
  // =========================================================================
  const TABLE_PAGE_SIZE = 5;
  const [driverTablePage, setDriverTablePage] = useState(1);
  const [customerTablePage, setCustomerTablePage] = useState(1);

  // Drivers diurutkan dari yang terbaru (pending diutamakan lalu created_at)
  const sortedOverviewDrivers = useMemo(() => {
    return [...drivers].sort((a, b) => {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      if (timeA !== timeB) return timeB - timeA;
      if (a.verification_status === 'pending' && b.verification_status !== 'pending') return -1;
      if (b.verification_status === 'pending' && a.verification_status !== 'pending') return 1;
      return 0;
    });
  }, [drivers]);

  const totalDriverPages = Math.max(1, Math.ceil(sortedOverviewDrivers.length / TABLE_PAGE_SIZE));
  const currentDriverPage = Math.min(driverTablePage, totalDriverPages);
  const paginatedDrivers = useMemo(() => {
    const startIndex = (currentDriverPage - 1) * TABLE_PAGE_SIZE;
    return sortedOverviewDrivers.slice(startIndex, startIndex + TABLE_PAGE_SIZE);
  }, [sortedOverviewDrivers, currentDriverPage]);

  // Customers diurutkan dari yang terbaru
  const sortedOverviewCustomers = useMemo(() => {
    return [...customers].sort((a, b) => {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return timeB - timeA;
    });
  }, [customers]);

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

    if (driverSearchQuery.trim()) {
      const q = driverSearchQuery.toLowerCase().trim();
      result = result.filter(
        (d) =>
          d.name?.toLowerCase().includes(q) ||
          d.plateNumber?.toLowerCase().includes(q) ||
          d.phone?.toLowerCase().includes(q) ||
          d.nik?.toLowerCase().includes(q) ||
          d.vehicleModel?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [drivers, driverTab, driverSearchQuery]);

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

    return result;
  }, [customers, customerTab, customerSearchQuery]);

  // =========================================================================
  // PAGINATION UNTUK HALAMAN VERIFIKASI DRIVER & DATA PELANGGAN (5 DATA / HALAMAN)
  // =========================================================================
  const [driversViewPage, setDriversViewPage] = useState(1);
  useEffect(() => {
    setDriversViewPage(1);
  }, [driverTab, driverSearchQuery]);

  const totalDriversViewPages = Math.max(1, Math.ceil(filteredDrivers.length / TABLE_PAGE_SIZE));
  const currentDriversViewPage = Math.min(driversViewPage, totalDriversViewPages);
  const paginatedDriversView = useMemo(() => {
    const start = (currentDriversViewPage - 1) * TABLE_PAGE_SIZE;
    return filteredDrivers.slice(start, start + TABLE_PAGE_SIZE);
  }, [filteredDrivers, currentDriversViewPage]);

  const [customersViewPage, setCustomersViewPage] = useState(1);
  useEffect(() => {
    setCustomersViewPage(1);
  }, [customerTab, customerSearchQuery]);

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

  const getDriverDocs = (driverId) => {
    try {
      const storedDocs = JSON.parse(localStorage.getItem('otwjek_db_driver_documents') || '[]');
      return storedDocs.filter((d) => d.driver_id === driverId);
    } catch {
      return [];
    }
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

  // Helper hitung jumlah pesanan per customer
  const getCustomerOrderCount = (customer) => {
    if (!customer) return 0;
    const cleanPhone = (customer.phone || '').replace(/^\+?62|^0/, '');
    const bookingList = Array.isArray(bookings) ? bookings : [];
    return bookingList.filter(
      (b) =>
        b.user_id === customer.id ||
        (b.customer_phone && b.customer_phone.replace(/^\+?62|^0/, '') === cleanPhone)
    ).length;
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
            <div className="tailadmin-topbar-search">
              <Search size={16} className="tailadmin-search-icon" />
              <input
                type="text"
                className="tailadmin-search-input"
                placeholder="search anything here"
                value={
                  mainSection === 'drivers'
                    ? driverSearchQuery
                    : mainSection === 'customers'
                    ? customerSearchQuery
                    : ''
                }
                onChange={(e) => {
                  if (mainSection === 'drivers') setDriverSearchQuery(e.target.value);
                  if (mainSection === 'customers') setCustomerSearchQuery(e.target.value);
                }}
              />
            </div>
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
                          <th className="tailadmin-th text-left">Driver</th>
                          <th className="tailadmin-th text-left">Layanan & Kendaraan</th>
                          <th className="tailadmin-th text-left">Wilayah Operasional</th>
                          <th className="tailadmin-th text-left">Status</th>
                          <th className="tailadmin-th text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedOverviewDrivers.length === 0 ? (
                          <tr>
                            <td colSpan="5" style={{ textAlign: 'center', padding: '32px 16px', color: '#64748B' }}>
                              Belum ada pendaftaran driver di database.
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
                                    <span className="table-primary-text">
                                      {d.operationalArea || 'Makassar dan sekitarnya'}
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
                                  <button
                                    type="button"
                                    className="btn-table-action"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setMainSection('drivers');
                                      setDriverSearchQuery(d.name);
                                    }}
                                  >
                                    {isPending ? 'Tinjau' : 'Detail'}
                                  </button>
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
                          <th className="tailadmin-th text-left">Pelanggan</th>
                          <th className="tailadmin-th text-left">Kontak</th>
                          <th className="tailadmin-th text-left">Aktivitas & Bergabung</th>
                          <th className="tailadmin-th text-left">Status</th>
                          <th className="tailadmin-th text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedOverviewCustomers.length === 0 ? (
                          <tr>
                            <td colSpan="5" style={{ textAlign: 'center', padding: '32px 16px', color: '#64748B' }}>
                              Belum ada data pelanggan di database.
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
                                  <button
                                    type="button"
                                    className="btn-table-action"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedCustomerDetail(c);
                                    }}
                                  >
                                    Detail
                                  </button>
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
                        <th className="tailadmin-th text-left">Driver</th>
                        <th className="tailadmin-th text-left">Layanan & Kendaraan</th>
                        <th className="tailadmin-th text-left">Berkas Dokumen</th>
                        <th className="tailadmin-th text-left">Wilayah Operasional</th>
                        <th className="tailadmin-th text-left">Status</th>
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
                                <div className="table-docs-group">
                                  <button
                                    type="button"
                                    className={`table-doc-pill ${ktpDoc?.document_url ? 'ready' : 'missing'}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (ktpDoc?.document_url) {
                                        setPreviewDoc({
                                          type: 'KTP',
                                          title: 'Foto KTP Asli',
                                          url: ktpDoc.document_url,
                                          driverName: driver.name
                                        });
                                      }
                                    }}
                                    title={ktpDoc?.document_url ? 'Lihat Foto KTP' : 'KTP belum diunggah'}
                                  >
                                    <FileText size={12} />
                                    <span>KTP</span>
                                  </button>

                                  <button
                                    type="button"
                                    className={`table-doc-pill ${simDoc?.document_url ? 'ready' : 'missing'}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (simDoc?.document_url) {
                                        setPreviewDoc({
                                          type: 'SIM',
                                          title: `Foto ${driver.vehicleType === 'mobil' ? 'SIM A' : 'SIM C'} Asli`,
                                          url: simDoc.document_url,
                                          driverName: driver.name
                                        });
                                      }
                                    }}
                                    title={simDoc?.document_url ? 'Lihat Foto SIM' : 'SIM belum diunggah'}
                                  >
                                    <FileText size={12} />
                                    <span>SIM</span>
                                  </button>

                                  <button
                                    type="button"
                                    className={`table-doc-pill ${stnkDoc?.document_url ? 'ready' : 'missing'}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (stnkDoc?.document_url) {
                                        setPreviewDoc({
                                          type: 'STNK',
                                          title: 'Foto STNK Kendaraan Asli',
                                          url: stnkDoc.document_url,
                                          driverName: driver.name
                                        });
                                      }
                                    }}
                                    title={stnkDoc?.document_url ? 'Lihat Foto STNK' : 'STNK belum diunggah'}
                                  >
                                    <FileText size={12} />
                                    <span>STNK</span>
                                  </button>
                                </div>
                              </td>
                              <td className="tailadmin-td area-td">
                                <div className="table-cell-meta">
                                  <span className="table-primary-text">
                                    {driver.operationalArea || 'Makassar dan sekitarnya'}
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
                                <div className="table-action-group">
                                  {isPending && (
                                    <>
                                      <button
                                        type="button"
                                        className="btn-table-approve"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setApproveConfirmDriver(driver);
                                        }}
                                        title="Setujui permohonan driver ini"
                                      >
                                        <CheckCircle2 size={13} />
                                        <span>Setujui</span>
                                      </button>
                                      <button
                                        type="button"
                                        className="btn-table-reject"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setRejectModalDriver(driver);
                                        }}
                                        title="Tolak permohonan berkas driver"
                                      >
                                        <XCircle size={13} />
                                        <span>Tolak</span>
                                      </button>
                                    </>
                                  )}

                                  {isApproved && (
                                    <button
                                      type="button"
                                      className="btn-table-revoke"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setRejectModalDriver(driver);
                                      }}
                                      title="Cabut status persetujuan"
                                    >
                                      Cabut Status
                                    </button>
                                  )}

                                  {isRejected && (
                                    <button
                                      type="button"
                                      className="btn-table-approve"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setApproveConfirmDriver(driver);
                                      }}
                                      title="Tinjau ulang & setujui"
                                    >
                                      <CheckCircle2 size={13} />
                                      <span>Setujui Ulang</span>
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
                        <th className="tailadmin-th text-left">Pelanggan</th>
                        <th className="tailadmin-th text-left">Kontak & WhatsApp</th>
                        <th className="tailadmin-th text-left">Aktivitas & Bergabung</th>
                        <th className="tailadmin-th text-left">Status</th>
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
                                <div className="table-action-group">
                                  <button
                                    type="button"
                                    className="btn-table-action"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedCustomerDetail(cust);
                                    }}
                                  >
                                    Detail
                                  </button>

                                  <button
                                    type="button"
                                    className={`btn-table-action-toggle ${isSuspended ? 'activate' : 'suspend'}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setCustomerStatusConfirm(cust);
                                    }}
                                    title={isSuspended ? 'Aktifkan kembali akun' : 'Tangguhkan akun'}
                                  >
                                    {isSuspended ? 'Aktifkan' : 'Tangguhkan'}
                                  </button>

                                  <button
                                    type="button"
                                    className="btn-table-action-del"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setCustomerDeleteConfirm(cust);
                                    }}
                                    title="Hapus data pelanggan ini"
                                  >
                                    <Trash2 size={13} />
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
              <div className="dialog-icon-wrap customer">
                <User size={22} />
              </div>
              <div>
                <h3 className="dialog-title">Detail Profil Pelanggan</h3>
                <span className="dialog-sub">ID: {selectedCustomerDetail.id}</span>
              </div>
              <button
                type="button"
                className="btn-close-dialog"
                onClick={() => setSelectedCustomerDetail(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="dialog-body">
              <div className="customer-modal-profile">
                <div className="customer-modal-avatar">
                  {selectedCustomerDetail.avatar_url ? (
                    <img src={selectedCustomerDetail.avatar_url} alt={selectedCustomerDetail.full_name} />
                  ) : (
                    <div className="modal-initials">
                      {selectedCustomerDetail.full_name ? selectedCustomerDetail.full_name.charAt(0).toUpperCase() : 'P'}
                    </div>
                  )}
                </div>
                <div className="customer-modal-name-group">
                  <h4 className="modal-cust-name">{selectedCustomerDetail.full_name}</h4>
                  <span className={`modal-status-badge ${selectedCustomerDetail.status === 'suspended' ? 'suspended' : 'active'}`}>
                    Status: {selectedCustomerDetail.status === 'suspended' ? 'Akun Ditangguhkan' : 'Akun Aktif'}
                  </span>
                </div>
              </div>

              <div className="customer-details-table">
                <div className="modal-data-row">
                  <span className="data-row-label">Nomor WhatsApp:</span>
                  <div className="data-row-val-group">
                    <span className="data-row-val">{selectedCustomerDetail.phone || '-'}</span>
                    {selectedCustomerDetail.phone && (
                      <a
                        href={`https://wa.me/${(selectedCustomerDetail.phone || '').replace(/^\+?62|^0/, '62')}?text=Halo%20Kak%20${encodeURIComponent(selectedCustomerDetail.full_name || 'Pelanggan')},%20kami%20dari%20Customer%20Care%20OTWJek.`}
                        target="_blank"
                        rel="noreferrer"
                        className="modal-link-wa"
                      >
                        Buka WhatsApp <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                </div>

                <div className="modal-data-row">
                  <span className="data-row-label">Email:</span>
                  <span className="data-row-val">{selectedCustomerDetail.email || '-'}</span>
                </div>

                <div className="modal-data-row">
                  <span className="data-row-label">Jenis Kelamin:</span>
                  <span className="data-row-val">{selectedCustomerDetail.gender || 'Perempuan'} (Verifikasi Wanita)</span>
                </div>

                <div className="modal-data-row">
                  <span className="data-row-label">Tanggal Lahir:</span>
                  <span className="data-row-val">{selectedCustomerDetail.birth_date || 'Belum diisi'}</span>
                </div>

                <div className="modal-data-row">
                  <span className="data-row-label">Tanggal Bergabung:</span>
                  <span className="data-row-val">
                    {selectedCustomerDetail.created_at
                      ? new Date(selectedCustomerDetail.created_at).toLocaleString('id-ID', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : '-'}
                  </span>
                </div>

                <div className="modal-data-row">
                  <span className="data-row-label">Total Pesanan:</span>
                  <span className="data-row-val bold-val">
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
    </div>
  );
}
