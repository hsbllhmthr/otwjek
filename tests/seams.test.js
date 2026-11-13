import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateFare, formatRupiah } from '../src/utils/fareCalculator.js';
import { formatBookingMessage, sanitizeWhatsAppPhone, buildWhatsAppLink } from '../src/utils/whatsappTemplate.js';
import { calculateHaversineDistance } from '../src/utils/geoUtils.js';

test('Seam 2: Fare Calculation Logic - OTWJek Motor & Mobil', () => {
  // Scenario 1: Short distance 1 - 4 km (e.g. 2.5 km)
  // Base fare: 15,000 + platform fee: 2,000 = 17,000
  const shortTrip = calculateFare({ serviceType: 'ride', vehicleType: 'motor', distanceKm: 2.5 });
  assert.equal(shortTrip.baseFare, 15000);
  assert.equal(shortTrip.distanceCost, 0);
  assert.equal(shortTrip.totalFare, 17000);

  // Scenario 2: Medium distance (6 km)
  // Base fare (first 4km): 15,000
  // Extra km: 2 km * 3,750 = 7,500
  // Subtotal: 22,500 + 2,000 = 24,500
  const mediumTrip = calculateFare({ serviceType: 'ride', vehicleType: 'motor', distanceKm: 6 });
  assert.equal(mediumTrip.extraKm, 2);
  assert.equal(mediumTrip.distanceCost, 7500);
  assert.equal(mediumTrip.totalFare, 24500);

  // Scenario 3: Mobil short distance 1 - 4 km (e.g. 3 km)
  // Base fare: 27,600 + platform fee: 2,000 = 29,600
  const carTrip = calculateFare({ serviceType: 'ride', vehicleType: 'mobil', distanceKm: 3 });
  assert.equal(carTrip.baseFare, 27600);
  assert.equal(carTrip.distanceCost, 0);
  assert.equal(carTrip.totalFare, 29600);
});

test('Seam 2: Fare Calculation Logic - OTWJek Paket with Weight', () => {
  // OTWJek Kirim Paket 5 km, medium weight (2-5 kg)
  // Base: 17,000 (first 4km) + extra 1 km * 4,250 = 4,250 + weight surcharge 2,000 + platform fee 2,000 = 25,250
  const packageTrip = calculateFare({
    serviceType: 'send',
    distanceKm: 5,
    weightCategory: 'medium'
  });
  assert.equal(packageTrip.baseFare, 17000);
  assert.equal(packageTrip.distanceCost, 4250);
  assert.equal(packageTrip.weightSurcharge, 2000);
  assert.equal(packageTrip.totalFare, 25250);
});

test('Seam 3: WhatsApp URL & Payload Formatter', () => {
  const message = formatBookingMessage({
    serviceType: 'ride',
    vehicleType: 'motor',
    pickupAddress: 'Grand Indonesia Lobby Barat',
    dropoffAddress: 'Stasiun Gambir',
    distanceKm: 3.5,
    formattedFare: 'Rp 17.000',
    customerName: 'Anisa Maharani',
    customerNotes: 'Tolong helm yang wangi',
    driverName: 'Siti Rahmawati',
    pickupCoords: { lat: -6.1930, lng: 106.8230 }
  });

  assert.ok(message.includes('🌸 *Tipe Layanan*: Antar Penumpang (OTWJek Motor)'));
  assert.ok(message.includes('📍 *Titik Jemput*: Grand Indonesia Lobby Barat'));
  assert.ok(message.includes('https://maps.google.com/?q=-6.193000,106.823000'));
  assert.ok(message.includes('💵 *Estimasi Tarif*: Rp 17.000'));
  assert.ok(message.includes('🛵 *Driver Pilihan*: Siti Rahmawati'));

  // Test phone sanitization
  assert.equal(sanitizeWhatsAppPhone('081298765432'), '6281298765432');
  assert.equal(sanitizeWhatsAppPhone('+62 812-9876-5432'), '6281298765432');

  // Test URL builder
  const url = buildWhatsAppLink('081298765432', message);
  assert.ok(url.startsWith('https://api.whatsapp.com/send?phone=6281298765432') || url.startsWith('https://wa.me/6281298765432'));
  assert.ok(url.includes(encodeURIComponent('Anisa Maharani')));
});

test('Seam 1: Distance calculation with coordinates', () => {
  // Monas (-6.1754, 106.8272) to Bundaran HI (-6.1930, 106.8230)
  const dist = calculateHaversineDistance(-6.1754, 106.8272, -6.1930, 106.8230);
  assert.ok(dist > 1.5 && dist < 4.0, `Expected distance between 1.5 and 4.0 km, got ${dist}`);
});

test('Seam 4: OTWJek Kirim Paket Booking Message Formatter', () => {
  const message = formatBookingMessage({
    serviceType: 'send',
    vehicleType: 'motor',
    pickupAddress: 'Indo Mode Tamalate',
    dropoffAddress: 'Jalan Andi Tonro',
    distanceKm: 4.2,
    formattedFare: 'Rp 21.700',
    customerName: 'Kak Dian',
    customerNotes: 'Kue basah, jangan dimiringkan',
    packageInfo: {
      itemName: 'Kue Lapis & Brownies',
      weightTier: 'medium',
      senderPhone: '081234567890',
      recipientName: 'Ibu Ratna',
      recipientPhone: '085298765432',
      specialNotes: 'Titip di meja resepsionis lantai 1'
    }
  });

  assert.ok(message.includes('Antar Paket (OTWJek Kirim)'));
  assert.ok(message.includes('Kue Lapis & Brownies [Sedang (2 - 5 kg)]'));
  assert.ok(message.includes('Ibu Ratna (WA: 085298765432)'));
  assert.ok(message.includes('Titip di meja resepsionis lantai 1'));
});

