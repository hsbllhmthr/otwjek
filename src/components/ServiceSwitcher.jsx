import React from 'react';
import { Bike, Car, Package, Sparkles, FileText, Utensils, Shirt, ShoppingBag } from 'lucide-react';

export default function ServiceSwitcher({
  serviceType,
  setServiceType,
  vehicleType,
  setVehicleType,
  packageCategory,
  setPackageCategory,
  weightCategory,
  setWeightCategory
}) {
  const packageCategories = [
    { id: 'makanan', label: 'Makanan / Kue', icon: Utensils },
    { id: 'dokumen', label: 'Dokumen', icon: FileText },
    { id: 'fashion', label: 'Pakaian / Hijab', icon: Shirt },
    { id: 'belanjaan', label: 'Belanjaan', icon: ShoppingBag }
  ];

  const weightTiers = [
    { id: 'light', label: '< 2 kg', note: 'Standard' },
    { id: 'medium', label: '2 - 5 kg', note: '+Rp 2.000' },
    { id: 'heavy', label: '5 - 10 kg', note: '+Rp 5.000' }
  ];

  return (
    <div className="service-switcher-card">
      {/* Primary Switcher: SheRide vs SheSend */}
      <div className="service-tabs">
        <button
          className={`service-tab-btn ${serviceType === 'ride' ? 'active' : ''}`}
          onClick={() => setServiceType('ride')}
        >
          <Bike size={18} />
          <span>SheRide (Penumpang)</span>
        </button>

        <button
          className={`service-tab-btn ${serviceType === 'send' ? 'active' : ''}`}
          onClick={() => setServiceType('send')}
        >
          <Package size={18} />
          <span>SheSend (Kirim Paket)</span>
        </button>
      </div>

      {/* Sub-options for SheRide */}
      {serviceType === 'ride' && (
        <div className="vehicle-selection-grid">
          <div
            className={`vehicle-card ${vehicleType === 'motor' ? 'selected' : ''}`}
            onClick={() => setVehicleType('motor')}
          >
            <div className="vehicle-icon-box">🛵</div>
            <div className="vehicle-info">
              <div className="vehicle-name">
                <span>SheRide Motor</span>
                <span className="badge-tag">Favorit</span>
              </div>
              <div className="vehicle-desc">Cepat & santun, sedia helm bersih + hairnet</div>
            </div>
          </div>

          <div
            className={`vehicle-card ${vehicleType === 'mobil' ? 'selected' : ''}`}
            onClick={() => setVehicleType('mobil')}
          >
            <div className="vehicle-icon-box">🚗</div>
            <div className="vehicle-info">
              <div className="vehicle-name">
                <span>SheRide Mobil</span>
                <span className="badge-tag" style={{ background: '#F2EDFB', color: '#8C68CD' }}>
                  Keluarga
                </span>
              </div>
              <div className="vehicle-desc">Bebas asap rokok, AC sejuk, hingga 4 orang</div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-options for SheSend */}
      {serviceType === 'send' && (
        <div className="package-options-wrapper">
          <div className="section-mini-title">Kategori Paket:</div>
          <div className="package-category-chips">
            {packageCategories.map((cat) => {
              const IconComp = cat.icon;
              const isSelected = packageCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  className={`category-chip ${isSelected ? 'active' : ''}`}
                  onClick={() => setPackageCategory(cat.id)}
                >
                  <IconComp size={14} />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          <div className="section-mini-title" style={{ marginTop: '12px' }}>
            Estimasi Berat Paket:
          </div>
          <div className="weight-tier-grid">
            {weightTiers.map((tier) => (
              <div
                key={tier.id}
                className={`weight-card ${weightCategory === tier.id ? 'active' : ''}`}
                onClick={() => setWeightCategory(tier.id)}
              >
                <div className="weight-label">{tier.label}</div>
                <div className="weight-note">{tier.note}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        .service-switcher-card {
          margin-bottom: 16px;
        }

        .vehicle-selection-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .vehicle-card {
          border: 1.5px solid var(--border-neutral);
          border-radius: var(--radius-md);
          padding: 12px;
          cursor: pointer;
          display: flex;
          align-items: flex-start;
          gap: 10px;
          background: white;
          transition: var(--transition);
        }

        .vehicle-card:hover {
          border-color: var(--primary);
          background: var(--primary-light);
        }

        .vehicle-card.selected {
          border-color: var(--primary);
          background: var(--primary-light);
          box-shadow: 0 4px 12px var(--primary-glow);
        }

        .vehicle-icon-box {
          font-size: 24px;
        }

        .vehicle-info {
          flex: 1;
        }

        .vehicle-name {
          font-weight: 700;
          font-size: 13px;
          color: var(--text-main);
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }

        .vehicle-desc {
          font-size: 11px;
          color: var(--text-muted);
          margin-top: 2px;
          line-height: 1.3;
        }

        .section-mini-title {
          font-size: 12px;
          font-weight: 700;
          color: var(--text-muted);
          margin-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .package-category-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .category-chip {
          border: 1px solid var(--border-neutral);
          background: white;
          padding: 6px 12px;
          border-radius: var(--radius-full);
          font-size: 12px;
          font-weight: 600;
          color: var(--text-muted);
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          transition: var(--transition);
        }

        .category-chip:hover {
          border-color: var(--secondary);
          color: var(--secondary);
        }

        .category-chip.active {
          background: var(--secondary-light);
          border-color: var(--secondary);
          color: var(--secondary);
        }

        .weight-tier-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }

        .weight-card {
          border: 1.5px solid var(--border-neutral);
          border-radius: var(--radius-sm);
          padding: 8px;
          text-align: center;
          cursor: pointer;
          background: white;
          transition: var(--transition);
        }

        .weight-card.active {
          border-color: var(--primary);
          background: var(--primary-light);
        }

        .weight-label {
          font-weight: 700;
          font-size: 12px;
          color: var(--text-main);
        }

        .weight-note {
          font-size: 10px;
          color: var(--text-muted);
        }
      `}</style>
    </div>
  );
}
