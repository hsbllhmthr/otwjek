import React, { useState, useEffect, useRef } from 'react';
import MapEngine from './components/MapEngine.jsx';
import DriverCatalogModal from './components/DriverCatalogModal.jsx';
import HomePage from './components/HomePage.jsx';
import WhereToPage from './components/WhereToPage.jsx';
import SendPackagePage from './components/SendPackagePage.jsx';
import DeliveryDetailsPage from './components/DeliveryDetailsPage.jsx';
import PickupSelectionPage from './components/PickupSelectionPage.jsx';
import RideConfirmationPage from './components/RideConfirmationPage.jsx';
import PaymentMethodsPage from './components/PaymentMethodsPage.jsx';
import BottomNavBar from './components/BottomNavBar.jsx';
import { ActivityView, MessageView, AccountView, PaymentView } from './components/SecondaryViews.jsx';

import { DEFAULT_PICKUP, DEFAULT_DROPOFF, POPULAR_LOCATIONS } from './data/popularLocations.js';
import { VERIFIED_DRIVERS } from './data/drivers.js';
import { calculateFare, formatRupiah } from './utils/fareCalculator.js';
import { fetchOSRMRoute, searchNominatim, reverseGeocodeNominatim, calculateHaversineDistance } from './utils/geoUtils.js';
import { buildWhatsAppLink, formatBookingMessage, openWhatsApp } from './utils/whatsappTemplate.js';
import { ADMINS } from './data/admins.js';
import RideDetailsPage from './components/RideDetailsPage.jsx';
import PackageDetailsPage from './components/PackageDetailsPage.jsx';
import WelcomeScreen from './components/WelcomeScreen.jsx';
import SignUpPage from './components/SignUpPage.jsx';

