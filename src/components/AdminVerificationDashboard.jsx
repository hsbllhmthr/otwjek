import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import './AdminVerificationDashboard.css';
import './ActivityOrderDetailView.css';
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
  Edit3,
  ArrowUpDown,
  Check,
  Package,
  Receipt,
  FileText,
  Copy,
  CheckCheck,
  MoreVertical,
  Bell
} from 'lucide-react';
import dbService, { normalizePhone } from '../services/dbService.js';
import { playDriverTaskSound } from './BottomNavBar.jsx';
import driverPlaceholder from '../assets/driver_placeholder.svg';
import otwjekLogo from '../assets/otwjek_logo.png';
import { compressImageFile } from '../utils/imageCompressor.js';
import { FLAT_PLATFORM_FEE } from '../utils/fareCalculator.js';

export const isDriverUsingCar = (driver) => {
  if (!driver) return false;
  const active = String(driver.activeVehicleType || '').toLowerCase().trim();
  if (active === 'mobil' || active === 'car') return true;
  if (active === 'motor') return false;
  const base = String(driver.vehicleType || '').toLowerCase().trim();
  if (base === 'mobil' || base === 'car') return true;
  return false;
};

export const getDriverEffectiveType = (driver) => {
  return isDriverUsingCar(driver) ? 'mobil' : 'motor';
};

const REJECT_REASON_OPTIONS = [
  'Foto KTP buram atau tidak terbaca dengan jelas.',
  'Masa berlaku SIM sudah kadaluarsa.',
  'Masa berlaku pajak STNK sudah habis / Plat nomor tidak sesuai.',
  'Foto KTP/SIM terpotong atau bukan dokumen asli.',
  'Foto wajah driver tidak jelas atau bukan perempuan.'
];

const isMultiFleetDriver = (driver) =>
  Boolean(driver) &&
  (driver.vehicleType === 'both' ||
    Boolean(driver.motorData && driver.carData) ||
    Boolean(driver.activeVehicleType && driver.vehicleType && driver.activeVehicleType !== driver.vehicleType));

const getDriverServiceLabel = (driver, includeActiveMode = true) => {
  if (!driver) return '-';
  const isCar = isDriverUsingCar(driver);
  if (isMultiFleetDriver(driver)) {
    return includeActiveMode ? `Multi-Armada (${isCar ? 'Mobil' : 'Motor'})` : 'Multi-Armada';
  }
  return isCar ? 'SheCar (Mobil)' : 'SheRide (Motor)';
};

const getDriverDocSummary = (driver, driverDocs = []) => {
  if (!driver) return { isComplete: false, label: '-' };
  const hasKtp = Boolean(driverDocs.find((d) => d.document_type === 'ktp')?.document_url || driver.ktpUrl);
  const hasSim = Boolean(driverDocs.find((d) => d.document_type === 'sim')?.document_url || driver.simUrl);
  const hasStnk = Boolean(driverDocs.find((d) => d.document_type === 'stnk')?.document_url || driver.stnkUrl);
  const missing = [!hasKtp && 'KTP', !hasSim && 'SIM', !hasStnk && 'STNK'].filter(Boolean);
  return {
    isComplete: missing.length === 0,
    label: missing.length === 0 ? 'Lengkap (KTP, SIM, STNK)' : `Belum lengkap (${missing.join(', ')})`
  };
};

/**
 * Shared confirmation dialog shell used across destructive and approval actions
 * in the Admin dashboard to avoid decorative icon badges and keep keyboard/contrast consistent.
 */
