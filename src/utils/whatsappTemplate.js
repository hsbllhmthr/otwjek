import dbService from '../services/dbService.js';

/**
 * WhatsApp Booking Message Generator (Seam 3)
 * Implements PRD standard markdown template and URL encoder
 */

/**
 * Generates the clean markdown text for booking message
 */
export function formatBookingMessage({
  serviceType = 'ride',
  vehicleType = 'motor',
  pickupAddress = '',
  dropoffAddress = '',
  distanceKm = 0,
  formattedFare = 'Rp 0',
  customerName = '',
  customerPhone = '',
  customerNotes = '',
  driverName = '',
  packageDetails = '',
  packageInfo = null,
  paymentMethod = 'cash',
  pickupCoords = null,
  dropoffCoords = null
}) {
  let serviceLabel = 'Antar Penumpang (OTWJek Motor)';
  if (serviceType === 'ride') {
    serviceLabel = vehicleType === 'mobil' ? 'Antar Penumpang (OTWJek Mobil)' : 'Antar Penumpang (OTWJek Motor)';
  } else {
    serviceLabel = `Antar Paket (OTWJek Kirim) ${packageDetails ? '- ' + packageDetails : ''}`;
  }

  const paymentLabel = paymentMethod === 'qris' ? 'QRIS (Scan Barcode)' : 'Tunai / Cash';
  const selectedDriver = driverName && driverName.trim().length > 0 ? driverName : 'Acak (Dicarikan Admin)';
  const notesText = customerNotes && customerNotes.trim().length > 0 ? customerNotes : 'Tidak ada catatan';

  // Deteksi nama dan nomor WhatsApp pemesan dari akun login aktif
  let effectiveCustomerName = customerName && customerName.trim() && customerName !== 'Pelanggan OTWJek' && customerName !== 'Pelanggan Perempuan'
    ? customerName.trim()
    : '';
  let effectiveCustomerPhone = customerPhone && customerPhone.trim() ? customerPhone.trim() : '';

  try {
    const sessionUser = dbService?.session?.getCurrentUser();
    if (sessionUser) {
      if (!effectiveCustomerName) {
        effectiveCustomerName = sessionUser.fullName || sessionUser.full_name || sessionUser.name || '';
      }
      if (!effectiveCustomerPhone && sessionUser.phone) {
        effectiveCustomerPhone = sessionUser.phone;
      }
    }
  } catch (err) {
    // Ignore error
  }

  const nameText = effectiveCustomerName || 'Pelanggan OTWJek';
  const phoneText = effectiveCustomerPhone ? ` (WA: ${effectiveCustomerPhone})` : '';

  // Build high-accuracy Google Maps Shareloc links
  const pickupMapLink =
    pickupCoords && typeof pickupCoords.lat === 'number' && typeof pickupCoords.lng === 'number'
      ? `https://maps.google.com/?q=${pickupCoords.lat.toFixed(6)},${pickupCoords.lng.toFixed(6)}`
      : '';

  const dropoffMapLink =
    dropoffCoords && typeof dropoffCoords.lat === 'number' && typeof dropoffCoords.lng === 'number'
      ? `https://maps.google.com/?q=${dropoffCoords.lat.toFixed(6)},${dropoffCoords.lng.toFixed(6)}`
      : '';

  if (serviceType === 'send' && packageInfo) {
    const weightLabels = {
      light: 'Ringan (< 2 kg)',
      medium: 'Sedang (2 - 5 kg)',
      heavy: 'Berat (5 - 10 kg)'
    };
    const weightStr = weightLabels[packageInfo.weightTier] || packageInfo.weightTier || 'Ringan (< 2 kg)';
    const itemStr = packageInfo.itemName ? `${packageInfo.itemName} [${weightStr}]` : `Paket Barang [${weightStr}]`;
    const recipientStr = packageInfo.recipientName
      ? `${packageInfo.recipientName} ${packageInfo.recipientPhone ? `(WA: ${packageInfo.recipientPhone})` : ''}`
      : 'Penerima di lokasi';
    const instructionsStr = packageInfo.specialNotes || notesText;
    const senderPhoneStr = packageInfo.senderPhone ? `(WA: ${packageInfo.senderPhone})` : phoneText;

    return `Halo Admin OTWJek, saya ingin memesan layanan:

🌸 *Tipe Layanan*: ${serviceLabel}
📦 *Detail & Berat Paket*: ${itemStr}
📍 *Titik Jemput (Pengirim)*: ${pickupAddress || 'Titik Jemput di Peta'}${pickupMapLink ? `\n🗺️ *Shareloc / Peta Pengirim*:\n${pickupMapLink}` : ''}
👤 *Pengirim*: ${nameText} ${senderPhoneStr}
🏁 *Titik Tujuan (Penerima)*: ${dropoffAddress || 'Titik Tujuan di Peta'}${dropoffMapLink ? `\n🗺️ *Peta Penerima*:\n${dropoffMapLink}` : ''}
👥 *Kontak Penerima*: ${recipientStr}
⚠️ *Instruksi Pengiriman*: ${instructionsStr}
📏 *Estimasi Jarak*: ${distanceKm} km
💵 *Estimasi Tarif*: ${formattedFare}
💳 *Metode Pembayaran*: ${paymentLabel}
🛵 *Kurir Pilihan*: ${selectedDriver}

Mohon konfirmasi mitra kurir perempuan yang tersedia. Terima kasih!`;
  }

  return `Halo Admin OTWJek, saya ingin memesan layanan:

🌸 *Tipe Layanan*: ${serviceLabel}
📍 *Titik Jemput*: ${pickupAddress || 'Titik Jemput di Peta'}${pickupMapLink ? `\n🗺️ *Shareloc / Peta Jemput Akurat*:\n${pickupMapLink}` : ''}
🏁 *Titik Tujuan*: ${dropoffAddress || 'Titik Tujuan di Peta'}${dropoffMapLink ? `\n🗺️ *Peta Tujuan*:\n${dropoffMapLink}` : ''}
📏 *Estimasi Jarak*: ${distanceKm} km
💵 *Estimasi Tarif*: ${formattedFare}
💳 *Metode Pembayaran*: ${paymentLabel}
👤 *Nama Pemesan*: ${nameText}${phoneText}
📦 *Catatan / Info*: ${notesText}
🛵 *Driver Pilihan*: ${selectedDriver}

Mohon konfirmasi driver perempuan yang tersedia. Terima kasih!`;
}

