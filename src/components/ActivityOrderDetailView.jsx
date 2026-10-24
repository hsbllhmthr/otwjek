import React, { useState } from 'react';
import './ActivityOrderDetailView.css';
import {
  ArrowLeft,
  Headphones,
  Store,
  User,
  Info,
  Banknote,
  Hexagon,
  FileText,
  RotateCcw,
  Clock,
  Check,
  X,
  CheckCheck,
  Bike,
  Car,
  Package,
  MapPin,
  Star,
  Receipt,
  QrCode,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { formatRupiah } from '../utils/fareCalculator.js';

export default function ActivityOrderDetailView({
  order,
  onBack,
  currentUser,
  isDriver: initialIsDriver,
  onReorder
}) {
  const [copied, setCopied] = useState(false);

  const [toastMsg, setToastMsg] = useState(null);

  // Customer in-card rating state
  const [customerRating, setCustomerRating] = useState(5);
  const [customerRatingSubmitted, setCustomerRatingSubmitted] = useState(false);
  const [selectedTag, setSelectedTag] = useState('Ramah & Sopan');

  // Penentuan tampilan terkunci berdasarkan peran akun yang login:
  // Akun Customer hanya dapat melihat rincian pesanan Pelanggan.
  // Akun Driver hanya dapat melihat rincian pesanan Driver.
  const isDriverView = Boolean(
    initialIsDriver ||
    currentUser?.role === 'driver' ||
    order?.isDriver
  );

  if (!order) return null;

  // Layanan: Motor, Mobil, atau Paket
  const sType = String(order.serviceType || '').toLowerCase();
  const isCar = sType === 'mobil' || sType === 'car';
  const isPackage = sType === 'paket' || sType === 'send' || sType === 'food' || sType === 'package';
  const serviceDisplayName = isCar ? 'Mobil' : isPackage ? 'Paket' : 'Motor';

  // Order Details Props with robust fallbacks
  const orderCode = order.orderCode || (order.id ? `#${String(order.id).slice(-4).toUpperCase()}` : '#8L9A');
  const orderNumber = order.orderNumber || '3301447308559872213';
  const isDelivered = order.status !== 'cancelled';
  const deliveryFeeStr = order.deliveryFee || order.formattedPrice || formatRupiah(order.price || 9600);
  const totalEarningsStr = order.totalEarnings || order.formattedPrice || deliveryFeeStr;

  // Tagihan tunai / Penyesuaian Driver matching format reference
  const cashCollectedStr = order.cashCollected || (order.price ? `-${formatRupiah(order.price)}` : '-Rp282.062');
  const adjustmentStr = order.adjustment || cashCollectedStr;

  // Timeline stations
  const timeline = order.timeline || {
    received: '13:31',
    arrived: '13:45',
    pickedUp: '13:47',
    completed: order.time || '14:00'
  };

  // Driver details for customer view
  const driverInfo = order.driver || {
    name: isCar ? 'Nurul Hidayah' : 'Siti Rahmawati',
    rating: 4.9,
    tripsCount: '1.250+ perjalanan',
    vehicleModel: isCar ? 'Toyota Calya · Silver' : 'Honda Vario 160 · Hitam',
    plateNumber: isCar ? 'DD 1289 AZ' : 'DD 4521 XY',
    phone: '085255655084'
  };

  // Customer pricing breakdown
  const fare = Number(order.price || 15000);
  const customerPricing = order.customerPricing || {
    tripFare: Math.max(0, fare - 2000),
    formattedTripFare: formatRupiah(Math.max(0, fare - 2000)),
    platformFee: 2000,
    formattedPlatformFee: formatRupiah(2000),
    discount: 0,
    formattedDiscount: null,
    totalPayment: fare,
    formattedTotal: formatRupiah(fare),
    paymentMethodLabel: (order.paymentMethod || 'cash').toLowerCase() === 'cash' ? 'Tunai (Cash)' : 'QRIS / OTWPay'
  };

  // Real locations for customer view
  const pickupLoc = order.pickupLocation || {
    name: order.merchantName && order.merchantName !== 'Alamat Pengirim disembunyikan'
      ? order.merchantName
      : isPackage
      ? 'Kantor Pengirim Rappocini'
      : 'Warung Megarasa - Rappocini',
    address: 'Jl. Rappocini Raya No. 112, Makassar'
  };

  const dropoffLoc = order.dropoffLocation || {
    name: order.customerAddress && order.customerAddress !== 'Alamat Pelanggan disembunyikan'
      ? order.customerAddress
      : isCar
      ? 'Bandara Sultan Hasanuddin'
      : isPackage
      ? 'Ruko Pettarani Indah No. 14'
      : 'Mall Panakkukang (MP)',
    address: isCar
      ? 'Mandai, Maros, Makassar'
      : isPackage
      ? 'Jl. AP Pettarani Blok C2, Makassar'
      : 'Jl. Pengayoman, Panakkukang, Makassar'
  };

  const handleCopyOrderNumber = () => {
    try {
      navigator.clipboard.writeText(orderNumber);
      setCopied(true);
      showToast('No. Pesanan berhasil disalin!');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      showToast('Gagal menyalin nomor pesanan.');
    }
  };

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleContactCS = () => {
    const roleText = isDriverView ? 'Mitra Driver' : 'Pelanggan';
    const waUrl = `https://wa.me/6285255655084?text=${encodeURIComponent(
      `Halo CS OTWJek, saya sebagai ${roleText} ingin menanyakan rincian pesanan ${serviceDisplayName} ${orderCode} (No: ${orderNumber}).`
    )}`;
    window.open(waUrl, '_blank');
  };


  const handleSubmitCustomerRating = (star) => {
    setCustomerRating(star);
    setCustomerRatingSubmitted(true);
    showToast(`Terima kasih! Anda memberi rating ⭐ ${star}`);
    try {
      const existing = JSON.parse(localStorage.getItem('otwjek_db_customer_ratings') || '[]');
      existing.unshift({
        orderCode,
        orderNumber,
        driverName: driverInfo.name,
        rating: star,
        tag: selectedTag,
        submittedAt: new Date().toISOString()
      });
      localStorage.setItem('otwjek_db_customer_ratings', JSON.stringify(existing));
    } catch {
      // ignore
    }
  };



  const handleReorderClick = () => {
    showToast(`Membuat pesanan ulang ${serviceDisplayName}...`);
    setTimeout(() => {
      if (onReorder) {
        onReorder(order);
      } else if (onBack) {
        onBack();
      }
    }, 800);
  };

  return (
    <div className="order-detail-viewport">
      {/* 1. Top Navigation Bar */}
      <header className="order-detail-topbar">
        <button
          type="button"
          className="btn-order-detail-back"
          onClick={onBack}
          aria-label="Kembali ke Riwayat Pesanan"
        >
          <ArrowLeft size={22} strokeWidth={2.2} />
        </button>

        <h1 className="order-detail-topbar-title">Rincian Pesanan</h1>

        <button
          type="button"
          className="btn-order-detail-cs"
          onClick={handleContactCS}
          title="Bantuan Layanan Pelanggan"
          aria-label="Hubungi Layanan Pelanggan"
        >
          <Headphones size={22} color="#EE4335" strokeWidth={2.2} />
        </button>
      </header>

      {/* 2. Scrollable Body Content */}
      <main className="order-detail-content-scroll">
        {/* ===================================================================
            TAMPILAN 1: KHUSUS AKUN DRIVER (Sesuai referensi gambar sebelumnya)
            =================================================================== */}
        {isDriverView ? (
          <div className="driver-detail-flow">
            {/* Section: Header Code & Route Driver */}
            <section className="order-detail-header-card">
              <div className="order-detail-badge-row">
                <span className="order-detail-code">{orderCode}</span>

                {/* Rubber Stamp Badge (Delivered or Cancelled) */}
                <div className={`order-stamp-badge ${isDelivered ? 'stamp-delivered' : 'stamp-cancelled'}`}>
                  <svg width="86" height="38" viewBox="0 0 86 38" className="stamp-svg">
                    <ellipse
                      cx="43"
                      cy="19"
                      rx="39"
                      ry="16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeDasharray="4 2"
                    />
                    <ellipse
                      cx="43"
                      cy="19"
                      rx="35"
                      ry="13"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1"
                    />
                    <text
                      x="43"
                      y="23"
                      textAnchor="middle"
                      fill="currentColor"
                      fontSize="12"
                      fontWeight="700"
                      fontFamily="inherit"
                      letterSpacing="0.4"
                    >
                      {isDelivered ? 'Delivered' : 'Cancelled'}
                    </text>
                  </svg>
                </div>
              </div>

              {/* Route Section Driver */}
              <div className="order-detail-route">
                {/* Origin Step */}
                <div className="order-route-point">
                  <div className="route-circle-icon store-icon">
                    <Store size={14} color="#E04F16" strokeWidth={2.2} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                    <span className="route-point-label" title={pickupLoc.name}>
                      {pickupLoc.name}
                    </span>
                    {pickupLoc.address && pickupLoc.address !== pickupLoc.name && (
                      <span style={{ fontSize: 12, color: '#6B7280', marginTop: 1 }}>{pickupLoc.address}</span>
                    )}
                  </div>
                </div>

                {/* Connecting Vertical Line */}
                <div className="route-connecting-line" aria-hidden="true" />

                {/* Destination Step */}
                <div className="order-route-point">
                  <div className="route-circle-icon user-icon">
                    <User size={14} color="#10B981" strokeWidth={2.4} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                    <span className="route-point-label" title={dropoffLoc.name}>
                      {dropoffLoc.name}
                    </span>
                    {dropoffLoc.address && dropoffLoc.address !== dropoffLoc.name && (
                      <span style={{ fontSize: 12, color: '#6B7280', marginTop: 1 }}>{dropoffLoc.address}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Informasi Pelanggan yang Ditugaskan Admin */}
              <div
                style={{
                  marginTop: 14,
                  padding: '10px 12px',
                  backgroundColor: '#F9FAFB',
                  border: '1px solid #E5E7EB',
                  borderRadius: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 11.5, color: '#6B7280', fontWeight: 500 }}>
                    Pelanggan ({serviceDisplayName})
                  </span>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: '#111827' }}>
                    {order.customerName || 'Pelanggan OTWJek'}
                    {order.customerPhone ? ` • ${order.customerPhone}` : ''}
                  </span>
                </div>
                {order.customerPhone && (
                  <a
                    href={`https://wa.me/${String(order.customerPhone).replace(/\D/g, '').replace(/^0/, '62')}?text=${encodeURIComponent(
                      `Halo Kak ${order.customerName || ''}, saya ${driverInfo.name} (Mitra Driver OTWJek) yang ditugaskan Admin untuk pesanan ${serviceDisplayName} ${orderCode}.`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      backgroundColor: '#10B981',
                      color: '#FFFFFF',
                      fontSize: 12,
                      fontWeight: 700,
                      padding: '6px 12px',
                      borderRadius: 8,
                      textDecoration: 'none',
                      flexShrink: 0
                    }}
                  >
                    Chat WA
                  </a>
                )}
              </div>
            </section>

            {/* Section Divider Strip */}
            <div className="order-section-divider" />

            {/* Section: Rangkuman Pendapatan Driver */}
            <section className="order-detail-card-section">
              <div className="section-title-row">
                <Banknote size={19} className="section-header-icon" strokeWidth={2} />
                <h2 className="section-title-text">Rangkuman Pendapatan</h2>
                <Info size={16} className="section-info-icon" />
              </div>

              <div className="section-content-list">
                <div className="section-data-row">
                  <span className="data-row-label">Biaya Pengantaran</span>
                  <span className="data-row-value">{deliveryFeeStr}</span>
                </div>

                <div className="section-data-row highlight">
                  <span className="data-row-label bold">Total Pendapatan</span>
                  <span className="data-row-value bold">{totalEarningsStr}</span>
                </div>
              </div>
            </section>

            {/* Section Divider Strip */}
            <div className="order-section-divider" />

            {/* Section: Insentif Driver */}
            <section className="order-detail-card-section">
              <div className="section-title-row">
                <Hexagon size={18} className="section-header-icon" strokeWidth={2.2} />
                <h2 className="section-title-text">Insentif</h2>
              </div>

              <div className="section-content-list">
                {(order.incentives && order.incentives.length > 0
                  ? order.incentives
                  : [
                      { name: 'Bonus Harian - Makassar', points: 100 },
                      { name: 'MISI SIGAP', points: 100 }
                    ]
                ).map((inc, i) => (
                  <div key={i} className="section-data-row">
                    <span className="data-row-label">{inc.name || inc.title}</span>
                    <span className="data-row-value">
                      {typeof inc.points === 'number' ? `${inc.points} Poin` : inc.points}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* Section Divider Strip */}
            <div className="order-section-divider" />

            {/* Section: Rincian (No. Pesanan & Salin) */}
            <section className="order-detail-card-section">
              <div className="section-title-row">
                <FileText size={18} className="section-header-icon" strokeWidth={2} />
                <h2 className="section-title-text">Rincian</h2>
              </div>

              <div className="section-content-list">
                <div className="section-data-row order-number-row">
                  <span className="data-row-label">No. Pesanan</span>
                  <span className="order-number-text">{orderNumber}</span>
                  <button
                    type="button"
                    className="btn-copy-order-number"
                    onClick={handleCopyOrderNumber}
                    aria-label="Salin nomor pesanan"
                  >
                    {copied ? (
                      <span className="copied-label">
                        <CheckCheck size={14} /> Tersalin
                      </span>
                    ) : (
                      <span>Salin</span>
                    )}
                  </button>
                </div>
              </div>
            </section>

            {/* Section Divider Strip */}
            <div className="order-section-divider" />

            {/* Section: Penyesuaian Pesanan Driver */}
            <section className="order-detail-card-section">
              <div className="section-title-row">
                <RotateCcw size={18} className="section-header-icon" strokeWidth={2} />
                <h2 className="section-title-text">Penyesuaian Pesanan</h2>
              </div>

              <div className="section-content-list">
                <div className="section-data-row">
                  <span className="data-row-label">Tagih Tunai yang Diterima</span>
                  <span className="data-row-value">{cashCollectedStr}</span>
                </div>

                <div className="section-data-row highlight">
                  <div className="label-with-info">
                    <span className="data-row-label bold">Penyesuaian Pesanan</span>
                    <Info size={15} className="section-info-icon" />
                  </div>
                  <span className="data-row-value bold">{adjustmentStr}</span>
                </div>
              </div>
            </section>

            {/* Section Divider Strip */}
            <div className="order-section-divider" />

            {/* Section: Waktu Pesanan (Horizontal Stepper Driver) */}
            <section className="order-detail-card-section waktu-section">
              <div className="section-title-row">
                <Clock size={18} className="section-header-icon" strokeWidth={2} />
                <h2 className="section-title-text">Waktu Pesanan</h2>
              </div>

              <div className="order-timeline-stepper">
                {/* Top Labels */}
                <div className="timeline-labels-row">
                  <span className="timeline-label-item">Diterima</span>
                  <span className="timeline-label-item">Tiba</span>
                  <span className="timeline-label-item">Diambil</span>
                  <span className="timeline-label-item active">Selesai</span>
                </div>

                {/* Stepper Track Line & Dots */}
                <div className="timeline-track-row" aria-hidden="true">
                  <div className="timeline-track-line" />
                  <div className="timeline-station">
                    <div className="timeline-dot" />
                  </div>
                  <div className="timeline-station">
                    <div className="timeline-dot" />
                  </div>
                  <div className="timeline-station">
                    <div className="timeline-dot" />
                  </div>
                  <div className="timeline-station">
                    <div className="timeline-dot-completed">
                      <Check size={12} strokeWidth={3} color="#FFFFFF" />
                    </div>
                  </div>
                </div>

                {/* Bottom Timestamps */}
                <div className="timeline-times-row">
                  <span className="timeline-time-item">{timeline.received}</span>
                  <span className="timeline-time-item">{timeline.arrived}</span>
                  <span className="timeline-time-item">{timeline.pickedUp}</span>
                  <span className="timeline-time-item">{timeline.completed}</span>
                </div>
              </div>
            </section>
          </div>
        ) : (
          /* ===================================================================
              TAMPILAN 2: KHUSUS AKUN PELANGGAN / CUSTOMER (Data & Desain Baru)
              =================================================================== */
          <div className="customer-detail-flow">
            {/* 1. Detail Rute Perjalanan & Titik Jemput - Tujuan (Unmasked untuk Pelanggan) */}
            <section className="customer-card-section">
              <div className="customer-section-header">
                <span className="customer-section-title">
                  {isPackage ? 'Rute Pengambilan & Pengantaran Paket' : 'Rute Perjalanan'}
                </span>
                <span className="customer-route-summary">
                  {order.distanceKm ? `${order.distanceKm} km` : '3.2 km'} (~{order.durationMinutes || 18} mnt)
                </span>
              </div>

              <div className="customer-route-box">
                {/* Titik Jemput / Asal */}
                <div className="customer-route-item pickup-step">
                  <div className="customer-pin-column">
                    <div className="customer-pin-icon pickup">
                      <MapPin size={15} strokeWidth={2.4} />
                    </div>
                    <div className="track-vertical-line" aria-hidden="true" />
                  </div>
                  <div className="customer-point-details pickup-details">
                    {isPackage && (
                      <span className="package-step-badge pickup">Lokasi Pengambilan (Pengirim)</span>
                    )}
                    <div className="point-title-row">
                      <span className="point-title">{pickupLoc.name}</span>
                      <span className="point-time-tag">{timeline.pickedUp || '13:47'}</span>
                    </div>
                    <p className="point-address">{pickupLoc.address}</p>
                    {isPackage && order.packageInfo?.senderName && (
                      <p className="point-contact-sub">
                        Pengirim: <strong>{order.packageInfo.senderName}</strong>
                        {order.packageInfo.senderPhone ? ` (${order.packageInfo.senderPhone})` : ''}
                      </p>
                    )}
                  </div>
                </div>

                {/* Titik Tujuan / Antar */}
                <div className="customer-route-item dropoff-step">
                  <div className="customer-pin-column">
                    <div className="customer-pin-icon dropoff">
                      <MapPin size={15} strokeWidth={2.4} />
                    </div>
                  </div>
                  <div className="customer-point-details">
                    {isPackage && (
                      <span className="package-step-badge dropoff">Lokasi Pengantaran (Penerima)</span>
                    )}
                    <div className="point-title-row">
                      <span className="point-title">{dropoffLoc.name}</span>
                      <span className="point-time-tag completed">{timeline.completed || '14:00'}</span>
                    </div>
                    <p className="point-address">{dropoffLoc.address}</p>
                    {isPackage && order.packageInfo?.recipientName && (
                      <p className="point-contact-sub">
                        Penerima: <strong>{order.packageInfo.recipientName}</strong>
                        {order.packageInfo.recipientPhone ? ` (${order.packageInfo.recipientPhone})` : ''}
                        {order.packageInfo.floorUnit ? ` • Unit: ${order.packageInfo.floorUnit}` : ''}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* 2. Card Baru: Detail Paket & Pengiriman (Khusus Layanan Paket) */}
            {isPackage && order.packageInfo && (
              <>
                <div className="order-section-divider" />

                <section className="customer-card-section">
                  <div className="customer-section-header">
                    <div className="title-with-icon">
                      <Package size={17} className="title-icon" />
                      <span className="customer-section-title">Detail Paket & Pengiriman</span>
                    </div>
                    <span className="customer-package-type-badge">
                      {order.packageInfo.category || 'Paket'}
                    </span>
                  </div>

                  <div className="package-detail-card-list">
                    {order.packageInfo.senderName && (
                      <div className="package-detail-row">
                        <span className="package-detail-label">Pengirim</span>
                        <span className="package-detail-value">
                          <strong>{order.packageInfo.senderName}</strong>
                          {order.packageInfo.senderPhone && (
                            <span className="package-detail-sub"> ({order.packageInfo.senderPhone})</span>
                          )}
                        </span>
                      </div>
                    )}

                    {order.packageInfo.recipientName && (
                      <div className="package-detail-row">
                        <span className="package-detail-label">Penerima</span>
                        <span className="package-detail-value">
                          <strong>{order.packageInfo.recipientName}</strong>
                          {order.packageInfo.recipientPhone && (
                            <span className="package-detail-sub"> ({order.packageInfo.recipientPhone})</span>
                          )}
                        </span>
                      </div>
                    )}

                    {order.packageInfo.floorUnit && (
                      <div className="package-detail-row">
                        <span className="package-detail-label">Unit / Patokan</span>
                        <span className="package-detail-value">{order.packageInfo.floorUnit}</span>
                      </div>
                    )}

                    <div className="customer-pricing-divider" />

                    {(order.packageInfo.itemName || order.packageInfo.category) && (
                      <div className="package-detail-row">
                        <span className="package-detail-label">Jenis Barang</span>
                        <span className="package-detail-value">
                          {order.packageInfo.itemName || order.packageInfo.category}
                          {order.packageInfo.category &&
                          order.packageInfo.itemName &&
                          order.packageInfo.itemName !== order.packageInfo.category
                            ? ` (${order.packageInfo.category})`
                            : ''}
                        </span>
                      </div>
                    )}

                    <div className="package-detail-row">
                      <span className="package-detail-label">Ukuran & Berat</span>
                      <span className="package-detail-value">
                        {order.packageInfo.size || 'S (Dokumen / Kecil)'}
                        {order.packageInfo.weight ? ` • ${order.packageInfo.weight} kg` : ''}
                      </span>
                    </div>

                    {order.packageInfo.deliverySpeed && (
                      <div className="package-detail-row">
                        <span className="package-detail-label">Layanan Pengiriman</span>
                        <span className="package-detail-value">{order.packageInfo.deliverySpeed}</span>
                      </div>
                    )}

                    {order.packageInfo.vehicleType && (
                      <div className="package-detail-row">
                        <span className="package-detail-label">Armada Kurir</span>
                        <span className="package-detail-value">{order.packageInfo.vehicleType}</span>
                      </div>
                    )}

                    {order.packageInfo.notes && (
                      <div className="package-detail-note-bar">
                        <span className="package-note-bar-label">Catatan</span>
                        <span className="package-note-bar-val">{order.packageInfo.notes}</span>
                      </div>
                    )}
                  </div>
                </section>
              </>
            )}

            {/* Section Divider Strip */}
            <div className="order-section-divider" />

            {/* 4. Rincian Pembayaran Pelanggan (Tarif, Biaya Layanan, Total Bayar) */}
            <section className="customer-card-section">
              <div className="customer-section-header">
                <div className="title-with-icon">
                  <Receipt size={17} className="title-icon" />
                  <span className="customer-section-title">Rincian Pembayaran</span>
                </div>
                <span className="customer-payment-badge success">
                  <Check size={12} strokeWidth={2.5} /> Lunas
                </span>
              </div>

              <div className="customer-pricing-list">
                <div className="customer-price-row">
                  <span className="price-item-label">
                    {isPackage ? 'Ongkos Kirim Paket' : 'Tarif Perjalanan'}
                  </span>
                  <span className="price-item-value">{customerPricing.formattedTripFare}</span>
                </div>

                <div className="customer-price-row">
                  <span className="price-item-label">Biaya Layanan & Aplikasi</span>
                  <span className="price-item-value">{customerPricing.formattedPlatformFee}</span>
                </div>

                {customerPricing.formattedDiscount && (
                  <div className="customer-price-row discount">
                    <span className="price-item-label">Diskon Promo</span>
                    <span className="price-item-value green">{customerPricing.formattedDiscount}</span>
                  </div>
                )}

                <div className="customer-pricing-divider" />

                <div className="customer-price-row total">
                  <span className="price-item-label bold">Total Pembayaran</span>
                  <span className="price-item-value total-bold">{customerPricing.formattedTotal}</span>
                </div>

                <div className="customer-payment-method-bar">
                  <div className="method-left">
                    {(order.paymentMethod || 'cash').toLowerCase() === 'cash' ? (
                      <Banknote size={16} color="#059669" />
                    ) : (
                      <QrCode size={16} color="#2563EB" />
                    )}
                    <span className="method-name">{customerPricing.paymentMethodLabel}</span>
                  </div>
                  <span className="method-status-tag">Lunas</span>
                </div>
              </div>
            </section>

            {/* Section Divider Strip */}
            <div className="order-section-divider" />

            {/* 5. Nomor Pesanan & Waktu */}
            <section className="customer-card-section">
              <div className="customer-section-header">
                <span className="customer-section-title">Informasi Pesanan</span>
              </div>

              <div className="customer-info-list">
                <div className="customer-info-row">
                  <span className="info-row-label">Layanan</span>
                  <span className="order-number-val" style={{ fontWeight: 600, color: '#111827' }}>
                    {serviceDisplayName}
                  </span>
                </div>

                <div className="customer-info-row">
                  <span className="info-row-label">Mitra Driver</span>
                  <span
                    className="order-number-val"
                    style={{
                      fontWeight: 600,
                      color: order.assignmentStatus === 'assigned' ? '#059669' : '#D97706',
                      textAlign: 'right'
                    }}
                  >
                    {order.assignmentStatus === 'assigned'
                      ? `${driverInfo.name}${driverInfo.plateNumber ? ` • ${driverInfo.plateNumber}` : ''}`
                      : 'Menunggu Penugasan Admin'}
                  </span>
                </div>

                <div className="customer-info-row">
                  <span className="info-row-label">Kode Pesanan</span>
                  <span className="order-number-val" style={{ fontWeight: 700, color: '#EE4335' }}>
                    {orderCode}
                  </span>
                </div>

                <div className="customer-info-row">
                  <span className="info-row-label">No. Pesanan</span>
                  <div className="info-row-right">
                    <span className="order-number-val">{orderNumber}</span>
                    <button
                      type="button"
                      className="btn-copy-order-number"
                      onClick={handleCopyOrderNumber}
                      aria-label="Salin nomor pesanan"
                    >
                      {copied ? (
                        <span className="copied-label">
                          <CheckCheck size={14} /> Tersalin
                        </span>
                      ) : (
                        <span>Salin</span>
                      )}
                    </button>
                  </div>
                </div>

                <div className="customer-info-row">
                  <span className="info-row-label">Waktu Pemesanan</span>
                  <span className="info-row-val">{order.date || '11 Okt 2026'}, {timeline.received || '13:31'}</span>
                </div>

                <div className="customer-info-row">
                  <span className="info-row-label">Waktu Tiba</span>
                  <span className="info-row-val">{order.date || '11 Okt 2026'}, {timeline.completed || '14:00'}</span>
                </div>
              </div>
            </section>

            {/* Section Divider Strip */}
            <div className="order-section-divider" />

            {/* 6. Ulasan / Penilaian Pengemudi oleh Pelanggan */}
            <section className="customer-card-section customer-rating-widget-card">
              <span className="customer-section-title">Nilai Pengemudi Anda</span>
              <p className="customer-rating-desc">
                Bagaimana pengalaman perjalanan dan layanan pesanan Anda?
              </p>

              <div className="customer-interactive-stars">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className={`customer-star-btn ${star <= customerRating ? 'active' : ''}`}
                    onClick={() => handleSubmitCustomerRating(star)}
                    title={`Beri ${star} bintang`}
                  >
                    ★
                  </button>
                ))}
              </div>

              <div className="customer-rating-tags">
                {['Ramah & Sopan', 'Tepat Waktu', 'Kendaraan Bersih', 'Mengemudi Aman'].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className={`rating-pill-tag ${selectedTag === tag ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedTag(tag);
                      showToast(`Ulasan: "${tag}" dipilih.`);
                    }}
                  >
                    {tag}
                  </button>
                ))}
              </div>

              {customerRatingSubmitted && (
                <div className="customer-rating-thankyou">
                  <CheckCircle2 size={16} color="#10B981" />
                  <span>Ulasan Anda telah tersimpan. Terima kasih!</span>
                </div>
              )}
            </section>

            <div className="customer-action-footer-spacer" />
          </div>
        )}
      </main>

      {/* Customer Action Bottom Bar (constrained inside order-detail-viewport) */}
      {!isDriverView && (
        <div className="customer-action-footer">
          <button
            type="button"
            className="btn-customer-cs-help"
            onClick={handleContactCS}
          >
            <Headphones size={17} />
            <span>Bantuan</span>
          </button>

          <button
            type="button"
            className="btn-customer-reorder"
            onClick={handleReorderClick}
          >
            <RefreshCw size={17} />
            <span>Pesan Lagi</span>
          </button>
        </div>
      )}



      {/* Toast Notification */}
      {toastMsg && (
        <div className="order-detail-toast" role="alert">
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
}
