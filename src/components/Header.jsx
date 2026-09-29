import React from 'react';
import { ShieldCheck, Heart, UserPlus, Sparkles } from 'lucide-react';

export default function Header({ onOpenMitra, onOpenSafety }) {
  return (
    <header className="app-header">
      <div className="header-left">
        <div className="brand-logo">
          <div className="logo-icon-wrap">
            <Heart size={20} className="logo-heart" fill="currentColor" />
          </div>
          <div className="brand-text">
            <div className="brand-title">
              <span>She</span>Ride
              <span className="brand-dot">·</span>
              <span className="brand-sub">SheSend</span>
            </div>
            <div className="brand-tagline">Mobilitas Aman Sesama Perempuan</div>
          </div>
        </div>

        <div className="female-guarantee-badge" onClick={onOpenSafety}>
          <ShieldCheck size={14} />
          <span>100% Khusus Perempuan</span>
        </div>
      </div>

      <div className="header-right">
        <button 
          className="header-btn safety-btn"
          onClick={onOpenSafety}
          title="Standar Keamanan Sisterhood"
        >
          <Sparkles size={16} />
          <span className="btn-label">Keamanan</span>
        </button>

        <button 
          className="header-btn mitra-btn"
          onClick={onOpenMitra}
          title="Daftar Jadi Mitra Driver Wanita"
        >
          <UserPlus size={16} />
          <span className="btn-label">Gabung Mitra</span>
        </button>
      </div>

      <style>{`
        .app-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 20px;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid var(--border-subtle);
          position: sticky;
          top: 0;
          z-index: 1001;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .brand-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
        }

        .logo-icon-wrap {
          width: 38px;
          height: 38px;
          background: linear-gradient(135deg, var(--primary) 0%, #D44A78 100%);
          color: white;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 10px var(--primary-glow);
        }

        .logo-heart {
          animation: beat 2.4s infinite;
        }

        @keyframes beat {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.12); }
        }

        .brand-title {
          font-size: 19px;
          font-weight: 800;
          letter-spacing: -0.5px;
          color: var(--text-main);
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .brand-title span:first-child {
          color: var(--primary);
        }

        .brand-dot {
          color: var(--text-light);
          font-weight: 400;
        }

        .brand-sub {
          color: var(--secondary);
          font-weight: 700;
          font-size: 15px;
        }

        .brand-tagline {
          font-size: 11px;
          color: var(--text-muted);
          font-weight: 500;
        }

        .female-guarantee-badge {
          display: none;
          align-items: center;
          gap: 6px;
          background: #FDF2F5;
          color: var(--primary);
          border: 1px solid rgba(225, 91, 136, 0.2);
          padding: 5px 12px;
          border-radius: var(--radius-full);
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: var(--transition);
        }

        .female-guarantee-badge:hover {
          background: #FCE6EE;
          transform: translateY(-1px);
        }

        @media (min-width: 640px) {
          .female-guarantee-badge {
            display: flex;
          }
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .header-btn {
          border: none;
          padding: 8px 14px;
          border-radius: var(--radius-full);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: var(--transition);
        }

        .safety-btn {
          background: var(--secondary-light);
          color: var(--secondary);
          border: 1px solid rgba(140, 104, 205, 0.2);
        }

        .safety-btn:hover {
          background: #EAE3F7;
        }

        .mitra-btn {
          background: var(--primary-light);
          color: var(--primary);
          border: 1px solid rgba(225, 91, 136, 0.2);
        }

        .mitra-btn:hover {
          background: #FCE6EE;
        }

        @media (max-width: 480px) {
          .btn-label {
            display: none;
          }
          .header-btn {
            padding: 8px;
            border-radius: var(--radius-md);
          }
        }
      `}</style>
    </header>
  );
}
