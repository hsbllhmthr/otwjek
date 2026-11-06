import React, { useState, useEffect, useCallback } from 'react';
import {
  HomeNavIcon,
  ActivityNavIcon,
  ProfileNavIcon
} from './BottomNavIcons.jsx';
import dbService, { normalizePhone } from '../services/dbService.js';

export default function BottomNavBar({ activeTab, onChangeTab, currentUser, isDriver }) {
  const [activityCount, setActivityCount] = useState(0);

  const activeUser = currentUser || dbService.session.getCurrentUser();
  const isDriverView = Boolean(isDriver || activeUser?.role === 'driver');

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
    const updateActivityBadge = () => {
      try {
        const queryAccount = resolveQueryAccount();
        if (!queryAccount) {
          setActivityCount(0);
          return;
        }
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

    updateActivityBadge();
    const unsubscribe = dbService.subscribe(() => {
      updateActivityBadge();
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [resolveQueryAccount, activeTab]);

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

  return (
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
  );
}
