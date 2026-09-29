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

export function AccountView({ onBack }) {
  return (
    <MinimalEmptyState
      onBack={onBack}
      icon={User}
      title="Segera Hadir"
      subtitle="Fitur profil akan segera hadir"
    />
  );
}
