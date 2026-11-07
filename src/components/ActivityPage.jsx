import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import './ActivityPage.css';
import './DriverHomePage.css';
import {
  ArrowLeft,
  ChevronDown,
  Bike,
  Package,
  Car,
  User,
  Check,
  ShoppingBag,
  Inbox
} from 'lucide-react';
import { formatRupiah } from '../utils/fareCalculator.js';
import dbService, { normalizePhone } from '../services/dbService.js';
import ActivityOrderDetailView from './ActivityOrderDetailView.jsx';

function toLocalDateKey(dateInput) {
  if (!dateInput) return '';
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Helper konversi data booking dari dbService ke format tampilan kartu riwayat pesanan
function formatBookingToOrder(b) {
  const isCar = b.service_type === 'car' || b.service_type === 'mobil';
  const isSend =
    b.service_type === 'send' ||
    b.service_type === 'express' ||
    b.service_type === 'package' ||
    b.service_type === 'paket' ||
    b.service_type === 'food';
  const sType = isCar ? 'mobil' : isSend ? 'paket' : 'motor';
  const sName = isCar ? 'Mobil' : isSend ? 'Paket' : 'Motor';

  const createdAtDate = b.created_at ? new Date(b.created_at) : new Date();
  const timeStr =
    b.timeline?.completed ||
    (b.created_at
      ? createdAtDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':')
      : '12:00');
  const dateStr = b.created_at
    ? createdAtDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
    : '11 Okt 2026';

  const fare = Number(b.fare_amount || 15000);
  const deliveryFee = Number(b.delivery_fee || Math.round((fare * 0.85) / 100) * 100);
  const totalEarnings = Number(b.total_earnings || deliveryFee);

  const isQris = String(b.payment_method || 'cash').toLowerCase() === 'qris';
  const cashVal = isQris
    ? 0
    : b.cash_collected !== undefined
    ? Number(b.cash_collected)
    : -fare;
  const adjVal = isQris
    ? 0
    : b.adjustment !== undefined
    ? Number(b.adjustment)
    : -fare;

  const code =
    b.order_code ||
    (b.booking_code ? `#${b.booking_code.replace('RIDE-', '')}` : '#8L9A');
  const num =
    b.order_number ||
    `3301447${(b.id ? String(b.id).replace(/\D/g, '') : '308559872213')
      .padEnd(12, '0')
      .slice(-12)}`;

  const defaultDriver = isCar
    ? {
        name: 'Nurul Hidayah',
        rating: 4.9,
        tripsCount: '1.420+ perjalanan',
        vehicleModel: 'Toyota Calya · Silver',
        plateNumber: 'DD 1289 AZ',
        phone: '085255655084'
      }
    : {
        name: 'Siti Rahmawati',
        rating: 4.9,
        tripsCount: '2.150+ perjalanan',
        vehicleModel: 'Honda Vario 160 · Hitam',
        plateNumber: 'DD 4521 XY',
        phone: '085255655084'
      };

  const driverObj = b.driver || {
    name: b.driver_name || defaultDriver.name,
    rating: b.driver_rating || defaultDriver.rating,
    tripsCount: b.driver_trips || defaultDriver.tripsCount,
    vehicleModel: b.driver_vehicle || defaultDriver.vehicleModel,
    plateNumber: b.driver_plate || defaultDriver.plateNumber,
    phone: b.driver_phone || defaultDriver.phone
  };

  const platformFee = 2000;
  const tripFare = Math.max(0, fare - platformFee);

  const realPickupName =
    b.pickup_name ||
    b.package_info?.pickupName ||
    (sType === 'paket' ? 'Titik Pengambilan Paket' : 'Warung Megarasa - Rappocini');
  const realPickupAddress =
    b.pickup_address ||
    b.package_info?.pickupAddress ||
    realPickupName;

  const realDropoffName =
    b.dropoff_name && b.dropoff_name !== 'Alamat Pelanggan disembunyikan'
      ? b.dropoff_name
      : b.package_info?.dropoffName
      ? b.package_info.dropoffName
      : isCar
      ? 'Bandara Sultan Hasanuddin'
      : isSend
      ? 'Titik Pengantaran Paket'
      : 'Mall Panakkukang (MP)';
  const realDropoffAddress =
    b.dropoff_address ||
    b.package_info?.dropoffAddress ||
    realDropoffName;

  return {
    id: b.id || b.booking_code || code,
    orderCode: code,
    orderNumber: num,
    time: timeStr,
    date: dateStr,
    dateKey: toLocalDateKey(createdAtDate),
    createdAt: b.created_at || new Date().toISOString(),
    fullDateTime: `${dateStr}, ${timeStr}`,
    serviceType: sType,
    serviceName: sName,
    price: fare,
    formattedPrice: formatRupiah(fare),
    deliveryFee: formatRupiah(deliveryFee),
    totalEarningsAmount: totalEarnings,
    totalEarnings: formatRupiah(totalEarnings),
    cashCollected: cashVal < 0 ? `-${formatRupiah(Math.abs(cashVal))}` : formatRupiah(cashVal),
    adjustment: adjVal < 0 ? `-${formatRupiah(Math.abs(adjVal))}` : formatRupiah(adjVal),
    merchantName: realPickupName,
    customerAddress: realDropoffName,
    pickupLocation: {
      name: realPickupName,
      address: realPickupAddress,
      lat: b.pickup_lat || null,
      lng: b.pickup_lng || null
    },
    dropoffLocation: {
      name: realDropoffName,
      address: realDropoffAddress,
      lat: b.dropoff_lat || null,
      lng: b.dropoff_lng || null
    },
    driver: driverObj,
    assignmentStatus: b.assignment_status || 'unassigned',
    assignedBy: b.assigned_by || null,
    customerName: b.customer_name || 'Pelanggan OTWJek',
    customerPhone: b.customer_phone || '',
    customerNotes: b.customer_notes || '',
    distanceKm: b.distance_km || 3.2,
    durationMinutes: b.duration_minutes || 18,
    status: b.booking_status === 'cancelled' ? 'cancelled' : 'completed',
    driverStep: b.driver_step || (b.booking_status === 'cancelled' ? 'cancelled' : 'completed'),
    cancelReason: b.cancel_reason || 'Dibatalkan oleh Pelanggan',
    timeline: b.timeline || {
      received: '13:31',
      arrived: '13:45',
      pickedUp: '13:47',
      completed: timeStr
    },
    incentives: b.incentives || [
      { name: 'Bonus Harian - Makassar', points: 100 },
      { name: 'MISI SIGAP', points: 100 }
    ],
    paymentMethod: b.payment_method || 'cash',
    packageInfo: b.package_info || (sType === 'paket' ? {
      recipientName: 'Ibu Ratna',
      recipientPhone: '0812-3456-7890',
      size: 'S (Dokumen / Paket Kecil)',
      notes: 'Titip di meja resepsionis lantai 1'
    } : null),
    customerPricing: {
      tripFare,
      formattedTripFare: formatRupiah(tripFare),
      platformFee,
      formattedPlatformFee: formatRupiah(platformFee),
      discount: b.discount || 0,
      formattedDiscount: b.discount ? `-Rp${Number(b.discount).toLocaleString('id-ID')}` : null,
      totalPayment: fare,
      formattedTotal: formatRupiah(fare),
      paymentMethodLabel: (b.payment_method || 'cash').toLowerCase() === 'cash' ? 'Tunai (Cash)' : 'QRIS / OTWPay'
    }
  };
}

