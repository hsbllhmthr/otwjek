import React, { useState, useEffect, useCallback } from 'react';
import {
  HomeNavIcon,
  ActivityNavIcon,
  ProfileNavIcon
} from './BottomNavIcons.jsx';
import { Bell, X, Volume2, ChevronRight } from 'lucide-react';
import dbService, { normalizePhone } from '../services/dbService.js';
import { formatRupiah } from '../utils/fareCalculator.js';

const NOTIFIED_TASKS_STORAGE_KEY = 'otwjek_driver_notified_tasks_v1';

export function playDriverTaskSound() {
  try {
    if (typeof window === 'undefined') return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    // Nada notifikasi tugas masuk 3-not naik (D5 -> F#5 -> A5 -> D6) yang jernih
    const notes = [
      { freq: 587.33, start: 0, duration: 0.13 },
      { freq: 739.99, start: 0.14, duration: 0.13 },
      { freq: 880.0, start: 0.28, duration: 0.15 },
      { freq: 1174.66, start: 0.44, duration: 0.32 }
    ];

    notes.forEach(({ freq, start, duration }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + start);

      gain.gain.setValueAtTime(0.001, now + start);
      gain.gain.exponentialRampToValueAtTime(0.28, now + start + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.001, now + start + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + start);
      osc.stop(now + start + duration + 0.02);
    });

    setTimeout(() => {
      try {
        ctx.close();
      } catch {
        // ignore
      }
    }, 1000);

    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate([160, 80, 160]);
    }
  } catch {
    // Abaikan jika browser memblokir autoplay audio sebelum interaksi
  }
}

