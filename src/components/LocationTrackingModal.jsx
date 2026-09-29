import React, { useState } from 'react';
import {
  Crosshair,
  MapPin,
  ShieldCheck,
  Zap,
  Navigation,
  Loader2,
  AlertCircle,
  X
} from 'lucide-react';
import { reverseGeocodeNominatim } from '../utils/geoUtils.js';

export default function LocationTrackingModal({
  isOpen,
  onClose,
  onLocationActivated,
  fallbackLocation
}) {
  const [isRequesting, setIsRequesting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  if (!isOpen) return null;

  const handleRequestLocation = () => {
    if (!navigator.geolocation) {
      setErrorMessage('Browser atau perangkat ini tidak mendukung fitur pelacakan lokasi.');
      return;
    }

    setIsRequesting(true);
    setErrorMessage(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude, accuracy } = pos.coords;
          const geoResult = await reverseGeocodeNominatim(latitude, longitude);

          const locationData = {
            name: geoResult.name || 'Lokasi Saya Saat Ini',
            address: geoResult.subtitle || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
            fullAddress: geoResult.displayName,
            lat: latitude,
            lng: longitude,
            accuracy: Math.round(accuracy || 10)
          };

          setIsRequesting(false);
          onLocationActivated(locationData);
        } catch (err) {
          console.error('Error in reverse geocoding live position:', err);
          setIsRequesting(false);
          onLocationActivated({
            name: 'Lokasi Saya Saat Ini',
            address: `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`,
            fullAddress: `Koordinat [${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}]`,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: Math.round(pos.coords.accuracy || 10)
          });
        }
      },
      (err) => {
        setIsRequesting(false);
        console.warn('Geolocation error code:', err.code, err.message);
        if (err.code === 1) {
          setErrorMessage(
            'Izin akses lokasi ditolak oleh browser. Harap izinkan akses lokasi pada pop-up izin browser Anda.'
          );
        } else if (err.code === 2) {
          setErrorMessage(
            'Sinyal GPS perangkat tidak dapat dideteksi. Pastikan GPS/Layanan Lokasi perangkat telah aktif.'
          );
        } else if (err.code === 3) {
          setErrorMessage(
            'Pencarian lokasi melebihi batas waktu (timeout). Silakan coba lagi.'
          );
        } else {
          setErrorMessage('Gagal mendeteksi lokasi saat ini. Silakan coba lagi.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const handleUseFallback = () => {
    if (fallbackLocation) {
      onLocationActivated(fallbackLocation);
    } else {
      onClose();
    }
  };

  return (
    <div className="location-modal-overlay">
      <div className="location-modal-card">
        {/* Animated Radar Beacon Graphic */}
        <div className="location-beacon-wrap">
          <div className="radar-wave wave-1" />
          <div className="radar-wave wave-2" />
          <div className="radar-wave wave-3" />
          <div className="radar-center-core">
            <Navigation size={26} color="#FFFFFF" strokeWidth={2.4} />
          </div>
        </div>

        {/* Header Tag Badge */}
        <div className="location-modal-badge">
          <Crosshair size={13} color="#00B14F" strokeWidth={2.6} />
          <span>Akurasi Penjemputan Realtime</span>
        </div>

        {/* Modal Title & Subtitle */}
        <h2 className="location-modal-title">Aktifkan Lacak Lokasi</h2>
        <p className="location-modal-subtitle">
          Untuk memastikan titik penjemputan terpasang secara akurat dan memudahkan mitra driver SheRide menemukan lokasi Anda, aktifkan akses lokasi di perangkat ini.
        </p>

        {/* 3 Key Benefits */}
        <div className="location-features-list">
          <div className="location-feature-item">
            <div className="location-feature-icon-wrap bg-green">
              <MapPin size={18} color="#00B14F" strokeWidth={2.4} />
            </div>
            <div className="location-feature-text">
              <h4>Titik Jemput Otomatis & Presisi</h4>
              <p>Posisi penjemputan langsung terkunci di titik Anda berada tanpa perlu mencari manual.</p>
            </div>
          </div>

          <div className="location-feature-item">
            <div className="location-feature-icon-wrap bg-blue">
              <Zap size={18} color="#007AFF" strokeWidth={2.4} />
            </div>
            <div className="location-feature-text">
              <h4>Driver Lebih Cepat Tiba</h4>
              <p>Mitra langsung diarahkan ke gerbang atau lobi terdekat Anda tanpa salah jalan.</p>
            </div>
          </div>

          <div className="location-feature-item">
            <div className="location-feature-icon-wrap bg-teal">
              <ShieldCheck size={18} color="#074F3B" strokeWidth={2.4} />
            </div>
            <div className="location-feature-text">
              <h4>Perjalanan Aman 100% Khusus Perempuan</h4>
              <p>Rute perjalanan terpantau secara realtime demi keamanan dan kenyamanan maksimal.</p>
            </div>
          </div>
        </div>

        {/* Error Alert Box if Permission Denied / Error */}
        {errorMessage && (
          <div className="location-modal-error-box">
            <AlertCircle size={18} color="#DC2626" className="flex-shrink-0" />
            <div className="error-text-wrap">
              <span>{errorMessage}</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="location-modal-actions">
          <button
            type="button"
            className="btn-activate-location-primary"
            onClick={handleRequestLocation}
            disabled={isRequesting}
          >
            {isRequesting ? (
              <>
                <Loader2 size={19} className="animate-spin" />
                <span>Mendeteksi Sinyal GPS...</span>
              </>
            ) : (
              <>
                <Crosshair size={19} strokeWidth={2.4} />
                <span>Aktifkan Lacak Lokasi</span>
              </>
            )}
          </button>

          <button
            type="button"
            className="btn-activate-location-secondary"
            onClick={handleUseFallback}
            disabled={isRequesting}
          >
            Gunakan Lokasi Rekomendasi (Manual)
          </button>
        </div>
      </div>
    </div>
  );
}
