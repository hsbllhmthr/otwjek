import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FLAT_PLATFORM_FEE,
  calculateDriverEarnings,
  calculateFare,
  formatRupiah,
  resolveBookingFeeBreakdown
} from '../src/utils/fareCalculator.js';
import {
  formatBookingMessage,
  sanitizeWhatsAppPhone,
  buildWhatsAppLink,
  openWhatsApp
} from '../src/utils/whatsappTemplate.js';
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
import {
  mergeCloudCollection,
  applyRealtimeRecordChange
} from '../src/services/supabaseSync.js';
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

test('Seam 8: Unified Flat Rp 2.000 Fee for Customer & Driver (Motor, Mobil, Paket)', () => {
  assert.equal(FLAT_PLATFORM_FEE, 2000);

  // Contoh transaksi Rp 27.500 -> tarif bersih Rp 25.500 + biaya aplikasi flat Rp 2.000
  const earnings = calculateDriverEarnings(27500, false);
  assert.equal(earnings.grossFare, 27500);
  assert.equal(earnings.platformFee, 2000);
  assert.equal(earnings.netEarnings, 25500);

  const cancelledEarnings = calculateDriverEarnings(27500, true);
  assert.equal(cancelledEarnings.platformFee, 0);
  assert.equal(cancelledEarnings.netEarnings, 0);

  const store = new Map();
  const prevStorage = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear()
  };

  try {
    const motorOrder = dbService.bookings.create({
      customerName: 'Pelanggan Motor',
      serviceType: 'motor',
      fareAmount: 17000
    });
    const mobilOrder = dbService.bookings.create({
      customerName: 'Pelanggan Mobil',
      serviceType: 'mobil',
      fareAmount: 29600
    });
    const paketOrder = dbService.bookings.create({
      customerName: 'Pelanggan Paket',
      serviceType: 'paket',
      fareAmount: 27500
    });

    assert.equal(motorOrder.platform_fee, 2000);
    assert.equal(motorOrder.delivery_fee, 15000);
    assert.equal(motorOrder.total_earnings, 15000);

    assert.equal(mobilOrder.platform_fee, 2000);
    assert.equal(mobilOrder.delivery_fee, 27600);
    assert.equal(mobilOrder.total_earnings, 27600);

    assert.equal(paketOrder.platform_fee, 2000);
    assert.equal(paketOrder.delivery_fee, 25500);
    assert.equal(paketOrder.total_earnings, 25500);

    // Migrasi/normalisasi booking lama yang masih memakai potongan 15% (Rp 23.400)
    const legacyBooking = {
      id: 'legacy-15-pct-order',
      assignment_status: 'unassigned',
      service_type: 'paket',
      fare_amount: 27500,
      delivery_fee: 23400,
      total_earnings: 23400,
      booking_status: 'completed'
    };
    const resolvedLegacy = resolveBookingFeeBreakdown(legacyBooking);
    assert.equal(resolvedLegacy.customerTripFare, 25500);
    assert.equal(resolvedLegacy.customerPlatformFee, 2000);
    assert.equal(resolvedLegacy.driverPlatformFee, 2000);
    assert.equal(resolvedLegacy.totalEarnings, 25500);
    assert.equal(formatRupiah(resolvedLegacy.driverPlatformFee), 'Rp 2.000');

    // Saat dibatalkan, potongan dan pendapatan driver menjadi 0
    const cancelledBooking = dbService.bookings.updateBookingStatus(
      paketOrder.id,
      'cancelled',
      'Dibatalkan'
    );
    assert.equal(cancelledBooking.platform_fee, 0);
    assert.equal(cancelledBooking.delivery_fee, 0);
    assert.equal(cancelledBooking.total_earnings, 0);

    // Normalisasi getAllAdmin terhadap record lama di localStorage
    store.set('otwjek_db_ride_bookings', JSON.stringify([legacyBooking]));
    const normalizedList = dbService.bookings.getAllAdmin();
    assert.equal(normalizedList.length, 1);
    assert.equal(normalizedList[0].platform_fee, 2000);
    assert.equal(normalizedList[0].delivery_fee, 25500);
    assert.equal(normalizedList[0].total_earnings, 25500);
  } finally {
    if (prevStorage === undefined) {
      delete globalThis.localStorage;
    } else {
      globalThis.localStorage = prevStorage;
    }
  }
});