function getNotifiedTaskKeys() {
  try {
    const raw = localStorage.getItem(NOTIFIED_TASKS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function markTaskKeyNotified(taskKey) {
  if (!taskKey) return;
  try {
    const current = getNotifiedTaskKeys();
    if (!current.includes(taskKey)) {
      const next = [...current.slice(-50), taskKey];
      localStorage.setItem(NOTIFIED_TASKS_STORAGE_KEY, JSON.stringify(next));
    }
  } catch {
    // ignore storage errors
  }
}

export default function BottomNavBar({ activeTab, onChangeTab, currentUser, isDriver }) {
  const [activityCount, setActivityCount] = useState(0);
  const [newTaskAlert, setNewTaskAlert] = useState(null);

  const activeUser = currentUser || dbService.session.getCurrentUser();
  const isDriverView = typeof isDriver === 'boolean' ? isDriver : Boolean(activeUser?.role === 'driver');

  const resolveQueryAccount = useCallback(() => {
    const user = currentUser || dbService.session.getCurrentUser();
    if (!user) return null;
    if (!isDriverView) return user;

    const allDrivers = dbService.drivers.getAll();
    const matchedDriver =
      dbService.drivers.getDriverByUserId(user.id) ||
      allDrivers.find(
        (d) =>
          d &&
          ((user.driver?.id && d.id === user.driver.id) ||
            (user.phone && d.phone && normalizePhone(d.phone) === normalizePhone(user.phone)))
      ) ||
      user.driver ||
      null;

    return {
      ...user,
      role: 'driver',
      driver: matchedDriver || user.driver
    };
  }, [currentUser, isDriverView]);

  useEffect(() => {
    const checkUpdates = () => {
      try {
        const queryAccount = resolveQueryAccount();
        if (!queryAccount) {
          setActivityCount(0);
          setNewTaskAlert(null);
          return;
        }

        // 1. Cek tugas baru yang baru saja ditugaskan oleh Admin untuk Driver
        if (isDriverView) {
          const allAssigned = dbService.bookings.getAll(queryAccount);
          const notifiedKeys = getNotifiedTaskKeys();

          // Cari pesanan aktif yang baru ditugaskan dan belum pernah memicu popup alert
          const freshAssigned = allAssigned.find((b) => {
            if (!b || b.assignment_status !== 'assigned') return false;
            if (b.booking_status === 'cancelled' || b.driver_step === 'cancelled') return false;
            if (b.driver_step && b.driver_step !== 'assigned') return false;
            if (b.is_read_driver) return false;
            const taskKey = `${b.id}_${b.assigned_at || b.created_at || ''}`;
            return !notifiedKeys.includes(taskKey);
          });

          if (freshAssigned) {
            const taskKey = `${freshAssigned.id}_${freshAssigned.assigned_at || freshAssigned.created_at || ''}`;
            markTaskKeyNotified(taskKey);
            setNewTaskAlert(freshAssigned);
            playDriverTaskSound();
          } else {
            // Jika alert sedang terbuka tetapi tugas sudah selesai/dibatalkan/dialihkan ke driver lain, tutup otomatis
            setNewTaskAlert((prev) => {
              if (!prev) return null;
              const stillActive = allAssigned.find(
                (b) =>
                  b &&
                  b.id === prev.id &&
                  b.booking_status !== 'cancelled' &&
                  b.driver_step !== 'completed'
              );
              return stillActive || null;
            });
          }
        }

        // 2. Hitung badge aktivitas yang belum dibaca
        if (activeTab === 'activity') {
          dbService.bookings.markAllAsRead(queryAccount);
          setActivityCount(0);
          return;
        }
        const unreadCount = dbService.bookings.getUnreadCount(queryAccount);
        setActivityCount(unreadCount);
      } catch {
        setActivityCount(0);
      }
    };

    checkUpdates();
    const unsubscribe = dbService.subscribe(() => {
      checkUpdates();
    });
    const pollTimer = setInterval(checkUpdates, 1500);

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
      clearInterval(pollTimer);
    };
  }, [resolveQueryAccount, activeTab, isDriverView]);

  const handleOpenAssignedTask = () => {
    if (!newTaskAlert) return;
    const targetOrderId = newTaskAlert.id;
    const queryAccount = resolveQueryAccount();
    if (queryAccount) {
      dbService.bookings.markAllAsRead(queryAccount);
    }
    setActivityCount(0);
    setNewTaskAlert(null);

    try {
      sessionStorage.setItem('otwjek_driver_open_order_id', String(targetOrderId));
      window.dispatchEvent(
        new CustomEvent('otwjek:open-driver-order', { detail: { orderId: targetOrderId } })
      );
    } catch {
      // ignore
    }

    if (onChangeTab) {
      onChangeTab('home');
    }
  };

  const handleDismissTaskAlert = () => {
    const queryAccount = resolveQueryAccount();
    if (queryAccount) {
      dbService.bookings.markAllAsRead(queryAccount);
    }
    setActivityCount(0);
    setNewTaskAlert(null);
  };

  const badgeLabel =
    activeTab !== 'activity' && activityCount > 0
      ? activityCount > 99
        ? '99+'
        : String(activityCount)
      : null;

  const navItems = [
    { id: 'home', label: isDriverView ? 'Beranda' : 'Home', icon: HomeNavIcon },
    { id: 'activity', label: isDriverView ? 'Riwayat' : 'Activity', icon: ActivityNavIcon, badge: badgeLabel },
    { id: 'account', label: isDriverView ? 'Profil' : 'Profile', icon: ProfileNavIcon }
  ];

  // Format data untuk Banner Popup Tugas Baru
  const renderTaskAlertPopup = () => {
    if (!isDriverView || !newTaskAlert) return null;

    const sTypeRaw = String(newTaskAlert.service_type || '').toLowerCase();
    const isCar = sTypeRaw === 'mobil' || sTypeRaw === 'car';
    const isSend =
      sTypeRaw === 'paket' ||
      sTypeRaw === 'send' ||
      sTypeRaw === 'package' ||
      sTypeRaw === 'express' ||
      sTypeRaw === 'food';
    const serviceCategory = isCar ? 'mobil' : isSend ? 'paket' : 'motor';
    const serviceLabel = isCar ? 'Mobil' : isSend ? 'Paket' : 'Motor';
    const orderCode =
      newTaskAlert.order_code ||
      (newTaskAlert.booking_code ? `#${newTaskAlert.booking_code.replace('RIDE-', '')}` : '#ORD');

    const fare = Number(newTaskAlert.fare_amount || 15000);
    const netEarnings = Number(
      newTaskAlert.total_earnings || newTaskAlert.delivery_fee || Math.round((fare * 0.85) / 100) * 100
    );
    const paymentLabel =
      String(newTaskAlert.payment_method || 'cash').toLowerCase() === 'qris' ? 'QRIS' : 'Tunai';

    return (
      <div className="driver-task-alert-overlay" role="alert" aria-live="assertive">
        <div className="driver-task-alert-card">
          <div className="driver-task-alert-top">
            <div className="driver-task-alert-title-group">
              <span className="driver-task-alert-pulse-dot" />
              <Bell size={14} className="driver-task-alert-bell-icon" />
              <span className="driver-task-alert-kicker">TUGAS BARU MASUK</span>
              <span className={`driver-task-alert-service ${serviceCategory}`}>
                {serviceLabel}
              </span>
              <span className="driver-task-alert-code">{orderCode}</span>
            </div>

            <div className="driver-task-alert-top-actions">
              <button
                type="button"
                className="driver-task-alert-icon-btn"
                onClick={() => playDriverTaskSound()}
                title="Bunyikan Ulang Nada Notifikasi"
                aria-label="Bunyikan Ulang"
              >
                <Volume2 size={14} />
              </button>
              <button
                type="button"
                className="driver-task-alert-icon-btn"
                onClick={handleDismissTaskAlert}
                title="Tutup Notifikasi"
                aria-label="Tutup"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          <div className="driver-task-alert-body">
            <div className="driver-task-alert-route">
              <div className="driver-task-alert-point">
                <span className="point-label">Jemput:</span>
                <strong className="point-val">
                  {newTaskAlert.pickup_name || 'Titik Penjemputan'}
                </strong>
              </div>
              <div className="driver-task-alert-point">
                <span className="point-label">Tujuan:</span>
                <strong className="point-val">
                  {newTaskAlert.dropoff_name || 'Titik Tujuan'}
                </strong>
              </div>
            </div>

            <div className="driver-task-alert-meta-row">
              <span className="driver-task-alert-customer">
                {newTaskAlert.customer_name || 'Pelanggan'} · {newTaskAlert.distance_km || 3.2} km ·{' '}
                {paymentLabel}
              </span>
              <span className="driver-task-alert-earning">
                + {formatRupiah(netEarnings)}
              </span>
            </div>
          </div>

          <div className="driver-task-alert-actions">
            <button
              type="button"
              className="btn-task-alert-secondary"
              onClick={handleDismissTaskAlert}
            >
              Nanti
            </button>
            <button
              type="button"
              className="btn-task-alert-primary"
              onClick={handleOpenAssignedTask}
            >
              <span>Lihat & Jalankan Tugas</span>
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {renderTaskAlertPopup()}
      <nav className="ref-bottom-navbar">
        {navItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              className={`ref-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => {
                if (item.id === 'activity') {
                  const queryAccount = resolveQueryAccount();
                  if (queryAccount) {
                    dbService.bookings.markAllAsRead(queryAccount);
                  }
                  setActivityCount(0);
                }
                onChangeTab(item.id);
              }}
              id={`ref-nav-${item.id}`}
              aria-label={item.label}
            >
              <div className="ref-nav-icon-wrap">
                <IconComponent size={25} active={isActive} />
                {item.badge && <span className="ref-nav-badge">{item.badge}</span>}
              </div>
              <span className={`ref-nav-label ${isActive ? 'active' : ''}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