function AdminConfirmDialog({
  idPrefix,
  title,
  subtitle,
  onClose,
  onConfirm,
  confirmLabel,
  confirmTone = 'danger',
  confirmDisabled = false,
  summaryItems = [],
  note,
  warningNote,
  children,
  dialogClassName = ''
}) {
  const titleId = `${idPrefix}-title`;

  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <div
        className={`admin-modal-dialog admin-confirm-dialog ${dialogClassName}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dialog-header confirm-dialog-header">
          <div className="confirm-header-copy">
            <h3 id={titleId} className="dialog-title">{title}</h3>
            {subtitle && <span className="dialog-sub">{subtitle}</span>}
          </div>
          <button
            type="button"
            className="btn-close-dialog confirm-close-btn"
            onClick={onClose}
            aria-label="Tutup dialog"
            title="Tutup dialog"
          >
            <X size={16} />
          </button>
        </div>

        <div className="dialog-body confirm-dialog-body">
          {summaryItems.length > 0 && (
            <div className="confirm-summary-list">
              {summaryItems.map((item) => (
                <div key={item.label} className="confirm-summary-row">
                  <span className="confirm-summary-label">{item.label}</span>
                  <span className={`confirm-summary-value${item.tone ? ` tone-${item.tone}` : ''}`}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          )}

          {children}

          {note && <p className="confirm-dialog-note">{note}</p>}
          {warningNote && <div className="confirm-warning-note">{warningNote}</div>}
        </div>

        <div className="dialog-footer confirm-dialog-footer">
          <button
            type="button"
            className="btn-dialog-cancel"
            onClick={onClose}
          >
            Batal
          </button>
          <button
            type="button"
            className={confirmTone === 'approve' ? 'btn-dialog-confirm-approve' : 'btn-dialog-confirm-reject'}
            onClick={onConfirm}
            disabled={confirmDisabled}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Menu dropdown 3-dot di pojok kanan atas card mobile untuk semua aksi baris tabel.
 * Disembunyikan pada desktop (>= 768px) karena kolom aksi tabel tampil langsung.
 */
function MobileCardActionMenu({ menuKey, activeKey, onToggle, onClose, items = [] }) {
  const visibleItems = items.filter(Boolean);
  if (visibleItems.length === 0) return null;
  const isOpen = activeKey === menuKey;

  return (
    <div
      className="mobile-card-action-menu"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className={`mobile-card-action-trigger ${isOpen ? 'is-open' : ''}`}
        aria-label="Menu Aksi"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        title="Menu Aksi"
        onClick={(e) => {
          e.stopPropagation();
          onToggle(menuKey);
        }}
      >
        <MoreVertical size={18} />
      </button>

      {isOpen && (
        <div className="mobile-card-action-dropdown" role="menu">
          {visibleItems.map((item) => {
            const cls = `mobile-card-action-item ${item.variant ? `is-${item.variant}` : ''}`;
            if (item.href) {
              return (
                <a
                  key={item.key}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className={cls}
                  role="menuitem"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                  }}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </a>
              );
            }
            return (
              <button
                key={item.key}
                type="button"
                className={cls}
                role="menuitem"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                  item.onClick?.();
                }}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Normalizes order display metadata shared across order tables and cards.
 */
function getOrderDisplayMeta(ord) {
  const sType = String(ord.service_type || '').toLowerCase();
  const isCar = sType === 'mobil' || sType === 'car';
  const isSend = sType === 'paket' || sType === 'send' || sType === 'package' || sType === 'food';
  const serviceLabel = isCar ? 'Mobil' : isSend ? 'Paket' : 'Motor';
  const orderCode = ord.order_code || ord.booking_code || '#ORD';
  const fareFormatted = `Rp ${Number(ord.fare_amount || 15000).toLocaleString('id-ID')}`;
  const createdDateStr = ord.created_at
    ? new Date(ord.created_at).toLocaleString('id-ID', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      })
    : 'Baru saja';

  return { isCar, isSend, serviceLabel, orderCode, fareFormatted, createdDateStr };
}

/**
 * Icon-free order card/row header showing code, service label, and secondary timestamp/meta.
 */
function OrderTitleMeta({ orderCode, serviceLabel, secondaryText }) {
  return (
    <div className="table-cell-meta">
      <div className="assignment-order-title-row">
        <span className="assignment-order-code">{orderCode}</span>
        <span className="assignment-order-sep" aria-hidden="true">•</span>
        <span className="assignment-order-service">{serviceLabel}</span>
      </div>
      <span className="table-secondary-text">{secondaryText}</span>
    </div>
  );
}

/**
 * Shared customer contact cell for order tables and mobile cards.
 */
function OrderCustomerCell({ order, isSend }) {
  return (
    <td className="tailadmin-td" data-label="Pelanggan">
      <div className="table-cell-meta">
        <span className="table-primary-text">
          {order.customer_name || 'Pelanggan OTWJek'}
        </span>
        <span className="table-secondary-text">
          {order.customer_phone || '-'}
          {isSend && order.package_info?.recipientName
            ? ` → Penerima: ${order.package_info.recipientName}`
            : ''}
        </span>
      </div>
    </td>
  );
}

/**
 * Shared two-part route cell (Lokasi & Tujuan) without icons, matching the assignment card layout.
 */
function OrderRouteCell({ order }) {
  return (
    <td className="tailadmin-td route-td assignment-route-td" data-label="Rute">
      <div className="assignment-route-columns">
        <div
          className="assignment-route-col"
          title={`Lokasi: ${order.pickup_name || '-'} (${order.pickup_address || ''})`}
        >
          <span className="assignment-route-label">Lokasi</span>
          <div className="assignment-route-val-group">
            <span className="assignment-route-value">
              {order.pickup_name || 'Titik Jemput'}
            </span>
          </div>
        </div>
        <div className="assignment-route-divider" aria-hidden="true" />
        <div
          className="assignment-route-col"
          title={`Tujuan: ${order.dropoff_name || '-'} (${order.dropoff_address || ''})`}
        >
          <span className="assignment-route-label">Tujuan</span>
          <div className="assignment-route-val-group">
            <span className="assignment-route-value">
              {order.dropoff_name || 'Titik Tujuan'}
            </span>
            <span className="assignment-route-distance">
              {order.distance_km || 3.2} km
            </span>
          </div>
        </div>
      </div>
    </td>
  );
}

export default function AdminVerificationDashboard({ admin, onLogout, onGoToCustomerApp }) {
  // Navigation Section: 'overview' | 'drivers' | 'customers'
  const [mainSection, setMainSection] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeCardMenuKey, setActiveCardMenuKey] = useState(null);

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
  const [rejectReason, setRejectReason] = useState(REJECT_REASON_OPTIONS[0]);
  const [customRejectReason, setCustomRejectReason] = useState('');
  const [approveConfirmDriver, setApproveConfirmDriver] = useState(null);
  
  // State Edit & Lengkapi Data Driver oleh Admin
  const [editingDriver, setEditingDriver] = useState(null);
  const [editDriverForm, setEditDriverForm] = useState(null);
  const [editDriverActiveTab, setEditDriverActiveTab] = useState('identitas'); // 'identitas' | 'kendaraan' | 'dokumen' | 'status'
  const [isSavingDriver, setIsSavingDriver] = useState(false);
  const [editAvatarError, setEditAvatarError] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [cloudSyncStatus, setCloudSyncStatus] = useState(() => dbService.cloud.getStatus());

  useEffect(() => {
    return dbService.cloud.subscribeStatus(setCloudSyncStatus);
  }, []);

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
  const [driverDeleteConfirm, setDriverDeleteConfirm] = useState(null);
  const [clearDbModalOpen, setClearDbModalOpen] = useState(false);

  // =========================================================================
  // STATE PESANAN & PENUGASAN DRIVER (ORDER DISPATCH)
  // =========================================================================
  const [orderTab, setOrderTab] = useState('all'); // 'all' | 'unassigned' | 'assigned' | 'cancelled'
  const [orderServiceFilter, setOrderServiceFilter] = useState('all');

  // =========================================================================
  // STATE: SEMUA PESANAN PELANGGAN (RIWAYAT, SELESAI, DIBATALKAN)
  // =========================================================================
  const [allOrdersStatusTab, setAllOrdersStatusTab] = useState('all'); // 'all' | 'completed' | 'in_progress' | 'cancelled'
  const [allOrdersServiceFilter, setAllOrdersServiceFilter] = useState('all');
  const [allOrdersSearchQuery, setAllOrdersSearchQuery] = useState('');
  const [allOrdersViewPage, setAllOrdersViewPage] = useState(1);
  const [orderDetailModalData, setOrderDetailModalData] = useState(null);
  const [adminCopiedOrderNum, setAdminCopiedOrderNum] = useState(false); // 'all' | 'motor' | 'mobil' | 'paket'
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [ordersViewPage, setOrdersViewPage] = useState(1);
  const [assignModalOrder, setAssignModalOrder] = useState(null);
  const [assignDriverSearch, setAssignDriverSearch] = useState('');
  const [assignVehicleFilter, setAssignVehicleFilter] = useState('recommended'); // 'recommended' | 'all'
  const [assignErrorMessage, setAssignErrorMessage] = useState(null);

  // =========================================================================
  // DATA LOADERS & REALTIME SUBSCRIPTION
  // =========================================================================
  const [bookings, setBookings] = useState(() => {
    try {
      return dbService.bookings.getAllAdmin();
    } catch {
      return [];
    }
  });

  const loadDrivers = () => {
    const all = dbService.drivers.getAll();
    setDrivers([...all]);
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

  const knownOrderIdsRef = useRef(null);
  const incomingAlertsArmedRef = useRef(
    !dbService.cloud.isConfigured() || dbService.cloud.getStatus().hydrated
  );
  const [incomingOrderAlert, setIncomingOrderAlert] = useState(null);

  const checkIncomingOrders = (allOrders) => {
    if (!incomingAlertsArmedRef.current || !knownOrderIdsRef.current) return;
    const newlyArrived = [];
    for (const b of allOrders) {
      if (!b?.id || knownOrderIdsRef.current.has(b.id)) continue;
      knownOrderIdsRef.current.add(b.id);
      const isCancelled =
        b.booking_status === 'cancelled' || b.status === 'cancelled' || b.driver_step === 'cancelled';
      const isCompleted =
        b.booking_status === 'completed' || b.status === 'completed' || b.driver_step === 'completed';
      if (!isCancelled && !isCompleted && b.assignment_status !== 'assigned') {
        newlyArrived.push(b);
      }
    }
    if (newlyArrived.length > 0) {
      const latest = newlyArrived[0];
      const meta = getOrderDisplayMeta(latest);
      setIncomingOrderAlert({
        id: latest.id,
        count: newlyArrived.length,
        orderCode: meta.orderCode,
        serviceName: meta.serviceLabel,
        customerName: meta.customerName,
        routeSummary: `${meta.pickupName} → ${meta.dropoffName}`
      });
      playDriverTaskSound();
    }
  };

  const loadBookings = (detectIncoming = false) => {
    try {
      const allOrders = dbService.bookings.getAllAdmin();
      if (detectIncoming) {
        checkIncomingOrders(allOrders);
      }
      setBookings((prev) => {
        if (prev.length !== allOrders.length) return [...allOrders];
        const hasChanged = allOrders.some((b, idx) => {
          const p = prev[idx];
          return (
            !p ||
            p.id !== b.id ||
            p.driver_id !== b.driver_id ||
            p.assignment_status !== b.assignment_status ||
            p.driver_step !== b.driver_step ||
            p.booking_status !== b.booking_status ||
            p.updated_at !== b.updated_at
          );
        });
        return hasChanged ? [...allOrders] : prev;
      });
    } catch (e) {
      console.error('Error loading bookings:', e);
    }
  };

  useEffect(() => {
    const armKnownOrders = () => {
      const current = dbService.bookings.getAllAdmin() || [];
      knownOrderIdsRef.current = new Set(current.map((b) => b?.id).filter(Boolean));
      incomingAlertsArmedRef.current = true;
    };

    loadDrivers();
    loadCustomers();
    loadBookings(false);

    let hydrateFallbackTimer = null;
    if (incomingAlertsArmedRef.current) {
      armKnownOrders();
    } else {
      window.addEventListener('otwjek_cloud_hydrated', armKnownOrders);
      hydrateFallbackTimer = setTimeout(armKnownOrders, 3500);
    }

    // 1. Subscribe to instant reactive updates from dbService (intra-tab, cross-tab, dan Supabase Realtime)
    const unsubscribe = dbService.subscribe(() => {
      loadDrivers();
      loadCustomers();
      loadBookings(true);
    });

    // 2. Real-time background sync interval (heartbeat every 1500ms)
    const pollInterval = setInterval(() => {
      loadDrivers();
      loadCustomers();
      loadBookings(true);
    }, 1500);

    return () => {
      unsubscribe();
      clearInterval(pollInterval);
      window.removeEventListener('otwjek_cloud_hydrated', armKnownOrders);
      if (hydrateFallbackTimer) clearTimeout(hydrateFallbackTimer);
    };
  }, []);

  // Tutup dropdown menu kolom dan menu aksi card saat klik di luar
  useEffect(() => {
    const handleGlobalClick = (e) => {
      if (activeColumnMenu && !e.target.closest('.th-filter-dropdown-container')) {
        setActiveColumnMenu(null);
      }
      if (activeCardMenuKey && !e.target.closest('.mobile-card-action-menu')) {
        setActiveCardMenuKey(null);
      }
    };
    document.addEventListener('mousedown', handleGlobalClick);
    return () => document.removeEventListener('mousedown', handleGlobalClick);
  }, [activeColumnMenu, activeCardMenuKey]);

  const handleToggleCardMenu = useCallback((menuKey) => {
    setActiveCardMenuKey((prev) => (prev === menuKey ? null : menuKey));
  }, []);

  // Tutup modal aktif atau menu card saat tombol Escape ditekan (Aksesibilitas Keyboard R-32)
  useEffect(() => {
    const hasOpenModal =
      activeCardMenuKey ||
      previewDoc ||
      clearDbModalOpen ||
      driverDeleteConfirm ||
      customerDeleteConfirm ||
      customerStatusConfirm ||
      approveConfirmDriver ||
      rejectModalDriver ||
      selectedCustomerDetail ||
      orderDetailModalData ||
      assignModalOrder ||
      editingDriver;

    if (!hasOpenModal) return undefined;

    const handleKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      if (activeCardMenuKey) { setActiveCardMenuKey(null); return; }
      if (previewDoc) { setPreviewDoc(null); return; }
      if (clearDbModalOpen) { setClearDbModalOpen(false); return; }
      if (driverDeleteConfirm) { setDriverDeleteConfirm(null); return; }
      if (customerDeleteConfirm) { setCustomerDeleteConfirm(null); return; }
      if (customerStatusConfirm) { setCustomerStatusConfirm(null); return; }
      if (approveConfirmDriver) { setApproveConfirmDriver(null); return; }
      if (rejectModalDriver) { setRejectModalDriver(null); return; }
      if (selectedCustomerDetail) { setSelectedCustomerDetail(null); return; }
      if (orderDetailModalData) { setOrderDetailModalData(null); return; }
      if (assignModalOrder) {
        setAssignModalOrder(null);
        setAssignErrorMessage(null);
        return;
      }
      if (editingDriver && !isSavingDriver) {
        setEditingDriver(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [
    activeCardMenuKey,
    previewDoc,
    clearDbModalOpen,
    driverDeleteConfirm,
    customerDeleteConfirm,
    customerStatusConfirm,
    approveConfirmDriver,
    rejectModalDriver,
    selectedCustomerDetail,
    orderDetailModalData,
    assignModalOrder,
    editingDriver,
    isSavingDriver
  ]);

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
        result = result.filter((d) => d.verification_status === 'approved');
      } else if (overviewDriverStatusFilter === 'rejected') {
        result = result.filter((d) => d.verification_status === 'rejected');
      }
    }

    // Filter Layanan
    if (overviewDriverServiceFilter !== 'all') {
      result = result.filter((d) => {
        const vType = getDriverEffectiveType(d);
        return vType === overviewDriverServiceFilter;
      });
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
        const sA = a.verification_status || 'pending';
        const sB = b.verification_status || 'pending';
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
    const approved = drivers.filter((d) => d.verification_status === 'approved').length;
    const rejected = drivers.filter((d) => d.verification_status === 'rejected').length;
    return { all: drivers.length, pending, approved, rejected };
  }, [drivers]);

  const filteredDrivers = useMemo(() => {
    let result = drivers;

    if (driverTab === 'pending') {
      result = result.filter((d) => d.verification_status === 'pending');
    } else if (driverTab === 'approved') {
      result = result.filter((d) => d.verification_status === 'approved');
    } else if (driverTab === 'rejected') {
      result = result.filter((d) => d.verification_status === 'rejected');
    }

    if (driverServiceFilter && driverServiceFilter !== 'all') {
      result = result.filter((d) => {
        const vType = getDriverEffectiveType(d);
        return vType === driverServiceFilter;
      });
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
        const statusA = a.verification_status || 'pending';
        const statusB = b.verification_status || 'pending';
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
  const [seenCustomerIds, setSeenCustomerIds] = useState(() => {
    try {
      const raw = localStorage.getItem('otwjek_admin_seen_customer_ids');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
      const initialIds = (dbService.users.getCustomers() || []).map((c) => c.id).filter(Boolean);
      localStorage.setItem('otwjek_admin_seen_customer_ids', JSON.stringify(initialIds));
      return initialIds;
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (mainSection === 'customers' && customers.length > 0) {
      const currentIds = customers.map((c) => c.id).filter(Boolean);
      setSeenCustomerIds((prev) => {
        const merged = Array.from(new Set([...prev, ...currentIds]));
        if (merged.length === prev.length) return prev;
        try {
          localStorage.setItem('otwjek_admin_seen_customer_ids', JSON.stringify(merged));
        } catch {
          // ignore storage quota errors
        }
        return merged;
      });
    }
  }, [mainSection, customers]);

  const newCustomersCount = useMemo(() => {
    return customers.filter((c) => c.id && !seenCustomerIds.includes(c.id)).length;
  }, [customers, seenCustomerIds]);

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
  // ORDERS / DISPATCH COUNTS, FILTERS & HANDLERS
  // =========================================================================
  const isCustomerOrderCompleted = useCallback((b) => {
    if (!b) return false;
    if (b.booking_status === 'cancelled' || b.status === 'cancelled' || b.driver_step === 'cancelled') return false;
    if (b.driver_step) return b.driver_step === 'completed';
    if (b.assignment_status === 'assigned') return b.booking_status === 'completed';
    return Boolean(b.status_note && b.booking_status === 'completed');
  }, []);

  const isCustomerOrderCancelled = useCallback((b) => {
    if (!b) return false;
    return (
      b.booking_status === 'cancelled' ||
      b.status === 'cancelled' ||
      b.driver_step === 'cancelled'
    );
  }, []);

  const isOrderDispatchCompleted = useCallback(
    (b) => {
      if (!b || isCustomerOrderCancelled(b)) return false;
      return (
        b.assignment_status === 'assigned' &&
        (!b.driver_step || b.driver_step === 'completed')
      );
    },
    [isCustomerOrderCancelled]
  );

  const orderCounts = useMemo(() => {
    const list = Array.isArray(bookings) ? bookings : [];
    const completedAssigned = list.filter((b) => isOrderDispatchCompleted(b)).length;
    const cancelled = list.filter((b) => isCustomerOrderCancelled(b)).length;
    const activeDispatch = list.filter(
      (b) =>
        !isOrderDispatchCompleted(b) &&
        !isCustomerOrderCancelled(b) &&
        !isCustomerOrderCompleted(b)
    ).length;
    const unassigned = list.filter(
      (b) =>
        b.assignment_status !== 'assigned' &&
        !isCustomerOrderCancelled(b) &&
        !isCustomerOrderCompleted(b)
    ).length;
    return {
      total: activeDispatch,
      assigned: completedAssigned,
      unassigned,
      cancelled
    };
  }, [bookings, isOrderDispatchCompleted, isCustomerOrderCancelled, isCustomerOrderCompleted]);

  useEffect(() => {
    if (!incomingOrderAlert) return undefined;
    const timer = setTimeout(() => setIncomingOrderAlert(null), 12000);
    return () => clearTimeout(timer);
  }, [incomingOrderAlert]);

  const filteredOrders = useMemo(() => {
    let result = Array.isArray(bookings) ? [...bookings] : [];

    if (orderTab === 'unassigned') {
      result = result.filter(
        (b) =>
          b.assignment_status !== 'assigned' &&
          !isCustomerOrderCancelled(b) &&
          !isCustomerOrderCompleted(b)
      );
    } else if (orderTab === 'assigned') {
      result = result.filter((b) => isOrderDispatchCompleted(b));
    } else if (orderTab === 'cancelled') {
      result = result.filter((b) => isCustomerOrderCancelled(b));
    } else {
      // Tab "Semua Pesanan" hanya menampilkan pesanan aktif yang belum selesai ditugaskan dan belum dibatalkan;
      // begitu selesai ditugaskan pindah ke tab "Sudah Ditugaskan", dan jika dibatalkan pindah ke tab "Dibatalkan".
      result = result.filter(
        (b) =>
          !isOrderDispatchCompleted(b) &&
          !isCustomerOrderCancelled(b) &&
          !isCustomerOrderCompleted(b)
      );
    }

    if (orderServiceFilter !== 'all') {
      result = result.filter((b) => {
        const sType = String(b.service_type || '').toLowerCase();
        if (orderServiceFilter === 'mobil') return sType === 'mobil' || sType === 'car';
        if (orderServiceFilter === 'paket') return sType === 'paket' || sType === 'send' || sType === 'package' || sType === 'food';
        return sType === 'motor' || sType === 'ride' || (!sType && orderServiceFilter === 'motor');
      });
    }

    if (orderSearchQuery.trim()) {
      const q = orderSearchQuery.toLowerCase().trim();
      result = result.filter(
        (b) =>
          b.order_code?.toLowerCase().includes(q) ||
          b.booking_code?.toLowerCase().includes(q) ||
          b.customer_name?.toLowerCase().includes(q) ||
          b.customer_phone?.toLowerCase().includes(q) ||
          b.pickup_name?.toLowerCase().includes(q) ||
          b.dropoff_name?.toLowerCase().includes(q) ||
          b.driver_name?.toLowerCase().includes(q) ||
          b.driver_plate?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [
    bookings,
    orderTab,
    orderServiceFilter,
    orderSearchQuery,
    isOrderDispatchCompleted,
    isCustomerOrderCancelled,
    isCustomerOrderCompleted
  ]);

  useEffect(() => {
    setOrdersViewPage(1);
  }, [orderTab, orderServiceFilter, orderSearchQuery]);

  const totalOrdersViewPages = Math.max(1, Math.ceil(filteredOrders.length / TABLE_PAGE_SIZE));
  const currentOrdersViewPage = Math.min(ordersViewPage, totalOrdersViewPages);
  // =========================================================================
  // MEMO: METRIK & FILTER SEMUA PESANAN PELANGGAN
  // =========================================================================

  const allOrdersMetrics = useMemo(() => {
    const list = Array.isArray(bookings) ? bookings : [];
    const completed = list.filter((b) => isCustomerOrderCompleted(b)).length;
    const cancelled = list.filter((b) => isCustomerOrderCancelled(b)).length;
    const inProgress = list.filter(
      (b) => !isCustomerOrderCompleted(b) && !isCustomerOrderCancelled(b)
    ).length;
    // Tab "Semua" menampilkan pesanan yang belum selesai agar item yang sudah selesai berpindah ke tab "Selesai"
    const total = list.filter((b) => !isCustomerOrderCompleted(b)).length;
    const totalRevenue = list
      .filter((b) => isCustomerOrderCompleted(b))
      .reduce((sum, b) => sum + Number(b.fare_amount || 0), 0);

    return { total, completed, cancelled, inProgress, totalRevenue };
  }, [bookings, isCustomerOrderCompleted, isCustomerOrderCancelled]);

  const filteredAllOrders = useMemo(() => {
    let result = Array.isArray(bookings) ? [...bookings] : [];

    // Filter status tab
    if (allOrdersStatusTab === 'completed') {
      result = result.filter((b) => isCustomerOrderCompleted(b));
    } else if (allOrdersStatusTab === 'cancelled') {
      result = result.filter((b) => isCustomerOrderCancelled(b));
    } else if (allOrdersStatusTab === 'in_progress') {
      result = result.filter(
        (b) => !isCustomerOrderCompleted(b) && !isCustomerOrderCancelled(b)
      );
    } else {
      // Pada tab "Semua", pesanan yang sudah selesai otomatis berpindah ke tab "Selesai"
      result = result.filter((b) => !isCustomerOrderCompleted(b));
    }

    // Filter layanan
    if (allOrdersServiceFilter !== 'all') {
      result = result.filter((b) => {
        const sType = String(b.service_type || '').toLowerCase();
        if (allOrdersServiceFilter === 'mobil') return sType === 'mobil' || sType === 'car';
        if (allOrdersServiceFilter === 'paket')
          return sType === 'paket' || sType === 'send' || sType === 'package' || sType === 'food';
        return sType === 'motor' || sType === 'ride' || (!sType && allOrdersServiceFilter === 'motor');
      });
    }

    // Filter pencarian
    if (allOrdersSearchQuery.trim()) {
      const q = allOrdersSearchQuery.toLowerCase().trim();
      result = result.filter(
        (b) =>
          b.order_code?.toLowerCase().includes(q) ||
          b.order_number?.toLowerCase().includes(q) ||
          b.booking_code?.toLowerCase().includes(q) ||
          b.customer_name?.toLowerCase().includes(q) ||
          b.customer_phone?.toLowerCase().includes(q) ||
          b.pickup_name?.toLowerCase().includes(q) ||
          b.dropoff_name?.toLowerCase().includes(q) ||
          b.driver_name?.toLowerCase().includes(q) ||
          b.driver_plate?.toLowerCase().includes(q) ||
          b.package_info?.recipientName?.toLowerCase().includes(q) ||
          b.package_info?.itemName?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [
    bookings,
    allOrdersStatusTab,
    allOrdersServiceFilter,
    allOrdersSearchQuery,
    isCustomerOrderCompleted,
    isCustomerOrderCancelled
  ]);

  useEffect(() => {
    setAllOrdersViewPage(1);
  }, [allOrdersStatusTab, allOrdersServiceFilter, allOrdersSearchQuery]);

  const totalAllOrdersPages = Math.max(1, Math.ceil(filteredAllOrders.length / TABLE_PAGE_SIZE));
  const currentAllOrdersPage = Math.min(allOrdersViewPage, totalAllOrdersPages);
  const paginatedAllOrdersView = useMemo(() => {
    const start = (currentAllOrdersPage - 1) * TABLE_PAGE_SIZE;
    return filteredAllOrders.slice(start, start + TABLE_PAGE_SIZE);
  }, [filteredAllOrders, currentAllOrdersPage]);

  const handleUpdateOrderStatus = (orderId, newStatus, statusNote = '') => {
    if (!orderId || !newStatus) return;
    dbService.bookings.updateBookingStatus(orderId, newStatus, statusNote);
    loadBookings();
    if (orderDetailModalData && orderDetailModalData.id === orderId) {
      setOrderDetailModalData((prev) => (prev ? { ...prev, booking_status: newStatus, status_note: statusNote } : null));
    }
    const label = newStatus === 'completed' ? 'diselesaikan' : newStatus === 'cancelled' ? 'dibatalkan' : 'diperbarui';
    setToastMessage(`Status pesanan berhasil diubah menjadi ${label}!`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const paginatedOrdersView = useMemo(() => {
    const start = (currentOrdersViewPage - 1) * TABLE_PAGE_SIZE;
    return filteredOrders.slice(start, start + TABLE_PAGE_SIZE);
  }, [filteredOrders, currentOrdersViewPage]);

  const buildDriverTaskWhatsAppUrl = (booking, driver) => {
    const rawPhone = driver?.phone || booking?.driver_phone || '';
    const cleanPhone = String(rawPhone).replace(/\D/g, '').replace(/^0/, '62');
    const targetPhone = cleanPhone.startsWith('62') ? cleanPhone : `62${cleanPhone}`;
    const driverName = driver?.name || booking?.driver_name || 'Mitra Driver';
    const orderCode = booking?.order_code || booking?.booking_code || '#ORD';
    const sName = booking?.service_name || (booking?.service_type === 'mobil' ? 'Mobil' : booking?.service_type === 'paket' ? 'Paket' : 'Motor');
    const fareStr = `Rp ${Number(booking?.fare_amount || 15000).toLocaleString('id-ID')}`;
    const payMethod = (booking?.payment_method || 'cash').toUpperCase();

    const pkgLines = booking?.package_info
      ? `\n📦 *Detail Paket:* ${booking.package_info.itemName || booking.package_info.category || 'Paket'} (${booking.package_info.size || 'S'})${booking.package_info.weight ? ` • ${booking.package_info.weight} kg` : ''}\n👤 *Penerima Paket:* ${booking.package_info.recipientName || '-'} (${booking.package_info.recipientPhone || '-'})${booking.package_info.floorUnit ? ` • Unit: ${booking.package_info.floorUnit}` : ''}${booking.package_info.notes ? `\n📝 *Catatan:* ${booking.package_info.notes}` : ''}`
      : '';

    const text = `Halo Kak *${driverName}* 🌸\nAnda mendapat *Penugasan Pesanan OTWJek* dari Admin:\n\n📋 *Kode Pesanan:* ${orderCode}\n🛵 *Layanan:* ${sName}\n👤 *Pelanggan:* ${booking?.customer_name || 'Pelanggan OTWJek'} (${booking?.customer_phone || '-'})\n📍 *Lokasi Jemput / Ambil:* ${booking?.pickup_name || '-'}${booking?.pickup_address && booking.pickup_address !== booking.pickup_name ? ` (${booking.pickup_address})` : ''}\n🏁 *Lokasi Tujuan / Antar:* ${booking?.dropoff_name || '-'}${booking?.dropoff_address && booking.dropoff_address !== booking.dropoff_name ? ` (${booking.dropoff_address})` : ''}\n📏 *Estimasi Jarak:* ${booking?.distance_km || 3.2} km\n💰 *Total Tarif:* ${fareStr} (${payMethod})${pkgLines}\n\nSilakan segera menuju titik penjemputan dan cek menu *Activity* di akun Driver Anda. Terima kasih! 🙏`;

    return `https://wa.me/${targetPhone}?text=${encodeURIComponent(text)}`;
  };

  const handleAssignDriverToOrder = (booking, driver, sendWa = false) => {
    if (!booking || !driver) return;

    const liveBooking =
      dbService.bookings.getAllAdmin().find((b) => b && b.id === booking.id) ||
      bookings.find((b) => b && b.id === booking.id) ||
      booking;

    if (isCustomerOrderCancelled(liveBooking)) {
      loadBookings();
      const errMsg = `Penugasan ditolak: pesanan ${liveBooking.order_code || liveBooking.booking_code || ''} telah dibatalkan dan tidak dapat ditugaskan ke driver.`;
      setAssignErrorMessage(errMsg);
      setAssignModalOrder(liveBooking);
      setToastMessage(errMsg);
      setTimeout(() => setToastMessage(null), 4000);
      return;
    }

    if (isCustomerOrderCompleted(liveBooking)) {
      loadBookings();
      const errMsg = `Penugasan ditolak: pesanan ${liveBooking.order_code || liveBooking.booking_code || ''} sudah selesai dan tidak dapat ditugaskan ulang.`;
      setAssignErrorMessage(errMsg);
      setAssignModalOrder(liveBooking);
      setToastMessage(errMsg);
      setTimeout(() => setToastMessage(null), 4000);
      return;
    }

    const liveDriver =
      dbService.drivers.getDriverById(driver.id) ||
      drivers.find((d) => d.id === driver.id) ||
      driver;
    const isApproved = liveDriver.verification_status === 'approved';
    const isDrvOnline =
      typeof liveDriver.is_online === 'boolean' ? liveDriver.is_online : isApproved;

    if (!isApproved || !isDrvOnline) {
      loadDrivers();
      const errMsg = `Driver ${liveDriver.name || driver.name} sedang istirahat / off tidak aktif dan tidak dapat ditugaskan.`;
      setAssignErrorMessage(errMsg);
      setToastMessage(errMsg);
      setTimeout(() => setToastMessage(null), 4000);
      return;
    }

    const reviewerName = admin?.name || 'Admin OTWJEK';
    const updated = dbService.bookings.assignDriver(liveBooking.id, liveDriver, reviewerName);
    if (!updated) {
      loadBookings();
      loadDrivers();
      const latestAfter =
        dbService.bookings.getAllAdmin().find((b) => b && b.id === liveBooking.id) || liveBooking;
      const errMsg = isCustomerOrderCancelled(latestAfter)
        ? `Penugasan ditolak: pesanan ${latestAfter.order_code || latestAfter.booking_code || ''} telah dibatalkan.`
        : `Penugasan dibatalkan: driver ${liveDriver.name || driver.name} sedang istirahat atau pesanan sudah ditutup.`;
      setAssignErrorMessage(errMsg);
      setAssignModalOrder(latestAfter);
      setToastMessage(errMsg);
      setTimeout(() => setToastMessage(null), 4000);
      return;
    }

    loadBookings();
    loadDrivers();
    setAssignErrorMessage(null);
    setAssignModalOrder(null);
    setAssignDriverSearch('');
    setToastMessage(`Driver ${liveDriver.name} berhasil ditugaskan untuk pesanan ${liveBooking.order_code || liveBooking.booking_code}!`);
    setTimeout(() => setToastMessage(null), 4000);

    if (sendWa && updated) {
      const waUrl = buildDriverTaskWhatsAppUrl(updated, liveDriver);
      window.open(waUrl, '_blank');
    }
  };

  // =========================================================================
  // HANDLERS DRIVER
  // =========================================================================
  const handleApprove = (driver) => {
    const reviewerName = admin?.name || 'Admin OTWJEK';
    dbService.drivers.approveDriver(driver.id, reviewerName);
    loadDrivers();
    setApproveConfirmDriver(null);
  };

  const openRejectDriverModal = (driver) => {
    setRejectReason(REJECT_REASON_OPTIONS[0]);
    setCustomRejectReason('');
    setRejectModalDriver(driver);
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
    return area.trim();
  };

  const getDriverDocs = (driverId) => {
    try {
      const parsedDocs = JSON.parse(localStorage.getItem('otwjek_db_driver_documents') || '[]');
      const storedDocs = Array.isArray(parsedDocs) ? parsedDocs : [];
      return storedDocs.filter((d) => d && d.driver_id === driverId);
    } catch {
      return [];
    }
  };

  const handleOpenEditDriver = (driver, initialTab = 'identitas') => {
    if (!driver) return;
    const docs = getDriverDocs(driver.id) || [];
    const ktpDoc = docs.find((d) => d.document_type === 'ktp');
    const simDoc = docs.find((d) => d.document_type === 'sim');
    const simADoc = docs.find((d) => d.document_type === 'simA');
    const stnkDoc = docs.find((d) => d.document_type === 'stnk');
    const stnkCarDoc = docs.find((d) => d.document_type === 'stnkCar');

    setEditingDriver(driver);
    setEditDriverForm({
      name: driver.name || '',
      phone: driver.phone || '',
      nik: driver.nik || '',
      gender: driver.gender || 'Perempuan',
      avatar: driver.avatar || '',
      bio: driver.bio || '',

      vehicleType: driver.vehicleType || 'motor',
      activeVehicleType: driver.activeVehicleType || (driver.vehicleType === 'mobil' ? 'mobil' : 'motor'),
      vehicleBrand: driver.vehicleBrand || '',
      vehicleModel: driver.vehicleModel || '',
      plateNumber: driver.plateNumber || '',
      vehicleColor: driver.vehicleColor || '',
      operationalArea: driver.operationalArea || 'Makassar dan sekitarnya',
      badge: driver.badge || (driver.verification_status === 'approved' ? 'Mitra Resmi' : 'Calon Mitra'),

      motorModel: driver.motorData?.model || (driver.vehicleType === 'motor' ? driver.vehicleModel : ''),
      motorPlate: driver.motorData?.plateNumber || (driver.vehicleType === 'motor' ? driver.plateNumber : ''),
      carModel: driver.carData?.model || (driver.vehicleType === 'mobil' ? driver.vehicleModel : ''),
      carPlate: driver.carData?.plateNumber || (driver.vehicleType === 'mobil' ? driver.plateNumber : ''),

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
      simAUrl: simADoc?.document_url || '',
      stnkUrl: stnkDoc?.document_url || '',
      stnkCarUrl: stnkCarDoc?.document_url || ''
    });
    setEditAvatarError(false);
    setEditDriverActiveTab(initialTab);
  };

  const handleFileLabelKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.currentTarget.click();
    }
  };

  const handleAvatarFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await compressImageFile(file, 400, 400, 0.8);
      setEditAvatarError(false);
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
      if (docType === 'simA') setEditDriverForm((prev) => ({ ...prev, simAUrl: base64 }));
      if (docType === 'stnk') setEditDriverForm((prev) => ({ ...prev, stnkUrl: base64 }));
      if (docType === 'stnkCar') setEditDriverForm((prev) => ({ ...prev, stnkCarUrl: base64 }));
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
      activeVehicleType: editDriverForm.activeVehicleType || (editDriverForm.vehicleType === 'mobil' ? 'mobil' : 'motor'),
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
    if (editDriverForm.simAUrl) {
      docUpdates.simA = { url: editDriverForm.simAUrl, name: 'simA_document.jpg', verification_status: targetVerificationStatus === 'approved' ? 'approved' : 'pending' };
    }
    if (editDriverForm.stnkUrl) {
      docUpdates.stnk = { url: editDriverForm.stnkUrl, name: 'stnk_document.jpg', verification_status: targetVerificationStatus === 'approved' ? 'approved' : 'pending' };
    }
    if (editDriverForm.stnkCarUrl) {
      docUpdates.stnkCar = { url: editDriverForm.stnkCarUrl, name: 'stnkCar_document.jpg', verification_status: targetVerificationStatus === 'approved' ? 'approved' : 'pending' };
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
    setToastMessage(`Akun pelanggan "${customer.full_name}" berhasil dihapus.`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleDeleteDriver = (driver) => {
    dbService.drivers.delete(driver.id);
    setDriverDeleteConfirm(null);
    setToastMessage(`Data mitra driver "${driver.name}" berhasil dihapus.`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleClearEntireDatabase = () => {
    dbService.clearAllData();
    try {
      localStorage.removeItem('otwjek_admin_seen_customer_ids');
    } catch {
      // ignore
    }
    setSeenCustomerIds([]);
    setClearDbModalOpen(false);
    setToastMessage('Seluruh database berhasil dibersihkan! Semua pengguna & mitra driver telah dihapus.');
    setTimeout(() => setToastMessage(null), 4000);
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
            {driverCounts.pending > 0 && (
              <span className="sidebar-badge-alert">{driverCounts.pending}</span>
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
            {newCustomersCount > 0 && (
              <span className="sidebar-badge-count">{newCustomersCount}</span>
            )}
          </button>

          <button
            type="button"
            className={`sidebar-nav-item ${mainSection === 'orders' ? 'active' : ''}`}
            onClick={() => {
              setMainSection('orders');
              setSidebarOpen(false);
            }}
          >
            <div className="sidebar-nav-left">
              <Package size={18} />
              <span className="nav-item-label">Penugasan Pesanan</span>
            </div>
            {orderCounts.unassigned > 0 ? (
              <span className="sidebar-badge-alert">{orderCounts.unassigned}</span>
            ) : orderCounts.total > 0 ? (
              <span className="sidebar-badge-count">{orderCounts.total}</span>
            ) : null}
          </button>

          <button
            type="button"
            className={`sidebar-nav-item ${mainSection === 'all_orders' ? 'active' : ''}`}
            onClick={() => {
              setMainSection('all_orders');
              setSidebarOpen(false);
            }}
          >
            <div className="sidebar-nav-left">
              <Receipt size={18} />
              <span className="nav-item-label">Pesanan Pelanggan</span>
            </div>
            {allOrdersMetrics.inProgress > 0 && (
              <span className="sidebar-badge-count">{allOrdersMetrics.inProgress}</span>
            )}
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

          <button
            type="button"
            className="sidebar-nav-item btn-sidebar-clear-db"
            onClick={() => setClearDbModalOpen(true)}
            title="Bersihkan Seluruh Database (Hapus Semua Pengguna & Driver)"
            style={{ color: '#EF4444' }}
          >
            <div className="sidebar-nav-left">
              <Trash2 size={18} color="#EF4444" />
              <span className="nav-item-label" style={{ color: '#EF4444', fontWeight: 700 }}>
                Bersihkan Database
              </span>
            </div>
          </button>
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
                if (window.innerWidth <= 1024) {
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
            <div className="topbar-mobile-brand">
              <img src={otwjekLogo} alt="OTWJek" className="topbar-mobile-logo" />
              <span className="topbar-mobile-title">OTWJEK</span>
              <span className="topbar-mobile-role">Admin</span>
            </div>
          </div>

          <div className="topbar-right">
            <button
              type="button"
              className={`topbar-sync-pill is-${cloudSyncStatus.status}`}
              onClick={async () => {
                if (!cloudSyncStatus.configured) {
                  setToastMessage(
                    'Mode lokal aktif. Tambahkan VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY untuk sinkronisasi online.'
                  );
                  setTimeout(() => setToastMessage(null), 4000);
                  return;
                }
                const ok = await dbService.cloud.syncNow();
                setToastMessage(
                  ok ? 'Data berhasil disinkronkan dari Supabase.' : 'Gagal menyinkronkan data dari Supabase.'
                );
                setTimeout(() => setToastMessage(null), 3500);
              }}
              title={
                cloudSyncStatus.status === 'live'
                  ? 'Sinkronisasi real-time Supabase aktif (klik untuk refresh)'
                  : cloudSyncStatus.status === 'error'
                  ? cloudSyncStatus.lastError || 'Gagal terhubung ke Supabase (klik untuk coba lagi)'
                  : cloudSyncStatus.configured
                  ? 'Menghubungkan sinkronisasi Supabase...'
                  : 'Mode Lokal: data tersimpan di browser perangkat ini saja'
              }
            >
              <span className="topbar-sync-dot" aria-hidden="true" />
              <span className="topbar-sync-label">
                {cloudSyncStatus.status === 'live'
                  ? 'Live Sync'
                  : cloudSyncStatus.status === 'connecting'
                  ? 'Syncing...'
                  : cloudSyncStatus.status === 'error'
                  ? 'Sync Error'
                  : 'Mode Lokal'}
              </span>
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
                  : mainSection === 'customers'
                  ? 'Data Pelanggan'
                  : mainSection === 'orders'
                  ? 'Kelola & Penugasan Pesanan'
                  : 'Pesanan Pelanggan (Riwayat & Detail)'}
              </h2>
            </div>
            <div className="page-header-actions-row">
              <div className="page-header-breadcrumb">
                <span className="breadcrumb-lead">Dashboard</span>
                <span className="breadcrumb-slash">/</span>
                <span className="breadcrumb-active-tag">
                  {mainSection === 'overview'
                    ? 'Overview'
                    : mainSection === 'drivers'
                    ? 'Verifikasi Driver'
                    : mainSection === 'customers'
                    ? 'Data Pelanggan'
                    : mainSection === 'orders'
                    ? 'Penugasan Pesanan'
                    : 'Pesanan Pelanggan'}
                </span>
              </div>
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

                <div
                  className="metric-card"
                  onClick={() => {
                    setMainSection('orders');
                    setOrderTab('all');
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <span className="metric-label">Total Pesanan & Tugaskan</span>
                  <div className="metric-bottom-row">
                    <span className="metric-num">{orderCounts.total}</span>
                    <div className="metric-trend-wrap">
                      <span className={`metric-trend-badge ${orderCounts.unassigned > 0 ? 'warning' : 'success'}`}>
                        {orderCounts.unassigned > 0 ? `${orderCounts.unassigned} Belum` : 'Tertugaskan'}
                      </span>
                      <span className="metric-trend-text">Klik kelola</span>
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
                          paginatedDrivers.map((d, idx) => {
                            const isPending = d.verification_status === 'pending';
                            const isRejected = d.verification_status === 'rejected';
                            const statusClass = isPending ? 'pending' : isRejected ? 'cancel' : 'active';
                            const statusLabel = isPending ? 'Menunggu Review' : isRejected ? 'Ditolak' : 'Disetujui';
                            const isOnline = typeof d.is_online === 'boolean' ? d.is_online : d.verification_status === 'approved';

                            return (
                              <tr
                                key={d.id || `${d.phone || d.name || 'drv'}-${idx}`}
                                className="tailadmin-tr"
                                onClick={() => {
                                  setMainSection('drivers');
                                  setDriverSearchQuery(d.name);
                                }}
                                title={`Klik untuk melihat detail ${d.name}`}
                              >
                                <td className="tailadmin-td user-td user-td--has-actions" data-label="Driver">
                                  <div className="table-user-cell">
                                    <div className={`table-user-avatar ${!d.avatar ? 'driver-initial-avatar' : ''}`}>
                                      {d.avatar ? (
                                        <img
                                          src={d.avatar}
                                          alt={d.name}
                                          className="table-avatar-photo"
                                          onError={(e) => {
                                            e.currentTarget.style.display = 'none';
                                            const fallback = e.currentTarget.parentElement.querySelector('.driver-initial-text');
                                            if (fallback) fallback.style.display = 'flex';
                                          }}
                                        />
                                      ) : null}
                                      <span
                                        className="driver-initial-text"
                                        style={{ display: d.avatar ? 'none' : 'flex' }}
                                      >
                                        {d.name ? d.name.trim().charAt(0).toUpperCase() : 'D'}
                                      </span>
                                    </div>
                                    <div className="table-user-meta">
                                      <span className="table-user-name">{d.name}</span>
                                      <span className="table-user-sub">
                                        {d.phone || '-'}
                                      </span>
                                    </div>
                                  </div>
                                  <MobileCardActionMenu
                                    menuKey={`overview-driver-${d.id || idx}`}
                                    activeKey={activeCardMenuKey}
                                    onToggle={handleToggleCardMenu}
                                    onClose={() => setActiveCardMenuKey(null)}
                                    items={[
                                      {
                                        key: 'edit',
                                        label: isPending ? 'Lengkapi & Verifikasi' : 'Edit Data Driver',
                                        icon: <Edit3 size={15} />,
                                        onClick: () => handleOpenEditDriver(d)
                                      },
                                      {
                                        key: 'delete',
                                        label: 'Hapus Data Driver',
                                        icon: <Trash2 size={15} />,
                                        variant: 'danger',
                                        onClick: () => setDriverDeleteConfirm(d)
                                      }
                                    ]}
                                  />
                                </td>
                                <td className="tailadmin-td service-td" data-label="Layanan">
                                  <div className="table-cell-meta">
                                    <span className="table-primary-text">
                                      {getDriverServiceLabel(d, false)}
                                    </span>
                                    <span className="table-secondary-text">
                                      {d.vehicleModel || (isDriverUsingCar(d) ? 'Mobil' : 'Motor')}
                                      {d.plateNumber ? ` • ${d.plateNumber}` : ''}
                                      {d.vehicleColor ? ` (${d.vehicleColor})` : ''}
                                    </span>
                                  </div>
                                </td>
                                <td className="tailadmin-td area-td" data-label="Wilayah">
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
                                <td className="tailadmin-td status-td" data-label="Status">
                                  <div className="table-status-stack">
                                    <span className={`table-status-pill ${statusClass}`}>
                                      {statusLabel}
                                    </span>
                                    <span
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 5,
                                        padding: '2px 8px',
                                        borderRadius: 999,
                                        fontSize: 11,
                                        fontWeight: 700,
                                        backgroundColor: isOnline ? '#ECFDF5' : '#F1F5F9',
                                        color: isOnline ? '#059669' : '#64748B',
                                        border: isOnline ? '1px solid #A7F3D0' : '1px solid #E2E8F0'
                                      }}
                                    >
                                      <span
                                        style={{
                                          width: 6,
                                          height: 6,
                                          borderRadius: '50%',
                                          backgroundColor: isOnline ? '#10B981' : '#94A3B8'
                                        }}
                                      />
                                      {isOnline ? 'Online · Siap Order' : 'Offline · Istirahat'}
                                    </span>
                                  </div>
                                </td>
                                <td className="tailadmin-td action-td text-right" data-label="Aksi">
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
                                    <button
                                      type="button"
                                      className="btn-table-icon-action btn-icon-delete"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDriverDeleteConfirm(d);
                                      }}
                                      title="Hapus Data Driver"
                                      aria-label="Hapus Driver"
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
                          paginatedCustomers.map((c, idx) => {
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
                                key={c.id || `${c.phone || c.full_name || 'cust'}-${idx}`}
                                className="tailadmin-tr"
                                onClick={() => setSelectedCustomerDetail(c)}
                                title={`Klik untuk melihat detail ${c.full_name || 'Pelanggan'}`}
                              >
                                <td className="tailadmin-td user-td user-td--has-actions" data-label="Pelanggan">
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
                                  <MobileCardActionMenu
                                    menuKey={`overview-customer-${c.id || idx}`}
                                    activeKey={activeCardMenuKey}
                                    onToggle={handleToggleCardMenu}
                                    onClose={() => setActiveCardMenuKey(null)}
                                    items={[
                                      {
                                        key: 'detail',
                                        label: 'Lihat Detail Profil',
                                        icon: <Eye size={15} />,
                                        onClick: () => setSelectedCustomerDetail(c)
                                      }
                                    ]}
                                  />
                                </td>
                                <td className="tailadmin-td contact-td" data-label="Kontak">
                                  <div className="table-cell-meta">
                                    <span className="table-primary-text">{c.phone || '-'}</span>
                                    <span className="table-secondary-text">{c.email || 'Tanpa email'}</span>
                                  </div>
                                </td>
                                <td className="tailadmin-td area-td" data-label="Aktivitas">
                                  <div className="table-cell-meta">
                                    <span className="table-primary-text">
                                      {orderCount > 0 ? `${orderCount}x Pesanan` : 'Pelanggan Baru'}
                                    </span>
                                    <span className="table-secondary-text">
                                      Daftar: {formattedDate}
                                    </span>
                                  </div>
                                </td>
                                <td className="tailadmin-td status-td" data-label="Status">
                                  <span className={`table-status-pill ${statusClass}`}>
                                    {statusLabel}
                                  </span>
                                </td>
                                <td className="tailadmin-td action-td text-right" data-label="Aksi">
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
                        paginatedDriversView.map((driver, idx) => {
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
                          const isApproved = driver.verification_status === 'approved';
                          const isRejected = driver.verification_status === 'rejected';
                          const statusClass = isPending ? 'pending' : isRejected ? 'cancel' : 'active';
                          const statusLabel = isPending ? 'Menunggu Review' : isRejected ? 'Ditolak' : 'Disetujui';
                          const isOnline = typeof driver.is_online === 'boolean' ? driver.is_online : isApproved;

                          const waPhone = (driver.phone || '').replace(/^\+?62|^0/, '62');

                          return (
                            <tr key={driver.id || `${driver.phone || driver.name || 'drv'}-${idx}`} className="tailadmin-tr">
                              <td className="tailadmin-td user-td user-td--has-actions" data-label="Driver">
                                <div className="table-user-cell">
                                  <div className={`table-user-avatar ${!driver.avatar ? 'driver-initial-avatar' : ''}`}>
                                    {driver.avatar ? (
                                      <img
                                        src={driver.avatar}
                                        alt={driver.name}
                                        className="table-avatar-photo"
                                        onError={(e) => {
                                          e.currentTarget.style.display = 'none';
                                          const fallback = e.currentTarget.parentElement.querySelector('.driver-initial-text');
                                          if (fallback) fallback.style.display = 'flex';
                                        }}
                                      />
                                    ) : null}
                                    <span
                                      className="driver-initial-text"
                                      style={{ display: driver.avatar ? 'none' : 'flex' }}
                                    >
                                      {driver.name ? driver.name.trim().charAt(0).toUpperCase() : 'D'}
                                    </span>
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
                                <MobileCardActionMenu
                                  menuKey={`driver-verification-${driver.id || idx}`}
                                  activeKey={activeCardMenuKey}
                                  onToggle={handleToggleCardMenu}
                                  onClose={() => setActiveCardMenuKey(null)}
                                  items={[
                                    {
                                      key: 'edit',
                                      label: 'Edit & Lengkapi Data',
                                      icon: <Edit3 size={15} />,
                                      onClick: () => handleOpenEditDriver(driver)
                                    },
                                    isPending
                                      ? {
                                          key: 'approve',
                                          label: 'Setujui Driver',
                                          icon: <CheckCircle2 size={15} />,
                                          variant: 'success',
                                          onClick: () => setApproveConfirmDriver(driver)
                                        }
                                      : null,
                                    isPending
                                      ? {
                                          key: 'reject',
                                          label: 'Tolak Berkas Driver',
                                          icon: <XCircle size={15} />,
                                          variant: 'warning',
                                          onClick: () => openRejectDriverModal(driver)
                                        }
                                      : null,
                                    isApproved
                                      ? {
                                          key: 'revoke',
                                          label: 'Cabut Status Persetujuan',
                                          icon: <XCircle size={15} />,
                                          variant: 'warning',
                                          onClick: () => openRejectDriverModal(driver)
                                        }
                                      : null,
                                    isRejected
                                      ? {
                                          key: 'reapprove',
                                          label: 'Tinjau Ulang & Setujui',
                                          icon: <CheckCircle2 size={15} />,
                                          variant: 'success',
                                          onClick: () => setApproveConfirmDriver(driver)
                                        }
                                      : null,
                                    {
                                      key: 'delete',
                                      label: 'Hapus Data Driver',
                                      icon: <Trash2 size={15} />,
                                      variant: 'danger',
                                      onClick: () => setDriverDeleteConfirm(driver)
                                    }
                                  ]}
                                />
                              </td>
                              <td className="tailadmin-td service-td" data-label="Layanan">
                                <div className="table-cell-meta">
                                  <span className="table-primary-text">
                                    {getDriverServiceLabel(driver, false)}
                                  </span>
                                  <span className="table-secondary-text">
                                    {driver.vehicleModel || (isDriverUsingCar(driver) ? 'Mobil' : 'Motor')}
                                    {driver.plateNumber ? ` • ${driver.plateNumber}` : ''}
                                    {driver.vehicleColor ? ` (${driver.vehicleColor})` : ''}
                                  </span>
                                </div>
                              </td>
                              <td className="tailadmin-td docs-td" data-label="Berkas">
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
                              <td className="tailadmin-td area-td" data-label="Wilayah">
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
                              <td className="tailadmin-td status-td" data-label="Status">
                                <div className="table-status-stack">
                                  <span className={`table-status-pill ${statusClass}`}>
                                    {statusLabel}
                                  </span>
                                  <span
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 5,
                                      padding: '2px 8px',
                                      borderRadius: 999,
                                      fontSize: 11,
                                      fontWeight: 700,
                                      backgroundColor: isOnline ? '#ECFDF5' : '#F1F5F9',
                                      color: isOnline ? '#059669' : '#64748B',
                                      border: isOnline ? '1px solid #A7F3D0' : '1px solid #E2E8F0'
                                    }}
                                  >
                                    <span
                                      style={{
                                        width: 6,
                                        height: 6,
                                        borderRadius: '50%',
                                        backgroundColor: isOnline ? '#10B981' : '#94A3B8'
                                      }}
                                    />
                                    {isOnline ? 'Online · Siap Order' : 'Offline · Istirahat'}
                                  </span>
                                </div>
                              </td>
                              <td className="tailadmin-td action-td text-right" data-label="Aksi">
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
                                          openRejectDriverModal(driver);
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
                                        openRejectDriverModal(driver);
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

                                  <button
                                    type="button"
                                    className="btn-table-icon-action btn-icon-delete"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDriverDeleteConfirm(driver);
                                    }}
                                    title="Hapus Data Driver"
                                    aria-label="Hapus Driver"
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
        {/* VIEW 4: SEMUA PESANAN & RIWAYAT PELANGGAN (DETAIL, SELESAI, BATAL) */}
        {/* ================================================================= */}
        {mainSection === 'all_orders' && (
          <>
            {/* KPI Summary Cards All Orders */}
            <section className="dash-metrics-grid">
              <div
                className={`metric-card ${allOrdersStatusTab === 'all' ? 'active' : ''}`}
                onClick={() => setAllOrdersStatusTab('all')}
              >
                <span className="metric-label">Total Semua Pesanan</span>
                <div className="metric-bottom-row">
                  <span className="metric-num">{allOrdersMetrics.total}</span>
                  <div className="metric-trend-wrap">
                    <span className="metric-trend-badge success">Arsip Seluruh Pesanan</span>
                  </div>
                </div>
              </div>

              <div
                className={`metric-card ${allOrdersStatusTab === 'completed' ? 'active' : ''}`}
                onClick={() => setAllOrdersStatusTab('completed')}
              >
                <span className="metric-label">Pesanan Selesai</span>
                <div className="metric-bottom-row">
                  <span className="metric-num">{allOrdersMetrics.completed}</span>
                  <div className="metric-trend-wrap">
                    <span className="metric-trend-badge success">Berhasil Diantar</span>
                  </div>
                </div>
              </div>

              <div
                className={`metric-card ${allOrdersStatusTab === 'in_progress' ? 'active' : ''}`}
                onClick={() => setAllOrdersStatusTab('in_progress')}
              >
                <span className="metric-label">Sedang Berjalan / Aktif</span>
                <div className="metric-bottom-row">
                  <span className="metric-num">{allOrdersMetrics.inProgress}</span>
                  <div className="metric-trend-wrap">
                    <span className="metric-trend-badge primary">Dalam Proses</span>
                  </div>
                </div>
              </div>

              <div
                className={`metric-card ${allOrdersStatusTab === 'cancelled' ? 'active' : ''}`}
                onClick={() => setAllOrdersStatusTab('cancelled')}
              >
                <span className="metric-label">Pesanan Dibatalkan</span>
                <div className="metric-bottom-row">
                  <span className="metric-num">{allOrdersMetrics.cancelled}</span>
                  <div className="metric-trend-wrap">
                    <span className={`metric-trend-badge ${allOrdersMetrics.cancelled > 0 ? 'warning' : 'success'}`}>
                      {allOrdersMetrics.cancelled > 0 ? 'Dibatalkan' : 'Nihil Batal'}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* Filter and Search Bar All Orders */}
            <section className="dash-filter-row" style={{ flexWrap: 'wrap', gap: 12 }}>
              <div className="dash-tabs">
                <button
                  className={`dash-tab-btn ${allOrdersStatusTab === 'all' ? 'active' : ''}`}
                  onClick={() => setAllOrdersStatusTab('all')}
                >
                  Semua ({allOrdersMetrics.total})
                </button>
                <button
                  className={`dash-tab-btn ${allOrdersStatusTab === 'completed' ? 'active' : ''}`}
                  onClick={() => setAllOrdersStatusTab('completed')}
                >
                  Selesai ({allOrdersMetrics.completed})
                </button>
                <button
                  className={`dash-tab-btn ${allOrdersStatusTab === 'in_progress' ? 'active' : ''}`}
                  onClick={() => setAllOrdersStatusTab('in_progress')}
                >
                  Berjalan ({allOrdersMetrics.inProgress})
                </button>
                <button
                  className={`dash-tab-btn ${allOrdersStatusTab === 'cancelled' ? 'active' : ''}`}
                  onClick={() => setAllOrdersStatusTab('cancelled')}
                >
                  Dibatalkan ({allOrdersMetrics.cancelled})
                </button>
              </div>

              <div className="dash-filter-right-controls">
                <div className="assign-select-wrap">
                  <select
                    className="assign-select-filter"
                    value={allOrdersServiceFilter}
                    onChange={(e) => setAllOrdersServiceFilter(e.target.value)}
                  >
                    <option value="all">Semua Layanan</option>
                    <option value="motor">Motor (SheRide)</option>
                    <option value="mobil">Mobil (SheCar)</option>
                    <option value="paket">Paket (SheSend)</option>
                  </select>
                  <ChevronDown size={14} className="assign-select-icon" />
                </div>

                <div className="dash-search-box wide">
                  <Search size={16} className="search-icon" />
                  <input
                    type="text"
                    placeholder="Cari kode, nama pelanggan, driver, alamat..."
                    value={allOrdersSearchQuery}
                    onChange={(e) => setAllOrdersSearchQuery(e.target.value)}
                  />
                  {allOrdersSearchQuery && (
                    <button
                      type="button"
                      className="btn-clear-search"
                      onClick={() => setAllOrdersSearchQuery('')}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
            </section>

            {/* All Orders Table Section */}
            <section className="dash-customer-list-section">
              <div className="overview-split-card tailadmin-table-card">
                <div className="tailadmin-table-responsive">
                  <table className="tailadmin-project-table mobile-hide-thead assignment-orders-table">
                    <thead>
                      <tr className="tailadmin-th-row">
                        <th className="tailadmin-th text-left">Kode & Layanan</th>
                        <th className="tailadmin-th text-left">Pelanggan</th>
                        <th className="tailadmin-th text-left">Lokasi & Tujuan</th>
                        <th className="tailadmin-th text-left">Mitra Driver</th>
                        <th className="tailadmin-th text-left">Tarif & Bayar</th>
                        <th className="tailadmin-th text-left">Status</th>
                        <th className="tailadmin-th text-right">Rincian</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAllOrders.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="table-empty-td">
                            <div className="table-empty-content">
                              <Receipt size={28} className="empty-icon" />
                              <span>
                                {allOrdersSearchQuery
                                  ? `Tidak ditemukan pesanan yang cocok dengan "${allOrdersSearchQuery}".`
                                  : 'Belum ada data pesanan pada filter ini.'}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        paginatedAllOrdersView.map((ord, idx) => {
                          const { isSend, serviceLabel, orderCode, fareFormatted, createdDateStr } =
                            getOrderDisplayMeta(ord);

                          const isCancelled = isCustomerOrderCancelled(ord);
                          const isCompleted = isCustomerOrderCompleted(ord);
                          const isAssigned = ord.assignment_status === 'assigned';

                          return (
                            <tr key={ord.id || `${orderCode}-${ord.created_at || idx}`} className="tailadmin-tr">
                              <td className="tailadmin-td user-td user-td--has-actions" data-label="Kode & Layanan">
                                <OrderTitleMeta
                                  orderCode={orderCode}
                                  serviceLabel={serviceLabel}
                                  secondaryText={createdDateStr}
                                />
                                <MobileCardActionMenu
                                  menuKey={`order-list-${ord.id || orderCode || idx}`}
                                  activeKey={activeCardMenuKey}
                                  onToggle={handleToggleCardMenu}
                                  onClose={() => setActiveCardMenuKey(null)}
                                  items={[
                                    {
                                      key: 'detail',
                                      label: 'Lihat Rincian Pesanan',
                                      icon: <Eye size={15} />,
                                      onClick: () => setOrderDetailModalData(ord)
                                    }
                                  ]}
                                />
                              </td>

                              <OrderCustomerCell order={ord} isSend={isSend} />

                              <OrderRouteCell order={ord} />

                              <td className="tailadmin-td" data-label="Mitra Driver">
                                {isAssigned ? (
                                  <div className="table-cell-meta">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                      <span className="table-primary-text" style={{ fontWeight: 600 }}>
                                        {ord.driver_name || ord.driver?.name || 'Mitra Driver'}
                                      </span>
                                      <span
                                        className={`table-status-pill ${
                                          isCancelled ? 'cancel' : isCompleted ? 'active' : 'pending'
                                        }`}
                                        style={
                                          isCompleted
                                            ? {
                                                fontSize: 10,
                                                padding: '1px 7px',
                                                backgroundColor: '#ECFDF5',
                                                color: '#059669',
                                                border: '1px solid #A7F3D0'
                                              }
                                            : isCancelled
                                            ? { fontSize: 10, padding: '1px 7px' }
                                            : {
                                                fontSize: 10,
                                                padding: '1px 7px',
                                                backgroundColor: '#EFF6FF',
                                                color: '#2563EB',
                                                border: '1px solid #BFDBFE'
                                              }
                                        }
                                      >
                                        {isCancelled
                                          ? 'Dibatalkan'
                                          : isCompleted
                                          ? 'Selesai Ditugaskan'
                                          : 'Ditugaskan'}
                                      </span>
                                    </div>
                                    <span className="table-secondary-text">
                                      {ord.driver_plate || ord.driver?.plateNumber || 'DD - MKS'}
                                      {(ord.driver_vehicle || ord.driver?.vehicleModel)
                                        ? ` • ${ord.driver_vehicle || ord.driver?.vehicleModel}`
                                        : ''}
                                    </span>
                                  </div>
                                ) : (
                                  <span style={{ fontSize: 12, color: '#94A3B8', fontStyle: 'italic' }}>
                                    Belum Ada Driver
                                  </span>
                                )}
                              </td>

                              <td className="tailadmin-td" data-label="Tarif & Bayar">
                                <div className="table-cell-meta">
                                  <span className="table-primary-text" style={{ fontWeight: 700 }}>
                                    {fareFormatted}
                                  </span>
                                  <span className="table-secondary-text">
                                    {(ord.payment_method || 'CASH').toUpperCase()}
                                  </span>
                                </div>
                              </td>

                              <td className="tailadmin-td status-td" data-label="Status">
                                {isCompleted ? (
                                  <span className="table-status-pill active">Selesai</span>
                                ) : isCancelled ? (
                                  <span className="table-status-pill cancel">Dibatalkan</span>
                                ) : isAssigned ? (
                                  <span
                                    className="table-status-pill active"
                                    style={{ backgroundColor: '#EFF6FF', color: '#2563EB', borderColor: '#BFDBFE' }}
                                  >
                                    Berjalan
                                  </span>
                                ) : (
                                  <span className="table-status-pill pending">Menunggu</span>
                                )}
                              </td>

                              <td className="tailadmin-td action-td text-right" data-label="Rincian">
                                <div className="table-action-group table-action-icons-row">
                                  <button
                                    type="button"
                                    className="btn-table-icon-action btn-icon-detail"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOrderDetailModalData(ord);
                                    }}
                                    title="Lihat Rincian Lengkap Pesanan"
                                    aria-label="Lihat Rincian Lengkap Pesanan"
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

                {/* TailAdmin Table Footer Pagination All Orders View */}
                <div className="tailadmin-table-footer">
                  <div className="table-pagination-info">
                    Menampilkan{' '}
                    <strong>
                      {filteredAllOrders.length === 0
                        ? 0
                        : (currentAllOrdersPage - 1) * TABLE_PAGE_SIZE + 1}
                      {' - '}
                      {Math.min(currentAllOrdersPage * TABLE_PAGE_SIZE, filteredAllOrders.length)}
                    </strong>{' '}
                    dari <strong>{filteredAllOrders.length}</strong> pesanan
                  </div>

                  <div className="table-pagination-controls">
                    <button
                      type="button"
                      className="btn-pagination-nav"
                      disabled={currentAllOrdersPage <= 1}
                      onClick={() => setAllOrdersViewPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft size={15} />
                      <span>Sebelumnya</span>
                    </button>

                    <div className="table-pagination-pages">
                      {renderPaginationPages(currentAllOrdersPage, totalAllOrdersPages, setAllOrdersViewPage)}
                    </div>

                    <button
                      type="button"
                      className="btn-pagination-nav"
                      disabled={currentAllOrdersPage >= totalAllOrdersPages}
                      onClick={() => setAllOrdersViewPage((p) => Math.min(totalAllOrdersPages, p + 1))}
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
                        paginatedCustomersView.map((cust, idx) => {
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
                              key={cust.id || `${cust.phone || cust.full_name || 'cust'}-${idx}`}
                              className="tailadmin-tr"
                              onClick={() => setSelectedCustomerDetail(cust)}
                              title={`Klik untuk melihat detail ${cust.full_name || 'Pelanggan'}`}
                            >
                              <td className="tailadmin-td user-td user-td--has-actions" data-label="Pelanggan">
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
                                <MobileCardActionMenu
                                  menuKey={`customer-list-${cust.id || idx}`}
                                  activeKey={activeCardMenuKey}
                                  onToggle={handleToggleCardMenu}
                                  onClose={() => setActiveCardMenuKey(null)}
                                  items={[
                                    {
                                      key: 'detail',
                                      label: 'Lihat Detail Profil',
                                      icon: <Eye size={15} />,
                                      onClick: () => setSelectedCustomerDetail(cust)
                                    },
                                    {
                                      key: 'status',
                                      label: isSuspended ? 'Aktifkan Akun' : 'Tangguhkan Akun',
                                      icon: isSuspended ? <UserCheck size={15} /> : <UserX size={15} />,
                                      variant: isSuspended ? 'success' : 'warning',
                                      onClick: () => setCustomerStatusConfirm(cust)
                                    },
                                    {
                                      key: 'delete',
                                      label: 'Hapus Data Pelanggan',
                                      icon: <Trash2 size={15} />,
                                      variant: 'danger',
                                      onClick: () => setCustomerDeleteConfirm(cust)
                                    }
                                  ]}
                                />
                              </td>
                              <td className="tailadmin-td contact-td" data-label="Kontak">
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
                              <td className="tailadmin-td area-td" data-label="Aktivitas">
                                <div className="table-cell-meta">
                                  <span className="table-primary-text">
                                    {orderCount > 0 ? `${orderCount}x Pesanan` : 'Pelanggan Baru'}
                                  </span>
                                  <span className="table-secondary-text">
                                    Bergabung: {formattedDate}
                                  </span>
                                </div>
                              </td>
                              <td className="tailadmin-td status-td" data-label="Status">
                                <span className={`table-status-pill ${statusClass}`}>
                                  {statusLabel}
                                </span>
                              </td>
                              <td className="tailadmin-td action-td text-right" data-label="Aksi">
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

        {/* ================================================================= */}
        {/* VIEW 3: PENUGASAN PESANAN PELANGGAN KE DRIVER (ORDER DISPATCH)    */}
        {/* ================================================================= */}
        {mainSection === 'orders' && (
          <>
            {/* KPI Summary Cards Orders */}
            <section className="dash-metrics-grid">
              <div
                className={`metric-card ${orderTab === 'all' ? 'active' : ''}`}
                onClick={() => setOrderTab('all')}
              >
                <span className="metric-label">Total Pesanan Pelanggan</span>
                <div className="metric-bottom-row">
                  <span className="metric-num">{orderCounts.total}</span>
                  <div className="metric-trend-wrap">
                    <span className="metric-trend-badge success">Motor, Mobil & Paket</span>
                  </div>
                </div>
              </div>

              <div
                className={`metric-card ${orderTab === 'unassigned' ? 'active' : ''}`}
                onClick={() => setOrderTab('unassigned')}
              >
                <span className="metric-label">Menunggu Penugasan Driver</span>
                <div className="metric-bottom-row">
                  <span className="metric-num">{orderCounts.unassigned}</span>
                  <div className="metric-trend-wrap">
                    <span className={`metric-trend-badge ${orderCounts.unassigned > 0 ? 'warning' : 'success'}`}>
                      {orderCounts.unassigned > 0 ? 'Perlu Ditugaskan' : 'Semua Tertugaskan'}
                    </span>
                  </div>
                </div>
              </div>

              <div
                className={`metric-card ${orderTab === 'assigned' ? 'active' : ''}`}
                onClick={() => setOrderTab('assigned')}
              >
                <span className="metric-label">Sudah Ditugaskan ke Driver</span>
                <div className="metric-bottom-row">
                  <span className="metric-num">{orderCounts.assigned}</span>
                  <div className="metric-trend-wrap">
                    <span className="metric-trend-badge success">Aktif Berjalan</span>
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
                <span className="metric-label">Mitra Driver Siap Tugas</span>
                <div className="metric-bottom-row">
                  <span className="metric-num">{driverCounts.approved}</span>
                  <div className="metric-trend-wrap">
                    <span className="metric-trend-badge success">Disetujui Admin</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Filter and Search Bar Orders */}
            <section className="dash-filter-row" style={{ flexWrap: 'wrap', gap: 12 }}>
              <div className="dash-tabs">
                <button
                  className={`dash-tab-btn ${orderTab === 'all' ? 'active' : ''}`}
                  onClick={() => setOrderTab('all')}
                >
                  Semua Pesanan ({orderCounts.total})
                </button>
                <button
                  className={`dash-tab-btn ${orderTab === 'unassigned' ? 'active' : ''}`}
                  onClick={() => setOrderTab('unassigned')}
                >
                  Belum Ditugaskan ({orderCounts.unassigned})
                </button>
                <button
                  className={`dash-tab-btn ${orderTab === 'assigned' ? 'active' : ''}`}
                  onClick={() => setOrderTab('assigned')}
                >
                  Sudah Ditugaskan ({orderCounts.assigned})
                </button>
                <button
                  className={`dash-tab-btn ${orderTab === 'cancelled' ? 'active' : ''}`}
                  onClick={() => setOrderTab('cancelled')}
                >
                  Dibatalkan ({orderCounts.cancelled})
                </button>
              </div>

              <div className="dash-filter-right-controls">
                <div className="assign-select-wrap">
                  <select
                    className="assign-select-filter"
                    value={orderServiceFilter}
                    onChange={(e) => setOrderServiceFilter(e.target.value)}
                  >
                    <option value="all">Semua Layanan</option>
                    <option value="motor">Motor (SheRide)</option>
                    <option value="mobil">Mobil (SheCar)</option>
                    <option value="paket">Paket (SheSend)</option>
                  </select>
                  <ChevronDown size={14} className="assign-select-icon" />
                </div>

                <div className="dash-search-box wide">
                  <Search size={16} className="search-icon" />
                  <input
                    type="text"
                    placeholder="Cari kode pesanan, pelanggan, alamat, atau driver..."
                    value={orderSearchQuery}
                    onChange={(e) => setOrderSearchQuery(e.target.value)}
                  />
                  {orderSearchQuery && (
                    <button
                      type="button"
                      className="btn-clear-search"
                      onClick={() => setOrderSearchQuery('')}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
            </section>

            {/* Orders Table Section */}
            <section className="dash-customer-list-section">
              <div className="overview-split-card tailadmin-table-card">
                <div className="tailadmin-table-responsive">
                  <table className="tailadmin-project-table mobile-hide-thead assignment-orders-table">
                    <thead>
                      <tr className="tailadmin-th-row">
                        <th className="tailadmin-th text-left">Kode & Layanan</th>
                        <th className="tailadmin-th text-left">Pelanggan</th>
                        <th className="tailadmin-th text-left">Rute Jemput & Tujuan</th>
                        <th className="tailadmin-th text-left">Mitra Driver Ditugaskan</th>
                        <th className="tailadmin-th text-right">Aksi Penugasan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="table-empty-td">
                            <div className="table-empty-content">
                              <Package size={28} className="empty-icon" />
                              <span>
                                {orderSearchQuery
                                  ? `Tidak ditemukan pesanan yang cocok dengan "${orderSearchQuery}".`
                                  : orderTab === 'assigned'
                                  ? 'Belum ada pesanan yang selesai ditugaskan.'
                                  : orderTab === 'cancelled'
                                  ? 'Belum ada pesanan yang dibatalkan.'
                                  : orderTab === 'unassigned'
                                  ? 'Tidak ada pesanan aktif yang menunggu penugasan driver.'
                                  : 'Semua pesanan aktif telah selesai ditugaskan (lihat di tab Sudah Ditugaskan).'}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        paginatedOrdersView.map((ord, idx) => {
                          const { isSend, serviceLabel, orderCode, fareFormatted, createdDateStr } =
                            getOrderDisplayMeta(ord);
                          const isAssigned = ord.assignment_status === 'assigned';
                          const isTaskCompleted = isOrderDispatchCompleted(ord);
                          const isOrderCompleted = isCustomerOrderCompleted(ord);
                          const isTaskCancelled = isCustomerOrderCancelled(ord);
                          const isTaskActionable =
                            !isTaskCompleted && !isOrderCompleted && !isTaskCancelled;

                          return (
                            <tr key={ord.id || `${orderCode}-${ord.created_at || idx}`} className="tailadmin-tr">
                              <td
                                className={`tailadmin-td user-td ${isTaskActionable ? 'user-td--has-actions' : ''}`}
                                data-label="Kode & Layanan"
                              >
                                <OrderTitleMeta
                                  orderCode={orderCode}
                                  serviceLabel={serviceLabel}
                                  secondaryText={`${createdDateStr} • ${fareFormatted} (${(ord.payment_method || 'cash').toUpperCase()})`}
                                />
                                <MobileCardActionMenu
                                  menuKey={`assignment-list-${ord.id || orderCode || idx}`}
                                  activeKey={activeCardMenuKey}
                                  onToggle={handleToggleCardMenu}
                                  onClose={() => setActiveCardMenuKey(null)}
                                  items={
                                    isTaskActionable
                                      ? [
                                          {
                                            key: 'assign',
                                            label: isAssigned ? 'Ganti Driver' : 'Tugaskan Driver',
                                            icon: <UserCheck size={15} />,
                                            variant: isAssigned ? undefined : 'primary',
                                            onClick: () => {
                                              setAssignModalOrder(ord);
                                              setAssignDriverSearch('');
                                              setAssignVehicleFilter('recommended');
                                              setAssignErrorMessage(null);
                                            }
                                          },
                                          isAssigned && (ord.driver_phone || ord.driver?.phone)
                                            ? {
                                                key: 'wa',
                                                label: 'Kirim WA ke Driver',
                                                icon: <ExternalLink size={15} />,
                                                variant: 'success',
                                                href: buildDriverTaskWhatsAppUrl(ord, ord.driver)
                                              }
                                            : null
                                        ]
                                      : []
                                  }
                                />
                              </td>

                              <OrderCustomerCell order={ord} isSend={isSend} />

                              <OrderRouteCell order={ord} />

                              <td className="tailadmin-td" data-label="Mitra Driver">
                                {isAssigned ? (
                                  <div className="table-cell-meta">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                      <span className="table-primary-text" style={{ fontWeight: 600 }}>
                                        {ord.driver_name || ord.driver?.name || 'Mitra Driver'}
                                      </span>
                                      <span
                                        className={`table-status-pill ${
                                          isTaskCancelled ? 'cancel' : isTaskCompleted ? 'active' : 'pending'
                                        }`}
                                        style={
                                          isTaskCompleted
                                            ? {
                                                fontSize: 10.5,
                                                padding: '1px 8px',
                                                backgroundColor: '#ECFDF5',
                                                color: '#059669',
                                                border: '1px solid #A7F3D0'
                                              }
                                            : isTaskCancelled
                                            ? {
                                                fontSize: 10.5,
                                                padding: '1px 8px'
                                              }
                                            : {
                                                fontSize: 10.5,
                                                padding: '1px 8px',
                                                backgroundColor: '#EFF6FF',
                                                color: '#2563EB',
                                                border: '1px solid #BFDBFE'
                                              }
                                        }
                                      >
                                        {isTaskCancelled
                                          ? 'Dibatalkan'
                                          : isTaskCompleted
                                          ? 'Selesai Ditugaskan'
                                          : 'Ditugaskan'}
                                      </span>
                                    </div>
                                    <span className="table-secondary-text">
                                      {ord.driver_plate || ord.driver?.plateNumber || 'DD - MKS'} • {ord.driver_vehicle || ord.driver?.vehicleModel || 'Mitra Resmi'}
                                    </span>
                                  </div>
                                ) : isTaskCancelled ? (
                                  <div className="table-cell-meta">
                                    <span className="table-status-pill cancel">
                                      Dibatalkan
                                    </span>
                                    <span className="table-secondary-text assignment-empty-driver-hint">
                                      {ord.status_note || 'Pesanan dibatalkan'} · tidak dapat ditugaskan
                                    </span>
                                  </div>
                                ) : isOrderCompleted ? (
                                  <div className="table-cell-meta">
                                    <span className="table-status-pill active">
                                      Selesai
                                    </span>
                                    <span className="table-secondary-text assignment-empty-driver-hint">
                                      Pesanan telah diselesaikan
                                    </span>
                                  </div>
                                ) : (
                                  <div className="table-cell-meta">
                                    <span className="table-status-pill pending">
                                      Belum Ditugaskan
                                    </span>
                                    <span className="table-secondary-text assignment-empty-driver-hint">
                                      Pilih driver aktif untuk mengambil order
                                    </span>
                                  </div>
                                )}
                              </td>

                              <td className="tailadmin-td action-td text-right" data-label="Aksi Penugasan">
                                {isTaskActionable ? (
                                  <div className="table-action-group" style={{ justifyContent: 'flex-end', gap: 6 }}>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setAssignModalOrder(ord);
                                        setAssignDriverSearch('');
                                        setAssignVehicleFilter('recommended');
                                        setAssignErrorMessage(null);
                                      }}
                                      style={{
                                        backgroundColor: isAssigned ? '#F1F5F9' : '#EE4335',
                                        color: isAssigned ? '#334155' : '#FFFFFF',
                                        border: isAssigned ? '1px solid #CBD5E1' : 'none',
                                        borderRadius: 8,
                                        padding: '6px 12px',
                                        fontSize: 12,
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 5
                                      }}
                                    >
                                      <UserCheck size={14} />
                                      <span>{isAssigned ? 'Ganti Driver' : 'Tugaskan Driver'}</span>
                                    </button>

                                    {isAssigned && (ord.driver_phone || ord.driver?.phone) && (
                                      <a
                                        href={buildDriverTaskWhatsAppUrl(ord, ord.driver)}
                                        target="_blank"
                                        rel="noreferrer"
                                        title="Kirim rincian tugas pesanan ke WhatsApp Driver"
                                        style={{
                                          backgroundColor: '#10B981',
                                          color: '#FFFFFF',
                                          borderRadius: 8,
                                          padding: '6px 10px',
                                          fontSize: 12,
                                          fontWeight: 700,
                                          textDecoration: 'none',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: 4
                                        }}
                                      >
                                        <span>WA Driver</span>
                                        <ExternalLink size={12} />
                                      </a>
                                    )}
                                  </div>
                                ) : isTaskCancelled ? (
                                  <div className="table-action-group" style={{ justifyContent: 'flex-end' }}>
                                    <button
                                      type="button"
                                      disabled
                                      title="Pesanan dibatalkan dan tidak dapat ditugaskan ke driver"
                                      aria-label="Pesanan dibatalkan, tidak dapat ditugaskan"
                                      style={{
                                        backgroundColor: '#F1F5F9',
                                        color: '#94A3B8',
                                        border: '1px solid #E2E8F0',
                                        borderRadius: 8,
                                        padding: '6px 12px',
                                        fontSize: 12,
                                        fontWeight: 700,
                                        cursor: 'not-allowed',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 5
                                      }}
                                    >
                                      <XCircle size={14} />
                                      <span>Dibatalkan</span>
                                    </button>
                                  </div>
                                ) : null}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* TailAdmin Table Footer Pagination Orders View */}
                <div className="tailadmin-table-footer">
                  <div className="table-pagination-info">
                    Menampilkan{' '}
                    <strong>
                      {filteredOrders.length === 0
                        ? 0
                        : (currentOrdersViewPage - 1) * TABLE_PAGE_SIZE + 1}
                      {' - '}
                      {Math.min(currentOrdersViewPage * TABLE_PAGE_SIZE, filteredOrders.length)}
                    </strong>{' '}
                    dari <strong>{filteredOrders.length}</strong> pesanan
                  </div>

                  <div className="table-pagination-controls">
                    <button
                      type="button"
                      className="btn-pagination-nav"
                      disabled={currentOrdersViewPage <= 1}
                      onClick={() => setOrdersViewPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft size={15} />
                      <span>Sebelumnya</span>
                    </button>

                    <div className="table-pagination-pages">
                      {renderPaginationPages(currentOrdersViewPage, totalOrdersViewPages, setOrdersViewPage)}
                    </div>

                    <button
                      type="button"
                      className="btn-pagination-nav"
                      disabled={currentOrdersViewPage >= totalOrdersViewPages}
                      onClick={() => setOrdersViewPage((p) => Math.min(totalOrdersViewPages, p + 1))}
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
        <AdminConfirmDialog
          idPrefix="reject-driver-dialog"
          dialogClassName="admin-confirm-dialog--wide"
          title="Tolak Pendaftaran Mitra?"
          subtitle={[rejectModalDriver.name, rejectModalDriver.plateNumber].filter(Boolean).join(', ')}
          onClose={() => setRejectModalDriver(null)}
          onConfirm={handleConfirmReject}
          confirmLabel="Tolak Pendaftaran"
          confirmTone="danger"
          confirmDisabled={rejectReason === 'custom' && !customRejectReason.trim()}
        >
          <p className="confirm-section-label">Pilih alasan penolakan berkas</p>
          <div className="reason-options-list">
            {REJECT_REASON_OPTIONS.map((reason) => {
              const isSelected = rejectReason === reason;
              return (
                <label
                  key={reason}
                  className={`reason-radio-item confirm-radio-item${isSelected ? ' is-selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="rejectReason"
                    value={reason}
                    checked={isSelected}
                    onChange={(e) => setRejectReason(e.target.value)}
                  />
                  <span>{reason}</span>
                </label>
              );
            })}

            <label
              className={`reason-radio-item confirm-radio-item${rejectReason === 'custom' ? ' is-selected' : ''}`}
            >
              <input
                type="radio"
                name="rejectReason"
                value="custom"
                checked={rejectReason === 'custom'}
                onChange={() => setRejectReason('custom')}
              />
              <span>Tulis alasan khusus lainnya</span>
            </label>
          </div>

          {rejectReason === 'custom' && (
            <textarea
              className="dialog-custom-textarea"
              placeholder="Tuliskan alasan penolakan secara spesifik..."
              rows={3}
              value={customRejectReason}
              onChange={(e) => setCustomRejectReason(e.target.value)}
            />
          )}
        </AdminConfirmDialog>
      )}

      {/* ================================================================= */}
      {/* MODAL 3: KONFIRMASI APPROVE DRIVER                                */}
      {/* ================================================================= */}
      {approveConfirmDriver && (() => {
        const docStatus = getDriverDocSummary(approveConfirmDriver, getDriverDocs(approveConfirmDriver.id));
        const vehicleSummary = [approveConfirmDriver.vehicleModel, approveConfirmDriver.plateNumber]
          .filter(Boolean)
          .join(', ') || '-';
        return (
          <AdminConfirmDialog
            idPrefix="approve-driver-dialog"
            title="Setujui Mitra Pengemudi?"
            subtitle="Konfirmasi aktivasi akun calon mitra"
            onClose={() => setApproveConfirmDriver(null)}
            onConfirm={() => handleApprove(approveConfirmDriver)}
            confirmLabel="Setujui Mitra"
            confirmTone="approve"
            summaryItems={[
              { label: 'Nama Mitra', value: approveConfirmDriver.name || '-' },
              { label: 'Layanan', value: getDriverServiceLabel(approveConfirmDriver) },
              { label: 'Kendaraan', value: vehicleSummary },
              { label: 'No. WhatsApp', value: approveConfirmDriver.phone || '-' },
              {
                label: 'Berkas',
                value: docStatus.label,
                tone: docStatus.isComplete ? 'ok' : 'warn'
              }
            ]}
            note="Setelah disetujui, akun pengemudi langsung aktif dan muncul di katalog pesanan SheRide / SheCar."
          />
        );
      })()}

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
      {customerStatusConfirm && (() => {
        const isSuspended = customerStatusConfirm.status === 'suspended';
        return (
          <AdminConfirmDialog
            idPrefix="customer-status-dialog"
            title={isSuspended ? 'Aktifkan Akun Pelanggan?' : 'Tangguhkan Akun Pelanggan?'}
            subtitle="Konfirmasi perubahan akses pelanggan"
            onClose={() => setCustomerStatusConfirm(null)}
            onConfirm={() => handleToggleCustomerStatus(customerStatusConfirm)}
            confirmLabel={isSuspended ? 'Aktifkan Akun' : 'Tangguhkan Akun'}
            confirmTone={isSuspended ? 'approve' : 'danger'}
            summaryItems={[
              { label: 'Nama Pelanggan', value: customerStatusConfirm.full_name || 'Pelanggan' },
              { label: 'No. WhatsApp', value: customerStatusConfirm.phone || '-' },
              {
                label: 'Status Saat Ini',
                value: isSuspended ? 'Ditangguhkan' : 'Aktif',
                tone: isSuspended ? 'danger' : 'ok'
              }
            ]}
            note={
              isSuspended
                ? 'Akun akan diaktifkan kembali sehingga pelanggan dapat masuk dan memesan layanan OTWJek.'
                : 'Pelanggan tidak dapat membuat pesanan baru sampai akun ini diaktifkan kembali.'
            }
          />
        );
      })()}

      {/* ================================================================= */}
      {/* MODAL 6: KONFIRMASI HAPUS PELANGGAN                               */}
      {/* ================================================================= */}
      {customerDeleteConfirm && (
        <AdminConfirmDialog
          idPrefix="customer-delete-dialog"
          title="Hapus Akun Pelanggan?"
          subtitle="Tindakan permanen dan tidak dapat dibatalkan"
          onClose={() => setCustomerDeleteConfirm(null)}
          onConfirm={() => handleDeleteCustomer(customerDeleteConfirm)}
          confirmLabel="Hapus Akun"
          confirmTone="danger"
          summaryItems={[
            { label: 'Nama Pelanggan', value: customerDeleteConfirm.full_name || '-' },
            { label: 'No. WhatsApp', value: customerDeleteConfirm.phone || '-' },
            { label: 'Riwayat Order', value: `${getCustomerOrderCount(customerDeleteConfirm)} pesanan` }
          ]}
          warningNote="Seluruh data akun pelanggan ini akan dihapus permanen dari basis data OTWJek."
        />
      )}

      {/* ================================================================= */}
      {/* MODAL: KONFIRMASI HAPUS DRIVER                                    */}
      {/* ================================================================= */}
      {driverDeleteConfirm && (
        <AdminConfirmDialog
          idPrefix="driver-delete-dialog"
          title="Hapus Akun Mitra Driver?"
          subtitle="Tindakan permanen dan tidak dapat dibatalkan"
          onClose={() => setDriverDeleteConfirm(null)}
          onConfirm={() => handleDeleteDriver(driverDeleteConfirm)}
          confirmLabel="Hapus Mitra"
          confirmTone="danger"
          summaryItems={[
            { label: 'Nama Mitra', value: driverDeleteConfirm.name || '-' },
            { label: 'Layanan', value: getDriverServiceLabel(driverDeleteConfirm) },
            {
              label: 'Kendaraan',
              value: [driverDeleteConfirm.vehicleModel, driverDeleteConfirm.plateNumber].filter(Boolean).join(', ') || '-'
            },
            { label: 'No. WhatsApp', value: driverDeleteConfirm.phone || '-' }
          ]}
          warningNote="Data akun mitra beserta dokumen KTP, SIM, dan STNK akan dihapus permanen."
        />
      )}

      {/* ================================================================= */}
      {/* MODAL: KONFIRMASI BERSIHKAN SELURUH DATABASE                      */}
      {/* ================================================================= */}
      {clearDbModalOpen && (
        <AdminConfirmDialog
          idPrefix="clear-db-dialog"
          title="Bersihkan Seluruh Database?"
          subtitle="Tindakan permanen dan tidak dapat dibatalkan"
          onClose={() => setClearDbModalOpen(false)}
          onConfirm={handleClearEntireDatabase}
          confirmLabel="Bersihkan Database"
          confirmTone="danger"
          summaryItems={[
            { label: 'Data Mitra Driver', value: 'Dihapus permanen', tone: 'danger' },
            { label: 'Berkas KTP, SIM, STNK', value: 'Dihapus permanen', tone: 'danger' },
            { label: 'Akun Pelanggan', value: 'Dihapus permanen', tone: 'danger' },
            { label: 'Riwayat Pesanan', value: 'Dihapus permanen', tone: 'danger' }
          ]}
          warningNote="Hanya akun Super Admin yang dipertahankan agar Anda tetap dapat masuk ke dashboard."
        />
      )}

      {/* ================================================================= */}
      {/* MODAL 7: EDIT & LENGKAPI DATA DRIVER (SIMPLE, CLEAN & MINIMALIST) */}
      {/* ================================================================= */}
      {editingDriver && editDriverForm && (
        <div
          className="admin-modal-backdrop"
          onClick={() => !isSavingDriver && setEditingDriver(null)}
        >
          <div
            className="admin-modal-dialog driver-edit-dialog-minimal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="driver-edit-dialog-title"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="dialog-header edit-dialog-header-minimal">
              <div className="edit-header-copy">
                <div className="edit-dialog-title-row">
                  <h3 id="driver-edit-dialog-title" className="dialog-title">Edit Data Mitra Driver</h3>
                  <span
                    className={`table-status-pill ${
                      editDriverForm.verification_status === 'pending'
                        ? 'pending'
                        : editDriverForm.verification_status === 'rejected'
                        ? 'cancel'
                        : 'active'
                    }`}
                  >
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
                aria-label="Tutup dialog"
                title="Tutup dialog"
              >
                <X size={16} />
              </button>
            </div>

            {/* Clean Navigation Tabs */}
            <div
              className="driver-edit-tabs-minimal"
              role="tablist"
              aria-label="Bagian data mitra driver"
            >
              {[
                { id: 'identitas', label: 'Identitas' },
                { id: 'kendaraan', label: 'Kendaraan' },
                { id: 'dokumen', label: 'Dokumen' },
                { id: 'status', label: 'Status & Darurat' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  id={`driver-edit-tab-${tab.id}`}
                  aria-selected={editDriverActiveTab === tab.id}
                  aria-controls={`driver-edit-panel-${tab.id}`}
                  className={`tab-btn-minimal ${editDriverActiveTab === tab.id ? 'active' : ''}`}
                  onClick={() => setEditDriverActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Modal Body */}
            <div className="dialog-body edit-body-minimal">
              {/* TAB 1: IDENTITAS */}
              {editDriverActiveTab === 'identitas' && (
                <div
                  role="tabpanel"
                  id="driver-edit-panel-identitas"
                  aria-labelledby="driver-edit-tab-identitas"
                  className="edit-section-stack"
                >
                  <div className="avatar-row-minimal">
                    <div className="avatar-identity-group">
                      {editDriverForm.avatar && !editAvatarError ? (
                        <img
                          src={editDriverForm.avatar}
                          alt={`Foto profil ${editDriverForm.name || 'mitra'}`}
                          className="avatar-thumb-minimal"
                          onError={() => setEditAvatarError(true)}
                        />
                      ) : (
                        <div className="avatar-fallback-minimal" aria-hidden="true">
                          {(editDriverForm.name || 'D').trim().charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="avatar-info-minimal">
                        <span className="avatar-label-minimal">Foto Profil Mitra</span>
                        <span className="avatar-helper-minimal">
                          {editDriverForm.avatar && !editAvatarError
                            ? 'Foto profil terpasang'
                            : 'Belum ada foto profil'}
                        </span>
                      </div>
                    </div>
                    <label
                      htmlFor="driver-edit-avatar-input"
                      role="button"
                      tabIndex={0}
                      className="btn-avatar-upload-minimal"
                      onKeyDown={handleFileLabelKeyDown}
                    >
                      <span>{editDriverForm.avatar && !editAvatarError ? 'Ganti Foto' : 'Pilih Foto'}</span>
                      <input
                        id="driver-edit-avatar-input"
                        type="file"
                        accept="image/*"
                        className="visually-hidden-input"
                        onChange={handleAvatarFile}
                      />
                    </label>
                  </div>

                  <div className="minimal-grid">
                    <div className="minimal-field">
                      <label htmlFor="edit-driver-name">Nama Lengkap</label>
                      <input
                        id="edit-driver-name"
                        type="text"
                        placeholder="Nama lengkap driver"
                        value={editDriverForm.name}
                        onChange={(e) => setEditDriverForm({ ...editDriverForm, name: e.target.value })}
                      />
                    </div>

                    <div className="minimal-field">
                      <label htmlFor="edit-driver-phone">Nomor WhatsApp</label>
                      <input
                        id="edit-driver-phone"
                        type="text"
                        placeholder="08xxxxxxxxxx"
                        value={editDriverForm.phone}
                        onChange={(e) => setEditDriverForm({ ...editDriverForm, phone: e.target.value })}
                      />
                    </div>

                    <div className="minimal-field">
                      <label htmlFor="edit-driver-nik">NIK (KTP)</label>
                      <input
                        id="edit-driver-nik"
                        type="text"
                        maxLength={16}
                        placeholder="16 digit NIK"
                        value={editDriverForm.nik}
                        onChange={(e) => setEditDriverForm({ ...editDriverForm, nik: e.target.value })}
                      />
                    </div>

                    <div className="minimal-field">
                      <label htmlFor="edit-driver-gender">Jenis Kelamin</label>
                      <input
                        id="edit-driver-gender"
                        type="text"
                        value="Perempuan (Khusus Wanita)"
                        readOnly
                        className="readonly"
                      />
                    </div>

                    <div className="minimal-field full">
                      <label htmlFor="edit-driver-bio">Bio / Catatan Pelayanan</label>
                      <textarea
                        id="edit-driver-bio"
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
                <div
                  role="tabpanel"
                  id="driver-edit-panel-kendaraan"
                  aria-labelledby="driver-edit-tab-kendaraan"
                  className="edit-section-stack"
                >
                  <div className="minimal-grid">
                    <div className="minimal-field">
                      <label htmlFor="edit-driver-vehicle-type">Jenis Layanan</label>
                      <select
                        id="edit-driver-vehicle-type"
                        value={editDriverForm.vehicleType}
                        onChange={(e) => setEditDriverForm({ ...editDriverForm, vehicleType: e.target.value })}
                      >
                        <option value="motor">SheRide (Sepeda Motor)</option>
                        <option value="mobil">SheCar (Mobil Penumpang)</option>
                        <option value="both">Motor & Mobil (Multi-Armada)</option>
                      </select>
                    </div>

                    {editDriverForm.vehicleType === 'both' ? (
                      <>
                        <div className="minimal-field">
                          <label htmlFor="edit-driver-active-vehicle">Armada Aktif Beroperasi</label>
                          <select
                            id="edit-driver-active-vehicle"
                            value={editDriverForm.activeVehicleType || 'motor'}
                            onChange={(e) => setEditDriverForm({ ...editDriverForm, activeVehicleType: e.target.value })}
                          >
                            <option value="motor">Sepeda Motor (SheRide)</option>
                            <option value="mobil">Mobil Penumpang (SheCar)</option>
                          </select>
                        </div>

                        <div className="minimal-field">
                          <label htmlFor="edit-driver-motor-model">Model Motor</label>
                          <input
                            id="edit-driver-motor-model"
                            type="text"
                            placeholder="Scoopy, Beat, Vario..."
                            value={editDriverForm.motorModel || ''}
                            onChange={(e) => setEditDriverForm({ ...editDriverForm, motorModel: e.target.value })}
                          />
                        </div>

                        <div className="minimal-field">
                          <label htmlFor="edit-driver-motor-plate">Plat Nomor Motor</label>
                          <input
                            id="edit-driver-motor-plate"
                            type="text"
                            placeholder="DD 1234 XX"
                            value={editDriverForm.motorPlate || ''}
                            onChange={(e) => setEditDriverForm({ ...editDriverForm, motorPlate: e.target.value.toUpperCase() })}
                          />
                        </div>

                        <div className="minimal-field">
                          <label htmlFor="edit-driver-car-model">Model Mobil</label>
                          <input
                            id="edit-driver-car-model"
                            type="text"
                            placeholder="Avanza, Calya, Brio..."
                            value={editDriverForm.carModel || ''}
                            onChange={(e) => setEditDriverForm({ ...editDriverForm, carModel: e.target.value })}
                          />
                        </div>

                        <div className="minimal-field">
                          <label htmlFor="edit-driver-car-plate">Plat Nomor Mobil</label>
                          <input
                            id="edit-driver-car-plate"
                            type="text"
                            placeholder="DD 5678 YY"
                            value={editDriverForm.carPlate || ''}
                            onChange={(e) => setEditDriverForm({ ...editDriverForm, carPlate: e.target.value.toUpperCase() })}
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="minimal-field">
                          <label htmlFor="edit-driver-vehicle-brand">Merk Kendaraan</label>
                          <input
                            id="edit-driver-vehicle-brand"
                            type="text"
                            placeholder="Honda, Yamaha, Toyota..."
                            value={editDriverForm.vehicleBrand}
                            onChange={(e) => setEditDriverForm({ ...editDriverForm, vehicleBrand: e.target.value })}
                          />
                        </div>

                        <div className="minimal-field">
                          <label htmlFor="edit-driver-vehicle-model">Model & Tipe</label>
                          <input
                            id="edit-driver-vehicle-model"
                            type="text"
                            placeholder="Scoopy, Fazzio, Calya..."
                            value={editDriverForm.vehicleModel}
                            onChange={(e) => setEditDriverForm({ ...editDriverForm, vehicleModel: e.target.value })}
                          />
                        </div>

                        <div className="minimal-field">
                          <label htmlFor="edit-driver-plate">Plat Nomor</label>
                          <input
                            id="edit-driver-plate"
                            type="text"
                            placeholder="DD 1234 XX"
                            value={editDriverForm.plateNumber}
                            onChange={(e) => setEditDriverForm({ ...editDriverForm, plateNumber: e.target.value.toUpperCase() })}
                          />
                        </div>
                      </>
                    )}

                    <div className="minimal-field">
                      <label htmlFor="edit-driver-color">Warna Kendaraan</label>
                      <input
                        id="edit-driver-color"
                        type="text"
                        placeholder="Warna kendaraan"
                        value={editDriverForm.vehicleColor}
                        onChange={(e) => setEditDriverForm({ ...editDriverForm, vehicleColor: e.target.value })}
                      />
                    </div>

                    <div className="minimal-field">
                      <label htmlFor="edit-driver-area">Area Operasional</label>
                      <input
                        id="edit-driver-area"
                        type="text"
                        placeholder="Makassar, Gowa..."
                        value={editDriverForm.operationalArea}
                        onChange={(e) => setEditDriverForm({ ...editDriverForm, operationalArea: e.target.value })}
                      />
                    </div>

                    <div className="minimal-field full">
                      <label htmlFor="edit-driver-badge">Badge Mitra</label>
                      <input
                        id="edit-driver-badge"
                        type="text"
                        placeholder="Mitra Resmi"
                        value={editDriverForm.badge}
                        onChange={(e) => setEditDriverForm({ ...editDriverForm, badge: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: DOKUMEN & LEGALITAS */}
              {editDriverActiveTab === 'dokumen' && (() => {
                const docRows = [
                  {
                    key: 'ktp',
                    label: 'Foto KTP Asli',
                    url: editDriverForm.ktpUrl,
                    previewType: 'KTP',
                    previewTitle: 'Foto KTP'
                  },
                  ...(editDriverForm.vehicleType === 'both'
                    ? [
                        {
                          key: 'sim',
                          label: 'Foto SIM C Asli (Motor)',
                          url: editDriverForm.simUrl,
                          previewType: 'SIM C',
                          previewTitle: 'Foto SIM C (Motor)'
                        },
                        {
                          key: 'simA',
                          label: 'Foto SIM A Asli (Mobil)',
                          url: editDriverForm.simAUrl,
                          previewType: 'SIM A',
                          previewTitle: 'Foto SIM A (Mobil)'
                        },
                        {
                          key: 'stnk',
                          label: 'Foto STNK Motor',
                          url: editDriverForm.stnkUrl,
                          previewType: 'STNK Motor',
                          previewTitle: 'Foto STNK Motor'
                        },
                        {
                          key: 'stnkCar',
                          label: 'Foto STNK Mobil',
                          url: editDriverForm.stnkCarUrl,
                          previewType: 'STNK Mobil',
                          previewTitle: 'Foto STNK Mobil'
                        }
                      ]
                    : [
                        {
                          key: 'sim',
                          label: `Foto ${editDriverForm.vehicleType === 'mobil' ? 'SIM A' : 'SIM C'} Asli`,
                          url: editDriverForm.simUrl,
                          previewType: 'SIM',
                          previewTitle: 'Foto SIM'
                        },
                        {
                          key: 'stnk',
                          label: 'Foto STNK Kendaraan',
                          url: editDriverForm.stnkUrl,
                          previewType: 'STNK',
                          previewTitle: 'Foto STNK'
                        }
                      ])
                ];

                return (
                  <div
                    role="tabpanel"
                    id="driver-edit-panel-dokumen"
                    aria-labelledby="driver-edit-tab-dokumen"
                    className="edit-section-stack"
                  >
                    <div className="minimal-grid">
                      <div className="minimal-field">
                        <label htmlFor="edit-driver-sim-number">Nomor SIM</label>
                        <input
                          id="edit-driver-sim-number"
                          type="text"
                          placeholder="Nomor SIM"
                          value={editDriverForm.simNumber}
                          onChange={(e) => setEditDriverForm({ ...editDriverForm, simNumber: e.target.value })}
                        />
                      </div>

                      <div className="minimal-field">
                        <label htmlFor="edit-driver-sim-expiry">Masa Berlaku SIM</label>
                        <input
                          id="edit-driver-sim-expiry"
                          type="date"
                          value={editDriverForm.simExpiry || ''}
                          onChange={(e) => setEditDriverForm({ ...editDriverForm, simExpiry: e.target.value })}
                        />
                      </div>

                      <div className="minimal-field full">
                        <label htmlFor="edit-driver-stnk-expiry">Masa Berlaku STNK</label>
                        <input
                          id="edit-driver-stnk-expiry"
                          type="date"
                          value={editDriverForm.stnkExpiry || ''}
                          onChange={(e) => setEditDriverForm({ ...editDriverForm, stnkExpiry: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="docs-list-minimal">
                      {docRows.map((row) => {
                        const inputId = `driver-edit-doc-${row.key}`;
                        return (
                          <div key={row.key} className="doc-row-minimal">
                            <div className="doc-info-minimal">
                              <span className="doc-name-minimal">{row.label}</span>
                              <span className={`doc-status-badge ${row.url ? 'ready' : 'empty'}`}>
                                {row.url ? 'Tersedia' : 'Belum Ada'}
                              </span>
                            </div>
                            <div className="doc-actions-minimal">
                              {row.url && (
                                <button
                                  type="button"
                                  className="btn-doc-link-minimal"
                                  onClick={() =>
                                    setPreviewDoc({
                                      type: row.previewType,
                                      title: row.previewTitle,
                                      url: row.url,
                                      driverName: editDriverForm.name
                                    })
                                  }
                                >
                                  Lihat Foto
                                </button>
                              )}
                              <label
                                htmlFor={inputId}
                                role="button"
                                tabIndex={0}
                                className="btn-doc-upload-minimal"
                                onKeyDown={handleFileLabelKeyDown}
                              >
                                <span>{row.url ? 'Ganti File' : 'Unggah File'}</span>
                                <input
                                  id={inputId}
                                  type="file"
                                  accept="image/*"
                                  className="visually-hidden-input"
                                  onChange={(e) => handleDocFile(row.key, e)}
                                />
                              </label>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* TAB 4: STATUS & DARURAT */}
              {editDriverActiveTab === 'status' && (
                <div
                  role="tabpanel"
                  id="driver-edit-panel-status"
                  aria-labelledby="driver-edit-tab-status"
                  className="edit-section-stack"
                >
                  <div className="minimal-grid">
                    <div className="minimal-field">
                      <label htmlFor="edit-driver-emergency-name">Kontak Darurat (Nama)</label>
                      <input
                        id="edit-driver-emergency-name"
                        type="text"
                        placeholder="Nama keluarga / kerabat"
                        value={editDriverForm.emergencyContactName}
                        onChange={(e) =>
                          setEditDriverForm({ ...editDriverForm, emergencyContactName: e.target.value })
                        }
                      />
                    </div>

                    <div className="minimal-field">
                      <label htmlFor="edit-driver-emergency-phone">Nomor HP Darurat</label>
                      <input
                        id="edit-driver-emergency-phone"
                        type="text"
                        placeholder="08xxxxxxxxxx"
                        value={editDriverForm.emergencyContactPhone}
                        onChange={(e) =>
                          setEditDriverForm({ ...editDriverForm, emergencyContactPhone: e.target.value })
                        }
                      />
                    </div>

                    <div className="minimal-field full">
                      <label htmlFor="edit-driver-status">Status Verifikasi Akun</label>
                      <select
                        id="edit-driver-status"
                        value={editDriverForm.verification_status}
                        onChange={(e) =>
                          setEditDriverForm({ ...editDriverForm, verification_status: e.target.value })
                        }
                      >
                        <option value="approved">Disetujui (Approved / Aktif)</option>
                        <option value="pending">Menunggu Review (Pending)</option>
                        <option value="rejected">Ditolak (Rejected)</option>
                      </select>
                    </div>

                    {editDriverForm.verification_status === 'rejected' && (
                      <div className="minimal-field full">
                        <label htmlFor="edit-driver-rejection-reason">Alasan Penolakan</label>
                        <textarea
                          id="edit-driver-rejection-reason"
                          rows={2}
                          placeholder="Jelaskan alasan penolakan berkas..."
                          value={editDriverForm.rejection_reason}
                          onChange={(e) =>
                            setEditDriverForm({ ...editDriverForm, rejection_reason: e.target.value })
                          }
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
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

      {/* ================================================================= */}
      {/* MODAL 8: PILIH & TUGASKAN MITRA DRIVER PADA PESANAN PELANGGAN     */}
      {/* ================================================================= */}
      {assignModalOrder && (() => {
        const liveAssignOrder =
          bookings.find((b) => b && b.id === assignModalOrder.id) || assignModalOrder;
        const isAssignOrderCancelled = isCustomerOrderCancelled(liveAssignOrder);
        const isAssignOrderCompleted = isCustomerOrderCompleted(liveAssignOrder);
        const isAssignOrderLocked = isAssignOrderCancelled || isAssignOrderCompleted;

        return (
          <div
            className="admin-modal-backdrop"
            onClick={() => {
              setAssignModalOrder(null);
              setAssignErrorMessage(null);
            }}
          >
            <div
              className="admin-modal-dialog assign-dialog-clean"
              role="dialog"
              aria-modal="true"
              aria-labelledby="assign-driver-dialog-title"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="assign-dialog-header">
                <div className="assign-header-left">
                  <h3 id="assign-driver-dialog-title" className="assign-header-title">
                    Tugaskan Mitra Driver
                  </h3>
                  <p className="assign-header-sub">
                    Pelanggan: {liveAssignOrder.customer_name || 'Pelanggan OTWJek'} • Layanan{' '}
                    {liveAssignOrder.service_name ||
                      (liveAssignOrder.service_type === 'mobil'
                        ? 'Mobil'
                        : liveAssignOrder.service_type === 'paket'
                          ? 'Paket'
                          : 'Motor')}
                  </p>
                </div>
                <button
                  type="button"
                  className="assign-close-text-btn"
                  onClick={() => {
                    setAssignModalOrder(null);
                    setAssignErrorMessage(null);
                  }}
                  aria-label="Tutup dialog penugasan"
                >
                  ×
                </button>
              </div>

              <div className="assign-body-clean">
                {/* Ringkasan Pesanan & Rute Minimalis */}
                <div className="assign-order-card">
                  <div className="assign-order-card-header">
                    <span className="assign-order-service-summary">
                      {liveAssignOrder.service_name ||
                        (liveAssignOrder.service_type === 'mobil'
                          ? 'Mobil'
                          : liveAssignOrder.service_type === 'paket'
                            ? 'Paket'
                            : 'Motor')}{' '}
                      • {liveAssignOrder.distance_km || 3.2} km
                    </span>
                    <span className="assign-price-val">
                      Rp {Number(liveAssignOrder.fare_amount || 15000).toLocaleString('id-ID')} •{' '}
                      {(liveAssignOrder.payment_method || 'CASH').toUpperCase()}
                    </span>
                  </div>

                  <div className="assign-route-timeline">
                    <div className="assign-station-row">
                      <span className="assign-station-label">
                        {liveAssignOrder.service_type === 'paket' ? 'Ambil' : 'Jemput'}
                      </span>
                      <div className="assign-station-info">
                        <div className="assign-station-name">{liveAssignOrder.pickup_name || '-'}</div>
                        <div className="assign-station-address">{liveAssignOrder.pickup_address || '-'}</div>
                      </div>
                    </div>
                    <div className="assign-station-row">
                      <span className="assign-station-label">
                        {liveAssignOrder.service_type === 'paket' ? 'Antar' : 'Tujuan'}
                      </span>
                      <div className="assign-station-info">
                        <div className="assign-station-name">{liveAssignOrder.dropoff_name || '-'}</div>
                        <div className="assign-station-address">{liveAssignOrder.dropoff_address || '-'}</div>
                      </div>
                    </div>
                  </div>

                  {liveAssignOrder.package_info && (
                    <div className="assign-package-meta">
                      <span>
                        Barang: {liveAssignOrder.package_info.itemName || liveAssignOrder.package_info.category || 'Paket'} ({liveAssignOrder.package_info.size || 'M'}) • Penerima: {liveAssignOrder.package_info.recipientName || '-'} ({liveAssignOrder.package_info.recipientPhone || '-'})
                      </span>
                    </div>
                  )}
                </div>

                {isAssignOrderLocked && (
                  <div className="assign-error-banner" role="alert">
                    <span>
                      {isAssignOrderCancelled
                        ? 'Pesanan ini telah dibatalkan dan tidak dapat lagi ditugaskan ke mitra driver.'
                        : 'Pesanan ini sudah selesai dan tidak dapat ditugaskan ulang.'}
                    </span>
                  </div>
                )}

                {/* Filter & Pencarian Tanpa Ikon */}
                <div className="assign-filter-row">
                  <div className="assign-search-wrap">
                    <input
                      type="text"
                      className={`assign-search-input ${assignDriverSearch ? 'has-value' : ''}`}
                      aria-label="Cari nama driver, plat, atau wilayah"
                      placeholder="Cari nama driver, plat, atau wilayah..."
                      value={assignDriverSearch}
                      onChange={(e) => setAssignDriverSearch(e.target.value)}
                    />
                    {assignDriverSearch && (
                      <button
                        type="button"
                        className="assign-clear-btn"
                        onClick={() => setAssignDriverSearch('')}
                        aria-label="Hapus pencarian"
                      >
                        Hapus
                      </button>
                    )}
                  </div>
                  <select
                    className="assign-select-filter"
                    aria-label="Filter armada driver"
                    value={assignVehicleFilter}
                    onChange={(e) => setAssignVehicleFilter(e.target.value)}
                  >
                    <option value="recommended">Sesuai Armada</option>
                    <option value="all">Semua Armada</option>
                  </select>
                </div>

                {/* Daftar Mitra Driver */}
                {(() => {
                  const approvedList = drivers.filter((d) => d.verification_status === 'approved');
                  const orderNeedsCar =
                    liveAssignOrder.service_type === 'mobil' ||
                    liveAssignOrder.service_type === 'car' ||
                    String(liveAssignOrder.package_info?.vehicleType || '').toLowerCase().includes('mobil');

                  let candidateDrivers = approvedList.filter((d) => {
                    const dIsCar = isDriverUsingCar(d);
                    if (assignVehicleFilter === 'recommended') {
                      return orderNeedsCar ? dIsCar : !dIsCar;
                    }
                    return true;
                  });

                  if (assignDriverSearch.trim()) {
                    const q = assignDriverSearch.toLowerCase().trim();
                    candidateDrivers = candidateDrivers.filter(
                      (d) =>
                        d.name?.toLowerCase().includes(q) ||
                        d.plateNumber?.toLowerCase().includes(q) ||
                        d.motorData?.plateNumber?.toLowerCase().includes(q) ||
                        d.carData?.plateNumber?.toLowerCase().includes(q) ||
                        d.vehicleModel?.toLowerCase().includes(q) ||
                        d.phone?.toLowerCase().includes(q) ||
                        d.operationalArea?.toLowerCase().includes(q)
                    );
                  }

                  // Prioritaskan driver yang sedang Siap Order di urutan teratas
                  candidateDrivers = [...candidateDrivers].sort((a, b) => {
                    const aOnline = typeof a.is_online === 'boolean' ? a.is_online : true;
                    const bOnline = typeof b.is_online === 'boolean' ? b.is_online : true;
                    if (aOnline !== bOnline) return aOnline ? -1 : 1;
                    return 0;
                  });

                  const onlineCount = candidateDrivers.filter((d) =>
                    typeof d.is_online === 'boolean' ? d.is_online : true
                  ).length;
                  const offlineCount = Math.max(0, candidateDrivers.length - onlineCount);

                  if (approvedList.length === 0) {
                    return (
                      <div className="assign-empty-box">
                        <p className="assign-empty-text">
                          Belum ada akun mitra driver yang berstatus Disetujui.
                        </p>
                        <button
                          type="button"
                          className="btn-assign-text-outline"
                          onClick={() => {
                            setAssignModalOrder(null);
                            setMainSection('drivers');
                          }}
                        >
                          Buka Verifikasi Driver
                        </button>
                      </div>
                    );
                  }

                  if (candidateDrivers.length === 0) {
                    const expectedArmada = orderNeedsCar ? 'Mobil' : 'Motor';
                    return (
                      <div className="assign-empty-box">
                        <p className="assign-empty-text">
                          {assignDriverSearch.trim()
                            ? `Tidak ada driver ${expectedArmada} yang cocok dengan "${assignDriverSearch}".`
                            : `Belum ada mitra driver aktif untuk armada ${expectedArmada}.`}
                        </p>
                        <div className="assign-empty-actions">
                          {assignDriverSearch.trim() ? (
                            <button
                              type="button"
                              className="btn-assign-text-outline"
                              onClick={() => setAssignDriverSearch('')}
                            >
                              Reset Pencarian
                            </button>
                          ) : null}
                          {assignVehicleFilter === 'recommended' ? (
                            <button
                              type="button"
                              className="btn-assign-text-outline"
                              onClick={() => setAssignVehicleFilter('all')}
                            >
                              Tampilkan Semua Armada
                            </button>
                          ) : null}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <>
                      {assignErrorMessage && !isAssignOrderLocked && (
                        <div className="assign-error-banner" role="alert">
                          <span>{assignErrorMessage}</span>
                        </div>
                      )}

                      <div className="assign-readiness-summary">
                        <span>Daftar Mitra Driver</span>
                        <span className="assign-readiness-counts">
                          {onlineCount} Siap Order • {offlineCount} Istirahat
                        </span>
                      </div>

                      {onlineCount === 0 && offlineCount > 0 && (
                        <div className="assign-offline-notice">
                          Semua mitra pada daftar ini sedang istirahat. Penugasan hanya tersedia bagi mitra dengan status Siap Order.
                        </div>
                      )}

                      <div className="assign-drivers-list">
                        {candidateDrivers.map((drv, drvIdx) => {
                          const isCurrentlyAssigned =
                            liveAssignOrder.assignment_status === 'assigned' &&
                            liveAssignOrder.driver_id === drv.id;

                          const isCar = isDriverUsingCar(drv);
                          const isDrvOnline = typeof drv.is_online === 'boolean' ? drv.is_online : true;
                          const isBtnDisabled = !isDrvOnline || isAssignOrderLocked;
                          const disabledAssignTitle = isAssignOrderCancelled
                            ? 'Pesanan dibatalkan dan tidak dapat ditugaskan ke driver'
                            : isAssignOrderCompleted
                              ? 'Pesanan sudah selesai'
                              : 'Mitra sedang istirahat / offline';

                          let displayPlate = drv.plateNumber || 'DD - MKS';
                          let displayModel = drv.vehicleModel || '';

                          if (isCar && drv.carData) {
                            if (drv.carData.plateNumber) displayPlate = drv.carData.plateNumber;
                            if (drv.carData.model) displayModel = drv.carData.model;
                          } else if (!isCar && drv.motorData) {
                            if (drv.motorData.plateNumber) displayPlate = drv.motorData.plateNumber;
                            if (drv.motorData.model) displayModel = drv.motorData.model;
                          }

                          const vehicleLabel = isCar ? 'Mobil' : 'Motor';
                          const cleanedModel =
                            displayModel && displayModel.toLowerCase().trim() !== vehicleLabel.toLowerCase()
                              ? displayModel.trim()
                              : '';
                          const driverMetaText = [vehicleLabel, cleanedModel, displayPlate]
                            .filter(Boolean)
                            .join(' · ');

                          return (
                            <div
                              key={drv.id || `${drv.phone || drv.name || 'drv'}-${drvIdx}`}
                              className={`assign-driver-card ${isCurrentlyAssigned ? 'is-assigned' : ''} ${!isDrvOnline ? 'is-offline' : ''}`}
                              title={drv.operationalArea ? `Wilayah: ${drv.operationalArea}` : undefined}
                            >
                              <div className="assign-driver-info">
                                <div className="assign-driver-name-row">
                                  <span className="assign-driver-name">{drv.name}</span>
                                  <div className="assign-driver-badges">
                                    <span className={`assign-status-text ${isDrvOnline ? 'is-online' : 'is-offline'}`}>
                                      {isDrvOnline ? 'Siap Order' : 'Istirahat'}
                                    </span>
                                    {isCurrentlyAssigned && (
                                      <span className="assign-status-assigned-label">
                                        {isAssignOrderCancelled
                                          ? 'Dibatalkan'
                                          : !liveAssignOrder.driver_step || liveAssignOrder.driver_step === 'completed'
                                            ? 'Selesai Ditugaskan'
                                            : 'Ditugaskan'}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="assign-driver-meta-row">
                                  {driverMetaText}
                                </div>
                              </div>

                              <div className="assign-driver-actions">
                                <button
                                  type="button"
                                  className={isCurrentlyAssigned ? 'btn-assign-text-outline' : 'btn-assign-text-primary'}
                                  disabled={isBtnDisabled}
                                  onClick={() => handleAssignDriverToOrder(liveAssignOrder, drv, false)}
                                  title={
                                    !isBtnDisabled
                                      ? isCurrentlyAssigned
                                        ? 'Tugaskan ulang mitra ini'
                                        : 'Tugaskan pesanan ke mitra ini'
                                      : disabledAssignTitle
                                  }
                                >
                                  {isCurrentlyAssigned ? 'Tugaskan Ulang' : 'Tugaskan'}
                                </button>
                                <button
                                  type="button"
                                  className="btn-assign-text-outline"
                                  disabled={isBtnDisabled}
                                  onClick={() => handleAssignDriverToOrder(liveAssignOrder, drv, true)}
                                  title={!isBtnDisabled ? 'Tugaskan & kirim rincian via WhatsApp' : disabledAssignTitle}
                                >
                                  Kirim WA
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  );
                })()}
              </div>

              <div className="assign-dialog-footer">
                <button
                  type="button"
                  className="btn-dialog-cancel"
                  onClick={() => {
                    setAssignModalOrder(null);
                    setAssignErrorMessage(null);
                  }}
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ================================================================= */}
      {/* MODAL 9: DETAIL LENGKAP PESANAN PELANGGAN (SESUAI REFERENSI RECEIPT) */}
      {/* ================================================================= */}
      {orderDetailModalData && (() => {
        const ord = orderDetailModalData;
        const isPackage = String(ord.service_type || '').toLowerCase() === 'paket' || Boolean(ord.package_info);
        const isCar = String(ord.service_type || '').toLowerCase() === 'mobil';
        const serviceDisplayName = isCar ? 'Mobil' : isPackage ? 'Paket' : 'Motor';

        const fare = Number(ord.fare_amount || 17000);
        const platformFee = FLAT_PLATFORM_FEE;
        const tripFare = Math.max(0, fare - platformFee);

        const orderDateObj = ord.created_at ? new Date(ord.created_at) : new Date(0);
        const durationMin = Number(ord.duration_minutes || (ord.distance_km ? Math.round(ord.distance_km * 2) : 15));
        const dropoffDateObj = new Date(orderDateObj.getTime() + durationMin * 60000);

        const formatClock = (d) =>
          d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':');
        const formatDateTime = (d, clock) =>
          `${d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}, ${clock}`;

        const pickupClock = ord.timeline?.pickedUp || ord.timeline?.received || formatClock(orderDateObj);
        const dropoffClock = ord.timeline?.completed || formatClock(dropoffDateObj);

        const orderCode = ord.order_code || ord.booking_code || '#NP3S';
        const fallbackOrderSuffix = String(ord.id || orderDateObj.getTime())
          .replace(/\D/g, '')
          .padStart(12, '0')
          .slice(-12);
        const orderNum = ord.order_number || `3301447${fallbackOrderSuffix}`;

        const isCash = (ord.payment_method || 'cash').toLowerCase() === 'cash';
        const isCompleted = isCustomerOrderCompleted(ord);
        const isCancelled = isCustomerOrderCancelled(ord);
        const statusLabel = isCompleted ? 'Selesai' : isCancelled ? 'Dibatalkan' : 'Dalam Proses';

        const hasAssignedDriver = ord.assignment_status === 'assigned';
        const matchedLiveDriver = hasAssignedDriver
          ? drivers.find(
              (d) =>
                d &&
                ((ord.driver_id && d.id === ord.driver_id) ||
                  (ord.driver_user_id && d.user_id === ord.driver_user_id) ||
                  (ord.driver_phone && d.phone && normalizePhone(d.phone) === normalizePhone(ord.driver_phone)))
            )
          : null;
        const resolvedDriverName =
          matchedLiveDriver?.name || ord.driver_name || ord.driver?.name || 'Mitra Driver';
        const resolvedDriverPlate = matchedLiveDriver
          ? matchedLiveDriver.vehicleType === 'both'
            ? isCar
              ? matchedLiveDriver.carData?.plateNumber || matchedLiveDriver.plateNumber
              : matchedLiveDriver.motorData?.plateNumber || matchedLiveDriver.plateNumber
            : matchedLiveDriver.plateNumber
          : ord.driver_plate || ord.driver?.plateNumber;
        const driverDisplay = hasAssignedDriver
          ? `${resolvedDriverName}${resolvedDriverPlate ? ` (${resolvedDriverPlate})` : ''}`
          : 'Menunggu penugasan admin';

        const handleCopyNumber = () => {
          navigator.clipboard?.writeText(orderNum)?.catch(() => {});
          setAdminCopiedOrderNum(true);
          setTimeout(() => setAdminCopiedOrderNum(false), 2000);
        };

        const packageRows = isPackage && ord.package_info
          ? [
              ord.package_info.senderName && {
                label: 'Pengirim',
                value: `${ord.package_info.senderName}${ord.package_info.senderPhone ? ` (${ord.package_info.senderPhone})` : ''}`
              },
              ord.package_info.recipientName && {
                label: 'Penerima',
                value: `${ord.package_info.recipientName}${ord.package_info.recipientPhone ? ` (${ord.package_info.recipientPhone})` : ''}`
              },
              (ord.package_info.itemName || ord.package_info.category) && {
                label: 'Jenis Barang',
                value: ord.package_info.itemName || ord.package_info.category
              },
              {
                label: 'Ukuran & Berat',
                value: `${ord.package_info.size || 'M'}${ord.package_info.weight ? ` • ${ord.package_info.weight} kg` : ''}`
              },
              ord.package_info.notes && {
                label: 'Catatan',
                value: ord.package_info.notes
              }
            ].filter(Boolean)
          : [];

        return (
          <div className="admin-modal-backdrop" onClick={() => setOrderDetailModalData(null)}>
            <div
              className="admin-modal-dialog order-detail-admin-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="order-detail-dialog-title"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header Modal */}
              <div className="order-detail-admin-header">
                <div className="order-header-copy">
                  <div className="order-header-title-row">
                    <h3 id="order-detail-dialog-title" className="dialog-title">Rincian Pesanan</h3>
                    <span className="order-status-pill-minimal">{statusLabel}</span>
                  </div>
                  <span className="dialog-sub">
                    {orderCode} • Layanan {serviceDisplayName}
                  </span>
                </div>
                <button
                  type="button"
                  className="btn-close-dialog"
                  onClick={() => setOrderDetailModalData(null)}
                  aria-label="Tutup dialog"
                  title="Tutup dialog"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Body Modal */}
              <div className="order-detail-admin-body">
                {/* 1. Rute Perjalanan */}
                <section className="order-clean-section">
                  <div className="order-clean-section-head">
                    <h4 className="order-clean-section-title">
                      {isPackage ? 'Rute Pengambilan & Pengantaran' : 'Rute Perjalanan'}
                    </h4>
                    <span className="order-clean-meta">
                      {ord.distance_km || 3.9} km (~{durationMin} mnt)
                    </span>
                  </div>

                  <div className="order-route-card">
                    <div className="order-route-step">
                      <span className="order-route-role">
                        {isPackage ? 'Pengambilan' : 'Jemput'}
                      </span>
                      <div className="order-route-head">
                        <span className="order-route-place">{ord.pickup_name || 'Titik Jemput'}</span>
                        <span className="order-route-time">{pickupClock}</span>
                      </div>
                      <p className="order-route-address">{ord.pickup_address || '-'}</p>
                      {isPackage && ord.package_info?.senderName && (
                        <p className="order-route-sub">
                          Pengirim: {ord.package_info.senderName}
                          {ord.package_info.senderPhone ? ` (${ord.package_info.senderPhone})` : ''}
                        </p>
                      )}
                    </div>

                    <div className="order-route-step">
                      <span className="order-route-role">
                        {isPackage ? 'Pengantaran' : 'Tujuan'}
                      </span>
                      <div className="order-route-head">
                        <span className="order-route-place">{ord.dropoff_name || 'Titik Tujuan'}</span>
                        <span className="order-route-time">{dropoffClock}</span>
                      </div>
                      <p className="order-route-address">{ord.dropoff_address || '-'}</p>
                      {isPackage && ord.package_info?.recipientName && (
                        <p className="order-route-sub">
                          Penerima: {ord.package_info.recipientName}
                          {ord.package_info.recipientPhone ? ` (${ord.package_info.recipientPhone})` : ''}
                          {ord.package_info.floorUnit ? ` • Unit: ${ord.package_info.floorUnit}` : ''}
                        </p>
                      )}
                    </div>
                  </div>
                </section>

                {/* 2. Detail Paket */}
                {packageRows.length > 0 && (
                  <section className="order-clean-section">
                    <div className="order-clean-section-head">
                      <h4 className="order-clean-section-title">Detail Paket</h4>
                      <span className="order-clean-meta">{ord.package_info.category || 'Paket'}</span>
                    </div>
                    <div className="order-kv-list">
                      {packageRows.map((row) => (
                        <div key={row.label} className="order-kv-row">
                          <span className="order-kv-label">{row.label}</span>
                          <span className="order-kv-value">{row.value}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* 3. Rincian Pembayaran */}
                <section className="order-clean-section">
                  <div className="order-clean-section-head">
                    <h4 className="order-clean-section-title">Rincian Pembayaran</h4>
                    <span className="order-clean-meta">Lunas</span>
                  </div>

                  <div className="order-kv-list">
                    <div className="order-kv-row">
                      <span className="order-kv-label">
                        {isPackage ? 'Ongkos Kirim Paket' : 'Tarif Perjalanan'}
                      </span>
                      <span className="order-kv-value num">
                        Rp {tripFare.toLocaleString('id-ID')}
                      </span>
                    </div>

                    <div className="order-kv-row">
                      <span className="order-kv-label">Biaya Layanan & Aplikasi</span>
                      <span className="order-kv-value num">
                        Rp {platformFee.toLocaleString('id-ID')}
                      </span>
                    </div>

                    <div className="order-kv-row total">
                      <span className="order-kv-label">Total Pembayaran</span>
                      <span className="order-kv-value num">
                        Rp {fare.toLocaleString('id-ID')}
                      </span>
                    </div>

                    <div className="order-kv-row">
                      <span className="order-kv-label">Metode Pembayaran</span>
                      <span className="order-kv-value">
                        {isCash ? 'Tunai (Cash)' : 'QRIS / OTWPay'}
                      </span>
                    </div>
                  </div>
                </section>

                {/* 4. Informasi Pesanan */}
                <section className="order-clean-section">
                  <div className="order-clean-section-head">
                    <h4 className="order-clean-section-title">Informasi Pesanan</h4>
                  </div>

                  <div className="order-kv-list">
                    <div className="order-kv-row">
                      <span className="order-kv-label">Layanan</span>
                      <span className="order-kv-value">{serviceDisplayName}</span>
                    </div>

                    <div className="order-kv-row">
                      <span className="order-kv-label">Mitra Driver</span>
                      <span className={`order-kv-value${hasAssignedDriver ? '' : ' muted'}`}>
                        {driverDisplay}
                      </span>
                    </div>

                    <div className="order-kv-row">
                      <span className="order-kv-label">Kode Pesanan</span>
                      <span className="order-kv-value mono">{orderCode}</span>
                    </div>

                    <div className="order-kv-row">
                      <span className="order-kv-label">No. Pesanan</span>
                      <div className="order-kv-copy-wrap">
                        <span className="order-kv-value num">{orderNum}</span>
                        <button
                          type="button"
                          className={`btn-order-copy-minimal${adminCopiedOrderNum ? ' is-copied' : ''}`}
                          onClick={handleCopyNumber}
                          aria-label={adminCopiedOrderNum ? 'Nomor pesanan tersalin' : 'Salin nomor pesanan'}
                          title={adminCopiedOrderNum ? 'Tersalin' : 'Salin nomor pesanan'}
                        >
                          {adminCopiedOrderNum ? <CheckCheck size={14} /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>

                    <div className="order-kv-row">
                      <span className="order-kv-label">Waktu Pemesanan</span>
                      <span className="order-kv-value num">{formatDateTime(orderDateObj, pickupClock)}</span>
                    </div>

                    <div className="order-kv-row">
                      <span className="order-kv-label">Waktu Tiba</span>
                      <span className="order-kv-value num">{formatDateTime(dropoffDateObj, dropoffClock)}</span>
                    </div>
                  </div>
                </section>
              </div>

              {/* Modal Footer Controls */}
              <div className="order-detail-admin-footer">
                <div className="order-detail-admin-footer-actions">
                  {!isCompleted && !isCancelled && (
                    <>
                      <button
                        type="button"
                        className="btn-order-complete-minimal"
                        onClick={() => handleUpdateOrderStatus(ord.id, 'completed', 'Diselesaikan oleh Admin')}
                      >
                        Tandai Selesai
                      </button>
                      <button
                        type="button"
                        className="btn-order-cancel-minimal"
                        onClick={() => handleUpdateOrderStatus(ord.id, 'cancelled', 'Dibatalkan oleh Admin')}
                      >
                        Batalkan Pesanan
                      </button>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  className="btn-dialog-cancel"
                  onClick={() => setOrderDetailModalData(null)}
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Notifikasi Pesanan Baru Masuk Real-time */}
      {incomingOrderAlert && (
        <div className="admin-incoming-order-alert" role="status" aria-live="polite">
          <div className="incoming-order-icon-wrap" aria-hidden="true">
            <Bell size={17} />
          </div>
          <div className="incoming-order-body">
            <div className="incoming-order-title-row">
              <span className="incoming-order-title">
                {incomingOrderAlert.count > 1
                  ? `${incomingOrderAlert.count} Pesanan Baru Masuk`
                  : 'Pesanan Baru Masuk'}
              </span>
              <span className="incoming-order-code">
                {incomingOrderAlert.orderCode} · {incomingOrderAlert.serviceName}
              </span>
            </div>
            <p className="incoming-order-meta">
              {incomingOrderAlert.customerName} — {incomingOrderAlert.routeSummary}
            </p>
          </div>
          <div className="incoming-order-actions">
            <button
              type="button"
              className="btn-incoming-order-view"
              onClick={() => {
                setMainSection('orders');
                setOrderTab('unassigned');
                setIncomingOrderAlert(null);
              }}
            >
              Lihat
            </button>
            <button
              type="button"
              className="btn-incoming-order-close"
              onClick={() => setIncomingOrderAlert(null)}
              aria-label="Tutup notifikasi pesanan baru"
            >
              <X size={15} />
            </button>
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
