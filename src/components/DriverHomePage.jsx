import React, { useState, useEffect, useMemo, useCallback } from 'react';
import './DriverHomePage.css';
import {
  Wallet,
  Inbox,
  X,
  ChevronRight
} from 'lucide-react';
import dbService, { normalizePhone } from '../services/dbService.js';
import { formatRupiah } from '../utils/fareCalculator.js';
import ActivityOrderDetailView from './ActivityOrderDetailView.jsx';

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
  const [earningsPeriod, setEarningsPeriod] = useState('today'); // 'today' | 'all'
  const [orderFilter, setOrderFilter] = useState('all'); // 'all' | 'ride' | 'paket'
  const [selectedOrderDetail, setSelectedOrderDetail] = useState(null);
  const [dismissedVerifyBanner, setDismissedVerifyBanner] = useState(false);

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
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [loadDriverData]);

  const activeUser = currentUser || dbService.session.getCurrentUser();
  const verificationStatus = driverProfile?.verification_status || 'pending';

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

  // Kalkulasi metrik pendapatan & performa (hanya menghitung tugas yang benar-benar telah diselesaikan)
  const earningsStats = useMemo(() => {
    const todayDateStr = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });

    const completedOrders = formattedOrders.filter(
      (o) => o.status === 'completed' && (!o.driverStep || o.driverStep === 'completed')
    );
    const periodOrders =
      earningsPeriod === 'today'
        ? completedOrders.filter((o) => o.date === todayDateStr)
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

        {/* Earnings & Performance Summary Card */}
        <section className="driver-earnings-card">
          <div className="earnings-card-top">
            <div className="earnings-card-label">
              <Wallet size={16} color="#FF337F" />
              <span>Pendapatan Mitra</span>
            </div>

            <div className="earnings-period-tabs">
              <button
                type="button"
                className={`period-tab-btn ${earningsPeriod === 'today' ? 'active' : ''}`}
                onClick={() => setEarningsPeriod('today')}
              >
                Hari Ini
              </button>
              <button
                type="button"
                className={`period-tab-btn ${earningsPeriod === 'all' ? 'active' : ''}`}
                onClick={() => setEarningsPeriod('all')}
              >
                Semua
              </button>
            </div>
          </div>

          <h2 className="earnings-main-amount">{formatRupiah(earningsStats.totalNet)}</h2>

          <div className="earnings-metrics-grid">
            <div className="earnings-metric-box">
              <span className="metric-box-label">Order Selesai</span>
              <span className="metric-box-value">{earningsStats.completedCount} Order</span>
            </div>
            <div className="earnings-metric-box">
              <span className="metric-box-label">Tunai (Cash)</span>
              <span className="metric-box-value">{formatRupiah(earningsStats.cashTotal)}</span>
            </div>
            <div className="earnings-metric-box">
              <span className="metric-box-label">Non-Tunai (QRIS)</span>
              <span className="metric-box-value">{formatRupiah(earningsStats.qrisTotal)}</span>
            </div>
          </div>
        </section>

        {/* Assigned Orders List */}
        <section className="driver-orders-section">
          <div className="driver-section-header">
            <div className="driver-section-title-group">
              <h2 className="driver-section-title">Pesanan Ditugaskan</h2>
            </div>

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
            filteredOrders.map((ord) => (
              <div
                key={ord.id}
                className={`driver-order-card stepper-card-style ${ord.isUnreadDriver ? 'unread' : ''}`}
                onClick={() => {
                  dbService.bookings.markAllAsRead(activeUser);
                  setSelectedOrderDetail(ord);
                }}
              >
                {/* Stop 1: Pickup / Titik Jemput */}
                <div className="stepper-stop-row">
                  <div className="stepper-rail-col">
                    <div
                      className={`stepper-check-ring ${
                        ord.status === 'cancelled' ? 'muted-gray' : 'active-blue'
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
                        ord.status === 'completed' &&
                        (ord.driverStep === 'picked_up' || ord.driverStep === 'completed')
                          ? 'completed'
                          : ''
                      }`}
                    />
                  </div>

                  <div className="stepper-stop-content first-stop">
                    <div className="stepper-stop-header">
                      <span className="stepper-stop-kicker">TITIK JEMPUT · STOP 1</span>
                      <span
                        className={`stepper-status-pill ${
                          ord.status === 'cancelled'
                            ? 'cancelled'
                            : ord.driverStep === 'assigned' || ord.driverStep === 'arrived'
                            ? 'in-progress'
                            : 'completed'
                        }`}
                      >
                        {ord.status === 'cancelled'
                          ? 'DIBATALKAN'
                          : ord.driverStep === 'assigned'
                          ? 'MENUJU JEMPUT'
                          : ord.driverStep === 'arrived'
                          ? 'TIBA DI JEMPUT'
                          : 'SELESAI'}
                      </span>
                    </div>
                    <h3 className="stepper-stop-title">{ord.pickupLocation.name}</h3>
                    <p className="stepper-stop-address">{ord.pickupLocation.address}</p>
                    <p className="stepper-stop-meta">
                      Waktu {ord.timeline?.received || ord.time} – {ord.timeline?.pickedUp || ord.time} · Tiba {ord.timeline?.arrived || ord.time}
                    </p>
                  </div>
                </div>

                {/* Stop 2: Dropoff / Titik Tujuan */}
                <div className="stepper-stop-row">
                  <div className="stepper-rail-col">
                    <div
                      className={`stepper-check-ring ${
                        ord.status === 'completed' && ord.driverStep === 'completed'
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
                      {ord.status !== 'cancelled' && ord.driverStep === 'picked_up' && (
                        <span className="stepper-status-pill in-progress">DIANTAR</span>
                      )}
                    </div>
                    <h3 className="stepper-stop-title">{ord.dropoffLocation.name}</h3>
                    <p className="stepper-stop-address">{ord.dropoffLocation.address}</p>
                    <p className="stepper-stop-meta">
                      Estimasi {ord.timeline?.pickedUp || ord.time} – {ord.timeline?.completed || ord.time} · {ord.serviceName} {ord.orderCode} ({ord.totalEarnings})
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  );
}