/**
 * Cleans phone number to international WhatsApp format (e.g. 0812... -> 62812...)
 */
export function sanitizeWhatsAppPhone(phone) {
  if (!phone) return '6281298765432';
  let cleaned = phone.toString().replace(/[^0-9]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  }
  return cleaned;
}

/**
 * Builds direct WhatsApp deep link URL
 */
export function buildWhatsAppLink(phone, messageText) {
  const cleanPhone = sanitizeWhatsAppPhone(phone);
  const encodedText = encodeURIComponent(messageText);
  return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;
}

/**
 * Reliably opens WhatsApp link across all browsers and devices without getting blocked
 * - On Mobile: navigates via window.location.href to invoke native WhatsApp app immediately
 * - On Desktop: attempts window.open with fallback to window.location.href if blocked
 */
export function openWhatsApp(url) {
  if (!url || typeof window === 'undefined') return;

  const isMobile =
    typeof navigator !== 'undefined' &&
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || '');

  if (isMobile) {
    window.location.href = url;
    return;
  }

  try {
    const newWin = window.open(url, '_blank', 'noopener,noreferrer');
    if (!newWin || newWin.closed || typeof newWin.closed === 'undefined') {
      window.location.href = url;
    }
  } catch (err) {
    window.location.href = url;
  }
}

/**
 * Formats WhatsApp message for OTWFood (Titip Beli / Ambil Pesanan Makanan di Resto & Warung)
 */