import dbService, { normalizePhone, formatStandardPhone } from '../src/services/dbService.js';
import { getPortalFromLocation, getPortalMeta } from '../src/utils/pwaPortal.js';
import { readFileSync } from 'node:fs';

test('Seam 5: Phone Number Normalization and Standard Formatting', () => {
  // Test berbagai variasi input nomor telepon Indonesia
  assert.equal(normalizePhone('081234567890'), '81234567890');
  assert.equal(normalizePhone('+6281234567890'), '81234567890');
  assert.equal(normalizePhone('+62 812-3456-7890'), '81234567890');
  assert.equal(normalizePhone('+62081234567890'), '81234567890');
  assert.equal(normalizePhone('812 3456 7890'), '81234567890');
  assert.equal(normalizePhone('0812-3456-7890'), '81234567890');

  // Test format standar (+62)
  assert.equal(formatStandardPhone('081234567890'), '+6281234567890');
  assert.equal(formatStandardPhone('+62081234567890'), '+6281234567890');
  assert.equal(formatStandardPhone('81234567890'), '+6281234567890');
});

test('Seam 6: Driver Istirahat/Offline Guards Admin Assignment', () => {
  const store = new Map();
  const prevStorage = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear()
  };

  try {
    const reg = dbService.drivers.registerDriver(
      { fullName: 'Siti Driver', phone: '081200001111' },
      { vehicleType: 'motor', vehicleModel: 'Honda Beat', plateNumber: 'DD 1234 AB' }
    );
    const driverId = reg.driver.id;

    const booking = dbService.bookings.create({
      customerName: 'Pelanggan Uji',
      customerPhone: '081299998888',
      serviceType: 'motor',
      pickupName: 'Mall Panakkukang',
      dropoffName: 'Pantai Losari',
      fareAmount: 17000
    });

    // 1. Driver pending tidak boleh bisa di-set online atau ditugaskan
    const whilePending = dbService.drivers.setOnlineStatus(driverId, true);
    assert.equal(whilePending.is_online, false);
    assert.equal(dbService.bookings.assignDriver(booking.id, whilePending, 'Admin'), null);

    // 2. Setelah disetujui admin namun masih istirahat (is_online: false), penugasan tetap ditolak
    dbService.drivers.approveDriver(driverId, 'Admin');
    const restingDriver = dbService.drivers.setOnlineStatus(driverId, false);
    assert.equal(restingDriver.is_online, false);
    assert.equal(dbService.bookings.assignDriver(booking.id, restingDriver, 'Admin'), null);

    // 3. Meski objek driver stale (is_online: true) dikirim ke assignDriver, storage terbaru (is_online: false) tetap menolak
    const staleDriverPayload = { ...restingDriver, is_online: true };
    assert.equal(dbService.bookings.assignDriver(booking.id, staleDriverPayload, 'Admin'), null);

    // 4. Ketika driver mengaktifkan status Siap Terima Order (is_online: true), penugasan berhasil
    const activeDriver = dbService.drivers.setOnlineStatus(driverId, true);
    assert.equal(activeDriver.is_online, true);
    const assignedBooking = dbService.bookings.assignDriver(booking.id, activeDriver, 'Admin');
    assert.ok(assignedBooking);
    assert.equal(assignedBooking.assignment_status, 'assigned');
    assert.equal(assignedBooking.driver_id, driverId);
  } finally {
    if (prevStorage === undefined) {
      delete globalThis.localStorage;
    } else {
      globalThis.localStorage = prevStorage;
    }
  }
});

test('Seam 7: Separate PWA Mini-App Metadata & Manifests for Customer, Driver, and Admin', () => {
  assert.equal(getPortalFromLocation('/', ''), 'customer');
  assert.equal(getPortalFromLocation('/driver', ''), 'driver');
  assert.equal(getPortalFromLocation('/driver/', ''), 'driver');
  assert.equal(getPortalFromLocation('/admin', ''), 'admin');
  assert.equal(getPortalFromLocation('/admin/', ''), 'admin');

  const custMeta = getPortalMeta('customer');
  const drvMeta = getPortalMeta('driver');
  const admMeta = getPortalMeta('admin');
  assert.notEqual(custMeta.manifestHref, drvMeta.manifestHref);
  assert.notEqual(drvMeta.manifestHref, admMeta.manifestHref);

  const custManifest = JSON.parse(readFileSync(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8'));
  const drvManifest = JSON.parse(readFileSync(new URL('../public/manifest-driver.webmanifest', import.meta.url), 'utf8'));
  const admManifest = JSON.parse(readFileSync(new URL('../public/manifest-admin.webmanifest', import.meta.url), 'utf8'));

  assert.equal(custManifest.id, '/');
  assert.equal(custManifest.start_url, '/');
  assert.equal(custManifest.scope, '/');

  assert.equal(drvManifest.id, '/driver');
  assert.equal(drvManifest.start_url, '/driver');
  assert.equal(drvManifest.scope, '/driver');

  assert.equal(admManifest.id, '/admin');
  assert.equal(admManifest.start_url, '/admin');
  assert.equal(admManifest.scope, '/admin');

  assert.equal(new Set([custManifest.id, drvManifest.id, admManifest.id]).size, 3);
  assert.equal(new Set([custManifest.short_name, drvManifest.short_name, admManifest.short_name]).size, 3);
});


