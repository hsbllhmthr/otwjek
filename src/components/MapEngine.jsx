import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Crosshair } from 'lucide-react';

export default function MapEngine({
  pickup,
  dropoff,
  routePolyline = [],
  drivers = [],
  showRoute = false,
  onRecenter
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const pickupMarkerRef = useRef(null);
  const dropoffMarkerRef = useRef(null);
  const driverMarkersRef = useRef([]);
  const routeLineRef = useRef(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const initialLat = pickup?.lat || -5.1843;
      const initialLng = pickup?.lng || 119.4182;

      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: 15,
        zoomControl: false,
        attributionControl: false
      });

      // Google Maps Clean Roadmap Layer
      L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Pickup Marker (Blue target beacon pin like reference)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !pickup?.lat || !pickup?.lng) return;

    const pickupIcon = L.divIcon({
      className: 'grab-custom-pin',
      html: `
        <div class="grab-map-pin pickup-blue">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="8" stroke="white" stroke-width="3"/>
            <circle cx="12" cy="12" r="3.5" fill="white"/>
          </svg>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    });

    if (pickupMarkerRef.current) {
      pickupMarkerRef.current.setLatLng([pickup.lat, pickup.lng]);
    } else {
      pickupMarkerRef.current = L.marker([pickup.lat, pickup.lng], {
        icon: pickupIcon
      }).addTo(map);
    }
  }, [pickup]);

  // Update Dropoff Marker (Red location pin like reference)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !dropoff?.lat || !dropoff?.lng || !showRoute) {
      if (dropoffMarkerRef.current && map) {
        map.removeLayer(dropoffMarkerRef.current);
        dropoffMarkerRef.current = null;
      }
      return;
    }

    const dropoffIcon = L.divIcon({
      className: 'grab-custom-pin',
      html: `
        <div class="grab-map-pin destination-red">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3" fill="white"></circle>
          </svg>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    });

    if (dropoffMarkerRef.current) {
      dropoffMarkerRef.current.setLatLng([dropoff.lat, dropoff.lng]);
    } else {
      dropoffMarkerRef.current = L.marker([dropoff.lat, dropoff.lng], {
        icon: dropoffIcon
      }).addTo(map);
    }
  }, [dropoff, showRoute]);

  // Update Green Polyline Route (Screen 4)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (routeLineRef.current) {
      map.removeLayer(routeLineRef.current);
      routeLineRef.current = null;
    }

    if (showRoute && routePolyline && routePolyline.length > 1) {
      routeLineRef.current = L.polyline(routePolyline, {
        color: '#FF337F', // Feminine pink route line
        weight: 6,
        opacity: 0.9,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);

      try {
        const bounds = L.latLngBounds(routePolyline);
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      } catch (err) {
        console.warn('fitBounds error:', err);
      }
    } else if (pickup?.lat && pickup?.lng) {
      map.setView([pickup.lat, pickup.lng], 15);
    }
  }, [routePolyline, showRoute, pickup]);

  // Render Nearby Active Drivers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    driverMarkersRef.current.forEach((m) => map.removeLayer(m));
    driverMarkersRef.current = [];

    drivers.forEach((driver) => {
      const isMotor = driver.vehicleType === 'motor';
      const icon = L.divIcon({
        className: 'grab-driver-pin',
        html: `
          <div class="grab-map-pin driver-car" title="${driver.name}">
            ${isMotor ? '🛵' : '🚗'}
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const marker = L.marker([driver.lat, driver.lng], { icon }).addTo(map);
      driverMarkersRef.current.push(marker);
    });
  }, [drivers]);

  const handleRecenter = () => {
    if (mapInstanceRef.current && pickup?.lat && pickup?.lng) {
      mapInstanceRef.current.flyTo([pickup.lat, pickup.lng], 16);
    }
    if (onRecenter) onRecenter();
  };

  return (
    <div className="screen-map-area">
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

      {/* Re-center GPS button (like reference screen 2) */}
      <button
        className="btn-recenter-gps"
        onClick={handleRecenter}
        title="Pusatkan ke lokasi saya"
      >
        <Crosshair size={20} />
      </button>

      <style>{`
        .screen-map-area {
          position: absolute;
          inset: 0;
          z-index: 1;
        }

        .grab-custom-pin, .grab-driver-pin {
          background: transparent !important;
          border: none !important;
        }
      `}</style>
    </div>
  );
}
