import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import {
  ArrowLeft,
  Home,
  MapPin,
  MoreVertical,
  Crosshair,
  Check,
  Edit3,
  X,
  Search
} from 'lucide-react';
import { POPULAR_LOCATIONS } from '../data/popularLocations.js';
import { searchNominatim, reverseGeocodeNominatim, calculateHaversineDistance } from '../utils/geoUtils.js';

export default function PickupSelectionPage({
  targetMode = 'pickup',
  pickup,
  dropoff,
  driverNotes = '',
  onBack,
  onConfirmPickup,
  onConfirmDestination,
  selectedVehicleType = 'bike'
}) {
  const isDestination = targetMode === 'destination';
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const pinTipRef = useRef(null);
  const userGpsMarkerRef = useRef(null);
  const poiMarkersRef = useRef([]);
  const isProgrammaticMoveRef = useRef(false);
  const [isMapMoving, setIsMapMoving] = useState(false);

  // Dynamic base coordinates: use dropoff if in destination mode, else pickup
  const baseLat = isDestination ? (dropoff?.lat || -5.1477) : (pickup?.lat || -5.1843);
  const baseLng = isDestination ? (dropoff?.lng || 119.4327) : (pickup?.lng || 119.4182);
  const baseName = isDestination ? (dropoff?.name || 'Mall Ratu Indah') : (pickup?.name || 'Indo Mode Tamalate');
  const baseAddress = isDestination ? (dropoff?.address || 'Jl. DR. Ratulangi No.35, Mamajang') : (pickup?.address || 'Mangasa, Tamalate, Kota Makassar');
  const baseFullAddress = isDestination
    ? (dropoff?.fullAddress || dropoff?.address || 'Jl. DR. Ratulangi No.35, Mamajang')
    : (pickup?.fullAddress || pickup?.address || 'Jl. Sultan Alauddin, Mangasa, Tamalate, Kota Makassar');

  // Initial locations (no Home)
  const initialPickups = [
    {
      id: 'pick-main',
      name: baseName,
      address: baseAddress,
      fullAddress: baseFullAddress,
      distance: '0.0km',
      lat: baseLat,
      lng: baseLng
    },
    {
      id: 'pick-nearby-1',
      name: `${baseName} (Titik 1)`,
      address: baseAddress,
      fullAddress: baseFullAddress,
      distance: '0.05km',
      lat: baseLat + 0.0004,
      lng: baseLng + 0.0005
    },
    {
      id: 'pick-nearby-2',
      name: `${baseName} (Titik 2)`,
      address: baseAddress,
      fullAddress: baseFullAddress,
      distance: '0.1km',
      lat: baseLat - 0.0006,
      lng: baseLng + 0.0007
    }
  ];

  const [selectedPickup, setSelectedPickup] = useState(initialPickups[0]);
  const [nearbyOptions, setNearbyOptions] = useState(initialPickups.slice(1));
  const [currentNotes, setCurrentNotes] = useState(driverNotes || '');
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [tempNotes, setTempNotes] = useState(driverNotes || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);
  const debounceRef = useRef(null);

  // Sync notes when prop changes
  useEffect(() => {
    setCurrentNotes(driverNotes || '');
    setTempNotes(driverNotes || '');
  }, [driverNotes]);

  // Calculate container coordinates for pin contact point
  const getPinTipPoint = () => {
    if (pinTipRef.current && mapContainerRef.current) {
      const tipRect = pinTipRef.current.getBoundingClientRect();
      const mapRect = mapContainerRef.current.getBoundingClientRect();
      return {
        x: tipRect.left + tipRect.width / 2 - mapRect.left,
        y: tipRect.top + tipRect.height / 2 - mapRect.top
      };
    }
    if (!mapContainerRef.current) return { x: 0, y: 0 };
    return {
      x: mapContainerRef.current.clientWidth / 2,
      y: mapContainerRef.current.clientHeight / 2 - 110
    };
  };

  // Smoothly pan map so given lat, lng sits directly under the center pin
  const panToPinLocation = (lat, lng, zoom, animate = true) => {
    if (!mapInstanceRef.current || !mapContainerRef.current) return;
    const map = mapInstanceRef.current;
    const currentZoom = zoom !== undefined ? zoom : map.getZoom();

    const container = mapContainerRef.current;
    const cx = container.clientWidth / 2;
    const cy = container.clientHeight / 2;

    const tipPoint = getPinTipPoint();
    const diffX = cx - tipPoint.x;
    const diffY = cy - tipPoint.y;

    const targetPixel = map.project([lat, lng], currentZoom);
    const newCenterPixel = targetPixel.add([diffX, diffY]);
    const newCenterLatLng = map.unproject(newCenterPixel, currentZoom);

    if (animate) {
      map.flyTo(newCenterLatLng, currentZoom, {
        duration: 0.55,
        easeLinearity: 0.25
      });
    } else {
      map.setView(newCenterLatLng, currentZoom);
    }
  };

  // Initialize interactive Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const initialLat = selectedPickup.lat;
      const initialLng = selectedPickup.lng;

      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: 17,
        zoomControl: false,
        attributionControl: false
      });

      // Google Maps Clean Roadmap Layer
      L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
      }).addTo(map);

      mapInstanceRef.current = map;

      // Add live GPS blue pulse dot slightly offset
      const userGpsIcon = L.divIcon({
        className: 'user-gps-pulse-icon',
        html: `
          <div class="gps-pulse-outer">
            <div class="gps-pulse-core"></div>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      userGpsMarkerRef.current = L.marker([baseLat, baseLng], {
        icon: userGpsIcon
      }).addTo(map);

      // Add ambient POI markers on map matching the reference screenshot exactly
      const pois = [
        {
          name: "SEM Store Jene'tallasa",
          lat: initialLat + 0.0006,
          lng: initialLng + 0.0007,
          type: 'teal'
        },
        {
          name: "B/15, Graha Sejahtera\nResidence",
          lat: initialLat + 0.0004,
          lng: initialLng + 0.0006,
          type: 'teal'
        },
        {
          name: "B/12, Graha Sejahtera\nResidence",
          lat: initialLat - 0.0005,
          lng: initialLng + 0.0003,
          type: 'teal'
        },
        {
          name: "UKM Mart",
          lat: initialLat + 0.0003,
          lng: initialLng - 0.0006,
          type: 'teal'
        },
        {
          name: "Degan Pak Ri",
          lat: initialLat + 0.0011,
          lng: initialLng - 0.0001,
          type: 'food'
        },
        {
          name: "Ngeboba\nJene'tallasa",
          lat: initialLat - 0.0006,
          lng: initialLng - 0.0008,
          type: 'food'
        },
        {
          name: "Hafiz Jenetallasa Shop\nToko Hafiz",
          lat: initialLat - 0.0009,
          lng: initialLng - 0.0001,
          type: 'shop'
        }
      ];

      pois.forEach((poi) => {
        let badgeHtml = '';
        if (poi.type === 'food') {
          badgeHtml = `
            <div class="map-poi-badge poi-food">
              <div class="poi-icon-circle bg-orange">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="#D97706"><path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z"/></svg>
              </div>
              <div class="poi-text-col">
                <span class="poi-text text-orange">${poi.name.replace('\n', '<br/>')}</span>
              </div>
            </div>
          `;
        } else if (poi.type === 'shop') {
          badgeHtml = `
            <div class="map-poi-badge poi-shop">
              <div class="poi-icon-circle bg-blue">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="#007AFF"><path d="M19 6h-2c0-2.76-2.24-5-5-5S7 3.24 7 6H5c-1.1 0-1.99.9-1.99 2L3 20c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-7-3c1.66 0 3 1.34 3 3H9c0-1.66 1.34-3 3-3zm7 17H5V8h14v12z"/></svg>
              </div>
              <div class="poi-text-col">
                <span class="poi-text text-blue">${poi.name.replace(/\n/g, '<br/>')}</span>
              </div>
            </div>
          `;
        } else {
          badgeHtml = `
            <div class="map-poi-badge poi-teal">
              <div class="poi-icon-circle bg-teal">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="white"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
              </div>
              <span class="poi-text">${poi.name.replace('\n', '<br/>')}</span>
            </div>
          `;
        }

        const poiIcon = L.divIcon({
          className: 'map-poi-custom-container',
          html: badgeHtml,
          iconSize: [140, 36],
          iconAnchor: [8, 16]
        });
        const m = L.marker([poi.lat, poi.lng], { icon: poiIcon }).addTo(map);
        m.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          panToPinLocation(poi.lat, poi.lng);
        });
        poiMarkersRef.current.push(m);
      });

      // Listen to map movement events for the fixed center pin
      map.on('movestart', () => {
        setIsMapMoving(true);
      });

      map.on('moveend', () => {
        setIsMapMoving(false);
        if (isProgrammaticMoveRef.current) {
          isProgrammaticMoveRef.current = false;
          return;
        }
        const tipPoint = getPinTipPoint();
        const latLng = map.containerPointToLatLng([tipPoint.x, tipPoint.y]);
        onPinPositionChanged(latLng.lat, latLng.lng);
      });

      // Click anywhere on map to pan that point to center pin
      map.on('click', (e) => {
        panToPinLocation(e.latlng.lat, e.latlng.lng);
      });

      // Initial alignment: pan map so initialLat/Lng sits right under the center pin
      setTimeout(() => {
        if (mapInstanceRef.current && mapContainerRef.current) {
          mapInstanceRef.current.invalidateSize();
          panToPinLocation(initialLat, initialLng, 17, false);
        }
      }, 80);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Real-time reverse geocoding when pin is moved or map is panned
  const onPinPositionChanged = async (lat, lng) => {
    setIsResolvingAddress(true);

    // Real-time reverse geocoding via Nominatim
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const result = await reverseGeocodeNominatim(lat, lng);
        const distFromOrigin = calculateHaversineDistance(baseLat, baseLng, lat, lng);
        const distStr = `${distFromOrigin.toFixed(1)}km`;

        const dynamicPickup = {
          id: 'pick-loc-' + Date.now(),
          name: result.name || 'Titik Terpilih',
          address: result.subtitle || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
          fullAddress: result.displayName,
          distance: distStr,
          lat: lat,
          lng: lng
        };

        setSelectedPickup(dynamicPickup);

        // Dynamically update surrounding addresses around this pin point location
        const addr = result.raw?.address || {};
        const newNearby = [];

        // 1. Surrounding road or direct access gate
        const nearbyRoad = addr.road && addr.road !== result.name ? addr.road : null;
        if (nearbyRoad) {
          newNearby.push({
            id: 'nearby-road-' + Date.now(),
            name: nearbyRoad,
            address: [addr.village || addr.suburb, addr.district || addr.city_district].filter(Boolean).join(', ') || result.subtitle,
            fullAddress: `${nearbyRoad}, ${result.subtitle}`,
            distance: `${(distFromOrigin + 0.1).toFixed(1)}km`,
            lat: lat + 0.0006,
            lng: lng + 0.0005
          });
        } else {
          newNearby.push({
            id: 'nearby-gate-' + Date.now(),
            name: `Akses Masuk ${result.name}`,
            address: result.subtitle,
            fullAddress: `Akses Masuk ${result.name}, ${result.subtitle}`,
            distance: `${(distFromOrigin + 0.1).toFixed(1)}km`,
            lat: lat + 0.0005,
            lng: lng + 0.0005
          });
        }

        // 2. Surrounding neighborhood / junction / residential area around the pin
        const surroundingArea = addr.residential || addr.neighbourhood || addr.suburb || addr.village;
        const areaName = surroundingArea && surroundingArea !== result.name
          ? surroundingArea
          : `Simpang ${result.name}`;

        newNearby.push({
          id: 'nearby-area-' + Date.now(),
          name: areaName,
          address: [addr.district || addr.city_district, addr.county || addr.city].filter(Boolean).join(', ') || result.subtitle,
          fullAddress: `${areaName}, ${result.subtitle}`,
          distance: `${(distFromOrigin + 0.2).toFixed(1)}km`,
          lat: lat - 0.0006,
          lng: lng - 0.0005
        });

        setNearbyOptions(newNearby);
        setIsResolvingAddress(false);
      } catch (err) {
        console.error('Reverse geocode error:', err);
        setIsResolvingAddress(false);
      }
    }, 200);
  };

  const handleSelectPickupItem = (opt) => {
    setSelectedPickup(opt);
    panToPinLocation(opt.lat, opt.lng, undefined, true);
  };

  const handleRecenter = () => {
    panToPinLocation(baseLat, baseLng, 17, true);
  };

  const handleSearchPickupChange = (val) => {
    setSearchQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!val || val.trim().length === 0) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    if (val.trim().length >= 2) {
      setIsSearching(true);
      debounceRef.current = setTimeout(async () => {
        const smartResults = await searchNominatim(val);
        setSearchResults(smartResults || []);
        setIsSearching(false);
      }, 200);
    } else {
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = (loc) => {
    const dist = calculateHaversineDistance(baseLat, baseLng, loc.lat, loc.lng);
    const newPick = {
      id: loc.id || 'pick-custom-' + Date.now(),
      name: loc.name,
      address: loc.subtitle || loc.address,
      fullAddress: loc.address,
      distance: `${dist.toFixed(1)}km`,
      isHome: false,
      lat: loc.lat,
      lng: loc.lng,
      photoUrl: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=160&auto=format&fit=crop'
    };
    setSelectedPickup(newPick);
    setSearchQuery('');
    setSearchResults([]);
    isProgrammaticMoveRef.current = true;
    panToPinLocation(loc.lat, loc.lng, 17, true);
  };

  const handleConfirm = () => {
    if (isDestination && onConfirmDestination) {
      onConfirmDestination({
        name: selectedPickup.name,
        address: selectedPickup.fullAddress || selectedPickup.address,
        lat: selectedPickup.lat,
        lng: selectedPickup.lng
      });
    } else {
      onConfirmPickup(
        {
          name: selectedPickup.name,
          address: selectedPickup.fullAddress || selectedPickup.address,
          lat: selectedPickup.lat,
          lng: selectedPickup.lng
        },
        currentNotes
      );
    }
  };

  const displayPickupList = [
    selectedPickup,
    ...nearbyOptions.filter((opt) => opt.id !== selectedPickup.id)
  ];

  return (
    <div className="pickup-selection-viewport">
      {/* 1. Fullscreen Map Background */}
      <div className="pickup-map-container" ref={mapContainerRef} />

      {/* Fixed Center Pin Overlay (Stays in center while map is dragged) */}
      <div className="center-pin-overlay">
        <div className={`center-pin-bubble-wrapper ${isMapMoving ? 'is-lifted' : ''}`}>
          <div className="center-pin-vector-marker">
            <svg width="42" height="52" viewBox="0 0 42 52" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="pinBodyGrad" x1="21" y1="2" x2="21" y2="50" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#FF337F" />
                  <stop offset="100%" stopColor="#BE185D" />
                </linearGradient>
                <filter id="pinShadowFilter" x="0" y="0" width="42" height="52" filterUnits="userSpaceOnUse">
                  <feDropShadow dx="0" dy="3.5" stdDeviation="3.5" floodColor="#000000" floodOpacity="0.32" />
                </filter>
              </defs>
              {/* Outer Teardrop Pin Body */}
              <path
                d="M21 2C10.5 2 2 10.5 2 21C2 34 19.5 49.5 20.3 50.2C20.7 50.6 21.3 50.6 21.7 50.2C22.5 49.5 40 34 40 21C40 10.5 31.5 2 21 2Z"
                fill="url(#pinBodyGrad)"
                stroke="#FFFFFF"
                strokeWidth="2.8"
                strokeLinejoin="round"
                filter="url(#pinShadowFilter)"
              />
              {/* White Inner Circle */}
              <circle cx="21" cy="20" r="7.5" fill="#FFFFFF" />
              {/* Core Dot */}
              <circle cx="21" cy="20" r="3.6" fill="#831843" />
            </svg>
          </div>
        </div>

        {/* Ground shadow & center target landing dot */}
        <div className="center-pin-ground-target" ref={pinTipRef}>
          <div className={`ground-shadow-oval ${isMapMoving ? 'is-lifted' : ''}`} />
          <div className="ground-dot-core" />
        </div>
      </div>

      {/* 2. Top Floating Navigation & Search Bar */}
      <div className="pickup-top-bar">
        <button
          type="button"
          className="pickup-back-button"
          onClick={onBack}
          aria-label="Kembali"
        >
          <ArrowLeft size={22} color="#1C1C1E" strokeWidth={2.4} />
        </button>

        {/* Floating Pill: [Dot] Pick up at? / Drop off at? */}
        <div className="pickup-search-pill">
          <div className="pickup-target-blue-dot">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <circle
                cx="8"
                cy="8"
                r="6"
                stroke="#FF337F"
                strokeWidth="3"
                fill="#FFFFFF"
              />
            </svg>
          </div>

          <input
            type="text"
            className="pickup-search-input"
            placeholder={
              isResolvingAddress
                ? 'Membaca lokasi...'
                : selectedPickup?.name
                ? isDestination
                  ? `Drop off at ${selectedPickup.name}`
                  : `Pick up at ${selectedPickup.name}`
                : isDestination
                ? 'Where to?'
                : 'Pick up at?'
            }
            value={searchQuery}
            onChange={(e) => handleSearchPickupChange(e.target.value)}
          />

          {searchQuery && (
            <button
              type="button"
              className="pickup-search-clear"
              onClick={() => handleSearchPickupChange('')}
              aria-label="Hapus pencarian"
            >
              <X size={15} color="#8E8E93" />
            </button>
          )}
        </div>
      </div>

      {/* Real-time search dropdown if user typed in 'Pick up at?' */}
      {searchQuery.trim().length > 0 && (
        <div className="pickup-search-dropdown-results">
          {searchResults.length === 0 && !isSearching && (
            <div className="pickup-search-empty">
              <span>Lokasi tidak ditemukan. Coba ketik nama jalan terdekat.</span>
            </div>
          )}
          {searchResults.map((loc, idx) => (
            <div
              key={loc.id || `drop-pick-${idx}`}
              className="pickup-search-result-item"
              onClick={() => handleSelectSearchResult(loc)}
            >
              <MapPin size={16} color="#007AFF" />
              <div className="res-texts">
                <div className="res-title">{loc.name}</div>
                <div className="res-sub">{loc.address}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3. Bottom Sheet: Pickup Options & Confirmation */}
      <div className="pickup-bottom-sheet">
        {/* Floating Recenter GPS Button Docked Above Top-Right */}
        <button
          type="button"
          className="pickup-recenter-fab-docked"
          onClick={handleRecenter}
          title="Pusatkan Lokasi Saya"
        >
          <Crosshair size={20} color="#1C1C1E" strokeWidth={2.4} />
        </button>

        {/* Sheet Top Drag Handle */}
        <div className="pickup-sheet-handle" />

        {/* List of Pick-up Spots */}
        <div className="pickup-spots-list">
          {displayPickupList.map((opt) => {
            const isSelected = selectedPickup.id === opt.id;
            return (
              <div
                key={opt.id}
                className={`pickup-spot-item ${isSelected ? 'is-selected' : ''}`}
                onClick={() => handleSelectPickupItem(opt)}
              >
                <div className="spot-item-icon">
                  <div className="spot-teal-pin">
                    <MapPin size={17} color="#FFFFFF" strokeWidth={2.4} />
                  </div>
                </div>

                <div className="spot-item-info">
                  <div className="spot-name">
                    {opt.name}
                    {isResolvingAddress && isSelected && (
                      <span className="resolving-pill">Memperbarui...</span>
                    )}
                  </div>
                  <div className="spot-address">
                    {opt.distance} · {opt.address}
                  </div>
                </div>

                <button
                  type="button"
                  className="spot-more-menu"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical size={18} color="#8E8E93" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Driver Notes Row: Empty state vs Filled state */}
        <div className="pickup-notes-row">
          {!currentNotes ? (
            /* EMPTY STATE MATCHING REFERENCE IMAGE 1 */
            <div
              className="pickup-notes-empty-card"
              onClick={() => {
                setTempNotes(currentNotes);
                setIsNoteModalOpen(true);
              }}
              role="button"
              tabIndex={0}
            >
              <span className="pickup-notes-empty-label">
                Add pickup details (e.g. near the gate)
              </span>
              <button
                type="button"
                className="pickup-notes-plus-btn"
                title="Tambah Detail Penjemputan"
                onClick={(e) => {
                  e.stopPropagation();
                  setTempNotes(currentNotes);
                  setIsNoteModalOpen(true);
                }}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <circle cx="10" cy="10" r="10" fill="#FF337F" />
                  <path
                    d="M10 5.5V14.5M5.5 10H14.5"
                    stroke="#FFFFFF"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
          ) : (
            /* FILLED STATE MATCHING PREVIOUS REFERENCE */
            <div
              className="pickup-notes-display"
              onClick={() => {
                setTempNotes(currentNotes);
                setIsNoteModalOpen(true);
              }}
              role="button"
              tabIndex={0}
            >
              <span className="pickup-notes-text">{currentNotes}</span>
              <button
                type="button"
                className="pickup-notes-edit-icon"
                onClick={(e) => {
                  e.stopPropagation();
                  setTempNotes(currentNotes);
                  setIsNoteModalOpen(true);
                }}
                title="Edit Catatan"
              >
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                  <rect
                    x="2.5"
                    y="2.5"
                    width="15"
                    height="15"
                    rx="3.5"
                    stroke="#FF337F"
                    strokeWidth="1.8"
                  />
                  <path
                    d="M12.2 4.8L15.2 7.8L8.2 14.8H5.2V11.8L12.2 4.8Z"
                    stroke="#FF337F"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Big CTA: Choose this pickup / destination */}
        <button
          type="button"
          className="btn-choose-this-pickup"
          onClick={handleConfirm}
        >
          {isDestination ? 'Choose this destination' : 'Choose this pickup'}
        </button>
      </div>

      {/* 4. Note to driver Bottom Sheet Modal (Matching Image 2) */}
      {isNoteModalOpen && (
        <div
          className="note-modal-overlay"
          onClick={() => setIsNoteModalOpen(false)}
        >
          <div
            className="note-modal-sheet"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="note-modal-title">Note to driver</div>

            <div className="note-modal-textarea-box">
              <textarea
                className="note-modal-textarea"
                placeholder="Add pickup details (e.g. near the gate)"
                value={tempNotes}
                maxLength={150}
                onChange={(e) => setTempNotes(e.target.value)}
                autoFocus
              />
              <div className="note-modal-counter">
                {tempNotes.length}/150
              </div>
            </div>

            <button
              type="button"
              className="btn-note-modal-save"
              onClick={() => {
                setCurrentNotes(tempNotes.trim());
                setIsNoteModalOpen(false);
              }}
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
