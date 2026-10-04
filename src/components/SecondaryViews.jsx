import React from 'react';
import { ChevronLeft, Clock, Wallet, MessageSquare, User } from 'lucide-react';

function MinimalEmptyState({ onBack, icon: IconComponent, title, subtitle }) {
  return (
    <div className="minimal-empty-view">
      {onBack && (
        <div className="minimal-empty-topbar">
          <button className="btn-minimal-back" onClick={onBack} aria-label="Kembali">
            <ChevronLeft size={24} />
          </button>
        </div>
      )}
      <div className="minimal-empty-content">
        <IconComponent size={48} strokeWidth={1.5} className="minimal-empty-icon" />
        <h2 className="minimal-empty-title">{title}</h2>
        <p className="minimal-empty-desc">{subtitle}</p>
      </div>
    </div>
  );
}

export function ActivityView({ onBack }) {
  return (
    <MinimalEmptyState
      onBack={onBack}
      icon={Clock}
      title="Segera Hadir"
      subtitle="Fitur riwayat aktivitas akan segera hadir"
    />
  );
}

export function PaymentView({ onBack }) {
  return (
    <MinimalEmptyState
      onBack={onBack}
      icon={Wallet}
      title="Segera Hadir"
      subtitle="Fitur pembayaran akan segera hadir"
    />
  );
}

export function MessageView({ onBack }) {
  return (
    <MinimalEmptyState
      onBack={onBack}
      icon={MessageSquare}
      title="Segera Hadir"
      subtitle="Fitur pesan akan segera hadir"
    />
  );
}

export function AccountView({ onBack, onLogout }) {
  return (
    <div className="minimal-empty-view">
      {onBack && (
        <div className="minimal-empty-topbar">
          <button className="btn-minimal-back" onClick={onBack} aria-label="Kembali">
            <ChevronLeft size={24} />
          </button>
        </div>
      )}
      <div className="minimal-empty-content" style={{ maxWidth: '320px', width: '100%', margin: '0 auto', textAlign: 'center' }}>
        <div style={{
          width: '74px',
          height: '74px',
          borderRadius: '50%',
          backgroundColor: '#E8F8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px auto',
          color: '#00C265'
        }}>
          <User size={40} strokeWidth={1.8} />
        </div>
        <h2 className="minimal-empty-title" style={{ fontSize: '20px', fontWeight: 700, marginBottom: '6px' }}>Pengguna Aktif</h2>
        <p className="minimal-empty-desc" style={{ fontSize: '13px', color: '#6B7280', marginBottom: '24px' }}>
          user@goride.id · Terhubung
        </p>
        
        {onLogout && (
          <button
            onClick={onLogout}
            style={{
              width: '100%',
              padding: '13px 20px',
              borderRadius: '9999px',
              border: '1px solid #FEE2E2',
              backgroundColor: '#FEF2F2',
              color: '#DC2626',
              fontWeight: 700,
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s ease'
            }}
          >
            Keluar (Kembali ke Halaman Awal)
          </button>
        )}
      </div>
    </div>
  );
}
