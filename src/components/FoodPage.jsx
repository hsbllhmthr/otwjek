import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  ArrowUpDown,
  CheckCircle2,
  Utensils,
  Plus,
  Trash2,
  DollarSign,
  Share2,
  Store,
  MapPin,
  Edit2
} from 'lucide-react';
import sherideHeroArt from '../assets/sheride_hero_pink.png';
import { searchNominatim } from '../utils/geoUtils.js';
import { ADMINS } from '../data/admins.js';
import { buildWhatsAppLink, formatFoodOrderMessage } from '../utils/whatsappTemplate.js';
import dbService from '../services/dbService.js';

// Pixel-perfect Red Location Pin for Delivery Destination
function RedLocationPin({ size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0 }}
    >
      <path
        d="M12 2C7.58 2 4 5.58 4 10C4 15.5 11.25 21.6 11.56 21.86C11.69 21.96 11.84 22 12 22C12.16 22 12.31 21.96 12.44 21.86C12.75 21.6 20 15.5 20 10C20 5.58 16.42 2 12 2Z"
        fill="#EE4335"
      />
      <circle cx="12" cy="9.8" r="3.2" fill="#FFFFFF" />
    </svg>
  );
}

// Pink Destination Ring for Restaurant / Pickup
function PinkDestinationRing({ size = 18 }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        border: '3.5px solid #FF337F',
        backgroundColor: '#FFFFFF',
        boxSizing: 'border-box',
        flexShrink: 0
      }}
    />
  );
}

// Pink Folded Map Icon (matching reference Image 2 "Select on map")
function PinkFoldedMapIcon({ size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#FF337F"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
    >
      <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
      <line x1="9" y1="3" x2="9" y2="18" />
      <line x1="15" y1="6" x2="15" y2="21" />
    </svg>
  );
}

// Purple Plus Circle Icon for "Add destination"
function PurplePlusCircleIcon({ size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0 }}
    >
      <circle cx="12" cy="12" r="10" fill="#4E4CE6" />
      <path d="M12 7.5V16.5M7.5 12H16.5" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

const POPULAR_FOOD_LOCATIONS = [
  {
    id: 'food-loc-1',
    name: 'Mie Gacoan Pettarani',
    address: 'Jl. A. P. Pettarani No.12, Panakkukang, Kota Makassar',
    lat: -5.1485,
    lng: 119.4352
  },
  {
    id: 'food-loc-2',
    name: 'Warung Coto Daeng Rewa',
    address: 'Jl. H.M. Yasin Limpo, Romangpolong, Somba Opu, Gowa',
    lat: -5.2045,
    lng: 119.4925
  },
  {
    id: 'food-loc-3',
    name: 'Ayam Geprek Juara Samata',
    address: 'Jl. Samata, Somba Opu, Kabupaten Gowa',
    lat: -5.2080,
    lng: 119.4960
  },
  {
    id: 'food-loc-4',
    name: 'Rumah Makan Nelayan Seafood',
    address: 'Jl. Ali Malaka No.25, Maloku, Ujung Pandang, Makassar',
    lat: -5.1415,
    lng: 119.4080
  },
  {
    id: 'food-loc-5',
    name: 'Kopi Kenangan Mall Panakkukang',
    address: 'Mall Panakkukang Lt. 1, Jl. Boulevard, Makassar',
    lat: -5.1568,
    lng: 119.4475
  },
  {
    id: 'food-loc-6',
    name: 'Martabak & Terang Bulan Istimewa',
    address: 'Jl. Sultan Alauddin No.88, Tamalate, Kota Makassar',
    lat: -5.1820,
    lng: 119.4210
  }
];

