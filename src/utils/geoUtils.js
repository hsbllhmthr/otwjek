/**
 * Geographic, Geocoding, and Routing Engine
 * Optimized for High-Precision Real-Time Navigation in Mamminasata:
 * Kota Makassar, Kabupaten Gowa, Kabupaten Maros, and Kabupaten Takalar
 */

import { POPULAR_LOCATIONS } from '../data/popularLocations.js';

// In-memory LRU-style cache for reverse geocoding to eliminate duplicate network calls
const reverseGeocodeCache = new Map();

/**
 * Calculates straight line / road estimated distance using Haversine formula
 * @param {number} lat1
 * @param {number} lon1
 * @param {number} lat2
 * @param {number} lon2
 * @param {number} roadFactor Winding road multiplier (default 1.25)
 * @returns {number} distance in kilometers (rounded to 1 decimal place)
 */
export function calculateHaversineDistance(lat1, lon1, lat2, lon2, roadFactor = 1.25) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;

  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const directDistance = R * c;
  const estimatedRoadDistance = directDistance * roadFactor;

  return Math.max(0.2, Math.round(estimatedRoadDistance * 10) / 10);
}

/**
 * Determines regional label for coordinates in South Sulawesi
 */
function inferRegion(lat, lng) {
  if (lat >= -5.22 && lat <= -5.08 && lng >= 119.36 && lng <= 119.54) {
    return 'Kota Makassar';
  }
  if (lat >= -5.35 && lat <= -5.16 && lng >= 119.42 && lng <= 119.90) {
    return 'Kabupaten Gowa';
  }
  if (lat >= -5.10 && lat <= -4.85 && lng >= 119.48 && lng <= 119.85) {
    return 'Kabupaten Maros';
  }
  if (lat >= -5.60 && lat <= -5.25 && lng >= 119.32 && lng <= 119.65) {
    return 'Kabupaten Takalar';
  }
  return 'Sulawesi Selatan';
}

/**
 * Smart Multi-Tier Reverse Geocoder:
 * 1. Cache hit (instant)
 * 2. Photon (Komoot) reverse API (fast, street-level, no strict rate limit)
 * 3. OSM Nominatim reverse API with User-Agent
 * 4. Local proximity fallback
 */
export async function reverseGeocodeSmart(lat, lng) {
  if (!lat || !lng) {
    return {
      name: 'Titik Lokasi',
      shortName: 'Titik Lokasi',
      subtitle: 'Makassar, Sulawesi Selatan',
      displayName: 'Makassar, Sulawesi Selatan',
      address: 'Makassar, Sulawesi Selatan'
    };
  }

  const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  if (reverseGeocodeCache.has(cacheKey)) {
    return reverseGeocodeCache.get(cacheKey);
  }

  // 1. Try Photon (Komoot) Reverse Geocoder
  try {
    const photonUrl = `https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}&lang=id`;
    const res = await fetch(photonUrl);
    if (res.ok) {
      const data = await res.json();
      const p = data.features?.[0]?.properties;
      if (p) {
        const title = p.name || p.street || p.locality || p.district || 'Titik Terpilih';
        const addressParts = [
          p.street && p.street !== title ? p.street : null,
          p.locality || p.district,
          p.city || p.county,
          p.state || 'Sulawesi Selatan'
        ].filter(Boolean);
        const subtitle = addressParts.join(', ') || inferRegion(lat, lng);
        const resolved = {
          name: title,
          shortName: title,
          subtitle: subtitle,
          displayName: `${title}, ${subtitle}`,
          address: subtitle,
          city: p.city || p.county || inferRegion(lat, lng),
          raw: p
        };
        reverseGeocodeCache.set(cacheKey, resolved);
        return resolved;
      }
    }
  } catch (err) {
    // Graceful fallback to next tier
  }

  // 2. Try OpenStreetMap Nominatim with User-Agent
  try {
    const nomUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
    const res = await fetch(nomUrl, {
      headers: {
        'Accept-Language': 'id',
        'User-Agent': 'SheRideApp/2.0 (SouthSulawesi, contact: support@sheride.id)'
      }
    });
    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      const title =
        addr.amenity ||
        addr.shop ||
        addr.building ||
        addr.residential ||
        addr.road ||
        data.name ||
        addr.suburb ||
        addr.village ||
        'Titik Terpilih';

      const addressParts = [
        addr.road && addr.road !== title ? addr.road : null,
        addr.village || addr.suburb,
        addr.district || addr.city_district,
        addr.county || addr.city || inferRegion(lat, lng)
      ].filter(Boolean);

      const subtitle = addressParts.length > 0 ? addressParts.join(', ') : inferRegion(lat, lng);
      const resolved = {
        name: title,
        shortName: title,
        subtitle: subtitle,
        displayName: data.display_name || `${title}, ${subtitle}`,
        address: subtitle,
        city: addr.county || addr.city || inferRegion(lat, lng),
        raw: data
      };
      reverseGeocodeCache.set(cacheKey, resolved);
      return resolved;
    }
  } catch (err) {
    // Fallback to local approximation
  }

  // 3. Proximity Fallback against known Mamminasata landmarks
  let closestLoc = null;
  let minDistance = Infinity;
  for (const loc of POPULAR_LOCATIONS) {
    const dist = calculateHaversineDistance(lat, lng, loc.lat, loc.lng);
    if (dist < minDistance) {
      minDistance = dist;
      closestLoc = loc;
    }
  }

  const regionName = inferRegion(lat, lng);
  let resolved;
  if (closestLoc && minDistance <= 0.35) {
    resolved = {
      name: closestLoc.name,
      shortName: closestLoc.name,
      subtitle: closestLoc.address,
      displayName: closestLoc.fullAddress || closestLoc.address,
      address: closestLoc.address,
      city: closestLoc.city || regionName
    };
  } else {
    resolved = {
      name: `Titik di ${regionName}`,
      shortName: regionName,
      subtitle: `Sekitar ${closestLoc ? closestLoc.name : regionName} [${lat.toFixed(4)}, ${lng.toFixed(4)}]`,
      displayName: `${regionName} [${lat.toFixed(4)}, ${lng.toFixed(4)}]`,
      address: regionName,
      city: regionName
    };
  }

  reverseGeocodeCache.set(cacheKey, resolved);
  return resolved;
}

