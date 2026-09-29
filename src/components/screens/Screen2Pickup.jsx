import React, { useState } from 'react';
import { ChevronLeft, Plus, Bookmark, MapPin, Edit3, ChevronRight, Check } from 'lucide-react';

export default function Screen2Pickup({
  pickup,
  setPickup,
  onConfirmPickup,
  onBack,
  driverNotes,
  setDriverNotes
}) {
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [selectedSpotIndex, setSelectedSpotIndex] = useState(0);

  const recommendedSpots = [
    {
      id: 'spot-1',
      name: pickup?.name || 'Pin Location',
      address: pickup?.address || 'Jl. Raya Mauk, Liti Waringin, Mauk, Tanger...',
      isCurrentPin: true
    },
    {
      id: 'spot-2',
      name: 'Lita Agung Net',
      badge: 'Recommended',
      address: 'Jl. Raya Mauk, Liti Waringin, Mauk, Tanger...',
      isCurrentPin: false
    },
    {
      id: 'spot-3',
      name: 'Jalan Pandan Wangi',
      address: 'Jl. Raya Mauk, Liti Waringin, Mauk, Tanger...',
      isCurrentPin: false
    }
  ];

  const handleSelectSpot = (spot, index) => {
    setSelectedSpotIndex(index);
    if (!spot.isCurrentPin) {
      setPickup(prev => ({
        ...prev,
        name: spot.name,
        address: spot.address
      }));
    }
  };

  return (
    <div className="screen-container">
      {/* Top Header: Back Button */}
      <div className="app-screen-header">
        <button className="btn-header-back" onClick={onBack} title="Kembali ke Pencarian">
          <ChevronLeft size={20} />
        </button>

        {/* Floating Chip: "Pickup Suggestion > +" */}
        <div className="floating-map-chip">
          <span>Pickup Suggestion</span>
          <ChevronRight size={14} style={{ color: '#8E8E93' }} />
          <div style={{ width: 1, height: 16, background: '#E5E7EB', margin: '0 4px' }} />
          <Plus size={16} style={{ color: '#00B14F', cursor: 'pointer' }} />
        </div>

        <div style={{ width: 38 }} />
      </div>

      <div style={{ flex: 1 }} />

      {/* Bottom Sheet Card */}
      <div className="grab-bottom-sheet">
        {/* Change Prompt Header */}
        <div className="pickup-change-prompt">
          <div>
            <div className="pickup-prompt-title">Want to change the pickup point?</div>
            <div className="pickup-prompt-sub">An affordable location will save time.</div>
          </div>
          <button className="pickup-change-link" onClick={() => handleSelectSpot(recommendedSpots[1], 1)}>
            Change
          </button>
        </div>

        {/* Spot 1: Pin Location (Blue Target) */}
        <div
          className={`pickup-item-card ${selectedSpotIndex === 0 ? 'selected-item' : ''}`}
          onClick={() => handleSelectSpot(recommendedSpots[0], 0)}
        >
          <div className="pickup-item-left">
            <div className="target-dot-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="#007AFF" strokeWidth="2.5" />
                <circle cx="12" cy="12" r="4" fill="#007AFF" />
              </svg>
            </div>
            <div className="destination-text">
              <div className="pickup-item-name">{recommendedSpots[0].name}</div>
              <div className="destination-address">{recommendedSpots[0].address}</div>
            </div>
          </div>
          <Bookmark size={18} style={{ color: '#8E8E93', cursor: 'pointer' }} />
        </div>

        {/* Spot 2: Lita Agung Net (Recommended) */}
        <div
          className={`pickup-item-card ${selectedSpotIndex === 1 ? 'selected-item' : ''}`}
          onClick={() => handleSelectSpot(recommendedSpots[1], 1)}
        >
          <div className="pickup-item-left">
            <MapPin size={18} style={{ color: '#EE4335', marginTop: 2, flexShrink: 0 }} />
            <div className="destination-text">
              <div className="pickup-item-name">
                <span>{recommendedSpots[1].name}</span>
                <span className="badge-recommended">Recommended</span>
              </div>
              <div className="destination-address">{recommendedSpots[1].address}</div>
            </div>
          </div>
          <ChevronRight size={18} className="destination-chevron" />
        </div>

        {/* Spot 3: Jalan Pandan Wangi */}
        <div
          className={`pickup-item-card ${selectedSpotIndex === 2 ? 'selected-item' : ''}`}
          onClick={() => handleSelectSpot(recommendedSpots[2], 2)}
        >
          <div className="pickup-item-left">
            <MapPin size={18} style={{ color: '#EE4335', marginTop: 2, flexShrink: 0 }} />
            <div className="destination-text">
              <div className="pickup-item-name">{recommendedSpots[2].name}</div>
              <div className="destination-address">{recommendedSpots[2].address}</div>
            </div>
          </div>
          <ChevronRight size={18} className="destination-chevron" />
        </div>

        {/* Add Pick-up Notes for Driver */}
        {isEditingNotes ? (
          <div style={{ margin: '8px 0' }}>
            <input
              type="text"
              className="where-to-searchbox searchbox-input"
              style={{ fontSize: 13, padding: '8px 12px', background: '#F2F4F7' }}
              placeholder="Contoh: Tunggu di depan pos satpam..."
              value={driverNotes}
              onChange={(e) => setDriverNotes(e.target.value)}
              onBlur={() => setIsEditingNotes(false)}
              autoFocus
            />
          </div>
        ) : (
          <button className="btn-add-notes" onClick={() => setIsEditingNotes(true)}>
            <Edit3 size={15} />
            <span>{driverNotes ? `Catatan: "${driverNotes}"` : 'Add pick-up notes for driver'}</span>
          </button>
        )}

        {/* Big Green Confirm Button */}
        <button
          className="btn-grab-confirm"
          onClick={onConfirmPickup}
          id="btn-confirm-pickup"
        >
          Confirm Pick-Up
        </button>
      </div>

      <style>{`
        .screen-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          position: relative;
        }

        .selected-item {
          background-color: #F8FBFF;
          border-radius: 8px;
          padding: 8px !important;
        }
      `}</style>
    </div>
  );
}