export default function FoodPage({
  onBack,
  onOpenMap,
  userLocation = 'Jl. H.M. Yasin Limpo, Somba Opu, Gowa'
}) {
  // Navigation step: 'select-location' (Step 1, matching SendPackagePage) | 'order-details' (Step 2, menu input)
  const [currentStep, setCurrentStep] = useState('select-location');

  // Step 1: Restaurant and Delivery Location Queries
  const [restaurantQuery, setRestaurantQuery] = useState('');
  const [deliveryQuery, setDeliveryQuery] = useState(
    userLocation && userLocation !== 'Current location'
      ? userLocation
      : 'B/15, Graha Sejahtera Residence'
  );
  const [activeField, setActiveField] = useState('restaurant'); // 'restaurant' | 'delivery'
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const restaurantInputRef = useRef(null);
  const deliveryInputRef = useRef(null);
  const debounceRef = useRef(null);

  // Step 2: Food Menu & Order Details
  const [restaurantPhone, setRestaurantPhone] = useState('');
  const [menuItems, setMenuItems] = useState([
    { id: 1, name: '', qty: 1, price: '', note: '' }
  ]);
  const [rawOrderNotes, setRawOrderNotes] = useState('');
  const [floorUnit, setFloorUnit] = useState('');
  const [customerName, setCustomerName] = useState(() => {
    const sessionUser = dbService?.session?.getCurrentUser();
    return sessionUser?.fullName || sessionUser?.full_name || sessionUser?.name || '';
  });
  const [customerPhone, setCustomerPhone] = useState(() => {
    const sessionUser = dbService?.session?.getCurrentUser();
    return sessionUser?.phone ? sessionUser.phone.replace(/^\+?62|^0/, '') : '';
  });
  const [driverNotes, setDriverNotes] = useState('');
  const [foodEstimatePrice, setFoodEstimatePrice] = useState('45000');
  const [deliveryFee] = useState(8000);
  const [platformFee] = useState(1000);
  const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash' | 'qris'
  const [selectedAdminId, setSelectedAdminId] = useState(ADMINS[0]?.id || 'admin-1');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  // Sync deliveryQuery when userLocation changes
  useEffect(() => {
    if (userLocation && userLocation !== 'Current location') {
      setDeliveryQuery(userLocation);
    }
  }, [userLocation]);

  // Focus restaurant input on mount
  useEffect(() => {
    if (currentStep === 'select-location') {
      const timer = setTimeout(() => {
        restaurantInputRef.current?.focus();
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [currentStep]);

  // Autocomplete search
  const performSearch = (val) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!val || val.trim().length === 0) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    if (val.trim().length >= 2) {
      setIsSearching(true);
      debounceRef.current = setTimeout(async () => {
        const smartResults = await searchNominatim(val);
        setSearchResults(smartResults || []);
        setIsSearching(false);
      }, 200);
    } else {
      setIsSearching(false);
    }
  };

  const handleRestaurantChange = (val) => {
    setRestaurantQuery(val);
    performSearch(val);
  };

  const handleDeliveryChange = (val) => {
    setDeliveryQuery(val);
    performSearch(val);
  };

  const handleSwapLocations = () => {
    const tempResto = restaurantQuery;
    const tempDest = deliveryQuery;
    setRestaurantQuery(tempDest);
    setDeliveryQuery(tempResto || 'Current location');
    showToast('🔄 Restaurant and delivery locations swapped');
  };

  const handleSelectLocation = (loc) => {
    if (activeField === 'restaurant') {
      setRestaurantQuery(loc.name);
      showToast(`🏪 Restaurant selected: ${loc.name}`);
      if (deliveryQuery && deliveryQuery.trim().length > 0) {
        setCurrentStep('order-details');
      } else {
        setActiveField('delivery');
        deliveryInputRef.current?.focus();
      }
    } else {
      setDeliveryQuery(loc.name);
      showToast(`📍 Delivery destination: ${loc.name}`);
      if (restaurantQuery && restaurantQuery.trim().length > 0) {
        setCurrentStep('order-details');
      } else {
        setActiveField('restaurant');
        restaurantInputRef.current?.focus();
      }
    }
  };

  const handleAddDestination = () => {
    if (!restaurantQuery.trim()) {
      showToast('⚠️ Please enter restaurant or food stall name');
      restaurantInputRef.current?.focus();
      return;
    }
    if (!deliveryQuery.trim()) {
      showToast('⚠️ Please enter delivery destination');
      deliveryInputRef.current?.focus();
      return;
    }
    setCurrentStep('order-details');
  };

  // Step 2 Form functions
  const handleAddMenuItem = () => {
    setMenuItems((prev) => [
      ...prev,
      { id: Date.now(), name: '', qty: 1, price: '', note: '' }
    ]);
  };

  const handleRemoveMenuItem = (id) => {
    if (menuItems.length <= 1) {
      setMenuItems([{ id: Date.now(), name: '', qty: 1, price: '', note: '' }]);
      return;
    }
    setMenuItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleUpdateMenuItem = (id, field, value) => {
    setMenuItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const parsedFoodPrice = parseInt(foodEstimatePrice.replace(/[^0-9]/g, '') || '0', 10);
  const totalFare = parsedFoodPrice + deliveryFee + platformFee;

  const handleSubmitOrder = () => {
    const hasItemName = menuItems.some((m) => m.name && m.name.trim().length > 0);
    if (!hasItemName && !rawOrderNotes.trim()) {
      showToast('⚠️ Please enter the food items to purchase');
      return;
    }

    const admin = ADMINS.find((a) => a.id === selectedAdminId) || ADMINS[0];

    const deliveryNotesCombined = [
      floorUnit.trim() ? `Floor/Unit: ${floorUnit.trim()}` : '',
      driverNotes.trim() ? `Note to driver: ${driverNotes.trim()}` : ''
    ].filter(Boolean).join(' | ');

    const message = formatFoodOrderMessage({
      restaurantName: restaurantQuery.trim() || 'Selected Restaurant',
      restaurantAddress: restaurantQuery.trim(),
      restaurantPhone: restaurantPhone.trim(),
      items: menuItems,
      rawOrderNotes: rawOrderNotes.trim(),
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      deliveryAddress: deliveryQuery.trim(),
      deliveryNotes: deliveryNotesCombined,
      foodEstimatePrice: parsedFoodPrice,
      deliveryFee,
      platformFee,
      totalFare,
      paymentMethod
    });

    const url = buildWhatsAppLink(admin.phone, message);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // =========================================================================
  // STEP 1: SELECT RESTAURANT & DELIVERY POINT (MATCHING SEND PACKAGE PAGE)
  // =========================================================================
  if (currentStep === 'select-location') {
    return (
      <div className="whereto-ref2-container">
        {/* Toast Notification */}
        {toastMessage && (
          <div className="ridego-toast-banner">
            <CheckCircle2 size={16} color="#FF337F" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Header Banner with SheRide Pink Illustration */}
        <div className="whereto-ref2-header">
          <img
            src={sherideHeroArt}
            alt="OTWFood Fleet"
            className="whereto-ref2-header-bg"
          />
          <div className="whereto-ref2-header-overlay" />

          <div className="whereto-ref2-nav-row">
            <button
              type="button"
              className="whereto-ref2-back-btn"
              onClick={onBack}
              aria-label="Back to Home"
            >
              <ArrowLeft size={19} color="#1F2937" strokeWidth={2.4} />
            </button>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <h1 className="whereto-ref2-title" style={{ fontSize: 19 }}>
                Where to order food?
              </h1>
            </div>
          </div>
        </div>

        {/* Main Content Sheet */}
        <div className="whereto-ref2-sheet">
          <div className="whereto-ref2-subtitle">
            Enter restaurant and delivery points
          </div>

          {/* Route Input Card (Matching Package Route Card) */}
          <div className="whereto-ref2-route-card">
            <div className="whereto-ref2-route-body">
              {/* Left Indicators */}
              <div className="whereto-ref2-route-indicators">
                <div
                  style={{ cursor: 'pointer' }}
                  onClick={() => onOpenMap && onOpenMap('pickup')}
                  title="Select restaurant location on map"
                >
                  <PinkDestinationRing size={16} />
                </div>
                <div className="whereto-ref2-route-dash" />
                <div
                  style={{ cursor: 'pointer' }}
                  onClick={() => onOpenMap && onOpenMap('destination')}
                  title="Select delivery location on map"
                >
                  <RedLocationPin size={18} />
                </div>
              </div>

              {/* Inputs */}
              <div className="whereto-ref2-route-inputs">
                {/* Field 1: Restaurant / Food Stall */}
                <div className="whereto-ref2-input-row">
                  <input
                    ref={restaurantInputRef}
                    type="text"
                    className="whereto-ref2-input"
                    value={restaurantQuery}
                    onChange={(e) => handleRestaurantChange(e.target.value)}
                    onFocus={() => setActiveField('restaurant')}
                    onClick={() => setActiveField('restaurant')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && restaurantQuery.trim()) {
                        deliveryInputRef.current?.focus();
                      }
                    }}
                    placeholder="Pick up food at?"
                    aria-label="Restaurant Location"
                  />
                </div>

                <div className="whereto-ref2-route-divider" />

                {/* Field 2: Deliver to? */}
                <div className="whereto-ref2-input-row">
                  <input
                    ref={deliveryInputRef}
                    type="text"
                    className="whereto-ref2-input"
                    value={deliveryQuery}
                    onFocus={() => setActiveField('delivery')}
                    onClick={() => setActiveField('delivery')}
                    onChange={(e) => handleDeliveryChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleAddDestination();
                      }
                    }}
                    placeholder="Deliver to?"
                    aria-label="Deliver to"
                  />
                </div>
              </div>
            </div>

            {/* Swap Button on Right */}
            <button
              type="button"
              className="whereto-ref2-swap-btn"
              onClick={handleSwapLocations}
              title="Swap locations"
              aria-label="Swap locations"
            >
              <ArrowUpDown size={14} color="#6366F1" />
            </button>
          </div>

          {/* Action Buttons: Select on map & Add destination */}
          <div className="whereto-ref2-actions">
            <button
              type="button"
              className="whereto-ref2-action-btn"
              onClick={() => onOpenMap && onOpenMap(activeField === 'restaurant' ? 'pickup' : 'destination')}
            >
              <PinkFoldedMapIcon size={16} />
              <span>Select on map</span>
            </button>

            <button
              type="button"
              className="whereto-ref2-action-btn"
              onClick={handleAddDestination}
            >
              <PurplePlusCircleIcon size={18} />
              <span>Add destination</span>
            </button>
          </div>

          {/* Popular Food Locations Suggestions */}
          <div className="whereto-ref2-suggestions">
            {(searchResults.length > 0 ? searchResults : POPULAR_FOOD_LOCATIONS).map((loc) => (
              <div
                key={loc.id}
                className="whereto-ref2-suggest-item"
                onClick={() => handleSelectLocation(loc)}
              >
                <div className="whereto-history-pin-icon" style={{ background: '#FF337F' }}>
                  <Utensils size={17} color="#FFFFFF" />
                </div>
                <div className="whereto-ref2-suggest-details">
                  <div className="whereto-ref2-suggest-name">{loc.name}</div>
                  <div className="whereto-ref2-suggest-address">{loc.address}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // STEP 2: FILL FOOD ORDER MENU DETAILS (CLEAN MINIMALIST ZERO SHADOW)
  // =========================================================================
  return (
    <div className="food-clean-viewport">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="clean-toast-banner">
          <CheckCircle2 size={16} color="#FF337F" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header - Matching reference design (left-aligned arrow + title) */}
      <header className="food-clean-header">
        <button
          type="button"
          className="btn-clean-back"
          onClick={() => setCurrentStep('select-location')}
          aria-label="Back to Location Selection"
        >
          <ArrowLeft size={22} color="#0F172A" strokeWidth={2.2} />
        </button>
        <h1 className="clean-title">Food Order Details</h1>
      </header>

      {/* Scrollable Form Body with Clean Cards */}
      <div className="food-clean-body">
        {/* Selected Route Info Card */}
        <section className="clean-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5, fontWeight: 700, color: '#1E293B' }}>
                <Store size={16} color="#FF337F" />
                <span>{restaurantQuery || 'Selected Restaurant'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: '#64748B' }}>
                <MapPin size={15} color="#EE4335" />
                <span>{deliveryQuery || 'Delivery Address'}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setCurrentStep('select-location')}
              className="btn-clean-edit-route"
            >
              <Edit2 size={13} />
              <span>Change</span>
            </button>
          </div>
        </section>

        {/* Section 1: Order Menu Items Card */}
        <section className="clean-card">
          <div className="card-head-between" style={{ marginBottom: 14 }}>
            <div className="card-head-simple">
              <Utensils size={18} color="#FF337F" />
              <h2 className="card-title">Order Menu Items</h2>
            </div>
            <button
              type="button"
              className="btn-clean-add"
              onClick={handleAddMenuItem}
            >
              <Plus size={14} />
              <span>Add Menu Item</span>
            </button>
          </div>

          {/* Dynamic Menu Items List */}
          <div className="clean-menu-list">
            {menuItems.map((item, index) => (
              <div key={item.id} className="clean-item-box">
                {menuItems.length > 1 && (
                  <div className="clean-item-top">
                    <span className="item-badge-text">Menu Item #{index + 1}</span>
                    <button
                      type="button"
                      className="btn-clean-del"
                      onClick={() => handleRemoveMenuItem(item.id)}
                      title="Remove this item"
                    >
                      <Trash2 size={15} color="#94A3B8" />
                    </button>
                  </div>
                )}

                {/* Food / Drink Name */}
                <div className="ref-form-group">
                  <label className="ref-input-label">
                    Food / drink name <span className="ref-asterisk">*</span>
                  </label>
                  <input
                    type="text"
                    className="ref-input-field"
                    placeholder="e.g. Fried Rice, Iced Lemon Tea..."
                    value={item.name}
                    onChange={(e) => handleUpdateMenuItem(item.id, 'name', e.target.value)}
                  />
                </div>

                {/* Portion Stepper */}
                <div className="ref-form-group">
                  <label className="ref-input-label">
                    Portion <span className="ref-asterisk">*</span>
                  </label>
                  <div className="ref-stepper-box">
                    <button
                      type="button"
                      className="ref-stepper-btn"
                      onClick={() => handleUpdateMenuItem(item.id, 'qty', Math.max(1, item.qty - 1))}
                      aria-label="Decrease portion"
                    >
                      -
                    </button>
                    <span className="ref-stepper-qty">{item.qty}</span>
                    <button
                      type="button"
                      className="ref-stepper-btn"
                      onClick={() => handleUpdateMenuItem(item.id, 'qty', item.qty + 1)}
                      aria-label="Increase portion"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Special Instructions */}
                <div className="ref-form-group" style={{ marginBottom: 0 }}>
                  <label className="ref-input-label">Special instructions (optional)</label>
                  <input
                    type="text"
                    className="ref-input-field"
                    placeholder="e.g. Medium spicy, less ice, no pickles..."
                    value={item.note}
                    onChange={(e) => handleUpdateMenuItem(item.id, 'note', e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Additional Notes Textarea */}
          <div className="ref-form-group" style={{ marginTop: 10, marginBottom: 0 }}>
            <label className="ref-input-label">Order notes</label>
            <textarea
              rows={3}
              className="ref-textarea-field"
              placeholder="Add special instructions or details for the restaurant..."
              value={rawOrderNotes}
              onChange={(e) => setRawOrderNotes(e.target.value)}
            />
          </div>
        </section>

        {/* Section 2: Contact & Delivery Notes Card (Matching User Reference Image) */}
        <section className="clean-card">
          <div className="card-head-simple" style={{ marginBottom: 14 }}>
            <MapPin size={18} color="#FF337F" />
            <h2 className="card-title">Delivery & Contact Details</h2>
          </div>

          {/* 1. Floor and unit no. */}
          <div className="ref-form-group">
            <label className="ref-input-label">Floor and unit no.</label>
            <input
              type="text"
              className="ref-input-field"
              placeholder="Add floor or unit no."
              maxLength={120}
              value={floorUnit}
              onChange={(e) => setFloorUnit(e.target.value)}
            />
            <div className="ref-char-counter">{floorUnit.length}/120</div>
          </div>

          {/* 2. Contact name * */}
          <div className="ref-form-group">
            <label className="ref-input-label">
              Contact name <span className="ref-asterisk">*</span>
            </label>
            <input
              type="text"
              className="ref-input-field"
              placeholder="Name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
          </div>

          {/* 3. Contact number * */}
          <div className="ref-form-group">
            <label className="ref-input-label">
              Contact number <span className="ref-asterisk">*</span>
            </label>
            <input
              type="tel"
              className="ref-input-field"
              placeholder="Phone number"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
            />
          </div>

          {/* 4. Note to driver */}
          <div className="ref-form-group" style={{ marginBottom: 0 }}>
            <label className="ref-input-label">Note to driver</label>
            <input
              type="text"
              className="ref-input-field"
              placeholder="Add a note to driver"
              value={driverNotes}
              onChange={(e) => setDriverNotes(e.target.value)}
            />
          </div>
        </section>

        {/* Section 3: Estimated Cost & Advance Card */}
        <section className="clean-card">
          <div className="card-head-simple" style={{ marginBottom: 14 }}>
            <DollarSign size={18} color="#FF337F" />
            <h2 className="card-title">Estimated Cost & Advance</h2>
          </div>

          <div className="ref-form-group">
            <label className="ref-input-label">
              Estimated food price (IDR) <span className="ref-asterisk">*</span>
            </label>
            <div className="ref-prefix-box">
              <span className="ref-prefix-tag">Rp</span>
              <input
                type="text"
                inputMode="numeric"
                className="ref-prefix-input"
                placeholder="45000"
                value={foodEstimatePrice}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  setFoodEstimatePrice(val);
                }}
              />
            </div>
            <div className="ref-input-hint">
              *The courier will advance payment at the restaurant and receive reimbursement upon arrival.
            </div>
          </div>

          {/* Simple Breakdown Table */}
          <div className="clean-breakdown-box">
            <div className="breakdown-line">
              <span>Estimated Food Cost (Courier Advance)</span>
              <span>Rp {parsedFoodPrice.toLocaleString('id-ID')}</span>
            </div>
            <div className="breakdown-line">
              <span>Courier Delivery Fee</span>
              <span>Rp {deliveryFee.toLocaleString('id-ID')}</span>
            </div>
            <div className="breakdown-line">
              <span>Platform Service Fee</span>
              <span>Rp {platformFee.toLocaleString('id-ID')}</span>
            </div>
            <div className="breakdown-divider" />
            <div className="breakdown-line total">
              <span>Total Estimated Payment</span>
              <span className="total-pink">Rp {totalFare.toLocaleString('id-ID')}</span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="ref-form-group" style={{ marginTop: 14 }}>
            <label className="ref-input-label">Payment Method</label>
            <div className="clean-options-row">
              <button
                type="button"
                className={`clean-option-btn ${paymentMethod === 'cash' ? 'active' : ''}`}
                onClick={() => setPaymentMethod('cash')}
              >
                💵 Cash (Upon Arrival)
              </button>
              <button
                type="button"
                className={`clean-option-btn ${paymentMethod === 'qris' ? 'active' : ''}`}
                onClick={() => setPaymentMethod('qris')}
              >
                📱 QRIS Barcode
              </button>
            </div>
          </div>

          {/* Admin Dispatcher Selection */}
          <div className="ref-form-group" style={{ marginTop: 14, marginBottom: 0 }}>
            <label className="ref-input-label">Select WhatsApp Admin Dispatch</label>
            <div className="clean-options-row">
              {ADMINS.slice(0, 2).map((adm) => (
                <button
                  key={adm.id}
                  type="button"
                  className={`clean-option-btn ${selectedAdminId === adm.id ? 'active' : ''}`}
                  onClick={() => setSelectedAdminId(adm.id)}
                >
                  <span className="clean-dot" />
                  <span>{adm.name} ({adm.role})</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Submit Action */}
        <div className="clean-footer-area">
          <button
            type="button"
            className="btn-clean-submit"
            onClick={handleSubmitOrder}
          >
            <Share2 size={17} />
            <span>Order Food via WhatsApp (Rp {totalFare.toLocaleString('id-ID')})</span>
          </button>
        </div>
      </div>

      <style>{`
        .food-clean-viewport {
          position: absolute;
          inset: 0;
          background: #F8F9FA;
          display: flex;
          flex-direction: column;
          z-index: 1000;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          overflow: hidden;
          letter-spacing: -0.15px;
        }

        .clean-toast-banner {
          position: fixed;
          top: 14px;
          left: 50%;
          transform: translateX(-50%);
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 10px;
          padding: 8px 16px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 600;
          color: #1E293B;
          z-index: 3000;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
        }

        .food-clean-header {
          height: 56px;
          background: #FFFFFF;
          display: flex;
          align-items: center;
          padding: 0 16px;
          gap: 12px;
          flex-shrink: 0;
          border-bottom: 1px solid #F1F5F9;
          box-shadow: none !important;
        }

        .btn-clean-back {
          background: transparent;
          border: none;
          width: 36px;
          height: 36px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #0F172A;
          padding: 0;
          margin-left: -4px;
          transition: background 0.15s ease;
        }

        .btn-clean-back:hover {
          background: #F8FAFC;
        }

        .clean-title {
          font-size: 18px;
          font-weight: 700;
          color: #0F172A;
          margin: 0;
          letter-spacing: -0.25px;
        }

        /* Clean Scroll Body with Flat Cards */
        .food-clean-body {
          flex: 1;
          overflow-y: auto;
          background: #F8F9FA;
          padding: 14px 16px 32px 16px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          -webkit-overflow-scrolling: touch;
        }

        /* Clean Flat Cards (Zero Shadow) */
        .clean-card {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 14px;
          padding: 16px;
          box-shadow: none !important;
          display: flex;
          flex-direction: column;
        }

        .btn-clean-edit-route {
          background: #FDF2F8;
          border: 1px solid #FBCFE8;
          color: #FF337F;
          font-size: 12px;
          font-weight: 650;
          padding: 4px 10px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 4px;
          cursor: pointer;
          box-shadow: none !important;
        }

        .card-head-simple {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .card-head-between {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .card-title {
          font-size: 15px;
          font-weight: 700;
          color: #1E293B;
          margin: 0;
          letter-spacing: -0.2px;
        }

        .btn-clean-add {
          background: #FDF2F8;
          border: 1px solid #FF337F;
          color: #FF337F;
          font-size: 12px;
          font-weight: 650;
          padding: 4px 10px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 4px;
          cursor: pointer;
          box-shadow: none !important;
          transition: background 0.15s;
        }

        .btn-clean-add:hover {
          background: #FF337F;
          color: #FFFFFF;
        }

        /* =========================================================================
           INPUT STYLING MATCHING USER'S REFERENCE IMAGE
           ========================================================================= */
        .ref-form-group {
          display: flex;
          flex-direction: column;
          margin-bottom: 16px;
          width: 100%;
        }

        .ref-input-label {
          font-size: 14px;
          font-weight: 600;
          color: #1E293B;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          letter-spacing: -0.15px;
        }

        .ref-asterisk {
          color: #EF4444;
          font-size: 14px;
          font-weight: 600;
          margin-left: 3px;
        }

        .ref-input-field {
          width: 100%;
          height: 48px;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          padding: 0 16px;
          font-size: 14px;
          color: #1E293B;
          background: #FFFFFF;
          outline: none;
          box-sizing: border-box;
          font-family: inherit;
          box-shadow: none !important;
          transition: border-color 0.15s ease;
        }

        .ref-input-field::placeholder {
          color: #94A3B8;
          font-weight: 400;
        }

        .ref-input-field:focus {
          border-color: #FF337F;
        }

        .ref-char-counter {
          font-size: 12px;
          color: #94A3B8;
          margin-top: 5px;
          padding-left: 2px;
          font-weight: 500;
        }

        .ref-textarea-field {
          width: 100%;
          min-height: 84px;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          padding: 12px 16px;
          font-size: 14px;
          color: #1E293B;
          background: #FFFFFF;
          outline: none;
          box-sizing: border-box;
          font-family: inherit;
          resize: vertical;
          box-shadow: none !important;
          transition: border-color 0.15s ease;
        }

        .ref-textarea-field::placeholder {
          color: #94A3B8;
          font-weight: 400;
        }

        .ref-textarea-field:focus {
          border-color: #FF337F;
        }

        /* Stepper matching rounded input style */
        .ref-stepper-box {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          height: 48px;
          padding: 0 8px;
          box-sizing: border-box;
          box-shadow: none !important;
        }

        .ref-stepper-btn {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          border: none;
          background: #F1F5F9;
          color: #1E293B;
          font-size: 16px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: none !important;
          transition: background 0.15s ease;
        }

        .ref-stepper-btn:hover {
          background: #E2E8F0;
        }

        .ref-stepper-qty {
          font-size: 14.5px;
          font-weight: 700;
          color: #1E293B;
        }

        /* Prefix box for Price */
        .ref-prefix-box {
          display: flex;
          align-items: center;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          height: 48px;
          background: #FFFFFF;
          overflow: hidden;
          box-shadow: none !important;
          transition: border-color 0.15s ease;
        }

        .ref-prefix-box:focus-within {
          border-color: #FF337F;
        }

        .ref-prefix-tag {
          padding: 0 14px;
          font-size: 14px;
          font-weight: 650;
          color: #64748B;
          background: #F8FAFC;
          height: 100%;
          display: flex;
          align-items: center;
          border-right: 1px solid #E2E8F0;
        }

        .ref-prefix-input {
          flex: 1;
          height: 100%;
          border: none;
          outline: none;
          padding: 0 16px;
          font-size: 14px;
          font-weight: 600;
          color: #1E293B;
          background: transparent;
        }

        .ref-prefix-input::placeholder {
          color: #94A3B8;
          font-weight: 400;
        }

        .ref-input-hint {
          font-size: 11.5px;
          color: #64748B;
          line-height: 1.35;
          margin-top: 5px;
          padding-left: 2px;
        }

        /* Menu item list wrapper */
        .clean-menu-list {
          display: flex;
          flex-direction: column;
        }

        .clean-item-box {
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          padding: 14px;
          margin-bottom: 12px;
          box-shadow: none !important;
        }

        .clean-item-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .item-badge-text {
          font-size: 12px;
          font-weight: 700;
          color: #FF337F;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .btn-clean-del {
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          border-radius: 6px;
        }

        .btn-clean-del:hover svg {
          color: #EF4444 !important;
        }

        /* Breakdown Table */
        .clean-breakdown-box {
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          padding: 12px 14px;
          display: flex;
          flex-direction: column;
          gap: 7px;
          box-shadow: none !important;
        }

        .breakdown-line {
          display: flex;
          justify-content: space-between;
          font-size: 12.5px;
          color: #475569;
        }

        .breakdown-divider {
          height: 1px;
          background: #E2E8F0;
          margin: 4px 0;
        }

        .breakdown-line.total {
          font-size: 13.5px;
          font-weight: 750;
          color: #1E293B;
        }

        .total-pink {
          color: #FF337F;
          font-size: 14.5px;
        }

        .clean-options-row {
          display: flex;
          gap: 8px;
        }

        .clean-option-btn {
          flex: 1;
          height: 44px;
          padding: 0 12px;
          border-radius: 12px;
          border: 1px solid #E2E8F0;
          background: #FFFFFF;
          font-size: 12.5px;
          font-weight: 600;
          color: #475569;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          box-shadow: none !important;
          transition: all 0.15s ease;
        }

        .clean-option-btn.active {
          border-color: #FF337F;
          background: #FDF2F8;
          color: #FF337F;
        }

        .clean-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #10B981;
          flex-shrink: 0;
        }

        .clean-footer-area {
          margin-top: 14px;
          margin-bottom: 12px;
        }

        .btn-clean-submit {
          width: 100%;
          height: 50px;
          border-radius: 12px;
          background: #FF337F;
          color: #FFFFFF;
          font-size: 14.5px;
          font-weight: 700;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
          box-shadow: none !important;
          transition: background-color 0.15s;
        }

        .btn-clean-submit:hover {
          background: #E11D6F;
        }

        .btn-clean-submit:active {
          transform: translateY(0.5px);
        }
      `}</style>
    </div>
  );
}