// Backward-compatible alias
export const reverseGeocodeNominatim = reverseGeocodeSmart;

/**
 * Smart Multi-Tier Location Search Engine:
 * Tier 1: Instant Local Search with keywords/alias matching (0ms, 100% precision)
 * Tier 2: Real-time Photon (Komoot) Search biased to Mamminasata (-5.18, 119.45)
 * Tier 3: Real-time OSM Nominatim Search with Mamminasata Viewbox
 * Merges, filters, and deduplicates.
 */
export async function searchLocationSmart(query, options = {}) {
  if (!query || typeof query !== 'string') return [];
  const qClean = query.trim();
  if (qClean.length < 2) return [];

  const qLower = qClean.toLowerCase();
  const allResults = [];
  const seenKeys = new Set();

  // Helper to add unique items
  const addResult = (item) => {
    // Deduplication by name + close coordinate (within ~100m)
    const coordKey = `${item.name.toLowerCase()}-${item.lat.toFixed(3)},${item.lng.toFixed(3)}`;
    if (!seenKeys.has(coordKey)) {
      seenKeys.add(coordKey);
      allResults.push(item);
    }
  };

  // -------------------------------------------------------------
  // TIER 1: Instant Local Search (Mamminasata Database)
  // -------------------------------------------------------------
  const qWords = qLower.split(/\s+/).filter(Boolean);
  const localMatches = POPULAR_LOCATIONS.filter((loc) => {
    const nameLower = loc.name.toLowerCase();
    const addrLower = loc.address.toLowerCase();
    const cityLower = loc.city?.toLowerCase() || '';

    if (nameLower.includes(qLower) || addrLower.includes(qLower) || cityLower.includes(qLower)) {
      return true;
    }

    if (loc.keywords && loc.keywords.some((k) => {
      const kLower = k.toLowerCase();
      if (kLower.includes(qLower)) return true;
      if (qWords.includes(kLower)) return true;
      if (kLower.length >= 4 && qLower.includes(kLower)) return true;
      return false;
    })) {
      return true;
    }

    return false;
  });

  localMatches.forEach((loc) => {
    addResult({
      id: loc.id,
      name: loc.name,
      address: loc.address,
      fullAddress: loc.fullAddress || loc.address,
      city: loc.city,
      category: loc.category,
      lat: loc.lat,
      lng: loc.lng,
      isVerifiedLocal: true
    });
  });

  // -------------------------------------------------------------
  // TIER 2 & TIER 3: Parallel Real-time Online Geocoders
  // -------------------------------------------------------------
  const onlinePromises = [];

  // A. Photon API biased towards Mamminasata (-5.18, 119.45)
  const fetchPhoton = async () => {
    try {
      const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(qClean)}&lat=-5.18&lon=119.45&limit=10&lang=id`;
      const res = await fetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      return (data.features || [])
        .filter((f) => {
          const c = f.geometry?.coordinates;
          if (!c || c.length < 2) return false;
          const lng = c[0];
          const lat = c[1];
          // Keep results in South Sulawesi & Indonesia
          const isSulsel = lng >= 118.5 && lng <= 121.5 && lat >= -6.5 && lat <= -3.5;
          const isID = f.properties?.countrycode === 'ID' || f.properties?.country === 'Indonesia';
          return isSulsel || isID;
        })
        .map((f) => {
          const p = f.properties || {};
          const lng = f.geometry.coordinates[0];
          const lat = f.geometry.coordinates[1];
          const name = p.name || p.street || p.locality || p.district || qClean;
          const parts = [
            p.street && p.street !== name ? p.street : null,
            p.locality || p.district,
            p.city || p.county,
            p.state || 'Sulawesi Selatan'
          ].filter(Boolean);
          const address = parts.join(', ') || inferRegion(lat, lng);
          return {
            id: `photon-${p.osm_type || 'N'}-${p.osm_id || Math.random().toString(36).substr(2, 6)}`,
            name: name,
            address: address,
            fullAddress: address,
            city: p.city || p.county || inferRegion(lat, lng),
            lat: lat,
            lng: lng
          };
        });
    } catch {
      return [];
    }
  };

  // B. Nominatim API with Mamminasata Viewbox
  const fetchNominatim = async () => {
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(qClean)}&countrycodes=id&viewbox=119.1,-4.7,119.9,-5.7&bounded=0&limit=6&addressdetails=1`;
      const res = await fetch(url, {
        headers: {
          'Accept-Language': 'id',
          'User-Agent': 'SheRideApp/2.0 (SouthSulawesi, contact: support@sheride.id)'
        }
      });
      if (!res.ok) return [];
      const data = await res.json();
      return (data || []).map((item) => {
        const addr = item.address || {};
        const title = item.name || item.display_name.split(',')[0] || qClean;
        const parts = [
          addr.road && addr.road !== title ? addr.road : null,
          addr.village || addr.suburb,
          addr.district || addr.city_district,
          addr.county || addr.city
        ].filter(Boolean);
        const address = parts.length > 0 ? parts.join(', ') : item.display_name;
        return {
          id: `nom-${item.place_id}`,
          name: title,
          address: address,
          fullAddress: item.display_name,
          city: addr.county || addr.city || inferRegion(parseFloat(item.lat), parseFloat(item.lon)),
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon)
        };
      });
    } catch {
      return [];
    }
  };

  onlinePromises.push(fetchPhoton());
  onlinePromises.push(fetchNominatim());

  try {
    const results = await Promise.allSettled(onlinePromises);
    results.forEach((r) => {
      if (r.status === 'fulfilled' && Array.isArray(r.value)) {
        r.value.forEach((item) => addResult(item));
      }
    });
  } catch {
    // If online requests fail, localMatches are already in allResults!
  }

  // Sort: by relevance (exact name match, prefix match, verified local)
  const getScore = (item) => {
    let score = 0;
    const n = item.name.toLowerCase();
    if (n === qLower) score += 100;
    else if (n.startsWith(qLower)) score += 60;
    else if (n.includes(qLower)) score += 40;
    if (item.isVerifiedLocal) score += 25;
    if (item.keywords && item.keywords.some((k) => k.toLowerCase() === qLower)) score += 50;
    return score;
  };

  allResults.sort((a, b) => getScore(b) - getScore(a));

  return allResults.slice(0, 15);
}