test('Seam 9: Booking Lifecycle Starts In Progress, Supports Cancellation & Completion', () => {
  const store = new Map();
  const prevStorage = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear()
  };

  try {
    const booking = dbService.bookings.create({
      customerName: 'Aulia',
      customerPhone: '081211112222',
      serviceType: 'mobil',
      pickup: { name: 'Mall Ratu Indah', address: 'Jl. Ratulangi', lat: -5.154, lng: 119.414 },
      dropoff: { name: 'Bandara Sultan Hasanuddin', address: 'Maros', lat: -5.061, lng: 119.554 },
      fareAmount: 56800,
      selectedAdminId: 'admin-1',
      selectedAdminName: 'Admin 1',
      selectedAdminPhone: '62882021942470',
      waDispatchedAt: '2026-11-18T10:05:00.000Z'
    });

    assert.equal(booking.booking_status, 'in_progress');
    assert.equal(booking.assignment_status, 'unassigned');
    assert.equal(booking.driver_step, null);
    assert.equal(booking.timeline.completed, '--:--');
    assert.equal(booking.pickup_lat, -5.154);
    assert.equal(booking.dropoff_lng, 119.554);
    assert.equal(booking.selected_admin_name, 'Admin 1');
    assert.equal(booking.platform_fee, 2000);
    assert.equal(booking.total_earnings, 54800);

    // Cancel flow marks booking as cancelled and zeroes driver earnings
    const cancelled = dbService.bookings.updateBookingStatus(
      booking.id,
      'cancelled',
      'Dibatalkan oleh Pelanggan'
    );
    assert.equal(cancelled.booking_status, 'cancelled');
    assert.equal(cancelled.driver_step, 'cancelled');
    assert.equal(cancelled.total_earnings, 0);
  } finally {
    if (prevStorage === undefined) {
      delete globalThis.localStorage;
    } else {
      globalThis.localStorage = prevStorage;
    }
  }
});

test('Seam 10: openWhatsApp Opens New Tab Without Navigating Original Page Away', () => {
  const prevWindowDesc = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const prevNavDesc = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const prevDocDesc = Object.getOwnPropertyDescriptor(globalThis, 'document');

  const restoreGlobals = () => {
    if (prevWindowDesc) Object.defineProperty(globalThis, 'window', prevWindowDesc);
    else delete globalThis.window;
    if (prevNavDesc) Object.defineProperty(globalThis, 'navigator', prevNavDesc);
    else delete globalThis.navigator;
    if (prevDocDesc) Object.defineProperty(globalThis, 'document', prevDocDesc);
    else delete globalThis.document;
  };

  try {
    const waUrl = 'https://api.whatsapp.com/send?phone=62882021942470&text=Test';

    // 1. Desktop & Mobile UA must both open _blank without noopener feature quirk
    //    and MUST NOT mutate window.location.href
    const openCalls = [];
    const openedPopup = { closed: false, opener: { mock: true } };
    const locationMock = { href: 'http://localhost:5173/' };

    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      writable: true,
      value: {
        location: locationMock,
        open: (url, target, features) => {
          openCalls.push({ url, target, features });
          return openedPopup;
        }
      }
    });
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      writable: true,
      value: { userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120.0' }
    });

    const openedOnMobile = openWhatsApp(waUrl);
    assert.equal(openedOnMobile, true);
    assert.equal(openCalls.length, 1);
    assert.equal(openCalls[0].target, '_blank');
    assert.equal(openCalls[0].features, undefined);
    assert.equal(openedPopup.opener, null);
    assert.equal(locationMock.href, 'http://localhost:5173/');

    // 2. When window.open is blocked (returns null), fallback uses target=_blank anchor
    //    and STILL never redirects the original window.location.href
    const anchorEvents = [];
    const createdAnchors = [];
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      writable: true,
      value: {
        location: locationMock,
        open: () => null
      }
    });
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      writable: true,
      value: {
        body: {
          appendChild: (el) => anchorEvents.push(['append', el]),
          removeChild: (el) => anchorEvents.push(['remove', el])
        },
        createElement: () => {
          const el = {
            style: {},
            click: () => anchorEvents.push(['click', el.href, el.target, el.rel])
          };
          createdAnchors.push(el);
          return el;
        }
      }
    });

    const openedFallback = openWhatsApp(waUrl);
    assert.equal(openedFallback, true);
    assert.equal(createdAnchors.length, 1);
    assert.equal(createdAnchors[0].target, '_blank');
    assert.equal(createdAnchors[0].rel, 'noopener noreferrer');
    assert.equal(anchorEvents[1][0], 'click');
    assert.equal(locationMock.href, 'http://localhost:5173/');
  } finally {
    restoreGlobals();
  }
});

