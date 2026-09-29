import React from 'react';
import { Wifi, Battery, Signal } from 'lucide-react';

export default function PhoneShell({
  children,
  time = '10:38',
  onBack
}) {
  return (
    <div className="phone-mockup">
      {/* Phone Status Bar (Time, Wifi, Battery) */}
      <div className="phone-status-bar">
        <span className="status-time">{time}</span>
        <div className="status-icons">
          <Signal size={12} />
          <Wifi size={12} />
          <Battery size={14} />
        </div>
      </div>

      {/* Screen Viewport */}
      <div className="phone-viewport">
        {children}
      </div>

      {/* Bottom Android Navigation Bar */}
      <div className="phone-nav-bar">
        <span className="nav-bar-btn" onClick={onBack}>◀</span>
        <span className="nav-bar-btn">●</span>
        <span className="nav-bar-btn">■</span>
      </div>
    </div>
  );
}
