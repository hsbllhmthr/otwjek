import React, { useState } from 'react';
import {
  Search,
  Tag,
  ChevronRight,
  CheckCircle2
} from 'lucide-react';
import sherideHeroArt from '../assets/sheride_hero_pink.png';
import iconSheRide from '../assets/icon_sheride.png';
import iconSheCar from '../assets/icon_shecar.png';
import iconSheSend from '../assets/icon_shesend.png';

// Pixel-perfect Red Map Pin with crisp center hole
function RedLocationPin({ size = 22 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0 }}
    >
      <path
        d="M12 2C7.58 2 4 5.58 4 10C4 15.5 11.25 21.6 11.56 21.86C11.69 21.96 11.84 22 12 22C12.16 22 12.31 21.96 12.44 21.86C12.75 21.6 20 15.5 20 10C20 5.58 16.42 2 12 2Z"
        fill="#FF337F"
      />
      <circle cx="12" cy="9.8" r="3.2" fill="#FFFFFF" />
    </svg>
  );
}

// Pixel-perfect Orange Destination Pin with clean center hole
function OrangeDestinationPin({ size = 19 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0 }}
    >
      <path
        d="M12 2C7.58 2 4 5.58 4 10C4 15.5 11.25 21.6 11.56 21.86C11.69 21.96 11.84 22 12 22C12.16 22 12.31 21.96 12.44 21.86C12.75 21.6 20 15.5 20 10C20 5.58 16.42 2 12 2Z"
        fill="#FDF2F8"
      />
      <circle cx="12" cy="9.8" r="3.2" fill="#FF337F" />
    </svg>
  );
}

export default function HomePage({
  onSelectService,
  currentLocation = 'Makassar, Sulawesi Selatan'
}) {
  const [toastMessage, setToastMessage] = useState(null);

  const popularDestinations = [
    {
      id: 'dest-mks-mp',
      name: 'Mall Panakkukang (MP)',
      address: 'Jl. Boulevard, Masale, Panakkukang, Makassar',
      lat: -5.1568,
      lng: 119.4475
    },
    {
      id: 'dest-mks-losari',
      name: 'Pantai Losari & Masjid 99 Kubah',
      address: 'Kawasan CPI & Anjungan Losari, Makassar',
      lat: -5.1444,
      lng: 119.4061
    },
    {
      id: 'dest-gowa-uin',
      name: 'UIN Alauddin Kampus 2 Samata',
      address: 'Jl. H.M. Yasin Limpo, Somba Opu, Gowa',
      lat: -5.2052,
      lng: 119.4930
    },
    {
      id: 'dest-mrs-bandara',
      name: 'Bandara Sultan Hasanuddin (UPG)',
      address: 'Jl. Bandara Baru, Mandai, Maros',
      lat: -5.0617,
      lng: 119.5539
    },
    {
      id: 'dest-tkl-galesong',
      name: 'Wisata Pantai Bintang Galesong',
      address: 'Desa Boddia, Galesong, Takalar',
      lat: -5.3180,
      lng: 119.3620
    }
  ];

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  const handleCopyPromo = () => {
    showToast('🎉 Kode promo "OTWJEK" berhasil disalin! Diskon hingga 30%.');
  };

  return (
    <div className="ridego-homepage">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="ridego-toast-banner">
          <CheckCircle2 size={16} color="#FF337F" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Scrollable Container */}
      <div className="ridego-scroll-container">
        {/* Hero Section with Illustration as Background */}
        <section className="ridego-hero-section">
          <div className="ridego-hero-bg-wrapper">
            <img
              src={sherideHeroArt}
              alt="OTWJek Fleet Illustration"
              className="ridego-hero-bg-img"
            />
            <div className="ridego-hero-overlay" />
          </div>
        </section>

        {/* Overlapping Promo & Search Widget */}
        <div className="ridego-promo-search-widget">
          {/* Green Promo Banner */}
          <div className="ridego-discount-banner" onClick={handleCopyPromo}>
            <div className="discount-left">
              <Tag size={15} className="discount-tag-icon" />
              <span className="discount-text">Discount up to 30% with &ldquo;OTWJEK&rdquo;</span>
            </div>
            <ChevronRight size={18} className="discount-chevron" />
          </div>

          {/* "Where to?" Search Bar */}
          <div
            className="ridego-where-to-pill"
            onClick={() => onSelectService('where-to')}
            role="button"
            tabIndex={0}
            aria-label="Where to?"
          >
            <div className="where-to-left">
              <RedLocationPin size={22} />
              <span className="where-to-placeholder">Where to?</span>
            </div>
            <Search size={20} className="where-to-search-icon" />
          </div>
        </div>

        {/* Lower Body Section */}
        <div className="ridego-body-content">
          {/* 1. Quick Services Grid (Directly unboxed) */}
          <section className="ridego-services-section">
            <div className="services-grid-row">
              {/* Motor */}
              <div
                className="service-grid-card"
                onClick={() => onSelectService('where-to', null, 'bike')}
                role="button"
                tabIndex={0}
                aria-label="Pesan Motor"
              >
                <div className="service-icon-bubble bubble-sheride">
                  <img src={iconSheRide} alt="Motor" className="service-icon-img" />
                </div>
                <span className="service-card-title">Motor</span>
              </div>

              {/* Mobil */}
              <div
                className="service-grid-card"
                onClick={() => onSelectService('where-to', null, 'car')}
                role="button"
                tabIndex={0}
                aria-label="Pesan Mobil"
              >
                <div className="service-icon-bubble bubble-shecar">
                  <img src={iconSheCar} alt="Mobil" className="service-icon-img" />
                </div>
                <span className="service-card-title">Mobil</span>
              </div>

              {/* Paket */}
              <div
                className="service-grid-card"
                onClick={() => onSelectService('send-package', null, 'express')}
                role="button"
                tabIndex={0}
                aria-label="Kirim Paket"
              >
                <div className="service-icon-bubble bubble-shesend">
                  <img src={iconSheSend} alt="Paket" className="service-icon-img" />
                </div>
                <span className="service-card-title">Paket</span>
              </div>
            </div>
          </section>

          {/* 2. Popular destinations Card */}
          <section className="ridego-popular-card">
            <div
              className="popular-card-header"
              onClick={() => onSelectService('where-to')}
              role="button"
              tabIndex={0}
            >
              <h2 className="popular-card-title">Popular destinations</h2>
              <ChevronRight size={17} strokeWidth={2.4} className="popular-chevron" />
            </div>

            <div className="popular-destinations-list">
              {popularDestinations.map((dest, idx) => (
                <div
                  key={dest.id}
                  className={`popular-dest-item ${idx !== popularDestinations.length - 1 ? 'has-divider' : ''}`}
                  onClick={() => onSelectService('where-to', dest.name)}
                >
                  <div className="popular-dest-icon-wrap">
                    <OrangeDestinationPin size={20} />
                  </div>
                  <div className="popular-dest-details">
                    <h3 className="popular-dest-name">{dest.name}</h3>
                    <p className="popular-dest-address">{dest.address}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