export function formatFoodOrderMessage({
  restaurantName = '',
  restaurantAddress = '',
  restaurantPhone = '',
  items = [],
  rawOrderNotes = '',
  customerName = '',
  customerPhone = '',
  deliveryAddress = '',
  deliveryNotes = '',
  foodEstimatePrice = 0,
  deliveryFee = 8000,
  platformFee = 1000,
  totalFare = 0,
  paymentMethod = 'cash'
}) {
  const paymentLabel = paymentMethod === 'qris' ? 'QRIS (Scan Barcode)' : 'Tunai / Cash saat tiba';

  let effectiveCustomerName = customerName && customerName.trim() && customerName !== 'Pelanggan OTWJek'
    ? customerName.trim()
    : '';
  let effectiveCustomerPhone = customerPhone && customerPhone.trim() ? customerPhone.trim() : '';

  try {
    const sessionUser = dbService?.session?.getCurrentUser();
    if (sessionUser) {
      if (!effectiveCustomerName) {
        effectiveCustomerName = sessionUser.fullName || sessionUser.full_name || sessionUser.name || '';
      }
      if (!effectiveCustomerPhone && sessionUser.phone) {
        effectiveCustomerPhone = sessionUser.phone;
      }
    }
  } catch (err) {
    // Ignore
  }

  const nameText = effectiveCustomerName || 'Pelanggan OTWJek';
  const phoneText = effectiveCustomerPhone ? ` (WA: ${effectiveCustomerPhone})` : '';

  let orderListStr = '';
  if (items && items.length > 0) {
    orderListStr = items
      .filter((it) => it.name && it.name.trim())
      .map((it, idx) => {
        const qtyStr = it.qty > 1 ? ` (x${it.qty})` : ' (1 porsi)';
        const priceStr = it.price ? ` [Estimasi: Rp ${Number(it.price).toLocaleString('id-ID')}]` : '';
        const noteStr = it.note ? `\n   ↳ Catatan: ${it.note}` : '';
        return `${idx + 1}. *${it.name.trim()}*${qtyStr}${priceStr}${noteStr}`;
      })
      .join('\n');
  }

  if (rawOrderNotes && rawOrderNotes.trim()) {
    orderListStr = orderListStr
      ? `${orderListStr}\n\n📝 *Catatan Tambahan Pesanan*:\n${rawOrderNotes.trim()}`
      : rawOrderNotes.trim();
  }

  if (!orderListStr) {
    orderListStr = 'Sesuai pesanan langsung di resto';
  }

  const formatRp = (num) => `Rp ${Number(num || 0).toLocaleString('id-ID')}`;

  return `Halo Admin OTWJek, saya ingin pesan layanan *Titip Beli Makanan (OTWFood)*:

🏪 *Lokasi Pembelian / Resto*:
- Nama Resto/Warung: *${restaurantName || 'Resto Pilihan'}*
- Alamat/Patokan: ${restaurantAddress || 'Lokasi terdekat'}
${restaurantPhone ? `- No. Kontak Resto: ${restaurantPhone}\n` : ''}
📋 *Rincian Pesanan Menu*:
${orderListStr}

📍 *Lokasi Pengantaran*:
- Alamat Antar: *${deliveryAddress || 'Alamat Pemesan'}*
${deliveryNotes ? `- Patokan/Unit: ${deliveryNotes}\n` : ''}- Nama Pemesan: *${nameText}*${phoneText}

💰 *Estimasi Biaya*:
- Estimasi Makanan (Ditalangi Kurir): ${formatRp(foodEstimatePrice)}
- Ongkir Antar Kurir: ${formatRp(deliveryFee)}
- Biaya Layanan Aplikasi: ${formatRp(platformFee)}
*Total Estimasi Pembayaran: ${formatRp(totalFare)}*

💳 *Metode Pembayaran*: ${paymentLabel}

Mohon dicarikan kurir untuk segera membelikan dan mengantar. Terima kasih!`;
}


