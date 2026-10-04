import React from 'react';
import { Star, ShieldCheck, Check, Sparkles } from 'lucide-react';
import driverPlaceholder from '../assets/driver_placeholder.svg';

export default function DriverShowcase({
  drivers,
  selectedDriver,
  onSelectDriver,
  vehicleType
}) {
  // Filter drivers based on vehicle mode if applicable
  const filteredDrivers = drivers.filter(
    (d) => d.vehicleType === vehicleType || vehicleType === undefined
  );

  return (
    <div className="driver-showcase-section">
      <div className="showcase-header">
        <div className="header-titles">
          <span className="showcase-title">Pilih Mitra Driver Wanita</span>
          <span className="showcase-subtitle">Semua mitra 100% diverifikasi perempuan</span>
        </div>
        {selectedDriver && (
          <button className="btn-reset-driver" onClick={() => onSelectDriver(null)}>
            Pilih Acak / Terdekat
          </button>
        )}
      </div>

      {/* Auto / Random Pick Card */}
      <div
        className={`driver-card auto-card ${!selectedDriver ? 'selected' : ''}`}
        onClick={() => onSelectDriver(null)}
      >
        <div className="driver-avatar-circle auto-avatar">
          <Sparkles size={20} className="sparkle-icon" />
        </div>
        <div className="driver-details">
          <div className="driver-name-row">
            <span className="driver-name">Driver Terdekat (Dicarikan Admin)</span>
            {!selectedDriver && <span className="active-check-badge"><Check size={12} /> Dipilih</span>}
          </div>
          <div className="driver-bio">
            Sistem admin akan mencarikan mitra perempuan aktif paling dekat dengan titik jemput Anda (~3-5 menit penjemputan).
          </div>
        </div>
      </div>

      {/* Driver Cards Horizontal / Vertical List */}
      <div className="drivers-list">
        {filteredDrivers.map((driver) => {
          const isSelected = selectedDriver?.id === driver.id;
          return (
            <div
              key={driver.id}
              className={`driver-card ${isSelected ? 'selected' : ''}`}
              onClick={() => onSelectDriver(driver)}
            >
              <div className="avatar-wrapper">
                <img
                  src={driver.avatar || driverPlaceholder}
                  alt={driver.name}
                  className="driver-avatar-img"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = driverPlaceholder;
                  }}
                />
                <span className="status-dot-active" title="Aktif Online" />
              </div>

              <div className="driver-details">
                <div className="driver-name-row">
                  <span className="driver-name">{driver.name}</span>
                  <div className="driver-rating">
                    <Star size={13} fill="#E5A93C" stroke="#E5A93C" />
                    <span>{driver.rating}</span>
                    <span className="trip-count">({driver.tripsCount})</span>
                  </div>
                </div>

                <div className="vehicle-badge-row">
                  <span className="vehicle-plate">{driver.vehicleModel} · {driver.plateNumber}</span>
                </div>

                <div className="driver-bio">{driver.bio}</div>

                <div className="driver-footer-row">
                  <span className="badge-verified">
                    <ShieldCheck size={12} />
                    <span>{driver.badge}</span>
                  </span>

                  <button
                    className={`btn-select-driver-action ${isSelected ? 'selected' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectDriver(isSelected ? null : driver);
                    }}
                  >
                    {isSelected ? '✓ Terpilih' : 'Pilih Driver'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        .driver-showcase-section {
          margin-bottom: 20px;
        }

        .showcase-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 10px;
        }

        .showcase-title {
          font-size: 13px;
          font-weight: 800;
          color: var(--text-main);
          display: block;
        }

        .showcase-subtitle {
          font-size: 11px;
          color: var(--text-muted);
        }

        .btn-reset-driver {
          background: transparent;
          border: none;
          color: var(--primary);
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }

        .drivers-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-top: 10px;
        }

        .driver-card {
          border: 1.5px solid var(--border-neutral);
          border-radius: var(--radius-md);
          padding: 12px;
          background: white;
          display: flex;
          gap: 12px;
          cursor: pointer;
          transition: var(--transition);
          position: relative;
        }

        .driver-card:hover {
          border-color: var(--primary);
          background: #FFFDFE;
          transform: translateY(-1px);
        }

        .driver-card.selected {
          border-color: var(--primary);
          background: var(--primary-light);
          box-shadow: 0 4px 14px var(--primary-glow);
        }

        .auto-card {
          background: #F8F6FC;
          border-color: rgba(140, 104, 205, 0.2);
        }

        .auto-card.selected {
          border-color: var(--secondary);
          background: #F4F0FA;
          box-shadow: 0 4px 14px rgba(140, 104, 205, 0.2);
        }

        .avatar-wrapper {
          position: relative;
          width: 50px;
          height: 50px;
          flex-shrink: 0;
        }

        .driver-avatar-img {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid white;
          box-shadow: var(--shadow-sm);
        }

        .status-dot-active {
          position: absolute;
          bottom: 2px;
          right: 2px;
          width: 11px;
          height: 11px;
          background: #2CB67D;
          border-radius: 50%;
          border: 2px solid white;
        }

        .driver-avatar-circle {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .auto-avatar {
          background: linear-gradient(135deg, var(--secondary) 0%, #7952B9 100%);
          color: white;
        }

        .sparkle-icon {
          animation: spin 6s linear infinite;
        }

        .driver-details {
          flex: 1;
        }

        .driver-name-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 2px;
        }

        .driver-name {
          font-size: 13px;
          font-weight: 700;
          color: var(--text-main);
        }

        .driver-rating {
          display: flex;
          align-items: center;
          gap: 3px;
          font-size: 12px;
          font-weight: 700;
          color: var(--text-main);
        }

        .trip-count {
          font-size: 10px;
          color: var(--text-light);
          font-weight: 400;
        }

        .vehicle-badge-row {
          font-size: 11px;
          color: var(--secondary);
          font-weight: 600;
          margin-bottom: 4px;
        }

        .driver-bio {
          font-size: 11px;
          color: var(--text-muted);
          line-height: 1.35;
          margin-bottom: 8px;
        }

        .driver-footer-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .btn-select-driver-action {
          border: none;
          background: #F1EFF5;
          color: var(--text-main);
          font-size: 11px;
          font-weight: 700;
          padding: 5px 12px;
          border-radius: var(--radius-full);
          cursor: pointer;
          transition: var(--transition);
        }

        .btn-select-driver-action:hover {
          background: var(--primary);
          color: white;
        }

        .btn-select-driver-action.selected {
          background: var(--primary);
          color: white;
        }

        .active-check-badge {
          display: inline-flex;
          align-items: center;
          gap: 2px;
          background: #8C68CD;
          color: white;
          padding: 2px 8px;
          border-radius: var(--radius-full);
          font-size: 10px;
          font-weight: 700;
        }
      `}</style>
    </div>
  );
}
