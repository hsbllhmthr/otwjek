import React, { useState } from 'react';
import { ChevronLeft, MapPin, ChevronRight } from 'lucide-react';
import { POPULAR_LOCATIONS } from '../../data/popularLocations.js';

export default function Screen1Destination({
  activeTab,
  setActiveTab,
  onSelectDestination,
  onOpenNotes
}) {
  const [timeMode, setTimeMode] = useState('now'); // 'now' | 'later'
  const [searchQuery, setSearchQuery] = useState('');

  const referenceLocations = [
    {
      id: 'ref-1',
      name: 'Stasiun Pondok Cina',
      address: 'Jl. Stasiun Pondok Cina No.455, Jakarta, Beji...',
      lat: -6.3688,
      lng: 106.8322
    },
    {
      id: 'ref-2',
      name: 'Stasiun Tebet',
      address: 'Jl. Tebet Raya, Jakarta, Tebet Timur, Tebet, J...',
      lat: -6.2263,
      lng: 106.8582
    },
    {
      id: 'ref-3',
      name: 'Stasiun Bojong Gede',
      address: 'Jl. Raya Bojong Gede, Kedung Waringin, Bo...',
      lat: -6.4938,
      lng: 106.7951
    },
    ...POPULAR_LOCATIONS.slice(0, 2)
  ];

  const filteredLocations = referenceLocations.filter(loc => 
    loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    loc.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="screen-container">
      {/* Top Header: Back & Tabs (Ride | Send) */}
      <div className="app-screen-header">
        <button className="btn-header-back" title="Kembali">
          <ChevronLeft size={20} />
        </button>

        <div className="header-tabs-pill">
          <button
            className={`header-tab-btn ${activeTab === 'ride' ? 'active' : ''}`}
            onClick={() => setActiveTab('ride')}
          >
            Ride
          </button>
          <button
            className={`header-tab-btn ${activeTab === 'send' ? 'active' : ''}`}
            onClick={() => setActiveTab('send')}
          >
            Send
          </button>
        </div>

        <div style={{ width: 38 }} /> {/* Spacer for balance */}
      </div>

      {/* Spacer to push card to bottom */}
      <div style={{ flex: 1 }} />

      {/* Bottom Sheet Card */}
      <div className="grab-bottom-sheet">
        {/* Now / Later Toggle */}
        <div className="now-later-group">
          <button
            className={`pill-now-btn ${timeMode === 'now' ? 'active' : ''}`}
            onClick={() => setTimeMode('now')}
          >
            Now
          </button>
          <button
            className={`pill-later-btn ${timeMode === 'later' ? 'active' : ''}`}
            onClick={() => setTimeMode('later')}
          >
            Later
          </button>
        </div>

        {/* Big Search Bar: "Where to?" */}
        <div className="where-to-searchbox">
          <MapPin size={22} className="searchbox-icon" />
          <input
            type="text"
            className="searchbox-input"
            placeholder="Where to?"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus={false}
          />
        </div>

        {/* Recent / Suggested Destinations List */}
        <div className="destinations-list">
          {filteredLocations.slice(0, 3).map((loc) => (
            <div
              key={loc.id}
              className="destination-row"
              onClick={() => onSelectDestination(loc)}
            >
              <div className="destination-row-left">
                <MapPin size={18} className="destination-pin-icon" />
                <div className="destination-text">
                  <div className="destination-name">{loc.name}</div>
                  <div className="destination-address">{loc.address}</div>
                </div>
              </div>
              <ChevronRight size={18} className="destination-chevron" />
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .screen-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          position: relative;
        }
      `}</style>
    </div>
  );
}
