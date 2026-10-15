import React, { useState, useEffect, useMemo, useRef } from 'react';
import './ActivityPage.css';
import {
  ArrowLeft,
  ChevronDown,
  Bike,
  Package,
  Car,
  User,
  Check,
  ShoppingBag
} from 'lucide-react';
import { formatRupiah } from '../utils/fareCalculator.js';
import dbService from '../services/dbService.js';
import ActivityOrderDetailView from './ActivityOrderDetailView.jsx';

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

  const cashVal =
    b.cash_collected !== undefined
      ? Number(b.cash_collected)
      : b.payment_method === 'cash'
      ? -fare
      : 0;
  const adjVal = b.adjustment !== undefined ? Number(b.adjustment) : -fare;

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

  const realPickupName = b.pickup_name || (sType === 'paket' ? 'Kantor Cabang Rappocini' : 'Warung Megarasa - Rappocini');
  const realPickupAddress = b.pickup_address || 'Jl. Rappocini Raya No. 112, Makassar';

  const realDropoffName =
    b.dropoff_name && b.dropoff_name !== 'Alamat Pelanggan disembunyikan'
      ? b.dropoff_name
      : isCar
      ? 'Bandara Sultan Hasanuddin'
      : isSend
      ? 'Ruko Pettarani Indah No. 14'
      : 'Mall Panakkukang (MP)';
  const realDropoffAddress =
    b.dropoff_address ||
    (isCar
      ? 'Mandai, Maros, Makassar'
      : isSend
      ? 'Jl. AP Pettarani Blok C2, Makassar'
      : 'Jl. Pengayoman, Panakkukang, Makassar');

  return {
    id: b.id || b.booking_code || code,
    orderCode: code,
    orderNumber: num,
    time: timeStr,
    date: dateStr,
    fullDateTime: `${dateStr}, ${timeStr}`,
    serviceType: sType,
    serviceName: sName,
    price: fare,
    formattedPrice: formatRupiah(fare),
    deliveryFee: formatRupiah(deliveryFee),
    totalEarnings: formatRupiah(totalEarnings),
    cashCollected: cashVal < 0 ? `-${formatRupiah(Math.abs(cashVal))}` : formatRupiah(cashVal),
    adjustment: adjVal < 0 ? `-${formatRupiah(Math.abs(adjVal))}` : formatRupiah(adjVal),
    merchantName: b.pickup_name || b.pickup_address || 'Alamat Pengirim disembunyikan',
    customerAddress: b.dropoff_name || b.dropoff_address || 'Alamat Pelanggan disembunyikan',
    pickupLocation: {
      name: realPickupName,
      address: realPickupAddress
    },
    dropoffLocation: {
      name: realDropoffName,
      address: realDropoffAddress
    },
    driver: driverObj,
    distanceKm: b.distance_km || 3.2,
    durationMinutes: b.duration_minutes || 18,
    status: b.booking_status === 'cancelled' ? 'cancelled' : 'completed',
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

export default function ActivityPage({ onBack, currentUser }) {
  const [activeTab, setActiveTab] = useState('selesai'); // 'selesai' | 'dibatalkan'
  const [selectedDate, setSelectedDate] = useState('all');
  const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [rawBookings, setRawBookings] = useState([]);
  const dropdownRef = useRef(null);

  const activeUser = currentUser || dbService.session.getCurrentUser();

  // Ambil data pesanan dinamis langsung dari dbService khusus untuk akun yang aktif
  const loadBookings = () => {
    try {
      const items = dbService.bookings.getAll(activeUser);
      setRawBookings(Array.isArray(items) ? items : []);
    } catch {
      // fallback
    }
  };

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
  }, [activeUser]);

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

  // Kumpulan opsi tanggal unik yang diekstrak secara dinamis dari database
  const availableDates = useMemo(() => {
    const datesSet = new Set();
    allOrders.forEach((ord) => {
      if (ord.date) datesSet.add(ord.date);
    });
    const uniqueDates = Array.from(datesSet).map((d) => ({ label: d, value: d }));
    return [
      { label: 'Semua Tanggal', value: 'all' },
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
    return filteredByTab.filter((ord) => ord.date === selectedDate);
  }, [allOrders, activeTab, selectedDate]);

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
    return (
      <ActivityOrderDetailView
        order={selectedOrder}
        onBack={() => setSelectedOrder(null)}
        currentUser={activeUser}
        isDriver={activeUser?.role === 'driver'}
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
        <h1 className="activity-topbar-title">Riwayat Pesanan</h1>
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
            <span>{selectedDate === 'all' ? 'Semua Tanggal' : selectedDate}</span>
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

        {/* Orders List */}
        {displayedOrders.length > 0 ? (
          <>
            {displayedOrders.map((order) => (
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
                      {order.merchantName}
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
                      {order.customerAddress}
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
            ))}

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
              <ShoppingBag size={28} />
            </div>
            <h3 className="activity-empty-title">
              {allOrders.length === 0 ? 'Belum Ada Pesanan' : 'Tidak Ada Pesanan'}
            </h3>
            <p className="activity-empty-desc">
              {allOrders.length === 0
                ? 'Riwayat pesanan Motor, Mobil, atau Paket Anda akan muncul di sini setelah Anda melakukan pemesanan.'
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
