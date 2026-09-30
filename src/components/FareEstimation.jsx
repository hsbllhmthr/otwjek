import React, { useState } from 'react';
import { ShieldCheck, ChevronDown, ChevronUp, Clock, MapPin } from 'lucide-react';
import { formatRupiah } from '../utils/fareCalculator.js';

export default function FareEstimation({
  fareBreakdown,
  distanceKm,
  durationMinutes = 15
}) {
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  if (!fareBreakdown) return null;

  return (
    <div className="fare-estimation-card">
      <div className="fare-summary-header">
        <div className="fare-left">
          <div className="fare-label-row">
            <span className="fare-title">Estimasi Tarif</span>
            <span className="fare-verified-badge">
              <ShieldCheck size={12} />
              <span>Transparan</span>
            </span>
          </div>
          <div className="fare-total-amount">
            {fareBreakdown.formattedTotal}
          </div>
          <div className="trip-meta-row">
            <span className="meta-item">
              <MapPin size={13} />
              {distanceKm} km
            </span>
            <span className="meta-dot">·</span>
            <span className="meta-item">
              <Clock size={13} />
              ~{durationMinutes} menit
            </span>
          </div>
        </div>

        <button
          className="btn-toggle-fare-detail"
          onClick={() => setIsDetailOpen(!isDetailOpen)}
          title="Rincian Biaya"
        >
          <span>Rincian</span>
          {isDetailOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {/* Expanded Rincian Tarif */}
      {isDetailOpen && (
        <div className="fare-breakdown-details">
          <div className="breakdown-row">
            <span className="detail-item-name">Tarif Dasar ({fareBreakdown.baseKm || 4} km pertama):</span>
            <span className="detail-item-value">{formatRupiah(fareBreakdown.baseFare)}</span>
          </div>

          {fareBreakdown.extraKm > 0 && (
            <div className="breakdown-row">
              <span className="detail-item-name">
                Jarak Tambahan ({fareBreakdown.extraKm} km):
              </span>
              <span className="detail-item-value">{formatRupiah(fareBreakdown.distanceCost)}</span>
            </div>
          )}

          {fareBreakdown.weightSurcharge > 0 && (
            <div className="breakdown-row">
              <span className="detail-item-name">Biaya Beban Berat Paket:</span>
              <span className="detail-item-value">{formatRupiah(fareBreakdown.weightSurcharge)}</span>
            </div>
          )}

          <div className="breakdown-row">
            <span className="detail-item-name">Proteksi Sisterhood & Admin:</span>
            <span className="detail-item-value">{formatRupiah(fareBreakdown.platformFee)}</span>
          </div>

          <div className="breakdown-total-row">
            <span>Total Pembayaran (Tunai/Transfer Admin):</span>
            <span className="total-highlight">{fareBreakdown.formattedTotal}</span>
          </div>
        </div>
      )}

      <style>{`
        .fare-estimation-card {
          background: #FFFFFF;
          border: 1.5px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          padding: 14px 16px;
          margin-bottom: 16px;
          box-shadow: var(--shadow-sm);
        }

        .fare-summary-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .fare-label-row {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .fare-title {
          font-size: 12px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .fare-verified-badge {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          font-size: 10px;
          font-weight: 700;
          color: #1B8A5A;
          background: #EBF9F3;
          padding: 2px 6px;
          border-radius: var(--radius-full);
        }

        .fare-total-amount {
          font-size: 24px;
          font-weight: 800;
          color: var(--primary);
          line-height: 1.2;
          margin-top: 2px;
          letter-spacing: -0.5px;
        }

        .trip-meta-row {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: var(--text-muted);
          margin-top: 4px;
          font-weight: 500;
        }

        .meta-item {
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .meta-dot {
          color: var(--text-light);
        }

        .btn-toggle-fare-detail {
          background: var(--bg-app);
          border: 1px solid var(--border-neutral);
          padding: 6px 12px;
          border-radius: var(--radius-full);
          font-size: 12px;
          font-weight: 700;
          color: var(--text-muted);
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
          transition: var(--transition);
        }

        .btn-toggle-fare-detail:hover {
          color: var(--primary);
          border-color: var(--primary);
        }

        .fare-breakdown-details {
          margin-top: 14px;
          padding-top: 12px;
          border-top: 1px dashed var(--border-subtle);
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 12px;
          animation: fadeIn 0.2s ease-out;
        }

        .breakdown-row {
          display: flex;
          justify-content: space-between;
          color: var(--text-muted);
        }

        .detail-item-value {
          font-weight: 600;
          color: var(--text-main);
        }

        .breakdown-total-row {
          display: flex;
          justify-content: space-between;
          padding-top: 8px;
          margin-top: 4px;
          border-top: 1px solid var(--border-neutral);
          font-weight: 700;
          color: var(--text-main);
        }

        .total-highlight {
          color: var(--primary);
          font-size: 13px;
        }
      `}</style>
    </div>
  );
}
