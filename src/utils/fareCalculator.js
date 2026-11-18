/**
 * Fare Calculation Engine (Pure Function for Seam 2)
 * Predictable, transparent pricing for SheRide and SheSend
 */

export const PRICING_CONFIG = {
  platformFee: 2000, // Biaya layanan & aplikasi Rp 2.000 flat per transaksi (motor, mobil, paket)
  rideMotor: {
    baseFare: 15000,
    baseKm: 4,
    perKmRate: 3750
  },
  rideMobil: {
    baseFare: 27600,
    baseKm: 4,
    perKmRate: 6900
  },
  send: {
    baseFare: 17000,
    baseKm: 4,
    perKmRate: 4250,
    weightTiers: {
      'light': 0,      // < 2 kg
      'medium': 2000,  // 2 - 5 kg
      'heavy': 5000    // 5 - 10 kg
    }
  }
};

export const FLAT_PLATFORM_FEE = PRICING_CONFIG.platformFee;

/**
 * Calculates driver earnings and flat application fee per transaction (motor, mobil, paket).
 * Every non-cancelled transaction allocates a flat Rp 2.000 fee to the application.
 * @param {number} fareAmount
 * @param {boolean} [isCancelled=false]
 * @returns {{ grossFare: number, platformFee: number, netEarnings: number }}
 */
export function calculateDriverEarnings(fareAmount, isCancelled = false) {
  const grossFare = Math.max(0, Number(fareAmount || 0));
  if (isCancelled || grossFare <= 0) {
    return {
      grossFare,
      platformFee: 0,
      netEarnings: 0
    };
  }

  const platformFee = Math.min(grossFare, FLAT_PLATFORM_FEE);
  const netEarnings = Math.max(0, grossFare - platformFee);

  return {
    grossFare,
    platformFee,
    netEarnings
  };
}

/**
 * Resolves unified flat Rp 2.000 fee breakdown for both customer receipt and driver earnings
 * from a stored or formatted booking object (safe against stale 15% records).
 * @param {Object} booking
 */
export function resolveBookingFeeBreakdown(booking) {
  const fare = Number(booking?.fare_amount || booking?.price || 15000);
  const isCancelled =
    booking?.booking_status === 'cancelled' ||
    booking?.status === 'cancelled' ||
    booking?.driver_step === 'cancelled';
  const { platformFee: calcFee, netEarnings: calcNet } = calculateDriverEarnings(
    fare,
    isCancelled
  );
  const hasMatchingFlatFee = Number(booking?.platform_fee) === calcFee;

  const totalEarnings = isCancelled
    ? 0
    : hasMatchingFlatFee &&
      booking?.total_earnings !== undefined &&
      booking?.total_earnings !== null
    ? Number(booking.total_earnings)
    : calcNet;
  const deliveryFee = isCancelled
    ? 0
    : hasMatchingFlatFee &&
      booking?.delivery_fee !== undefined &&
      booking?.delivery_fee !== null
    ? Number(booking.delivery_fee)
    : totalEarnings;
  const driverPlatformFee = isCancelled ? 0 : calcFee;
  const customerTripFare = Math.max(0, fare - FLAT_PLATFORM_FEE);

  return {
    fare,
    isCancelled,
    deliveryFee,
    totalEarnings,
    driverPlatformFee,
    customerPlatformFee: FLAT_PLATFORM_FEE,
    customerTripFare
  };
}

/**
 * Calculates fare based on service type, distance, and options
 * @param {Object} params
 * @param {'ride'|'send'} params.serviceType
 * @param {'motor'|'mobil'} [params.vehicleType='motor']
 * @param {'light'|'medium'|'heavy'} [params.weightCategory='light']
 * @param {number} params.distanceKm
 * @returns {Object} breakdown of fares
 */
export function calculateFare({
  serviceType = 'ride',
  vehicleType = 'motor',
  weightCategory = 'light',
  distanceKm = 1
}) {
  const dist = Math.max(0.1, Number(distanceKm) || 1);
  let baseFare = 0;
  let baseKm = 4;
  let perKmRate = 0;
  let weightSurcharge = 0;

  if (serviceType === 'ride') {
    if (vehicleType === 'mobil') {
      baseFare = PRICING_CONFIG.rideMobil.baseFare;
      baseKm = PRICING_CONFIG.rideMobil.baseKm;
      perKmRate = PRICING_CONFIG.rideMobil.perKmRate;
    } else {
      baseFare = PRICING_CONFIG.rideMotor.baseFare;
      baseKm = PRICING_CONFIG.rideMotor.baseKm;
      perKmRate = PRICING_CONFIG.rideMotor.perKmRate;
    }
  } else {
    // SheSend (Antar Barang / Paket)
    if (vehicleType === 'mobil') {
      baseFare = PRICING_CONFIG.rideMobil.baseFare;
      baseKm = PRICING_CONFIG.rideMobil.baseKm;
      perKmRate = PRICING_CONFIG.rideMobil.perKmRate;
    } else {
      baseFare = PRICING_CONFIG.send.baseFare;
      baseKm = PRICING_CONFIG.send.baseKm;
      perKmRate = PRICING_CONFIG.send.perKmRate;
    }
    weightSurcharge = PRICING_CONFIG.send.weightTiers[weightCategory] || 0;
  }

  // Distance beyond base km (jarak tambahan di atas 4 km)
  const extraKm = Math.max(0, dist - baseKm);
  const distanceCost = Math.round(extraKm * perKmRate);
  
  // Total calculation
  const subtotal = baseFare + distanceCost + weightSurcharge;
  const platformFee = PRICING_CONFIG.platformFee;
  const totalFare = subtotal + platformFee;

  return {
    baseFare,
    baseKm,
    distanceKm: dist,
    extraKm: Math.round(extraKm * 10) / 10,
    distanceCost,
    weightSurcharge,
    platformFee,
    subtotal,
    totalFare,
    formattedTotal: formatRupiah(totalFare)
  };
}

/**
 * Formats a number to Indonesian Rupiah (e.g. 24000 -> Rp 24.000)
 * @param {number} amount 
 * @returns {string}
 */
export function formatRupiah(amount) {
  return 'Rp ' + Number(amount || 0).toLocaleString('id-ID');
}
