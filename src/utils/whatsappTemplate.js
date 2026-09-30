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
  customerNotes = '',
  driverName = '',
  packageDetails = '',
  packageInfo = null,
  paymentMethod = 'cash'
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
  const nameText = customerName && customerName.trim().length > 0 ? customerName : 'Pelanggan OTWJek';

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

    return `Halo Admin OTWJek, saya ingin memesan layanan:

🌸 *Tipe Layanan*: ${serviceLabel}
📦 *Detail & Berat Paket*: ${itemStr}
📍 *Titik Jemput (Pengirim)*: ${pickupAddress || 'Titik Jemput di Peta'}
👤 *Pengirim*: ${nameText} ${packageInfo.senderPhone ? `(WA: ${packageInfo.senderPhone})` : ''}
🏁 *Titik Tujuan (Penerima)*: ${dropoffAddress || 'Titik Tujuan di Peta'}
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
📍 *Titik Jemput*: ${pickupAddress || 'Titik Jemput di Peta'}
🏁 *Titik Tujuan*: ${dropoffAddress || 'Titik Tujuan di Peta'}
📏 *Estimasi Jarak*: ${distanceKm} km
💵 *Estimasi Tarif*: ${formattedFare}
💳 *Metode Pembayaran*: ${paymentLabel}
👤 *Nama Pemesan*: ${nameText}
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
  return `https://wa.me/${cleanPhone}?text=${encodedText}`;
}
