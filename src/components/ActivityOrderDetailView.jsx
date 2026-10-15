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
  Edit3,
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
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
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

  const handleSubmitFeedback = (e) => {
    e.preventDefault();
    try {
      const existing = JSON.parse(localStorage.getItem('otwjek_db_order_feedbacks') || '[]');
      existing.unshift({
        orderCode,
        orderNumber,
        role: isDriverView ? 'driver' : 'customer',
        rating: feedbackRating,
        text: feedbackText,
        submittedAt: new Date().toISOString()
      });
      localStorage.setItem('otwjek_db_order_feedbacks', JSON.stringify(existing));
    } catch {
      // ignore
    }
    setFeedbackSubmitted(true);
    setTimeout(() => {
      setFeedbackSubmitted(false);
      setIsFeedbackOpen(false);
      showToast('Terima kasih atas saran & masukan Anda!');
    }, 1200);
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

              {/* Route Section Driver (Alamat disembunyikan sesuai privasi mitra driver) */}
              <div className="order-detail-route">
                {/* Origin Step */}
                <div className="order-route-point">
                  <div className="route-circle-icon store-icon">
                    <Store size={14} color="#E04F16" strokeWidth={2.2} />
                  </div>
                  <span className="route-point-label" title={order.merchantName || 'Alamat Pengirim disembunyikan'}>
                    {order.merchantName || 'Alamat Pengirim disembunyikan'}
                  </span>
                </div>

                {/* Connecting Vertical Line */}
                <div className="route-connecting-line" aria-hidden="true" />

                {/* Destination Step */}
                <div className="order-route-point">
                  <div className="route-circle-icon user-icon">
                    <User size={14} color="#10B981" strokeWidth={2.4} />
                  </div>
                  <span className="route-point-label" title={order.customerAddress || 'Alamat Pelanggan disembunyikan'}>
                    {order.customerAddress || 'Alamat Pelanggan disembunyikan'}
                  </span>
                </div>
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
                  {isPackage ? 'Rute Pengiriman Paket' : 'Rute Perjalanan'}
                </span>
                <span className="customer-route-summary">
                  {order.distanceKm ? `${order.distanceKm} km` : '3.2 km'} (~{order.durationMinutes || 18} mnt)
                </span>
              </div>

              <div className="customer-route-box">
                {/* Titik Jemput / Asal */}
                <div className="customer-route-item">
                  <div className="customer-pin-icon pickup">
                    <MapPin size={15} strokeWidth={2.4} />
                  </div>
                  <div className="customer-point-details">
                    <div className="point-title-row">
                      <span className="point-title">{pickupLoc.name}</span>
                      <span className="point-time-tag">{timeline.pickedUp || '13:47'}</span>
                    </div>
                    <p className="point-address">{pickupLoc.address}</p>
                  </div>
                </div>

                {/* Route Connecting Track */}
                <div className="customer-route-track" aria-hidden="true">
                  <div className="track-vertical-line" />
                </div>

                {/* Titik Tujuan / Antar */}
                <div className="customer-route-item">
                  <div className="customer-pin-icon dropoff">
                    <MapPin size={15} strokeWidth={2.4} />
                  </div>
                  <div className="customer-point-details">
                    <div className="point-title-row">
                      <span className="point-title">{dropoffLoc.name}</span>
                      <span className="point-time-tag completed">{timeline.completed || '14:00'}</span>
                    </div>
                    <p className="point-address">{dropoffLoc.address}</p>
                  </div>
                </div>
              </div>

              {/* Box Spesial Paket jika Layanan Paket */}
              {isPackage && order.packageInfo && (
                <div className="customer-package-note-box">
                  <div className="package-note-title">
                    <Package size={14} color="#7C3AED" />
                    <span>Detail Paket & Penerima</span>
                  </div>
                  <div className="package-note-content">
                    <div className="package-kv-row">
                      <span className="kv-label">Penerima:</span>
                      <span className="kv-val">{order.packageInfo.recipientName} ({order.packageInfo.recipientPhone})</span>
                    </div>
                    <div className="package-kv-row">
                      <span className="kv-label">Ukuran:</span>
                      <span className="kv-val">{order.packageInfo.size || 'S (Dokumen / Kecil)'}</span>
                    </div>
                    {order.packageInfo.notes && (
                      <div className="package-kv-row">
                        <span className="kv-label">Catatan:</span>
                        <span className="kv-val">{order.packageInfo.notes}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>

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

            {/* Customer Fixed Action Bottom Bar */}
            <div className="customer-action-footer-spacer" />
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
          </div>
        )}
      </main>

      {/* Floating Pill: Saran & Masukan (Hanya tampil pada mode Driver) */}
      {isDriverView && (
        <button
          type="button"
          className="floating-feedback-pill"
          onClick={() => setIsFeedbackOpen(true)}
          aria-label="Buka form Saran & Masukan"
        >
          <Edit3 size={15} strokeWidth={2.4} />
          <span>Saran & Masukan</span>
        </button>
      )}

      {/* Feedback Modal Popover untuk Driver */}
      {isFeedbackOpen && (
        <div className="feedback-modal-backdrop" onClick={() => setIsFeedbackOpen(false)}>
          <div
            className="feedback-modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="feedback-modal-header">
              <h3 className="feedback-modal-title">Saran & Masukan Mitra</h3>
              <button
                type="button"
                className="btn-feedback-close"
                onClick={() => setIsFeedbackOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            {feedbackSubmitted ? (
              <div className="feedback-success-state">
                <div className="feedback-success-icon">
                  <Check size={28} />
                </div>
                <h4>Terima Kasih!</h4>
                <p>Masukan Anda sangat berharga untuk meningkatkan mutu layanan OTWJek.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitFeedback} className="feedback-form">
                <p className="feedback-prompt-text">
                  Bagaimana operasional pesanan <strong>{orderCode}</strong>?
                </p>

                <div className="feedback-stars-row">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className={`star-btn ${star <= feedbackRating ? 'filled' : ''}`}
                      onClick={() => setFeedbackRating(star)}
                    >
                      ★
                    </button>
                  ))}
                </div>

                <textarea
                  className="feedback-textarea"
                  rows={3}
                  placeholder="Tulis kritik, kendala aplikasi, atau catatan rute..."
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                />

                <div className="feedback-actions-row">
                  <button
                    type="button"
                    className="btn-feedback-cancel"
                    onClick={() => setIsFeedbackOpen(false)}
                  >
                    Batal
                  </button>
                  <button type="submit" className="btn-feedback-submit">
                    Kirim Masukan
                  </button>
                </div>
              </form>
            )}
          </div>
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