export default function ActivityPage({ onBack, currentUser, isDriver }) {
  const [activeTab, setActiveTab] = useState('selesai'); // 'selesai' | 'dibatalkan'
  const [selectedDate, setSelectedDate] = useState('all');
  const [customStartDate, setCustomStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return toLocalDateKey(d);
  });
  const [customEndDate, setCustomEndDate] = useState(() => toLocalDateKey(new Date()));
  const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [rawBookings, setRawBookings] = useState([]);
  const dropdownRef = useRef(null);

  const activeUser = currentUser || dbService.session.getCurrentUser();
  const isDriverView = Boolean(isDriver || activeUser?.role === 'driver');

  // Ambil data pesanan dinamis langsung dari dbService khusus untuk akun yang aktif
  const loadBookings = useCallback(() => {
    try {
      if (!activeUser) {
        setRawBookings([]);
        return;
      }

      let queryAccount = activeUser;

      if (isDriverView) {
        const allDrivers = dbService.drivers.getAll();
        const matchedDriver =
          dbService.drivers.getDriverByUserId(activeUser.id) ||
          allDrivers.find(
            (d) =>
              d &&
              ((activeUser.driver?.id && d.id === activeUser.driver.id) ||
                (activeUser.phone && d.phone && normalizePhone(d.phone) === normalizePhone(activeUser.phone)))
          ) ||
          activeUser.driver ||
          null;

        queryAccount = {
          ...activeUser,
          role: 'driver',
          driver: matchedDriver || activeUser.driver
        };
      }

      dbService.bookings.markAllAsRead(queryAccount);
      const items = dbService.bookings.getAll(queryAccount);
      setRawBookings(Array.isArray(items) ? items : []);
    } catch {
      setRawBookings([]);
    }
  }, [activeUser, isDriverView]);

  useEffect(() => {
    loadBookings();

    const handleDbChange = (e) => {
      if (!e?.detail?.key || e.detail.key === 'otwjek_db_ride_bookings' || e.detail.key === 'all') {
        loadBookings();
      }
    };

    window.addEventListener('otwjek_db_change', handleDbChange);
    window.addEventListener('storage', loadBookings);

    return () => {
      window.removeEventListener('otwjek_db_change', handleDbChange);
      window.removeEventListener('storage', loadBookings);
    };
  }, [loadBookings]);

  // Tutup dropdown tanggal jika klik di luar
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDateDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Konversi semua pesanan mentah menjadi format riwayat pesanan dinamis
  const allOrders = useMemo(() => {
    return rawBookings.map((b) => formatBookingToOrder(b));
  }, [rawBookings]);

  // Kumpulan opsi tanggal unik yang diekstrak secara dinamis dari database + preset periode
  const availableDates = useMemo(() => {
    const datesSet = new Set();
    allOrders.forEach((ord) => {
      if (ord.date) datesSet.add(ord.date);
    });
    const uniqueDates = Array.from(datesSet).map((d) => ({ label: d, value: d }));
    return [
      { label: 'Semua Tanggal', value: 'all' },
      { label: 'Hari Ini', value: 'today' },
      { label: 'Minggu Ini (7 Hari)', value: 'week' },
      { label: 'Bulan Ini', value: 'month' },
      { label: 'Pilih Rentang Tanggal...', value: 'custom' },
      ...uniqueDates
    ];
  }, [allOrders]);

  // Filter pesanan berdasarkan tab aktif ('selesai' | 'dibatalkan') dan filter tanggal
  const displayedOrders = useMemo(() => {
    const filteredByTab = allOrders.filter((ord) =>
      activeTab === 'selesai' ? ord.status === 'completed' : ord.status === 'cancelled'
    );

    if (selectedDate === 'all') {
      return filteredByTab;
    }

    const now = new Date();
    const todayKey = toLocalDateKey(now);
    const todayDateStr = now.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });

    if (selectedDate === 'today') {
      return filteredByTab.filter(
        (ord) => (ord.dateKey || toLocalDateKey(ord.createdAt)) === todayKey || ord.date === todayDateStr
      );
    }

    if (selectedDate === 'week') {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - 6);
      const weekStartKey = toLocalDateKey(weekStart);
      return filteredByTab.filter((ord) => {
        const k = ord.dateKey || toLocalDateKey(ord.createdAt);
        return k >= weekStartKey && k <= todayKey;
      });
    }

    if (selectedDate === 'month') {
      const monthPrefix = todayKey.slice(0, 7);
      return filteredByTab.filter((ord) =>
        (ord.dateKey || toLocalDateKey(ord.createdAt)).startsWith(monthPrefix)
      );
    }

    if (selectedDate === 'custom') {
      const startKey =
        customStartDate && customEndDate && customStartDate > customEndDate
          ? customEndDate
          : customStartDate;
      const endKey =
        customStartDate && customEndDate && customStartDate > customEndDate
          ? customStartDate
          : customEndDate;
      return filteredByTab.filter((ord) => {
        const k = ord.dateKey || toLocalDateKey(ord.createdAt);
        if (startKey && endKey) return k >= startKey && k <= endKey;
        if (startKey) return k >= startKey;
        if (endKey) return k <= endKey;
        return true;
      });
    }

    return filteredByTab.filter((ord) => ord.date === selectedDate);
  }, [allOrders, activeTab, selectedDate, customStartDate, customEndDate]);

  const selectedDateLabel = useMemo(() => {
    const found = availableDates.find((d) => d.value === selectedDate);
    if (selectedDate === 'custom') return 'Rentang Kustom';
    return found ? found.label : selectedDate;
  }, [availableDates, selectedDate]);

  // Helper render ikon kategori layanan: Motor, Mobil, Paket
  const renderServiceBadge = (order) => {
    const sType = String(order.serviceType || '').toLowerCase();
    const sName = String(order.serviceName || '').toLowerCase();

    if (sType === 'mobil' || sType === 'car' || sName === 'mobil') {
      return (
        <span className="activity-service-badge mobil">
          <Car size={15} strokeWidth={2.2} />
          <span>Mobil</span>
        </span>
      );
    }
    if (sType === 'paket' || sType === 'send' || sType === 'food' || sType === 'package' || sName === 'paket') {
      return (
        <span className="activity-service-badge paket">
          <Package size={15} strokeWidth={2.2} />
          <span>Paket</span>
        </span>
      );
    }
    return (
      <span className="activity-service-badge motor">
        <Bike size={15} strokeWidth={2.2} />
        <span>Motor</span>
      </span>
    );
  };

  if (selectedOrder) {
    const liveSelectedOrder = allOrders.find((o) => o.id === selectedOrder.id) || selectedOrder;
    return (
      <ActivityOrderDetailView
        order={liveSelectedOrder}
        onBack={() => setSelectedOrder(null)}
        currentUser={activeUser}
        isDriver={isDriverView}
        onReorder={() => {
          setSelectedOrder(null);
          if (onBack) onBack();
        }}
      />
    );
  }

  return (
    <div className="activity-page-viewport">
      {/* 1. Top Navigation Bar */}
      <header className="activity-topbar">
        <button
          className="btn-activity-back"
          onClick={onBack}
          aria-label="Kembali ke beranda"
        >
          <ArrowLeft size={22} strokeWidth={2.2} />
        </button>
        <h1 className="activity-topbar-title">
          {isDriverView ? 'Riwayat Tugas Driver' : 'Riwayat Pesanan'}
        </h1>
      </header>

      {/* 2. Tabs Bar (Selesai | Dibatalkan) */}
      <nav className="activity-tabs-row" role="tablist">
        <button
          className={`activity-tab-btn ${activeTab === 'selesai' ? 'active' : ''}`}
          onClick={() => setActiveTab('selesai')}
          role="tab"
          aria-selected={activeTab === 'selesai'}
        >
          <span>Selesai</span>
          {activeTab === 'selesai' && <div className="activity-tab-indicator" />}
        </button>
        <button
          className={`activity-tab-btn ${activeTab === 'dibatalkan' ? 'active' : ''}`}
          onClick={() => setActiveTab('dibatalkan')}
          role="tab"
          aria-selected={activeTab === 'dibatalkan'}
        >
          <span>Dibatalkan</span>
          {activeTab === 'dibatalkan' && <div className="activity-tab-indicator" />}
        </button>
      </nav>

      {/* 3. Scrollable List Area */}
      <main className="activity-content-scroll">
        {/* Date Filter Header Selector */}
        <div className="activity-date-filter-row" ref={dropdownRef}>
          <button
            className="btn-activity-date-selector"
            onClick={() => setIsDateDropdownOpen(!isDateDropdownOpen)}
            aria-expanded={isDateDropdownOpen}
          >
            <span>{selectedDateLabel}</span>
            <ChevronDown
              size={16}
              strokeWidth={2.5}
              className={`activity-date-chevron ${isDateDropdownOpen ? 'rotated' : ''}`}
            />
          </button>

          {/* Date Picker Dropdown Popover */}
          {isDateDropdownOpen && (
            <div className="activity-date-dropdown">
              {availableDates.map((d) => (
                <button
                  key={d.value}
                  className={`activity-date-dropdown-item ${selectedDate === d.value ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedDate(d.value);
                    setIsDateDropdownOpen(false);
                  }}
                >
                  <span>{d.label}</span>
                  {selectedDate === d.value && <Check size={14} color="#EE4335" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Custom Date Range Box in Activity Page */}
        {selectedDate === 'custom' && (
          <div className="earnings-custom-date-box" style={{ marginBottom: '12px' }}>
            <div className="custom-date-inputs-row">
              <label className="custom-date-field">
                <span className="custom-date-label">Dari Tanggal</span>
                <input
                  type="date"
                  className="custom-date-input"
                  value={customStartDate}
                  max={toLocalDateKey(new Date())}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                />
              </label>
              <label className="custom-date-field">
                <span className="custom-date-label">Sampai Tanggal</span>
                <input
                  type="date"
                  className="custom-date-input"
                  value={customEndDate}
                  max={toLocalDateKey(new Date())}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                />
              </label>
            </div>
          </div>
        )}

        {/* Orders List */}
        {displayedOrders.length > 0 ? (
          <>
            {displayedOrders.map((order) =>
              isDriverView ? (
                /* KARTU RIWAYAT KHUSUS DRIVER (2-Stop Stepper Style seragam dengan Beranda Driver) */
                <article
                  key={order.id}
                  className="driver-order-card stepper-card-style"
                  onClick={() => setSelectedOrder(order)}
                  role="button"
                  tabIndex={0}
                  aria-label={`Rincian tugas ${order.orderCode} ${order.totalEarnings}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedOrder(order);
                    }
                  }}
                >
                  {/* Stop 1: Pickup / Titik Jemput */}
                  <div className="stepper-stop-row">
                    <div className="stepper-rail-col">
                      <div
                        className={`stepper-check-ring ${
                          order.status === 'cancelled' ? 'muted-gray' : 'active-blue'
                        }`}
                      >
                        <div className="stepper-check-inner">
                          <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
                            <path
                              d="M2.5 6.2L4.8 8.5L9.5 3.5"
                              stroke="#FFFFFF"
                              strokeWidth="2.2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </div>
                      </div>
                      <div
                        className={`stepper-dashed-line ${
                          order.status === 'completed' ? 'completed' : ''
                        }`}
                      />
                    </div>

                    <div className="stepper-stop-content first-stop">
                      <div className="stepper-stop-header">
                        <span className="stepper-stop-kicker">TITIK JEMPUT · STOP 1</span>
                        <span
                          className={`stepper-status-pill ${
                            order.status === 'cancelled'
                              ? 'cancelled'
                              : order.driverStep === 'assigned' || order.driverStep === 'arrived'
                              ? 'in-progress'
                              : 'completed'
                          }`}
                        >
                          {order.status === 'cancelled'
                            ? 'DIBATALKAN'
                            : order.driverStep === 'assigned'
                            ? 'MENUJU JEMPUT'
                            : order.driverStep === 'arrived'
                            ? 'TIBA DI JEMPUT'
                            : 'SELESAI'}
                        </span>
                      </div>
                      <h3 className="stepper-stop-title">{order.pickupLocation.name}</h3>
                      <p className="stepper-stop-address">{order.pickupLocation.address}</p>
                      <p className="stepper-stop-meta">
                        {order.date} · Waktu {order.timeline?.received || order.time} – {order.timeline?.pickedUp || order.time} · Tiba {order.timeline?.arrived || order.time}
                      </p>
                    </div>
                  </div>

                  {/* Stop 2: Dropoff / Titik Tujuan */}
                  <div className="stepper-stop-row">
                    <div className="stepper-rail-col">
                      <div
                        className={`stepper-check-ring ${
                          order.status === 'completed' && order.driverStep === 'completed'
                            ? 'active-blue'
                            : 'muted-gray'
                        }`}
                      >
                        <div className="stepper-check-inner">
                          <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
                            <path
                              d="M2.5 6.2L4.8 8.5L9.5 3.5"
                              stroke="#FFFFFF"
                              strokeWidth="2.2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </div>
                      </div>
                    </div>

                    <div className="stepper-stop-content">
                      <div className="stepper-stop-header">
                        <span className="stepper-stop-kicker">TITIK TUJUAN · STOP 2</span>
                        {order.status !== 'cancelled' && order.driverStep === 'picked_up' && (
                          <span className="stepper-status-pill in-progress">DIANTAR</span>
                        )}
                      </div>
                      <h3 className="stepper-stop-title">{order.dropoffLocation.name}</h3>
                      <p className="stepper-stop-address">{order.dropoffLocation.address}</p>
                      <p className="stepper-stop-meta">
                        Estimasi {order.timeline?.pickedUp || order.time} – {order.timeline?.completed || order.time} · {order.serviceName} {order.orderCode} ({order.totalEarnings})
                      </p>
                    </div>
                  </div>
                </article>
              ) : (
                /* KARTU RIWAYAT PELANGGAN (CUSTOMER) */
                <article
                  key={order.id}
                  className="activity-order-card"
                  onClick={() => setSelectedOrder(order)}
                  role="button"
                  tabIndex={0}
                  aria-label={`Rincian pesanan ${order.orderCode || order.serviceName} ${order.formattedPrice}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedOrder(order);
                    }
                  }}
                >
                  {/* Header Row: Time, Service Name (Motor / Mobil / Paket), and Price */}
                  <div className="activity-card-header-row">
                    <div className="activity-card-left-meta">
                      <span className="activity-card-time">{order.time}</span>
                      {renderServiceBadge(order)}
                    </div>
                    <span className="activity-card-price">{order.formattedPrice}</span>
                  </div>

                  {/* Route Details: Merchant / Pickup point and Customer Address */}
                  <div className="activity-card-route">
                    {/* Origin / Restaurant / Pickup */}
                    <div className="activity-route-step">
                      <div className="activity-circle-icon pickup">
                        {(order.serviceType === 'paket' || order.serviceType === 'send' || order.serviceName === 'Paket') ? (
                          <Package size={13} strokeWidth={2.2} />
                        ) : (order.serviceType === 'mobil' || order.serviceType === 'car' || order.serviceName === 'Mobil') ? (
                          <Car size={13} strokeWidth={2.2} />
                        ) : (
                          <Bike size={13} strokeWidth={2.2} />
                        )}
                      </div>
                      <span className="activity-route-text" title={order.merchantName}>
                        {order.serviceType === 'paket' ? `Pengambilan: ${order.merchantName}` : order.merchantName}
                      </span>
                    </div>

                    {/* Vertical Connecting Line */}
                    <div className="activity-route-connector" aria-hidden="true" />

                    {/* Destination / Customer Address */}
                    <div className="activity-route-step">
                      <div className="activity-circle-icon dropoff">
                        <User size={13} strokeWidth={2.4} />
                      </div>
                      <span className="activity-route-text subtle" title={order.customerAddress}>
                        {order.serviceType === 'paket' ? `Pengantaran: ${order.customerAddress}` : order.customerAddress}
                      </span>
                    </div>

                    {/* Cancelled badge if on cancelled tab */}
                    {order.status === 'cancelled' && order.cancelReason && (
                      <div className="activity-cancelled-badge">
                        {order.cancelReason}
                      </div>
                    )}
                  </div>
                </article>
              )
            )}

            {/* End of list divider ("Akhir dari daftar") matching reference */}
            <div className="activity-end-of-list" aria-hidden="true">
              <span className="activity-end-line" />
              <span className="activity-end-text">Akhir dari daftar</span>
              <span className="activity-end-line" />
            </div>
          </>
        ) : (
          <div className="activity-empty-box">
            <div className="activity-empty-icon-wrap">
              {isDriverView ? <Inbox size={28} /> : <ShoppingBag size={28} />}
            </div>
            <h3 className="activity-empty-title">
              {allOrders.length === 0
                ? isDriverView
                  ? 'Belum Ada Riwayat Tugas'
                  : 'Belum Ada Pesanan'
                : 'Tidak Ada Pesanan'}
            </h3>
            <p className="activity-empty-desc">
              {allOrders.length === 0
                ? isDriverView
                  ? 'Pesanan yang ditugaskan oleh Admin Dispatch kepada Anda akan otomatis tercatat di halaman riwayat ini.'
                  : 'Riwayat pesanan Motor, Mobil, atau Paket Anda akan muncul di sini setelah Anda melakukan pemesanan.'
                : activeTab === 'selesai'
                ? `Belum ada pesanan selesai pada tanggal ${selectedDate === 'all' ? '' : selectedDate}.`
                : 'Belum ada pesanan yang dibatalkan.'}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