// Backward-compatible alias
export const searchNominatim = searchLocationSmart;

/**
 * Fetches real driving route polyline from Open Source Routing Machine (OSRM)
 */
export async function fetchOSRMRoute(startLat, startLng, endLat, endLng) {
  let sLat = startLat;
  let sLng = startLng;
  let eLat = endLat;
  let eLng = endLng;

  // Support object format: fetchOSRMRoute({ lat, lng }, { lat, lng })
  if (typeof startLat === 'object' && startLat !== null) {
    sLat = startLat.lat;
    sLng = startLat.lng;
    eLat = startLng?.lat ?? endLat;
    eLng = startLng?.lng ?? endLng;
  }

  sLat = Number(sLat);
  sLng = Number(sLng);
  eLat = Number(eLat);
  eLng = Number(eLng);

  if (isNaN(sLat) || isNaN(sLng) || isNaN(eLat) || isNaN(eLng)) {
    return {
      success: false,
      distanceKm: 1.0,
      durationMinutes: 3,
      coordinates: []
    };
  }

  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${sLng},${sLat};${eLng},${eLat}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('OSRM routing request failed');
    const data = await res.json();
    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      const distanceKm = Math.max(0.2, Math.round((route.distance / 1000) * 10) / 10);
      const durationMinutes = Math.max(1, Math.round(route.duration / 60));
      // Coordinates in GeoJSON are [lon, lat], Leaflet polyline needs [lat, lon]
      const polylineCoords = route.geometry.coordinates.map((coord) => [coord[1], coord[0]]);
      return {
        success: true,
        distanceKm,
        durationMinutes,
        coordinates: polylineCoords
      };
    }
  } catch (err) {
    console.warn('OSRM routing fallback to direct line:', err);
  }

  // Graceful fallback to direct Haversine line
  const fallbackDistance = calculateHaversineDistance(sLat, sLng, eLat, eLng);
  return {
    success: false,
    distanceKm: fallbackDistance,
    durationMinutes: Math.max(1, Math.round(fallbackDistance * 3.5)),
    coordinates: [
      [sLat, sLng],
      [eLat, eLng]
    ]
  };
}