test('Seam 11: Cancelled or Completed Orders Cannot Be Assigned to a Driver', () => {
  const store = new Map();
  const prevStorage = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear()
  };

  try {
    const reg1 = dbService.drivers.registerDriver(
      { fullName: 'Rina Driver', phone: '081211110001' },
      { vehicleType: 'motor', vehicleModel: 'Honda Scoopy', plateNumber: 'DD 1001 AA' }
    );
    const reg2 = dbService.drivers.registerDriver(
      { fullName: 'Maya Driver', phone: '081211110002' },
      { vehicleType: 'motor', vehicleModel: 'Yamaha Fazzio', plateNumber: 'DD 1002 BB' }
    );
    dbService.drivers.approveDriver(reg1.driver.id, 'Admin');
    dbService.drivers.approveDriver(reg2.driver.id, 'Admin');
    const drv1 = dbService.drivers.setOnlineStatus(reg1.driver.id, true);
    const drv2 = dbService.drivers.setOnlineStatus(reg2.driver.id, true);

    // 1. Pesanan belum ditugaskan lalu dibatalkan pelanggan -> assignDriver harus ditolak (null)
    const booking1 = dbService.bookings.create({
      customerName: 'Pelanggan Batal',
      customerPhone: '081339581121',
      serviceType: 'motor',
      pickupName: "Jene'tallasa",
      dropoffName: 'Jalan Andi Tonro',
      fareAmount: 17000
    });
    const cancelled1 = dbService.bookings.updateBookingStatus(
      booking1.id,
      'cancelled',
      'Dibatalkan oleh Pelanggan'
    );
    assert.equal(cancelled1.booking_status, 'cancelled');
    assert.equal(cancelled1.driver_step, 'cancelled');

    const assignCancelledResult = dbService.bookings.assignDriver(booking1.id, drv1, 'Admin');
    assert.equal(assignCancelledResult, null);

    const freshBooking1 = dbService.bookings.getAllAdmin().find((b) => b.id === booking1.id);
    assert.equal(freshBooking1.assignment_status, 'unassigned');
    assert.equal(freshBooking1.booking_status, 'cancelled');
    assert.equal(freshBooking1.driver_id, null);
    assert.equal(Number(dbService.drivers.getDriverById(drv1.id).tripsCount || 0), 0);

    // 2. Pesanan sempat ditugaskan lalu dibatalkan -> tidak boleh ditugaskan ulang ke driver lain
    const booking2 = dbService.bookings.create({
      customerName: 'Pelanggan Batal 2',
      customerPhone: '081339581122',
      serviceType: 'motor',
      pickupName: 'Unhas Tamalanrea',
      dropoffName: 'UNM Parangtambung',
      fareAmount: 56800
    });
    const assigned2 = dbService.bookings.assignDriver(booking2.id, drv1, 'Admin');
    assert.equal(assigned2.assignment_status, 'assigned');
    const cancelled2 = dbService.bookings.updateBookingStatus(
      booking2.id,
      'cancelled',
      'Dibatalkan oleh Admin'
    );
    assert.equal(cancelled2.booking_status, 'cancelled');

    const reassignCancelledResult = dbService.bookings.assignDriver(booking2.id, drv2, 'Admin');
    assert.equal(reassignCancelledResult, null);
    const freshBooking2 = dbService.bookings.getAllAdmin().find((b) => b.id === booking2.id);
    assert.equal(freshBooking2.driver_id, drv1.id);
    assert.equal(freshBooking2.booking_status, 'cancelled');
    assert.equal(Number(dbService.drivers.getDriverById(drv2.id).tripsCount || 0), 0);

    // 3. Pesanan selesai juga tidak dapat ditugaskan ulang
    const booking3 = dbService.bookings.create({
      customerName: 'Pelanggan Selesai',
      customerPhone: '081339581123',
      serviceType: 'motor',
      pickupName: 'Sipodeceng',
      dropoffName: 'Indo Mode Tamalate',
      fareAmount: 30000
    });
    dbService.bookings.updateBookingStatus(booking3.id, 'completed', 'Diselesaikan oleh Admin');
    assert.equal(dbService.bookings.assignDriver(booking3.id, drv2, 'Admin'), null);
  } finally {
    if (prevStorage === undefined) {
      delete globalThis.localStorage;
    } else {
      globalThis.localStorage = prevStorage;
    }
  }
});

