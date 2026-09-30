import React from 'react';
import { X, Star, Check, Sparkles } from 'lucide-react';
import { VERIFIED_DRIVERS } from '../data/drivers.js';

export default function DriverCatalogModal({
  isOpen,
  onClose,
  selectedDriver,
  onSelectDriver
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#FF337F', textTransform: 'uppercase' }}>
              GrabNow · Mitra Khusus Perempuan
            </span>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#1C1C1E', margin: '2px 0 0' }}>
              Pilih Driver Wanita Terdekat
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#F2F4F7',
              border: 'none',
              borderRadius: '50%',
              width: 32,
              height: 32,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Auto Option */}
        <div
          onClick={() => {
            onSelectDriver(null);
            onClose();
          }}
          style={{
            border: !selectedDriver ? '2px solid #FF337F' : '1px solid #E5E7EB',
            background: !selectedDriver ? '#FDF2F8' : '#FFFFFF',
            borderRadius: 12,
            padding: 12,
            marginBottom: 10,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                background: '#FF337F',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Sparkles size={18} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1C1C1E' }}>Driver Terdekat Otomatis</div>
              <div style={{ fontSize: 11, color: '#8E8E93' }}>Dicarikan admin dengan estimasi jemput tercepat</div>
            </div>
          </div>
          {!selectedDriver && <Check size={18} color="#FF337F" />}
        </div>

        {/* Driver List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 340, overflowY: 'auto' }}>
          {VERIFIED_DRIVERS.map((driver) => {
            const isSelected = selectedDriver?.id === driver.id;
            return (
              <div
                key={driver.id}
                onClick={() => {
                  onSelectDriver(driver);
                  onClose();
                }}
                style={{
                  border: isSelected ? '2px solid #FF337F' : '1px solid #E5E7EB',
                  background: isSelected ? '#FDF2F8' : '#FFFFFF',
                  borderRadius: 12,
                  padding: 12,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <img
                    src={driver.avatar}
                    alt={driver.name}
                    style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }}
                  />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#1C1C1E' }}>{driver.name}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#F5A623', display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Star size={11} fill="#F5A623" /> {driver.rating}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: '#FF337F', fontWeight: 600 }}>
                      {driver.vehicleModel} · {driver.plateNumber}
                    </div>
                    <div style={{ fontSize: 10, color: '#8E8E93', marginTop: 2 }}>
                      {driver.operationalArea} · {driver.tripsCount} trips
                    </div>
                  </div>
                </div>

                {isSelected ? (
                  <Check size={18} color="#FF337F" style={{ marginTop: 4 }} />
                ) : (
                  <button
                    style={{
                      background: '#FF337F',
                      color: 'white',
                      border: 'none',
                      padding: '4px 10px',
                      borderRadius: 99,
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Pilih
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
