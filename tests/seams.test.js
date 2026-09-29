import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateFare, formatRupiah } from '../src/utils/fareCalculator.js';
import { formatBookingMessage, sanitizeWhatsAppPhone, buildWhatsAppLink } from '../src/utils/whatsappTemplate.js';
import { calculateHaversineDistance } from '../src/utils/geoUtils.js';

test('Seam 2: Fare Calculation Logic - SheRide Motor', () => {
  // Scenario 1: Short distance < 2km (e.g. 1.5 km)
  // Base fare: 10,000 + platform fee: 2,000 = 12,000
  const shortTrip = calculateFare({ serviceType: 'ride', vehicleType: 'motor', distanceKm: 1.5 });
  assert.equal(shortTrip.baseFare, 10000);
  assert.equal(shortTrip.distanceCost, 0);
  assert.equal(shortTrip.totalFare, 12000);

  // Scenario 2: Medium distance (6 km)
  // Base fare (first 2km): 10,000
  // Extra km: 4 km * 3,000 = 12,000
  // Subtotal: 22,000 + 2,000 = 24,000
  const mediumTrip = calculateFare({ serviceType: 'ride', vehicleType: 'motor', distanceKm: 6 });
  assert.equal(mediumTrip.extraKm, 4);
  assert.equal(mediumTrip.distanceCost, 12000);
  assert.equal(mediumTrip.totalFare, 24000);

  // Scenario 3: Long distance > 15km (17 km)
  // Extra: 15 km * 3,000 = 45,000
  // Subtotal: 55,000 + 2,000 = 57,000
  const longTrip = calculateFare({ serviceType: 'ride', vehicleType: 'motor', distanceKm: 17 });
  assert.equal(longTrip.distanceCost, 45000);
  assert.equal(longTrip.totalFare, 57000);
});

test('Seam 2: Fare Calculation Logic - SheSend Package with Weight', () => {
  // SheSend 5 km, medium weight (2-5 kg)
  // Base: 12,000 (first 2km) + extra 3 km * 3,500 = 10,500 + weight surcharge 2,000 + platform fee 2,000 = 26,500
  const packageTrip = calculateFare({
    serviceType: 'send',
    distanceKm: 5,
    weightCategory: 'medium'
  });
  assert.equal(packageTrip.baseFare, 12000);
  assert.equal(packageTrip.distanceCost, 10500);
  assert.equal(packageTrip.weightSurcharge, 2000);
  assert.equal(packageTrip.totalFare, 26500);
});

test('Seam 3: WhatsApp URL & Payload Formatter', () => {
  const message = formatBookingMessage({
    serviceType: 'ride',
    vehicleType: 'motor',
    pickupAddress: 'Grand Indonesia Lobby Barat',
    dropoffAddress: 'Stasiun Gambir',
    distanceKm: 3.5,
    formattedFare: 'Rp 16.500',
    customerName: 'Anisa Maharani',
    customerNotes: 'Tolong helm yang wangi',
    driverName: 'Siti Rahmawati'
  });

  assert.ok(message.includes('🌸 *Tipe Layanan*: Antar Penumpang (SheRide Motor)'));
  assert.ok(message.includes('📍 *Titik Jemput*: Grand Indonesia Lobby Barat'));
  assert.ok(message.includes('💵 *Estimasi Tarif*: Rp 16.500'));
  assert.ok(message.includes('🛵 *Driver Pilihan*: Siti Rahmawati'));

  // Test phone sanitization
  assert.equal(sanitizeWhatsAppPhone('081298765432'), '6281298765432');
  assert.equal(sanitizeWhatsAppPhone('+62 812-9876-5432'), '6281298765432');

  // Test URL builder
  const url = buildWhatsAppLink('081298765432', message);
  assert.ok(url.startsWith('https://wa.me/6281298765432?text='));
  assert.ok(url.includes(encodeURIComponent('Anisa Maharani')));
});

test('Seam 1: Distance calculation with coordinates', () => {
  // Monas (-6.1754, 106.8272) to Bundaran HI (-6.1930, 106.8230)
  const dist = calculateHaversineDistance(-6.1754, 106.8272, -6.1930, 106.8230);
  assert.ok(dist > 1.5 && dist < 4.0, `Expected distance between 1.5 and 4.0 km, got ${dist}`);
});

test('Seam 4: SheSend Package Booking Message Formatter', () => {
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

  assert.ok(message.includes('Antar Paket (SheSend)'));
  assert.ok(message.includes('Kue Lapis & Brownies [Sedang (2 - 5 kg)]'));
  assert.ok(message.includes('Ibu Ratna (WA: 085298765432)'));
  assert.ok(message.includes('Titip di meja resepsionis lantai 1'));
});

