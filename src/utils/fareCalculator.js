/**
 * Fare Calculation Engine (Pure Function for Seam 2)
 * Predictable, transparent pricing for SheRide and SheSend
 */

export const PRICING_CONFIG = {
  platformFee: 2000, // Sisterhood Safety & Admin Maintenance Fee
  rideMotor: {
    baseFare: 10000,
    baseKm: 2,
    perKmRate: 3000
  },
  rideMobil: {
    baseFare: 18000,
    baseKm: 2,
    perKmRate: 5500
  },
  send: {
    baseFare: 12000,
    baseKm: 2,
    perKmRate: 3500,
    weightTiers: {
      'light': 0,      // < 2 kg
      'medium': 2000,  // 2 - 5 kg
      'heavy': 5000    // 5 - 10 kg
    }
  }
};

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
  let baseKm = 2;
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
    // SheSend
    baseFare = PRICING_CONFIG.send.baseFare;
    baseKm = PRICING_CONFIG.send.baseKm;
    perKmRate = PRICING_CONFIG.send.perKmRate;
    weightSurcharge = PRICING_CONFIG.send.weightTiers[weightCategory] || 0;
  }

  // Distance beyond base km
  const extraKm = Math.max(0, dist - baseKm);
  const distanceCost = Math.round(extraKm * perKmRate);
  
  // Total calculation
  const subtotal = baseFare + distanceCost + weightSurcharge;
  const platformFee = PRICING_CONFIG.platformFee;
  const totalFare = subtotal + platformFee;

  return {
    baseFare,
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
