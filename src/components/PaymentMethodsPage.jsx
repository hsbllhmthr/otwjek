import React, { useState } from 'react';
import {
  ArrowLeft,
  Banknote,
  CheckCircle2
} from 'lucide-react';
import qrisLogo from '../assets/qris_logo.png';

function RadioButton({ selected = false }) {
  if (selected) {
    return (
      <div className="payment-radio-selected">
        <div className="payment-radio-dot" />
      </div>
    );
  }
  return <div className="payment-radio-unselected" />;
}

export default function PaymentMethodsPage({
  onBack,
  selectedMethod = 'cash',
  onSelectMethod
}) {
  const [activeMethod, setActiveMethod] = useState(selectedMethod);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2400);
  };

  const handleSelect = (method) => {
    setActiveMethod(method);
    if (method === 'cash') {
      showToast('💵 Metode pembayaran: Cash');
    } else if (method === 'qris') {
      showToast('📱 Metode pembayaran: QRIS');
    }
    if (onSelectMethod) {
      setTimeout(() => {
        onSelectMethod(method);
      }, 350);
    }
  };

  return (
    <div className="payment-methods-page">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="ridego-toast-banner" style={{ zIndex: 100 }}>
          <CheckCircle2 size={16} color="#FF337F" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Header Bar */}
      <header className="payment-header-bar">
        <button
          type="button"
          className="payment-back-btn"
          onClick={onBack}
          aria-label="Kembali"
        >
          <ArrowLeft size={22} color="#111827" strokeWidth={2.4} />
        </button>
        <h1 className="payment-header-title">Payment Methods</h1>
      </header>

      {/* 2. Scrollable Body Content */}
      <div className="payment-scroll-body">
        {/* Cashless Promo Card with QRIS inside */}
        <div className="payment-promo-card">
          <div className="payment-promo-heading">Enjoy easier, cashless payments</div>

          <div
            className="payment-qris-card"
            onClick={() => handleSelect('qris')}
            role="button"
            tabIndex={0}
          >
            <div className="payment-qris-left">
              {/* QRIS Authentic Logo Badge */}
              <div className="qris-logo-box">
                <img src={qrisLogo} alt="QRIS" className="qris-logo-img" />
              </div>
              <div className="payment-qris-details">
                <div className="payment-qris-title">QRIS</div>
                <div className="payment-qris-sub">Scan the driver's QR to pay</div>
              </div>
            </div>
            <RadioButton selected={activeMethod === 'qris'} />
          </div>
        </div>

        {/* Section: Linked Methods */}
        <div className="payment-section">
          <div className="payment-section-title">Linked Methods</div>
          <div className="payment-section-sub">Swipe left to set your default</div>

          <div
            className="payment-method-row"
            onClick={() => handleSelect('cash')}
            role="button"
            tabIndex={0}
          >
            <div className="payment-row-left">
              <div className="payment-icon-circle bg-mint">
                <Banknote size={20} color="#FF337F" />
              </div>
              <span className="payment-method-name">Cash</span>
            </div>
            <RadioButton selected={activeMethod === 'cash'} />
          </div>
        </div>
      </div>
    </div>
  );
}
