import React from 'react';

/**
 * Solid Fill Bottom Nav Icons
 * 1. HomeNavIcon: Solid filled house icon for Home
 * 2. ActivityNavIcon: Solid filled document with white cutout lines
 * 3. ProfileNavIcon: Solid filled user head and torso silhouette
 */

export function HomeNavIcon({ size = 25, className = '', active = false }) {
  const color = active ? '#FF337F' : '#9CA3AF';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M10.55 2.82C11.39 2.08 12.61 2.08 13.45 2.82L20.45 8.95C21.05 9.47 21.4 10.22 21.4 11.02V19.5C21.4 20.88 20.28 22 18.9 22H15.5C14.67 22 14 21.33 14 20.5V16C14 15.17 13.33 14.5 12.5 14.5H11.5C10.67 14.5 10 15.17 10 16V20.5C10 21.33 9.33 22 8.5 22H5.1C3.72 22 2.6 20.88 2.6 19.5V11.02C2.6 10.22 2.95 9.47 3.55 8.95L10.55 2.82Z"
        fill={color}
      />
    </svg>
  );
}

export function CompassNavIcon({ size = 25, className = '', active = false }) {
  const color = active ? '#FF337F' : '#9CA3AF';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <circle cx="12" cy="12" r="10.5" fill={color} />
      <path
        d="M15.8 8.2L13.4 15.8L8.2 15.8L10.6 8.2L15.8 8.2Z"
        fill="#FFFFFF"
      />
      <path
        d="M15.8 8.2L12 12L13.4 15.8L15.8 8.2Z"
        fill="rgba(255, 255, 255, 0.82)"
      />
      <circle cx="12" cy="12" r="1.6" fill={color} />
      <circle cx="12" cy="12" r="0.75" fill="#FFFFFF" />
    </svg>
  );
}

export function ActivityNavIcon({ size = 25, className = '', active = false }) {
  const color = active ? '#FF337F' : '#9CA3AF';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect x="4" y="2.5" width="16" height="19" rx="4.5" fill={color} />
      <rect x="7.5" y="7" width="9" height="2.2" rx="1.1" fill="#FFFFFF" />
      <rect x="7.5" y="11" width="9" height="2.2" rx="1.1" fill="#FFFFFF" />
      <rect x="7.5" y="15" width="5.5" height="2.2" rx="1.1" fill="#FFFFFF" />
    </svg>
  );
}

export function ProfileNavIcon({ size = 25, className = '', active = false }) {
  const color = active ? '#FF337F' : '#9CA3AF';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <circle cx="12" cy="7.2" r="4.4" fill={color} />
      <path
        d="M4 19.5C4 15.35 7.58 12 12 12C16.42 12 20 15.35 20 19.5C20 20.33 19.33 21 18.5 21H5.5C4.67 21 4 20.33 4 19.5Z"
        fill={color}
      />
    </svg>
  );
}
