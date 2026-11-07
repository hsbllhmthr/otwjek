import React, { useState, useEffect, useMemo, useCallback } from 'react';
import './DriverHomePage.css';
import {
  Inbox,
  X,
  ChevronRight,
  Calendar,
  BarChart3,
  Bell,
  Eye,
  EyeOff,
  CheckCircle2,
  Banknote,
  QrCode
} from 'lucide-react';
import dbService, { normalizePhone } from '../services/dbService.js';
import { formatRupiah } from '../utils/fareCalculator.js';
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

function formatDateKeyReadable(dateKey) {
  if (!dateKey) return '-';
  const parts = String(dateKey).split('-');
  if (parts.length !== 3) return dateKey;
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  if (Number.isNaN(d.getTime())) return dateKey;
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

function formatDriverBookingToOrder(b) {
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
    : 'Hari ini';

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

  const realPickupName =
    b.pickup_name ||
    b.package_info?.pickupName ||
    'Titik Penjemputan';
  const realPickupAddress =
    b.pickup_address ||
    b.package_info?.pickupAddress ||
    realPickupName;

  const realDropoffName =
    b.dropoff_name && b.dropoff_name !== 'Alamat Pelanggan disembunyikan'
      ? b.dropoff_name
      : b.package_info?.dropoffName || 'Titik Tujuan';
  const realDropoffAddress =
    b.dropoff_address ||
    b.package_info?.dropoffAddress ||
    realDropoffName;

  const platformFee = 2000;
  const tripFare = Math.max(0, fare - platformFee);

  return {
    id: b.id || b.booking_code || code,
    orderCode: code,
    orderNumber: num,
    time: timeStr,
    date: dateStr,
    dateKey: toLocalDateKey(createdAtDate),
    fullDateTime: `${dateStr}, ${timeStr}`,
    createdAt: b.created_at || new Date().toISOString(),
    serviceType: sType,
    serviceName: sName,
    price: fare,
    formattedPrice: formatRupiah(fare),
    deliveryFeeAmount: deliveryFee,
    totalEarningsAmount: totalEarnings,
    deliveryFee: formatRupiah(deliveryFee),
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
    driver: b.driver || {
      name: b.driver_name || 'Mitra Driver OTWJek',
      rating: b.driver_rating || 5.0,
      vehicleModel: b.driver_vehicle || 'Kendaraan Mitra',
      plateNumber: b.driver_plate || 'DD - MKS',
      phone: b.driver_phone || ''
    },
    assignmentStatus: b.assignment_status || 'assigned',
    assignedBy: b.assigned_by || 'Admin OTWJek',
    customerName: b.customer_name || 'Pelanggan OTWJek',
    customerPhone: b.customer_phone || '',
    customerNotes: b.customer_notes || '',
    distanceKm: b.distance_km || 3.2,
    durationMinutes: b.duration_minutes || 18,
    status: b.booking_status === 'cancelled' ? 'cancelled' : 'completed',
    driverStep: b.driver_step || (b.booking_status === 'cancelled' ? 'cancelled' : 'completed'),
    isUnreadDriver: !b.is_read_driver,
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
    paymentMethod: (b.payment_method || 'cash').toLowerCase(),
    packageInfo:
      b.package_info ||
      (sType === 'paket'
        ? {
            recipientName: 'Penerima Paket',
            recipientPhone: '',
            size: 'S (Dokumen / Paket Kecil)',
            notes: b.customer_notes || ''
          }
        : null),
    customerPricing: {
      tripFare,
      formattedTripFare: formatRupiah(tripFare),
      platformFee,
      formattedPlatformFee: formatRupiah(platformFee),
      discount: b.discount || 0,
      formattedDiscount: b.discount ? `-Rp${Number(b.discount).toLocaleString('id-ID')}` : null,
      totalPayment: fare,
      formattedTotal: formatRupiah(fare),
      paymentMethodLabel: (b.payment_method || 'cash').toLowerCase() === 'cash' ? 'Tunai (Cash)' : 'QRIS'
    }
  };
}

export default function DriverHomePage({ currentUser, onNavigate }) {
  const [driverProfile, setDriverProfile] = useState(null);
  const [rawBookings, setRawBookings] = useState([]);
  const [earningsPeriod, setEarningsPeriod] = useState('today'); // 'today' | 'all' (Card Pendapatan Mitra)
  const [recapPeriod, setRecapPeriod] = useState('week'); // 'week' | 'month' | 'custom' (Card Rekap & Filter Tanggal)
  const [customStartDate, setCustomStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return toLocalDateKey(d);
  });
  const [customEndDate, setCustomEndDate] = useState(() => toLocalDateKey(new Date()));
  const [orderFilter, setOrderFilter] = useState('all'); // 'all' | 'ride' | 'paket'
  const [selectedOrderDetail, setSelectedOrderDetail] = useState(null);
  const [dismissedVerifyBanner, setDismissedVerifyBanner] = useState(false);
  const [showBalance, setShowBalance] = useState(true);
  const [isRecapExpanded, setIsRecapExpanded] = useState(false);

  const loadDriverData = useCallback(() => {
    const activeUser = currentUser || dbService.session.getCurrentUser();
    if (!activeUser) return;

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

    setDriverProfile(matchedDriver);

    // Pastikan role driver aktif ketika mengambil pesanan yang ditugaskan
    const driverAccountQuery = {
      ...activeUser,
      role: 'driver',
      driver: matchedDriver || activeUser.driver
    };

    try {
      const assignedItems = dbService.bookings.getAll(driverAccountQuery);
      setRawBookings(Array.isArray(assignedItems) ? assignedItems : []);
    } catch {
      setRawBookings([]);
    }
  }, [currentUser]);

  useEffect(() => {
    loadDriverData();
    const unsub = dbService.subscribe(() => {
      loadDriverData();
    });
    const pollTimer = setInterval(loadDriverData, 1500);
    return () => {
      if (typeof unsub === 'function') unsub();
      clearInterval(pollTimer);
    };
  }, [loadDriverData]);

  const activeUser = currentUser || dbService.session.getCurrentUser();
  const verificationStatus = driverProfile?.verification_status || 'pending';

  const driverDisplayName = useMemo(() => {
    const rawName =
      driverProfile?.name ||
      activeUser?.fullName ||
      activeUser?.full_name ||
      'Mitra Driver';
    const firstWord = String(rawName).trim().split(/\s+/)[0];
    return firstWord || 'Mitra';
  }, [driverProfile, activeUser]);

  const driverAvatarUrl = useMemo(() => {
    const userImg = activeUser?.avatarUrl || activeUser?.avatar_url;
    if (userImg && !userImg.includes('unsplash.com')) return userImg;
    if (driverProfile?.avatar && !driverProfile.avatar.includes('unsplash.com')) {
      return driverProfile.avatar;
    }
    return null;
  }, [activeUser, driverProfile]);

  const currentMonthName = useMemo(() => {
    return new Date().toLocaleDateString('id-ID', { month: 'long' });
  }, []);

  // Format & urutkan pesanan: tugas aktif (assigned/arrived/picked_up) diprioritaskan paling atas
  const formattedOrders = useMemo(() => {
    const mapped = rawBookings.map((b) => formatDriverBookingToOrder(b));
    const getPriorityWeight = (ord) => {
      if (ord.status === 'cancelled') return 2;
      if (ord.driverStep && ord.driverStep !== 'completed') return 0; // Tugas aktif di urutan teratas
      return 1; // Pesanan selesai
    };

    return [...mapped].sort((a, b) => {
      const weightDiff = getPriorityWeight(a) - getPriorityWeight(b);
      if (weightDiff !== 0) return weightDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [rawBookings]);

  // Buka otomatis rincian tugas ketika Driver menekan "Lihat & Jalankan Tugas" dari Banner Popup
  useEffect(() => {
    const checkPendingOpenOrder = (explicitOrderId = null) => {
      try {
        const targetId = explicitOrderId || sessionStorage.getItem('otwjek_driver_open_order_id');
        if (!targetId || formattedOrders.length === 0) return;
        const matched = formattedOrders.find((o) => String(o.id) === String(targetId));
        if (matched) {
          sessionStorage.removeItem('otwjek_driver_open_order_id');
          setSelectedOrderDetail(matched);
        }
      } catch {
        // ignore
      }
    };

    checkPendingOpenOrder();

    const handleCustomOpen = (e) => {
      loadDriverData();
      checkPendingOpenOrder(e.detail?.orderId);
    };

    window.addEventListener('otwjek:open-driver-order', handleCustomOpen);
    return () => {
      window.removeEventListener('otwjek:open-driver-order', handleCustomOpen);
    };
  }, [formattedOrders, loadDriverData]);

  // 1. Kalkulasi metrik Card Pendapatan Mitra (Hari Ini vs Semua)
  const earningsStats = useMemo(() => {
    const now = new Date();
    const todayKey = toLocalDateKey(now);
    const todayDateStr = now.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });

    const completedOrders = formattedOrders.filter(
      (o) => o.status === 'completed' && (!o.driverStep || o.driverStep === 'completed')
    );

    const periodOrders =
      earningsPeriod === 'today'
        ? completedOrders.filter(
            (o) => (o.dateKey || toLocalDateKey(o.createdAt)) === todayKey || o.date === todayDateStr
          )
        : completedOrders;

    let totalNet = 0;
    let cashTotal = 0;
    let qrisTotal = 0;

    periodOrders.forEach((o) => {
      const earn = Number(o.totalEarningsAmount || 0);
      totalNet += earn;
      if (o.paymentMethod === 'qris') {
        qrisTotal += earn;
      } else {
        cashTotal += earn;
      }
    });

    return {
      totalNet,
      completedCount: periodOrders.length,
      cashTotal,
      qrisTotal
    };
  }, [formattedOrders, earningsPeriod]);

  // 2. Kalkulasi metrik Card Rekap Mingguan & Filter Tanggal Kustom (Terpisah)
  const recapStats = useMemo(() => {
    const now = new Date();
    const todayKey = toLocalDateKey(now);
    const todayDateStr = now.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });

    const weekStartObj = new Date(now);
    weekStartObj.setDate(now.getDate() - 6);
    const weekStartKey = toLocalDateKey(weekStartObj);
    const monthPrefix = todayKey.slice(0, 7);

    const completedOrders = formattedOrders.filter(
      (o) => o.status === 'completed' && (!o.driverStep || o.driverStep === 'completed')
    );

    const startKey =
      customStartDate && customEndDate && customStartDate > customEndDate
        ? customEndDate
        : customStartDate;
    const endKey =
      customStartDate && customEndDate && customStartDate > customEndDate
        ? customStartDate
        : customEndDate;

    const filteredRecapOrders = completedOrders.filter((o) => {
      const ordKey = o.dateKey || toLocalDateKey(o.createdAt);
      if (recapPeriod === 'week') {
        return ordKey >= weekStartKey && ordKey <= todayKey;
      }
      if (recapPeriod === 'month') {
        return ordKey.startsWith(monthPrefix);
      }
      if (recapPeriod === 'custom') {
        if (startKey && endKey) return ordKey >= startKey && ordKey <= endKey;
        if (startKey) return ordKey >= startKey;
        if (endKey) return ordKey <= endKey;
        return true;
      }
      return true;
    });

    let totalNet = 0;
    let totalGross = 0;
    filteredRecapOrders.forEach((o) => {
      const earn = Number(o.totalEarningsAmount || 0);
      const gross = Number(o.price || earn);
      totalNet += earn;
      totalGross += gross;
    });

    const totalCommission = Math.max(0, totalGross - totalNet);

    // Data grafik batang 7 hari terakhir (skala bar proporsional terhadap target 10 pesanan/hari)
    const dayNamesShort = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const weeklyDays = [];
    let maxDayNet = 0;
    let maxDayOrders = 0;

    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dKey = toLocalDateKey(d);
      const dayOrders = completedOrders.filter(
        (o) => (o.dateKey || toLocalDateKey(o.createdAt)) === dKey
      );
      const dayNet = dayOrders.reduce((sum, o) => sum + Number(o.totalEarningsAmount || 0), 0);
      if (dayNet > maxDayNet) maxDayNet = dayNet;
      if (dayOrders.length > maxDayOrders) maxDayOrders = dayOrders.length;

      weeklyDays.push({
        dateKey: dKey,
        dayLabel: i === 0 ? 'Hari Ini' : dayNamesShort[d.getDay()],
        shortDate: `${d.getDate()}/${d.getMonth() + 1}`,
        fullLabel: formatDateKeyReadable(dKey),
        netAmount: dayNet,
        orderCount: dayOrders.length,
        isToday: i === 0
      });
    }

    let periodLabel = `7 Hari Terakhir (${formatDateKeyReadable(weekStartKey)} – ${todayDateStr})`;
    if (recapPeriod === 'month') {
      periodLabel = `Bulan Ini (${now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })})`;
    } else if (recapPeriod === 'custom') {
      periodLabel = `${formatDateKeyReadable(startKey)} – ${formatDateKeyReadable(endKey)}`;
    }

    return {
      totalNet,
      totalGross,
      totalCommission,
      completedCount: filteredRecapOrders.length,
      weeklyDays,
      maxDayNet,
      maxDayOrders,
      periodLabel
    };
  }, [formattedOrders, recapPeriod, customStartDate, customEndDate]);

  const applyQuickDateRange = (daysBack) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - daysBack);
    setCustomStartDate(toLocalDateKey(start));
    setCustomEndDate(toLocalDateKey(end));
    setRecapPeriod('custom');
  };

  // Filter daftar pesanan berdasarkan kategori
  const filteredOrders = useMemo(() => {
    if (orderFilter === 'ride') {
      return formattedOrders.filter((o) => o.serviceType === 'motor' || o.serviceType === 'mobil');
    }
    if (orderFilter === 'paket') {
      return formattedOrders.filter((o) => o.serviceType === 'paket');
    }
    return formattedOrders;
  }, [formattedOrders, orderFilter]);

  const unreadOrdersCount = useMemo(() => {
    return formattedOrders.filter((o) => o.isUnreadDriver).length;
  }, [formattedOrders]);

  if (selectedOrderDetail) {
    const liveSelectedOrder =
      formattedOrders.find((o) => o.id === selectedOrderDetail.id) || selectedOrderDetail;
    return (
      <ActivityOrderDetailView
        order={liveSelectedOrder}
        currentUser={activeUser}
        isDriver={true}
        onBack={() => setSelectedOrderDetail(null)}
      />
    );
  }

  return (
    <div className="driver-home-viewport">
      <div className="driver-home-scroll">
        {/* 1. Top Dark Hero Header (Matching Reference UI) */}
        <header className="driver-hero-banner">
          <div className="driver-hero-topbar">
            <div
              className="driver-hero-user"
              onClick={() => onNavigate && onNavigate('account')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  if (onNavigate) onNavigate('account');
                }
              }}
            >
              <div className="driver-hero-avatar">
                {driverAvatarUrl ? (
                  <img src={driverAvatarUrl} alt={driverDisplayName} className="driver-hero-avatar-img" />
                ) : (
                  <span className="driver-hero-avatar-initial">
                    {driverDisplayName.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="driver-hero-greeting">
                <h1 className="driver-hero-hello">Halo {driverDisplayName}!</h1>
                <p className="driver-hero-welcome">Selamat datang kembali</p>
              </div>
            </div>

            <button
              type="button"
              className="driver-hero-bell-btn"
              onClick={() => {
                if (formattedOrders.length > 0) {
                  dbService.bookings.markAllAsRead(activeUser);
                  setSelectedOrderDetail(formattedOrders[0]);
                } else if (onNavigate) {
                  onNavigate('activity');
                }
              }}
              aria-label="Notifikasi Tugas"
              title="Notifikasi Tugas"
            >
              <Bell size={20} strokeWidth={2} />
              {unreadOrdersCount > 0 && <span className="driver-hero-bell-dot" />}
            </button>
          </div>
        </header>

        {/* 2. Main Content Container (With Overlapping Floating Wallet Card) */}
        <div className="driver-home-body">
          {/* Floating Balance / Pendapatan Mitra Card */}
          <section className="driver-wallet-card">
            <div className="wallet-card-header-row">
              <span className="wallet-card-kicker">PENDAPATAN MITRA</span>
              <div className="wallet-period-pills">
                <button
                  type="button"
                  className={`wallet-period-pill ${earningsPeriod === 'today' ? 'active' : ''}`}
                  onClick={() => setEarningsPeriod('today')}
                >
                  Hari Ini
                </button>
                <button
                  type="button"
                  className={`wallet-period-pill ${earningsPeriod === 'all' ? 'active' : ''}`}
                  onClick={() => setEarningsPeriod('all')}
                >
                  Semua
                </button>
              </div>
            </div>

            <div className="wallet-balance-row">
              <h2 className="wallet-balance-amount">
                {showBalance ? formatRupiah(earningsStats.totalNet) : 'Rp •••••••'}
              </h2>
              <button
                type="button"
                className="wallet-eye-btn"
                onClick={() => setShowBalance((prev) => !prev)}
                aria-label={showBalance ? 'Sembunyikan saldo' : 'Tampilkan saldo'}
              >
                {showBalance ? <Eye size={18} strokeWidth={2} /> : <EyeOff size={18} strokeWidth={2} />}
              </button>
            </div>

            {/* 4 Circular Icon Items (Matching Reference Transfer/Withdraw/Invest/Top up Layout) */}
            <div className="wallet-actions-grid">
              <div
                className="wallet-action-item"
                onClick={() => onNavigate && onNavigate('activity')}
                role="button"
                tabIndex={0}
              >
                <div className="wallet-action-circle">
                  <CheckCircle2 size={20} strokeWidth={2.2} />
                </div>
                <span className="wallet-action-label">Selesai</span>
                <span className="wallet-action-val">{earningsStats.completedCount} Order</span>
              </div>

              <div className="wallet-action-item">
                <div className="wallet-action-circle">
                  <Banknote size={20} strokeWidth={2.2} />
                </div>
                <span className="wallet-action-label">Tunai</span>
                <span className="wallet-action-val">
                  {showBalance ? formatRupiah(earningsStats.cashTotal) : '••••'}
                </span>
              </div>

              <div className="wallet-action-item">
                <div className="wallet-action-circle">
                  <QrCode size={20} strokeWidth={2.2} />
                </div>
                <span className="wallet-action-label">QRIS</span>
                <span className="wallet-action-val">
                  {showBalance ? formatRupiah(earningsStats.qrisTotal) : '••••'}
                </span>
              </div>

              <div
                className="wallet-action-item"
                onClick={() => setIsRecapExpanded((prev) => !prev)}
                role="button"
                tabIndex={0}
              >
                <div className="wallet-action-circle">
                  <BarChart3 size={20} strokeWidth={2.2} />
                </div>
                <span className="wallet-action-label">Rekap</span>
                <span className="wallet-action-val">Mingguan</span>
              </div>
            </div>
          </section>

          {/* Verification Status Banner (if Pending or Rejected) */}
          {!dismissedVerifyBanner && verificationStatus === 'pending' && (
            <div
              className="driver-verify-card pending"
              onClick={() => onNavigate && onNavigate('account')}
              role="button"
              tabIndex={0}
            >
              <div className="driver-verify-icon-outer">
                <div className="driver-verify-icon-inner">i</div>
              </div>
              <div className="driver-verify-body">
                <h3 className="driver-verify-title">Menunggu Verifikasi Admin</h3>
                <p className="driver-verify-desc">
                  Berkas KTP, SIM, dan STNK Anda sedang ditinjau oleh tim Admin OTWJek.
                </p>
              </div>
              <button
                type="button"
                className="driver-verify-close"
                onClick={(e) => {
                  e.stopPropagation();
                  setDismissedVerifyBanner(true);
                }}
                aria-label="Tutup notifikasi"
                title="Tutup"
              >
                <X size={16} strokeWidth={1.8} />
              </button>
            </div>
          )}

          {!dismissedVerifyBanner && verificationStatus === 'rejected' && (
            <div
              className="driver-verify-card rejected"
              onClick={() => onNavigate && onNavigate('account')}
              role="button"
              tabIndex={0}
            >
              <div className="driver-verify-icon-outer">
                <div className="driver-verify-icon-inner">!</div>
              </div>
              <div className="driver-verify-body">
                <h3 className="driver-verify-title">Verifikasi Perlu Diperbaiki</h3>
                <p className="driver-verify-desc">
                  {driverProfile?.rejection_reason || 'Foto dokumen kurang jelas. Ketuk untuk unggah ulang.'}
                </p>
              </div>
              <button
                type="button"
                className="driver-verify-close"
                onClick={(e) => {
                  e.stopPropagation();
                  setDismissedVerifyBanner(true);
                }}
                aria-label="Tutup notifikasi"
                title="Tutup"
              >
                <X size={16} strokeWidth={1.8} />
              </button>
            </div>
          )}

          {/* 3. Financial Insight Banner (Matching Reference "Let's check your Financial Insight..." Banner) */}
          <div
            className="driver-insight-banner"
            onClick={() => setIsRecapExpanded((prev) => !prev)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setIsRecapExpanded((prev) => !prev);
              }
            }}
          >
            <p className="driver-insight-text">
              Cek <strong>Rekap Pendapatan & Filter Tanggal</strong> untuk bulan {currentMonthName}!
            </p>
            <ChevronRight
              size={18}
              className={`driver-insight-chevron ${isRecapExpanded ? 'rotated' : ''}`}
            />
          </div>

          {/* Expandable Section Card: Rekap Mingguan & Filter Tanggal Kustom */}
          {isRecapExpanded && (
            <section className="driver-recap-card">
              <div className="recap-card-top">
                <div className="earnings-card-label">
                  <BarChart3 size={16} color="#FF337F" />
                  <span>Rekap Mingguan & Filter Tanggal</span>
                </div>

                <div className="recap-period-tabs">
                  <button
                    type="button"
                    className={`period-tab-btn ${recapPeriod === 'week' ? 'active' : ''}`}
                    onClick={() => setRecapPeriod('week')}
                  >
                    7 Hari
                  </button>
                  <button
                    type="button"
                    className={`period-tab-btn ${recapPeriod === 'month' ? 'active' : ''}`}
                    onClick={() => setRecapPeriod('month')}
                  >
                    Bulan Ini
                  </button>
                  <button
                    type="button"
                    className={`period-tab-btn ${recapPeriod === 'custom' ? 'active' : ''}`}
                    onClick={() => setRecapPeriod('custom')}
                  >
                    <Calendar size={11} />
                    <span>Kustom</span>
                  </button>
                </div>
              </div>

              {recapPeriod === 'custom' && (
                <div className="earnings-custom-date-box">
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
                  <div className="custom-date-presets">
                    <button
                      type="button"
                      className="date-preset-chip"
                      onClick={() => {
                        const yest = new Date();
                        yest.setDate(yest.getDate() - 1);
                        const yKey = toLocalDateKey(yest);
                        setCustomStartDate(yKey);
                        setCustomEndDate(yKey);
                      }}
                    >
                      Kemarin
                    </button>
                    <button
                      type="button"
                      className="date-preset-chip"
                      onClick={() => applyQuickDateRange(2)}
                    >
                      3 Hari Terakhir
                    </button>
                    <button
                      type="button"
                      className="date-preset-chip"
                      onClick={() => applyQuickDateRange(6)}
                    >
                      7 Hari Terakhir
                    </button>
                    <button
                      type="button"
                      className="date-preset-chip"
                      onClick={() => applyQuickDateRange(29)}
                    >
                      30 Hari Terakhir
                    </button>
                  </div>
                </div>
              )}

              <div className="earnings-weekly-chart-box">
                <div className="weekly-chart-header">
                  <span className="earnings-period-caption">{recapStats.periodLabel}</span>
                  <span className="weekly-chart-hint">Ketuk hari untuk filter</span>
                </div>
                <div className="weekly-bars-grid">
                  {recapStats.weeklyDays.map((day) => {
                    const targetMaxOrders = Math.max(10, recapStats.maxDayOrders || 10);
                    const heightPct =
                      day.orderCount > 0
                        ? Math.min(100, Math.round((day.orderCount / targetMaxOrders) * 100))
                        : 0;
                    const isSelectedCustomDay =
                      recapPeriod === 'custom' &&
                      customStartDate === day.dateKey &&
                      customEndDate === day.dateKey;

                    return (
                      <button
                        type="button"
                        key={day.dateKey}
                        className={`weekly-bar-col ${day.isToday ? 'is-today' : ''} ${
                          isSelectedCustomDay ? 'is-selected' : ''
                        } ${day.orderCount > 0 ? 'has-value' : ''}`}
                        onClick={() => {
                          setCustomStartDate(day.dateKey);
                          setCustomEndDate(day.dateKey);
                          setRecapPeriod('custom');
                        }}
                        title={`${day.fullLabel}: ${day.orderCount}/10 pesanan (${formatRupiah(day.netAmount)})`}
                      >
                        <span className="weekly-bar-order-badge">
                          {day.orderCount > 0 ? `${day.orderCount}x` : '-'}
                        </span>
                        <div className="weekly-bar-track">
                          <div
                            className="weekly-bar-fill"
                            style={{ height: `${heightPct}%` }}
                          />
                        </div>
                        <span className="weekly-bar-day">{day.dayLabel}</span>
                        <span className="weekly-bar-date">{day.shortDate}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="earnings-commission-summary">
                <div className="commission-row">
                  <span>Total Tarif Kotor ({recapStats.completedCount} Order)</span>
                  <span className="commission-val">{formatRupiah(recapStats.totalGross)}</span>
                </div>
                <div className="commission-row deduction">
                  <span>Potongan Komisi Platform (15%)</span>
                  <span className="commission-val">-{formatRupiah(recapStats.totalCommission)}</span>
                </div>
                <div className="commission-row net-total">
                  <span>Pendapatan Bersih Periode (85%)</span>
                  <span className="commission-val">{formatRupiah(recapStats.totalNet)}</span>
                </div>
              </div>
            </section>
          )}

          {/* 4. Pesanan Ditugaskan (Recent Transactions Reference Style) */}
          <section className="driver-orders-section">
            <div className="driver-section-header">
              <h2 className="driver-section-title">Pesanan Ditugaskan</h2>

              {formattedOrders.length > 0 && (
                <button
                  type="button"
                  className="btn-see-all-orders"
                  onClick={() => onNavigate && onNavigate('activity')}
                >
                  <span>Riwayat</span>
                  <ChevronRight size={15} />
                </button>
              )}
            </div>

            {formattedOrders.length > 0 && (
              <div className="driver-order-filters">
                <button
                  type="button"
                  className={`order-filter-pill ${orderFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setOrderFilter('all')}
                >
                  Semua ({formattedOrders.length})
                </button>
                <button
                  type="button"
                  className={`order-filter-pill ${orderFilter === 'ride' ? 'active' : ''}`}
                  onClick={() => setOrderFilter('ride')}
                >
                  Penumpang (
                  {formattedOrders.filter((o) => o.serviceType === 'motor' || o.serviceType === 'mobil').length}
                  )
                </button>
                <button
                  type="button"
                  className={`order-filter-pill ${orderFilter === 'paket' ? 'active' : ''}`}
                  onClick={() => setOrderFilter('paket')}
                >
                  Paket ({formattedOrders.filter((o) => o.serviceType === 'paket').length})
                </button>
              </div>
            )}

            {filteredOrders.length === 0 ? (
              <div className="driver-orders-empty">
                <div className="empty-icon-circle">
                  <Inbox size={22} />
                </div>
                <h3 className="empty-orders-title">Belum Ada Pesanan Ditugaskan</h3>
                <p className="empty-orders-sub">
                  Pesanan yang ditugaskan oleh Admin Dispatch kepada Anda akan otomatis muncul di halaman ini.
                </p>
              </div>
            ) : (
              <div className="driver-tx-list">
                {filteredOrders.map((ord) => {
                  const isCancelled = ord.status === 'cancelled';
                  const isActiveTask =
                    !isCancelled && ord.driverStep && ord.driverStep !== 'completed';
                  const isCompleted = !isCancelled && !isActiveTask;

                  const stepLabel = isCancelled
                    ? 'Dibatalkan'
                    : ord.driverStep === 'assigned'
                    ? 'Menuju Jemput'
                    : ord.driverStep === 'arrived'
                    ? 'Tiba di Jemput'
                    : ord.driverStep === 'picked_up'
                    ? 'Sedang Diantar'
                    : 'Selesai';

                  return (
                    <div
                      key={ord.id}
                      className={`driver-tx-item ${ord.isUnreadDriver ? 'unread' : ''}`}
                      onClick={() => {
                        dbService.bookings.markAllAsRead(activeUser);
                        setSelectedOrderDetail(ord);
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          dbService.bookings.markAllAsRead(activeUser);
                          setSelectedOrderDetail(ord);
                        }
                      }}
                    >
                      <div className="driver-tx-left">
                        <div className="driver-tx-meta">
                          <div className="driver-tx-top-tags">
                            <span className={`driver-tx-service-badge ${ord.serviceType}`}>
                              {ord.serviceName}
                            </span>
                            <span className="driver-tx-order-code">{ord.orderCode}</span>
                            <span
                              className={`driver-tx-status-badge ${
                                isCancelled ? 'cancelled' : isActiveTask ? 'active' : 'completed'
                              }`}
                            >
                              {stepLabel}
                            </span>
                          </div>

                          <div className="driver-tx-title">{ord.dropoffLocation.name}</div>

                          <div className="driver-tx-subtitle">
                            Jemput: <strong>{ord.pickupLocation.name}</strong>
                          </div>

                          <div className="driver-tx-extra-meta">
                            <span>{ord.customerName}</span>
                            <span className="meta-dot">·</span>
                            <span>{ord.distanceKm} km</span>
                            <span className="meta-dot">·</span>
                            <span>{ord.paymentMethod === 'qris' ? 'QRIS' : 'Tunai'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="driver-tx-right">
                        <span
                          className={`driver-tx-amount ${
                            isCompleted ? 'positive' : isCancelled ? 'cancelled' : 'neutral'
                          }`}
                        >
                          {isCompleted
                            ? `+ ${ord.totalEarnings}`
                            : isCancelled
                            ? 'Batal'
                            : ord.totalEarnings}
                        </span>
                        <span className="driver-tx-fare-sub">Tarif {ord.formattedPrice}</span>
                        <span className="driver-tx-date">
                          {ord.date} · {ord.time}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

