import React, { useState, useEffect } from 'react';
import {
  HomeNavIcon,
  ActivityNavIcon,
  ProfileNavIcon
} from './BottomNavIcons.jsx';
import dbService from '../services/dbService.js';

export default function BottomNavBar({ activeTab, onChangeTab, currentUser }) {
  const [activityCount, setActivityCount] = useState(0);

  useEffect(() => {
    const updateActivityBadge = () => {
      try {
        const activeUser = currentUser || dbService.session.getCurrentUser();
        if (activeTab === 'activity') {
          dbService.bookings.markAllAsRead(activeUser);
          setActivityCount(0);
          return;
        }
        const unreadCount = dbService.bookings.getUnreadCount(activeUser);
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
  }, [currentUser, activeTab]);

  const badgeLabel =
    activeTab !== 'activity' && activityCount > 0
      ? activityCount > 99
        ? '99+'
        : String(activityCount)
      : null;

  const navItems = [
    { id: 'home', label: 'Home', icon: HomeNavIcon },
    { id: 'activity', label: 'Activity', icon: ActivityNavIcon, badge: badgeLabel },
    { id: 'account', label: 'Profile', icon: ProfileNavIcon }
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
                const activeUser = currentUser || dbService.session.getCurrentUser();
                dbService.bookings.markAllAsRead(activeUser);
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
