import React from 'react';
import {
  HomeNavIcon,
  ActivityNavIcon,
  ProfileNavIcon
} from './BottomNavIcons.jsx';

export default function BottomNavBar({ activeTab, onChangeTab }) {
  const navItems = [
    { id: 'home', label: 'Home', icon: HomeNavIcon },
    { id: 'activity', label: 'Activity', icon: ActivityNavIcon, badge: '1' },
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
            onClick={() => onChangeTab(item.id)}
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