import {
  ChevronLeft,
  MapPin,
  ChevronRight,
  MoreHorizontal,
  Info,
  UserCheck,
  Bookmark,
  Edit3,
  ArrowUpDown,
  Search,
  X,
  Loader2
} from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState('welcome'); // 'welcome' | 'home' | 'ride' | 'food' | 'activity' | 'message' | 'account'
  const [activeTab, setActiveTab] = useState('ride'); // 'ride' | 'send'
  const [timeMode, setTimeMode] = useState('now'); // 'now' | 'later'
  const [selectedVehicleType, setSelectedVehicleType] = useState('bike'); // 'bike' | 'car' | 'express'
  const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash' | 'qris'

  // Location tracking states
  const [isLocationTrackingActive, setIsLocationTrackingActive] = useState(false);
  const [liveGpsCoords, setLiveGpsCoords] = useState(null);
  const watchIdRef = useRef(null);

  // Locations state
  const [pickup, setPickup] = useState(DEFAULT_PICKUP);
  const [dropoff, setDropoff] = useState(DEFAULT_DROPOFF);
  const [searchDestinationQuery, setSearchDestinationQuery] = useState(DEFAULT_DROPOFF.name);
  const [driverNotes, setDriverNotes] = useState('');
  const [isEditingNotes, setIsEditingNotes] = useState(false);

  // Selected Ride & Driver state
  const [selectedRideId, setSelectedRideId] = useState('protect');
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [isDriverCatalogOpen, setIsDriverCatalogOpen] = useState(false);
  const [selectedAdminId, setSelectedAdminId] = useState('admin-1');
  const [activeRideBooking, setActiveRideBooking] = useState(null);
  const [activePackageBooking, setActivePackageBooking] = useState(null);

  // Routing metrics
  const [distanceKm, setDistanceKm] = useState(3.8);
  const [durationMinutes, setDurationMinutes] = useState(18);
  const [routePolyline, setRoutePolyline] = useState([]);
  const [mapSelectionMode, setMapSelectionMode] = useState('pickup'); // 'pickup' | 'destination'

  // Floating Card Interactive Input & Autocomplete State
  const [pickupInput, setPickupInput] = useState(DEFAULT_PICKUP.name);
  const [activeFloatingInput, setActiveFloatingInput] = useState(null); // 'pickup' | 'dropoff' | null
  const [floatingSearchResults, setFloatingSearchResults] = useState([]);
  const [isSearchingFloating, setIsSearchingFloating] = useState(false);
  const searchDebounceRef = useRef(null);

  // Dynamic Destination Search & Nearby State for Side Panel
  const [panelSearchResults, setPanelSearchResults] = useState([]);
  const [isSearchingPanel, setIsSearchingPanel] = useState(false);
  const panelDebounceRef = useRef(null);

  const handleLocationActivated = (locData) => {
    setIsLocationTrackingActive(true);
    setLiveGpsCoords({
      lat: locData.lat,
      lng: locData.lng,
      accuracy: locData.accuracy
    });
    setPickup({
      name: locData.name,
      address: locData.address,
      fullAddress: locData.fullAddress || locData.address,
      lat: locData.lat,
      lng: locData.lng
    });

    // Start live continuous GPS tracking
    if (navigator.geolocation && !watchIdRef.current) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          setLiveGpsCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: Math.round(pos.coords.accuracy || 10)
          });
        },
        (err) => console.warn('watchPosition error:', err),
        { enableHighAccuracy: true, maximumAge: 5000 }
      );
    }
  };

  // Directly trigger native browser location permission on initial web access
  useEffect(() => {
    let isMounted = true;

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          if (!isMounted) return;
          try {
            const geo = await reverseGeocodeNominatim(pos.coords.latitude, pos.coords.longitude);
            handleLocationActivated({
              name: geo.name || 'Lokasi Saya',
              address: geo.subtitle,
              fullAddress: geo.displayName,
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: Math.round(pos.coords.accuracy || 10)
            });
          } catch (e) {
            handleLocationActivated({
              name: 'Lokasi Saya',
              address: `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`,
              fullAddress: '',
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: Math.round(pos.coords.accuracy || 10)
            });
          }
        },
        (err) => {
          console.warn('Native geolocation permission dismissed or denied:', err);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }

    return () => {
      isMounted = false;
      if (watchIdRef.current && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Sync input text when pickup or dropoff changes
  useEffect(() => {
    if (pickup?.name) setPickupInput(pickup.name);
  }, [pickup?.name]);

  useEffect(() => {
    if (dropoff?.name) setSearchDestinationQuery(dropoff.name);
  }, [dropoff?.name]);

  const handlePanelSearchChange = (value) => {
    setSearchDestinationQuery(value);

    if (panelDebounceRef.current) clearTimeout(panelDebounceRef.current);

    if (!value || value.trim().length === 0) {
      setPanelSearchResults([]);
      setIsSearchingPanel(false);
      return;
    }

    // Instant local filter from POPULAR_LOCATIONS
    const qLower = value.toLowerCase().trim();
    const localMatches = POPULAR_LOCATIONS.filter(
      (loc) =>
        loc.name.toLowerCase().includes(qLower) ||
        loc.address.toLowerCase().includes(qLower) ||
        loc.category?.toLowerCase().includes(qLower)
    );

    setPanelSearchResults(localMatches);

    if (value.trim().length >= 2) {
      setIsSearchingPanel(true);
      panelDebounceRef.current = setTimeout(async () => {
        const smartResults = await searchNominatim(value);
        setPanelSearchResults(smartResults || []);
        setIsSearchingPanel(false);
      }, 200);
    } else {
      setIsSearchingPanel(false);
    }
  };

  // Dynamically compute nearest locations around current pickup point
  const dynamicNearbyDestinations = React.useMemo(() => {
    const pLat = pickup?.lat || DEFAULT_PICKUP.lat;
    const pLng = pickup?.lng || DEFAULT_PICKUP.lng;

    const withDistances = POPULAR_LOCATIONS.map((loc) => {
      const dist = calculateHaversineDistance(pLat, pLng, loc.lat, loc.lng);
      return {
        ...loc,
        distanceKm: dist
      };
    });

    // Filter out locations that are too close to pickup (< 0.15km)
    // and sort by closest to pickup point
    const sorted = withDistances
      .filter((loc) => loc.distanceKm > 0.15)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    return sorted.slice(0, 4);
  }, [pickup?.lat, pickup?.lng]);

  const handleSelectDestination = (location) => {
    setDropoff({
      name: location.name,
      address: location.address,
      lat: location.lat,
      lng: location.lng
    });
    setSearchDestinationQuery(location.name);
    setPanelSearchResults([]);
    setIsSearchingPanel(false);
  };

  // Dynamic destinations to display in side panel:
  // If user searched, show search results; otherwise show nearest destinations to pickup
  const displayedDestinations = React.useMemo(() => {
    const pLat = pickup?.lat || DEFAULT_PICKUP.lat;
    const pLng = pickup?.lng || DEFAULT_PICKUP.lng;

    if (panelSearchResults.length > 0) {
      return panelSearchResults.slice(0, 3).map((loc) => ({
        ...loc,
        distanceKm: loc.distanceKm != null ? loc.distanceKm : calculateHaversineDistance(pLat, pLng, loc.lat, loc.lng)
      }));
    }
    return dynamicNearbyDestinations.slice(0, 3);
  }, [panelSearchResults, dynamicNearbyDestinations, pickup?.lat, pickup?.lng]);

  const handleFloatingInputChange = (type, value) => {
    if (type === 'pickup') {
      setPickupInput(value);
    } else {
      setSearchDestinationQuery(value);
    }
    setActiveFloatingInput(type);

    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    if (value.trim().length >= 2) {
      setIsSearchingFloating(true);
      searchDebounceRef.current = setTimeout(async () => {
        const results = await searchNominatim(value);
        setFloatingSearchResults(results || []);
        setIsSearchingFloating(false);
      }, 200);
    } else {
      setFloatingSearchResults([]);
      setIsSearchingFloating(false);
    }
  };

  const handleSelectFloatingLocation = (location) => {
    if (activeFloatingInput === 'pickup') {
      setPickup({
        name: location.name,
        address: location.address,
        lat: location.lat,
        lng: location.lng
      });
      setPickupInput(location.name);
    } else {
      setDropoff({
        name: location.name,
        address: location.address,
        lat: location.lat,
        lng: location.lng
      });
      setSearchDestinationQuery(location.name);
    }
    setActiveFloatingInput(null);
    setFloatingSearchResults([]);
  };

  // Mobile drawer collapse / minimize state
  const [isDrawerCollapsed, setIsDrawerCollapsed] = useState(false);
  const touchStartY = useRef(0);

  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    const touchEndY = e.changedTouches[0].clientY;
    const diff = touchEndY - touchStartY.current;
    if (diff > 35) {
      // Swiped down -> collapse
      setIsDrawerCollapsed(true);
    } else if (diff < -35) {
      // Swiped up -> expand
      setIsDrawerCollapsed(false);
    }
  };

  const currentAdmin = ADMINS.find((a) => a.id === selectedAdminId) || ADMINS[0];

  // Fetch actual driving route on location update
  useEffect(() => {
    let isCancelled = false;

    async function updateRoute() {
      if (!pickup?.lat || !pickup?.lng || !dropoff?.lat || !dropoff?.lng) return;

      const routeResult = await fetchOSRMRoute(
        pickup.lat,
        pickup.lng,
        dropoff.lat,
        dropoff.lng
      );

      if (!isCancelled) {
        setDistanceKm(routeResult.distanceKm);
        setDurationMinutes(routeResult.durationMinutes || 18);
        setRoutePolyline(routeResult.coordinates);
      }
    }

    updateRoute();

    return () => {
      isCancelled = true;
    };
  }, [pickup, dropoff]);

  // Fare calculations
  const motorFareResult = calculateFare({
    serviceType: 'ride',
    vehicleType: 'motor',
    distanceKm
  });
  const carFareResult = calculateFare({
    serviceType: 'ride',
    vehicleType: 'mobil',
    distanceKm
  });
  const sendFareResult = calculateFare({
    serviceType: 'send',
    vehicleType: 'motor',
    distanceKm
  });

  const motorPrice = motorFareResult.totalFare;
  const carPrice = carFareResult.totalFare;
  const sendPrice = sendFareResult.totalFare;

  const rideOptions = [
    {
      id: 'protect',
      name: 'SheRide Protect',
      desc: '100% Mitra Driver Perempuan Terverifikasi, Helm Steril',
      price: motorPrice + 2000,
      icon: '🛵'
    },
    {
      id: 'regular',
      name: 'SheRide Motor',
      desc: 'Cepat & praktis sesama perempuan',
      price: motorPrice,
      originalPrice: motorPrice + 3000,
      icon: '🛵'
    },
    {
      id: 'car',
      name: 'SheRide Mobil (Car)',
      desc: 'Kabin AC sejuk, bebas asap rokok, 4 kursi',
      price: carPrice,
      icon: '🚗'
    },
    {
      id: 'send',
      name: 'SheSend Express',
      desc: 'Kurir barang & makanan aman terpercaya',
      price: sendPrice,
      icon: '📦'
    }
  ];

  const currentRide = rideOptions.find((r) => r.id === selectedRideId) || rideOptions[0];

  // Booking via WhatsApp / Ride Details Page (Fitur Motor & Mobil)
  const handleBookWhatsApp = (bookingDetails = {}) => {
    const isSend = bookingDetails?.serviceType === 'send' || (!bookingDetails?.serviceType && activeTab === 'send');
    const ride = bookingDetails?.ride || currentRide;
    const pkgData = bookingDetails?.packageData || null;
    const pMethod = bookingDetails?.paymentMethod || paymentMethod || 'cash';

    // Jika fitur motor atau mobil (ride), buka halaman baru Ride Details (sesuai gambar referensi)
    if (!isSend) {
      setActiveRideBooking({
        ride,
        pickup,
        dropoff,
        distanceKm,
        durationMinutes,
        paymentMethod: pMethod,
        driverNotes: driverNotes || '',
        selectedDriver
      });
      setCurrentView('ride-details');
      return;
    }

    // Untuk fitur paket (send), langsung teruskan ke WhatsApp Admin dengan rotasi 4 admin
    const lastIdx = parseInt(localStorage.getItem('last_admin_dispatch_index') || '-1', 10);
    const nextIdx = (lastIdx + 1) % ADMINS.length;
    localStorage.setItem('last_admin_dispatch_index', nextIdx.toString());
    const targetAdmin = ADMINS[nextIdx] || ADMINS[0];

    const message = formatBookingMessage({
      serviceType: 'send',
      vehicleType: ride.id?.includes('car') ? 'mobil' : 'motor',
      pickupAddress: pickup?.name || pickup?.address || 'Titik Jemput di Peta',
      dropoffAddress: dropoff?.name || dropoff?.address || 'Titik Tujuan di Peta',
      distanceKm,
      formattedFare: formatRupiah(ride.price),
      customerName: 'Pelanggan OTWJek',
      customerNotes: pkgData?.specialNotes || driverNotes || '',
      driverName: selectedDriver?.name || 'Acak (Dicarikan Admin)',
      packageDetails: isSend ? (pkgData?.itemName || 'Paket / Makanan') : '',
      packageInfo: isSend ? pkgData : null,
      paymentMethod: pMethod,
      pickupCoords: pickup?.lat && pickup?.lng ? { lat: pickup.lat, lng: pickup.lng } : null,
      dropoffCoords: dropoff?.lat && dropoff?.lng ? { lat: dropoff.lat, lng: dropoff.lng } : null
    });

    const url = buildWhatsAppLink(targetAdmin.phone, message);
    openWhatsApp(url);
  };

  const handleSwapLocations = () => {
    const tempPickup = pickup;
    const tempDropoff = dropoff;
    setPickup(tempDropoff);
    setDropoff(tempPickup);
    setPickupInput(tempDropoff.name);
    setSearchDestinationQuery(tempPickup.name);
    setActiveFloatingInput(null);
  };

  const handleSelectDestinationFromWhereTo = (location, options = {}) => {
    // Preserve active pickup location (Current location / GPS coordinates)
    let currentPickup = pickup;
    if (options.pickupText && options.pickupText !== 'Current location') {
      const match = POPULAR_LOCATIONS.find(
        (p) => p.name.toLowerCase() === options.pickupText.toLowerCase()
      );
      if (match) {
        currentPickup = match;
      } else {
        currentPickup = {
          name: options.pickupText,
          address: options.pickupText,
          fullAddress: options.pickupText,
          lat: pickup?.lat || -5.2045,
          lng: pickup?.lng || 119.4550
        };
      }
      setPickup(currentPickup);
      setPickupInput(currentPickup.name);
    } else if (
      !currentPickup ||
      !currentPickup.lat ||
      (Math.abs(currentPickup.lat - location.lat) < 0.0001 && Math.abs(currentPickup.lng - location.lng) < 0.0001)
    ) {
      currentPickup = {
        name: 'Indo Mode Tamalate',
        address: 'Mangasa, Tamalate, Kota Makassar',
        fullAddress: 'Jl. Sultan Alauddin, Mangasa, Tamalate, Kota Makassar',
        lat: -5.1843,
        lng: 119.4182
      };
      setPickup(currentPickup);
      setPickupInput(currentPickup.name);
    }

    setDropoff({
      name: location.name,
      address: location.address,
      fullAddress: location.fullAddress || location.address,
      lat: location.lat,
      lng: location.lng
    });
    setSearchDestinationQuery(location.name);

    if (options.timeMode) {
      setTimeMode(options.timeMode);
    }

    if (options.vehicleType) {
      setSelectedVehicleType(options.vehicleType);
      if (options.vehicleType === 'car') {
        setSelectedRideId('car-protect');
        setActiveTab('ride');
      } else if (options.vehicleType === 'bike') {
        setSelectedRideId('protect');
        setActiveTab('ride');
      } else if (options.vehicleType === 'express') {
        setActiveTab('send');
      }
    }

    // Navigate to Delivery Details screen if in express/send package mode, otherwise directly to 'ride' (Book with cash)
    if (options.vehicleType === 'express' || currentView === 'send-package' || options.fromSendPackage) {
      setCurrentView('delivery-details');
    } else {
      // Directly proceed to the "Book with Cash" page
      setCurrentView('ride');
    }
  };

  const handleConfirmPickup = (selectedPickup, notes) => {
    if (selectedPickup) {
      setPickup({
        name: selectedPickup.name,
        address: selectedPickup.fullAddress || selectedPickup.address,
        lat: selectedPickup.lat,
        lng: selectedPickup.lng
      });
      setPickupInput(selectedPickup.name);
    }
    if (notes !== undefined && notes !== null) {
      setDriverNotes(notes);
    }

    // For express (kirim paket), return to 'send-package'
    // For motor (bike) and mobil (car), return to 'where-to'
    if (selectedVehicleType === 'express') {
      setCurrentView('send-package');
    } else {
      setCurrentView('where-to');
    }
  };

  const handleConfirmDestinationFromMap = (selectedDest) => {
    if (selectedDest) {
      setDropoff({
        name: selectedDest.name,
        address: selectedDest.fullAddress || selectedDest.address,
        fullAddress: selectedDest.fullAddress || selectedDest.address,
        lat: selectedDest.lat,
        lng: selectedDest.lng
      });
      setSearchDestinationQuery(selectedDest.name);
    }
    // For express (send package), proceed to delivery details; otherwise to ride (Book with cash)
    if (selectedVehicleType === 'express') {
      setCurrentView('delivery-details');
    } else {
      setCurrentView('ride');
    }
  };

  const handleSelectService = (serviceId, query, vehicleType) => {
    if (serviceId === 'send-package' || (serviceId === 'where-to' && vehicleType === 'express')) {
      setSelectedVehicleType('express');
      setActiveTab('send');
      setSelectedRideId('shesend-instant');
      if (query) {
        setSearchDestinationQuery(query);
      }
      setCurrentView('send-package');
      return;
    }

    if (serviceId === 'where-to') {
      const vType = vehicleType || 'bike';
      setSelectedVehicleType(vType);
      if (vType === 'car') {
        setSelectedRideId('car-protect');
        setActiveTab('ride');
      } else if (vType === 'bike') {
        setSelectedRideId('protect');
        setActiveTab('ride');
      } else if (vType === 'express') {
        setActiveTab('send');
      }

      if (query) {
        setSearchDestinationQuery(query);
      }
      setCurrentView('where-to');
      return;
    }

    if (serviceId === 'ride') {
      if (query) {
        setSearchDestinationQuery(query);
        handleFloatingInputChange('dropoff', query);
      }
      if (vehicleType === 'car') {
        setSelectedRideId('car-protect');
      } else if (vehicleType === 'bike') {
        setSelectedRideId('protect');
      }
      setActiveTab('ride');
      setCurrentView('ride');
    } else if (serviceId === 'express' || serviceId === 'send') {
      setActiveTab('send');
      setCurrentView('ride');
    } else if (serviceId === 'food') {
      setCurrentView('food');
    } else if (serviceId === 'account') {
      setCurrentView('account');
    } else if (serviceId === 'activity') {
      setCurrentView('activity');
    } else if (serviceId === 'payment') {
      setCurrentView('payment');
    }
  };

  if (currentView === 'welcome') {
    return (
      <div className="app-viewport-wrapper">
        <div className="bolt-app-shell">
          <WelcomeScreen
            onContinue={() => setCurrentView('home')}
            onSignUp={() => setCurrentView('signup')}
            onSignIn={() => setCurrentView('home')}
          />
        </div>
      </div>
    );
  }

  if (currentView === 'signup') {
    return (
      <div className="app-viewport-wrapper">
        <div className="bolt-app-shell">
          <SignUpPage
            onBack={() => setCurrentView('welcome')}
            onSuccess={() => setCurrentView('home')}
            onGoToSignIn={() => setCurrentView('welcome')}
          />
        </div>
      </div>
    );
  }

  if (currentView === 'home') {
    return (
      <div className="app-viewport-wrapper">
        <div className="bolt-app-shell">
          <HomePage
            onSelectService={handleSelectService}
            currentLocation={pickup?.name || 'Jakarta, Indonesia'}
          />
          <BottomNavBar
            activeTab="home"
            onChangeTab={(tab) => setCurrentView(tab)}
          />
        </div>
      </div>
    );
  }

  if (currentView === 'where-to') {
    return (
      <div className="app-viewport-wrapper">
        <div className="bolt-app-shell">
          <WhereToPage
            onBack={() => setCurrentView('home')}
            onOpenMap={(mode = 'destination') => {
              setMapSelectionMode(mode);
              setCurrentView('pickup-selection');
            }}
            onSelectDestination={handleSelectDestinationFromWhereTo}
            onSelectPickup={(newPickup) => {
              setPickup((prev) => ({
                ...prev,
                name: newPickup.name,
                address: newPickup.address || newPickup.subtitle || prev.address,
                fullAddress: newPickup.fullAddress || newPickup.address || prev.fullAddress,
                lat: newPickup.lat || prev.lat,
                lng: newPickup.lng || prev.lng
              }));
            }}
            selectedVehicleType={selectedVehicleType}
            timeMode={timeMode}
            onToggleTimeMode={(mode) => setTimeMode(mode)}
            userLocation={pickup?.name || 'Indo Mode Tamalate'}
          />
        </div>
      </div>
    );
  }

  if (currentView === 'send-package') {
    return (
      <div className="app-viewport-wrapper">
        <div className="bolt-app-shell">
          <SendPackagePage
            onBack={() => setCurrentView('home')}
            onOpenMap={(mode = 'destination') => {
              setMapSelectionMode(mode);
              setCurrentView('pickup-selection');
            }}
            onSelectDestination={handleSelectDestinationFromWhereTo}
            onSelectPickup={(newPickup) => {
              setPickup((prev) => ({
                ...prev,
                name: newPickup.name,
                address: newPickup.address || newPickup.subtitle || prev.address,
                fullAddress: newPickup.fullAddress || newPickup.address || prev.fullAddress,
                lat: newPickup.lat || prev.lat,
                lng: newPickup.lng || prev.lng
              }));
            }}
            timeMode={timeMode}
            onToggleTimeMode={(mode) => setTimeMode(mode)}
            userLocation={pickup?.name || 'Indo Mode Tamalate'}
          />
        </div>
      </div>
    );
  }

  if (currentView === 'delivery-details') {
    return (
      <div className="app-viewport-wrapper">
        <div className="bolt-app-shell">
          <DeliveryDetailsPage
            pickup={pickup}
            dropoff={dropoff}
            onBack={() => setCurrentView('send-package')}
            onSwapLocations={handleSwapLocations}
            onBook={handleBookWhatsApp}
            onReviewOrder={(pkgBooking) => {
              setActivePackageBooking(pkgBooking);
              setCurrentView('package-details');
            }}
            onUpdateDropoff={(newDropoff) => {
              setDropoff(newDropoff);
              if (newDropoff?.name) {
                setSearchDestinationQuery(newDropoff.name);
              }
            }}
            distanceKm={distanceKm}
          />
        </div>
      </div>
    );
  }

  if (currentView === 'package-details') {
    return (
      <div className="app-viewport-wrapper">
        <div className="bolt-app-shell">
          <PackageDetailsPage
            pickup={activePackageBooking?.pickup || pickup}
            dropoff={activePackageBooking?.dropoff || dropoff}
            senderInfo={activePackageBooking?.senderInfo}
            recipientInfo={activePackageBooking?.recipientInfo}
            itemInfo={activePackageBooking?.itemInfo}
            selectedVehicle={activePackageBooking?.selectedVehicle || 'bike'}
            deliverySpeed={activePackageBooking?.deliverySpeed || 'instant'}
            fare={activePackageBooking?.finalFare || 30500}
            distanceKm={activePackageBooking?.actualDistance || distanceKm}
            paymentMethod={activePackageBooking?.paymentMethod || paymentMethod}
            onBack={() => setCurrentView('delivery-details')}
            onCancelDelivery={() => setCurrentView('home')}
          />
        </div>
      </div>
    );
  }

  if (currentView === 'pickup-selection') {
    return (
      <div className="app-viewport-wrapper">
        <div className="bolt-app-shell">
          <PickupSelectionPage
            targetMode={mapSelectionMode}
            pickup={pickup}
            dropoff={dropoff}
            driverNotes={driverNotes || ''}
            onBack={() => setCurrentView(selectedVehicleType === 'express' ? 'send-package' : 'where-to')}
            onConfirmPickup={handleConfirmPickup}
            onConfirmDestination={handleConfirmDestinationFromMap}
            selectedVehicleType={selectedVehicleType}
          />
        </div>
      </div>
    );
  }


  if (currentView === 'activity') {
    return (
      <div className="app-viewport-wrapper">
        <div className="bolt-app-shell">
          <ActivityView onBack={() => setCurrentView('home')} />
          <BottomNavBar
            activeTab="activity"
            onChangeTab={(tab) => setCurrentView(tab)}
          />
        </div>
      </div>
    );
  }

  if (currentView === 'message') {
    return (
      <div className="app-viewport-wrapper">
        <div className="bolt-app-shell">
          <MessageView onBack={() => setCurrentView('home')} />
          <BottomNavBar
            activeTab="message"
            onChangeTab={(tab) => setCurrentView(tab)}
          />
        </div>
      </div>
    );
  }

  if (currentView === 'payment') {
    return (
      <div className="app-viewport-wrapper">
        <div className="bolt-app-shell">
          <PaymentView onBack={() => setCurrentView('home')} />
          <BottomNavBar
            activeTab="payment"
            onChangeTab={(tab) => setCurrentView(tab)}
          />
        </div>
      </div>
    );
  }

  if (currentView === 'account') {
    return (
      <div className="app-viewport-wrapper">
        <div className="bolt-app-shell">
          <AccountView
            onBack={() => setCurrentView('home')}
            onLogout={() => setCurrentView('welcome')}
          />
          <BottomNavBar
            activeTab="account"
            onChangeTab={(tab) => setCurrentView(tab)}
          />
        </div>
      </div>
    );
  }

  if (currentView === 'payment-methods') {
    return (
      <div className="app-viewport-wrapper">
        <div className="bolt-app-shell">
          <PaymentMethodsPage
            selectedMethod={paymentMethod}
            onBack={() => setCurrentView('ride')}
            onSelectMethod={(method) => {
              setPaymentMethod(method);
              setCurrentView('ride');
            }}
          />
        </div>
      </div>
    );
  }

  if (currentView === 'ride') {
    return (
      <div className="app-viewport-wrapper">
        <div className="bolt-app-shell">
          <RideConfirmationPage
            pickup={pickup}
            dropoff={dropoff}
            driverNotes={driverNotes}
            selectedVehicleType={selectedVehicleType}
            activeTab={activeTab}
            paymentMethod={paymentMethod}
            onOpenPaymentMethods={() => setCurrentView('payment-methods')}
            onBack={() => setCurrentView('where-to')}
            onEditPickup={() => {
              setMapSelectionMode('pickup');
              setCurrentView('pickup-selection');
            }}
            onBook={handleBookWhatsApp}
            distanceKm={distanceKm}
            durationMinutes={durationMinutes}
          />
        </div>
      </div>
    );
  }

  if (currentView === 'ride-details') {
    return (
      <div className="app-viewport-wrapper">
        <div className="bolt-app-shell">
          <RideDetailsPage
            pickup={activeRideBooking?.pickup || pickup}
            dropoff={activeRideBooking?.dropoff || dropoff}
            ride={activeRideBooking?.ride || currentRide}
            distanceKm={activeRideBooking?.distanceKm || distanceKm}
            durationMinutes={activeRideBooking?.durationMinutes || durationMinutes}
            paymentMethod={activeRideBooking?.paymentMethod || paymentMethod}
            driverNotes={activeRideBooking?.driverNotes || driverNotes}
            selectedDriver={activeRideBooking?.selectedDriver || selectedDriver}
            onBack={() => setCurrentView('ride')}
            onCancelRide={() => setCurrentView('home')}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="single-page-app">
      {/* Left / Side Booking Panel */}
      <aside className={`side-booking-panel ${isDrawerCollapsed ? 'is-collapsed' : ''}`}>
        {/* Mobile Drag & Collapse Handle - Clean minimalist pill only */}
        <div
          className="drawer-handle-zone"
          onClick={() => setIsDrawerCollapsed(!isDrawerCollapsed)}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div className="mobile-drawer-handle" />
        </div>

        {/* Minimized Peek Summary Bar when collapsed */}
        <div
          className="drawer-peek-summary"
          onClick={() => setIsDrawerCollapsed(false)}
        >
          <div className="peek-destination-info">
            <MapPin size={18} color="#EE4335" style={{ flexShrink: 0 }} />
            <div className="peek-texts">
              <span className="peek-title">{dropoff.name}</span>
              <span className="peek-meta">
                {durationMinutes} min · {formatRupiah(currentRide.price)}
              </span>
            </div>
          </div>
        </div>

        {/* Panel Header - Clean reference style */}
        <div className="panel-top-nav">
          <button
            className="btn-top-back"
            title="Kembali ke Pencarian Tujuan"
            onClick={() => setCurrentView('where-to')}
          >
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

          <div style={{ width: 36 }} />
        </div>

        {/* Scrollable Panel Content */}
        <div className="panel-scroll-content">
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

          {/* Pickup Point Card (Blue Target Pin) */}
          <div className="pickup-point-card">
            <div className="pickup-change-prompt">
              <div>
                <div className="pickup-prompt-title">Want to change the pickup point?</div>
                <div className="pickup-prompt-sub">An affordable location will save time.</div>
              </div>
              <button
                className="pickup-change-link"
                onClick={() => setCurrentView('pickup-selection')}
              >
                Change
              </button>
            </div>

            <div className="pickup-item-card">
              <div className="pickup-item-left">
                <div className="target-dot-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="9" stroke="#007AFF" strokeWidth="2.5" />
                    <circle cx="12" cy="12" r="4" fill="#007AFF" />
                  </svg>
                </div>
                <div>
                  <div className="pickup-item-name">
                    <span>{pickup.name}</span>
                    <span className="badge-recommended">Recommended</span>
                  </div>
                  <div className="destination-address">{pickup.address}</div>
                </div>
              </div>
              <Bookmark size={18} style={{ color: '#8E8E93', cursor: 'pointer' }} />
            </div>
          </div>

          {/* Destination Search Box ("Where to?") */}
          <div className="where-to-searchbox">
            <div className="searchbox-left">
              <Search size={18} className="searchbox-icon" />
              <input
                type="text"
                className="searchbox-input"
                placeholder="Where to? (Cari lokasi / stasiun...)"
                value={searchDestinationQuery}
                onChange={(e) => handlePanelSearchChange(e.target.value)}
              />
            </div>
            {searchDestinationQuery && (
              <button
                type="button"
                className="btn-clear-search"
                onClick={() => handlePanelSearchChange('')}
                title="Hapus pencarian"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Dynamic Quick Destinations List */}
          <div className="quick-list-section">
            <div className="quick-list-header">
              <span className="quick-list-label">
                {panelSearchResults.length > 0 ? 'Hasil Pencarian' : 'Tujuan di Sekitar Lokasi Jemput'}
              </span>
              {isSearchingPanel && (
                <span className="quick-list-searching">
                  <Loader2 size={12} className="spin-icon" />
                  Mencari...
                </span>
              )}
            </div>

            <div className="destinations-quick-list">
              {displayedDestinations.map((item) => (
                <div
                  key={item.id || `${item.lat}-${item.lng}`}
                  className="destination-row"
                  onClick={() => handleSelectDestination(item)}
                >
                  <div className="destination-row-left">
                    <div className="destination-pin-badge">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E1251B" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                        <circle cx="12" cy="10" r="3" stroke="#E1251B" strokeWidth="2" />
                      </svg>
                    </div>
                    <div className="destination-details">
                      <div className="destination-name-row">
                        <span className="destination-name">{item.name}</span>
                        {item.distanceKm != null && item.distanceKm > 0 && (
                          <span className="destination-distance-badge">
                            {item.distanceKm.toFixed(1)} km
                          </span>
                        )}
                      </div>
                      <div className="destination-address">{item.address}</div>
                    </div>
                  </div>
                  <ChevronRight size={18} className="destination-chevron" />
                </div>
              ))}
            </div>
          </div>

          {/* Suggested Rides List */}
          <div className="suggested-rides-section">
            <div className="suggested-rides-header">
              <div className="suggested-title">Suggested Rides</div>
              <button
                className="btn-view-all"
                onClick={() => setShowAllRides(!showAllRides)}
              >
                {showAllRides ? 'Hide ^' : 'View All ^'}
              </button>
            </div>

            <div className="ride-options-list">
              {(showAllRides ? rideOptions : rideOptions.slice(0, 2)).map((ride) => {
                const isSelected = selectedRideId === ride.id;
                return (
                  <div
                    key={ride.id}
                    className={`ride-option-row ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedRideId(ride.id)}
                  >
                    <div className="ride-row-left">
                      <div className="ride-icon-badge">{ride.icon}</div>
                      <div>
                        <div className="ride-name-row">
                          <span className="ride-name">{ride.name}</span>
                          <Info size={13} style={{ color: '#8E8E93' }} />
                        </div>
                        <div className="ride-desc">{ride.desc}</div>
                      </div>
                    </div>

                    <div className="ride-price-col">
                      <div className="ride-price">{formatRupiah(ride.price)}</div>
                      {ride.originalPrice && (
                        <div className="ride-price-strikethrough">
                          {formatRupiah(ride.originalPrice)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Driver Banner (if picked) */}
          {selectedDriver && (
            <div
              style={{
                background: '#FDF2F8',
                border: '1px solid #FBCFE8',
                borderRadius: 8,
                padding: '8px 12px',
                fontSize: 12,
                color: '#831843',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <UserCheck size={16} color="#FF337F" />
                <span>
                  Driver: <strong>{selectedDriver.name}</strong> ({selectedDriver.vehicleModel})
                </span>
              </div>
              <button
                onClick={() => setSelectedDriver(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#EE4335',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Ganti
              </button>
            </div>
          )}

          {/* Add Pick-up Notes for Driver */}
          {isEditingNotes ? (
            <div className="notes-input-container">
              <input
                type="text"
                className="notes-input-field"
                placeholder="Contoh: Tunggu di depan pos satpam..."
                value={driverNotes}
                onChange={(e) => setDriverNotes(e.target.value)}
                onBlur={() => setIsEditingNotes(false)}
                autoFocus
              />
            </div>
          ) : (
            <button
              className="btn-add-notes"
              onClick={() => setIsEditingNotes(true)}
            >
              <Edit3 size={13} />
              <span>{driverNotes ? `Catatan: "${driverNotes}"` : 'Tambah catatan jemput untuk driver'}</span>
            </button>
          )}

          {/* Dual Action Buttons: "Book" (Fill) & "GrabNow" (Outline) */}
          <div className="dual-action-buttons">
            <button
              className="btn-action-book"
              onClick={handleBookWhatsApp}
              id="btn-book-action"
            >
              Book
            </button>

            <button
              className="btn-action-grabnow"
              onClick={() => setIsDriverCatalogOpen(true)}
              id="btn-grabnow-action"
            >
              GrabNow
            </button>
          </div>
        </div>
      </aside>

      {/* Right / Full Viewport Map Engine */}
      <main className="full-map-area">
        {/* Floating Route Card (Matching Image 2 Reference) */}
        <div className="floating-route-card">
          <button
            className="btn-floating-route-back"
            onClick={() => setCurrentView('home')}
            title="Kembali ke Beranda"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="route-card-visual">
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=60&auto=format&fit=crop&q=80"
              alt="User"
              className="route-avatar-img"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
            <div className="route-connector-line" />
            <div className="route-green-ring" />
          </div>

          <div className="route-card-content">
            {/* Pickup Input Row */}
            <div className="route-point-row">
              <div className="route-card-input-wrapper">
                <input
                  type="text"
                  className="route-card-input"
                  value={pickupInput}
                  onChange={(e) => handleFloatingInputChange('pickup', e.target.value)}
                  onFocus={() => setActiveFloatingInput('pickup')}
                  placeholder="Lokasi jemput..."
                  title={pickupInput}
                />
                {activeFloatingInput === 'pickup' && pickupInput && (
                  <button
                    className="btn-clear-floating-input"
                    onClick={() => {
                      setPickupInput('');
                      handleFloatingInputChange('pickup', '');
                    }}
                    title="Hapus"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>

            <div className="route-row-divider" />

            {/* Destination Input Row */}
            <div className="route-point-row">
              <div className="route-card-input-wrapper">
                <input
                  type="text"
                  className="route-card-input"
                  value={searchDestinationQuery}
                  onChange={(e) => handleFloatingInputChange('dropoff', e.target.value)}
                  onFocus={() => setActiveFloatingInput('dropoff')}
                  placeholder="Mau ke mana? (Tujuan)..."
                  title={searchDestinationQuery}
                />
                {activeFloatingInput === 'dropoff' && searchDestinationQuery && (
                  <button
                    className="btn-clear-floating-input"
                    onClick={() => {
                      setSearchDestinationQuery('');
                      handleFloatingInputChange('dropoff', '');
                    }}
                    title="Hapus"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>
          </div>

          <button
            className="btn-swap-route"
            onClick={handleSwapLocations}
            title="Tukar titik jemput & tujuan"
          >
            <ArrowUpDown size={15} />
          </button>

          {/* Autocomplete / Popular Suggestions Dropdown directly beneath the card */}
          {activeFloatingInput && (
            <div className="floating-suggestions-dropdown">
              <div className="floating-suggestions-header">
                <span>
                  {isSearchingFloating
                    ? 'Mencari alamat...'
                    : activeFloatingInput === 'pickup'
                    ? 'Pilih Titik Jemput:'
                    : 'Pilih Titik Tujuan:'}
                </span>
                <button
                  className="btn-close-floating-dropdown"
                  onClick={() => setActiveFloatingInput(null)}
                >
                  Tutup
                </button>
              </div>

              {isSearchingFloating && (
                <div className="floating-loading-row">
                  <Loader2 size={16} className="spin-icon" />
                  <span>Menghubungi OpenStreetMap...</span>
                </div>
              )}

              {floatingSearchResults.length > 0 ? (
                <div>
                  {floatingSearchResults.map((item) => (
                    <div
                      key={item.id}
                      className="floating-suggestion-item"
                      onClick={() => handleSelectFloatingLocation(item)}
                    >
                      <Search size={16} className="floating-suggestion-icon" />
                      <div>
                        <div className="floating-suggestion-name">{item.name}</div>
                        <div className="floating-suggestion-address">{item.address}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div>
                  {dynamicNearbyDestinations.map((loc) => (
                    <div
                      key={loc.id}
                      className="floating-suggestion-item"
                      onClick={() => handleSelectFloatingLocation(loc)}
                    >
                      <MapPin size={16} className="floating-suggestion-icon" />
                      <div>
                        <div className="floating-suggestion-name">{loc.name}</div>
                        <div className="floating-suggestion-address">{loc.address}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <MapEngine
          pickup={pickup}
          dropoff={dropoff}
          routePolyline={routePolyline}
          drivers={VERIFIED_DRIVERS}
          showRoute={true}
        />
      </main>

      {/* Female Driver Catalog Modal */}
      <DriverCatalogModal
        isOpen={isDriverCatalogOpen}
        onClose={() => setIsDriverCatalogOpen(false)}
        selectedDriver={selectedDriver}
        onSelectDriver={(driver) => setSelectedDriver(driver)}
      />
    </div>
  );
}