test('Seam 12: Supabase Cloud Merge & Realtime Updates Preserve In-Flight Writes', () => {
  // 1. Snapshot cloud awal digabung dengan pesanan baru lokal yang masih proses upsert
  const pendingUpserts = new Map([
    [
      'b-local-new',
      {
        ts: 2000,
        item: {
          id: 'b-local-new',
          order_code: '#LOC1',
          booking_status: 'in_progress',
          assignment_status: 'unassigned',
          created_at: '2026-11-18T14:30:00.000Z'
        }
      }
    ]
  ]);
  const pendingDeletes = new Map([['b-deleted', 2000]]);

  const cloudRows = [
    {
      id: 'b-cloud-old',
      created_at: '2026-11-18T14:00:00.000Z',
      updated_at: '2026-11-18T14:00:00.000Z',
      payload: {
        id: 'b-cloud-old',
        order_code: '#CLD1',
        booking_status: 'in_progress',
        assignment_status: 'unassigned',
        created_at: '2026-11-18T14:00:00.000Z'
      }
    },
    {
      id: 'b-deleted',
      created_at: '2026-11-18T13:00:00.000Z',
      updated_at: '2026-11-18T13:00:00.000Z',
      payload: { id: 'b-deleted', order_code: '#DEL1' }
    }
  ];

  const merged = mergeCloudCollection({
    domain: 'bookings',
    cloudItems: cloudRows,
    pendingUpsertsMap: pendingUpserts,
    pendingDeletesMap: pendingDeletes
  });

  assert.equal(merged.length, 2);
  assert.equal(merged[0].id, 'b-local-new');
  assert.equal(merged[1].id, 'b-cloud-old');

  // 2. Event Realtime INSERT dari pelanggan lain langsung masuk paling atas untuk Admin
  const afterRemoteInsert = applyRealtimeRecordChange({
    domain: 'bookings',
    eventType: 'INSERT',
    newRow: {
      id: 'b-remote-cust',
      created_at: '2026-11-18T14:35:00.000Z',
      updated_at: '2026-11-18T14:35:00.000Z',
      payload: {
        id: 'b-remote-cust',
        order_code: '#RMT9',
        booking_status: 'in_progress',
        assignment_status: 'unassigned',
        created_at: '2026-11-18T14:35:00.000Z'
      }
    },
    currentLocalItems: merged
  });

  assert.ok(Array.isArray(afterRemoteInsert));
  assert.equal(afterRemoteInsert.length, 3);
  assert.equal(afterRemoteInsert[0].id, 'b-remote-cust');

  // 3. Stale UPDATE terhadap record lokal yang sedang in-flight lebih baru harus diabaikan
  const staleEchoIgnored = applyRealtimeRecordChange({
    domain: 'bookings',
    eventType: 'UPDATE',
    newRow: {
      id: 'b-local-new',
      created_at: '2026-11-18T14:30:00.000Z',
      updated_at: new Date(1000).toISOString(),
      payload: {
        id: 'b-local-new',
        order_code: '#STALE',
        created_at: '2026-11-18T14:30:00.000Z'
      }
    },
    currentLocalItems: afterRemoteInsert,
    pendingUpsertsMap: pendingUpserts
  });
  assert.equal(staleEchoIgnored, null);

  // 4. Event Realtime DELETE menghapus item secara sinkron
  const afterDelete = applyRealtimeRecordChange({
    domain: 'bookings',
    eventType: 'DELETE',
    oldRow: { id: 'b-cloud-old' },
    currentLocalItems: afterRemoteInsert
  });
  assert.equal(afterDelete.length, 2);
  assert.equal(afterDelete.some((b) => b.id === 'b-cloud-old'), false);

  // 5. Mode lokal di environment tanpa env Supabase melaporkan status disabled
  assert.equal(dbService.cloud.isConfigured(), false);
  assert.equal(dbService.cloud.getStatus().status, 'disabled');
});



