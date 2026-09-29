import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import {
  ArrowLeft,
  Crosshair,
  ChevronRight,
  Info,
  Banknote,
  Tag,
  MoreHorizontal,
  CheckCircle2,
  Package,
  Sparkles
} from 'lucide-react';
import { formatRupiah, calculateFare } from '../utils/fareCalculator.js';
import { fetchOSRMRoute, calculateHaversineDistance } from '../utils/geoUtils.js';

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Hyper-Realistic 3D Isometric Scooter with Vibrant Green Seat (Standard Bike)
function StandardBike3D({ width = 88, height = 62 }) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 120 84"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0, filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.14))' }}
    >
      <defs>
        {/* Soft Ground Shadow */}
        <radialGradient id="std_shadow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#1E293B" stopOpacity="0.32" />
          <stop offset="65%" stopColor="#64748B" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#94A3B8" stopOpacity="0" />
        </radialGradient>

        {/* 3D Pearl White Body Gradients */}
        <linearGradient id="std_body_main" x1="20" y1="25" x2="85" y2="70" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="45%" stopColor="#F8FAFC" />
          <stop offset="85%" stopColor="#E2E8F0" />
          <stop offset="100%" stopColor="#CBD5E1" />
        </linearGradient>

        <linearGradient id="std_front_shield" x1="70" y1="20" x2="95" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="60%" stopColor="#F1F5F9" />
          <stop offset="100%" stopColor="#CBD5E1" />
        </linearGradient>

        <linearGradient id="std_green_seat" x1="18" y1="28" x2="58" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#22C55E" />
          <stop offset="35%" stopColor="#16A34A" />
          <stop offset="80%" stopColor="#15803D" />
          <stop offset="100%" stopColor="#14532D" />
        </linearGradient>

        {/* Tire Shading */}
        <radialGradient id="std_tire_grad" cx="40%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#475569" />
          <stop offset="55%" stopColor="#1E293B" />
          <stop offset="100%" stopColor="#0F172A" />
        </radialGradient>
      </defs>

      {/* Ground Shadow */}
      <ellipse cx="58" cy="74" rx="48" ry="7.5" fill="url(#std_shadow)" />

      {/* Rear Wheel (isometric perspective tucked under left) */}
      <ellipse cx="28" cy="58" rx="14" ry="17" fill="url(#std_tire_grad)" transform="rotate(-10 28 58)" />
      <ellipse cx="28" cy="58" rx="8" ry="10.5" fill="#94A3B8" transform="rotate(-10 28 58)" />
      <ellipse cx="28" cy="58" rx="4.5" ry="5.5" fill="#E2E8F0" transform="rotate(-10 28 58)" />

      {/* Front Wheel (prominent right side) */}
      <ellipse cx="88" cy="58" rx="15" ry="18" fill="url(#std_tire_grad)" transform="rotate(-10 88 58)" />
      <ellipse cx="88" cy="58" rx="8.5" ry="11" fill="#94A3B8" transform="rotate(-10 88 58)" />
      <ellipse cx="88" cy="58" rx="4.5" ry="5.5" fill="#F8FAFC" transform="rotate(-10 88 58)" />

      {/* Footrest Floorboard / Underbody Chassis */}
      <path
        d="M28 54 C34 54 48 54 62 52 C74 50 82 46 84 52 C84 56 68 62 44 62 C32 62 26 58 28 54 Z"
        fill="#334155"
      />
      <path
        d="M36 53 L74 50 L77 53 L38 56 Z"
        fill="#0F172A"
      />

      {/* Main Scooter Chassis Body (3D voluptuous curved shell) */}
      <path
        d="M18 46 C16 34 28 32 44 34 C58 36 68 40 76 47 C77 52 70 56 56 57 C38 58 20 56 18 46 Z"
        fill="url(#std_body_main)"
      />

      {/* Front Apron Fairing / Steering Shield */}
      <path
        d="M68 44 C67 36 74 24 82 22 C88 22 94 30 96 42 C98 52 92 56 84 54 C78 52 70 50 68 44 Z"
        fill="url(#std_front_shield)"
      />

      {/* Front Mudguard Fender */}
      <path
        d="M78 52 C78 48 93 47 98 54 C98 58 90 62 83 60 C80 58 78 55 78 52 Z"
        fill="#F8FAFC"
      />

      {/* Sleek Oval Headlight with Cyan Accent */}
      <ellipse cx="91" cy="30" rx="3.5" ry="6" fill="#FFFFFF" transform="rotate(15 91 30)" />
      <ellipse cx="91" cy="30" rx="2" ry="4" fill="#67E8F9" opacity="0.85" transform="rotate(15 91 30)" />

      {/* Handlebars with Ergonomic Grips and Mirrors */}
      <path
        d="M76 21 L85 21 L93 18"
        stroke="#475569"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Left Mirror */}
      <circle cx="74" cy="14" r="2.8" fill="#1E293B" />
      <line x1="76" y1="18" x2="74" y2="14" stroke="#475569" strokeWidth="1.8" />
      {/* Right Mirror */}
      <circle cx="91" cy="12" r="2.8" fill="#1E293B" />
      <line x1="89" y1="17" x2="91" y2="12" stroke="#475569" strokeWidth="1.8" />

      {/* 3D Ergonomic Green Cushion Seat (Standard Bike Signature) */}
      <path
        d="M20 37 C21 30 36 29 52 32 C60 33 63 36 62 39 C58 42 40 43 24 41 C21 40 20 39 20 37 Z"
        fill="url(#std_green_seat)"
      />
      {/* Seat Top Highlight */}
      <path
        d="M24 35 C28 32 38 31 50 33 C56 34 58 35 56 37 C48 37 34 37 26 36 Z"
        fill="#86EFAC"
        opacity="0.5"
      />
    </svg>
  );
}

// Hyper-Realistic 3D Isometric Scooter with Orange Seat (Hemat Bike)
function HematBike3D({ width = 88, height = 62 }) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 120 84"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0, filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.14))' }}
    >
      <defs>
        <radialGradient id="hmt_shadow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#1E293B" stopOpacity="0.32" />
          <stop offset="65%" stopColor="#64748B" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#94A3B8" stopOpacity="0" />
        </radialGradient>

        <linearGradient id="hmt_body_main" x1="20" y1="25" x2="85" y2="70" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="45%" stopColor="#F8FAFC" />
          <stop offset="85%" stopColor="#E2E8F0" />
          <stop offset="100%" stopColor="#CBD5E1" />
        </linearGradient>

        <linearGradient id="hmt_front_shield" x1="70" y1="20" x2="95" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="60%" stopColor="#F1F5F9" />
          <stop offset="100%" stopColor="#CBD5E1" />
        </linearGradient>

        {/* Signature Orange Cushion Seat */}
        <linearGradient id="hmt_orange_seat" x1="18" y1="28" x2="58" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FB923C" />
          <stop offset="40%" stopColor="#F97316" />
          <stop offset="85%" stopColor="#EA580C" />
          <stop offset="100%" stopColor="#C2410C" />
        </linearGradient>

        <radialGradient id="hmt_tire_grad" cx="40%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#475569" />
          <stop offset="55%" stopColor="#1E293B" />
          <stop offset="100%" stopColor="#0F172A" />
        </radialGradient>
      </defs>

      {/* Ground Shadow */}
      <ellipse cx="58" cy="74" rx="48" ry="7.5" fill="url(#hmt_shadow)" />

      {/* Rear Wheel */}
      <ellipse cx="28" cy="58" rx="14" ry="17" fill="url(#hmt_tire_grad)" transform="rotate(-10 28 58)" />
      <ellipse cx="28" cy="58" rx="8" ry="10.5" fill="#94A3B8" transform="rotate(-10 28 58)" />
      <ellipse cx="28" cy="58" rx="4.5" ry="5.5" fill="#E2E8F0" transform="rotate(-10 28 58)" />

      {/* Front Wheel */}
      <ellipse cx="88" cy="58" rx="15" ry="18" fill="url(#hmt_tire_grad)" transform="rotate(-10 88 58)" />
      <ellipse cx="88" cy="58" rx="8.5" ry="11" fill="#94A3B8" transform="rotate(-10 88 58)" />
      <ellipse cx="88" cy="58" rx="4.5" ry="5.5" fill="#F8FAFC" transform="rotate(-10 88 58)" />

      {/* Footrest Chassis */}
      <path
        d="M28 54 C34 54 48 54 62 52 C74 50 82 46 84 52 C84 56 68 62 44 62 C32 62 26 58 28 54 Z"
        fill="#334155"
      />
      <path
        d="M36 53 L74 50 L77 53 L38 56 Z"
        fill="#0F172A"
      />

      {/* Main Body */}
      <path
        d="M18 46 C16 34 28 32 44 34 C58 36 68 40 76 47 C77 52 70 56 56 57 C38 58 20 56 18 46 Z"
        fill="url(#hmt_body_main)"
      />

      {/* Front Fairing */}
      <path
        d="M68 44 C67 36 74 24 82 22 C88 22 94 30 96 42 C98 52 92 56 84 54 C78 52 70 50 68 44 Z"
        fill="url(#hmt_front_shield)"
      />

      {/* Front Mudguard */}
      <path
        d="M78 52 C78 48 93 47 98 54 C98 58 90 62 83 60 C80 58 78 55 78 52 Z"
        fill="#F8FAFC"
      />

      {/* Headlight */}
      <ellipse cx="91" cy="30" rx="3.5" ry="6" fill="#FFFFFF" transform="rotate(15 91 30)" />
      <ellipse cx="91" cy="30" rx="2" ry="4" fill="#FDE68A" opacity="0.85" transform="rotate(15 91 30)" />

      {/* Handlebars & Mirrors */}
      <path
        d="M76 21 L85 21 L93 18"
        stroke="#475569"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="74" cy="14" r="2.8" fill="#1E293B" />
      <line x1="76" y1="18" x2="74" y2="14" stroke="#475569" strokeWidth="1.8" />
      <circle cx="91" cy="12" r="2.8" fill="#1E293B" />
      <line x1="89" y1="17" x2="91" y2="12" stroke="#475569" strokeWidth="1.8" />

      {/* Orange Seat (Hemat Bike Signature) */}
      <path
        d="M20 37 C21 30 36 29 52 32 C60 33 63 36 62 39 C58 42 40 43 24 41 C21 40 20 39 20 37 Z"
        fill="url(#hmt_orange_seat)"
      />
      <path
        d="M24 35 C28 32 38 31 50 33 C56 34 58 35 56 37 C48 37 34 37 26 36 Z"
        fill="#FDBA74"
        opacity="0.5"
      />
    </svg>
  );
}

// Hyper-Realistic 3D Isometric White Car with Orange Roof (Hemat Car)
function HematCar3D({ width = 88, height = 58 }) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 110 70"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0, filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.14))' }}
    >
      <defs>
        <radialGradient id="car_shadow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#1E293B" stopOpacity="0.32" />
          <stop offset="65%" stopColor="#64748B" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#94A3B8" stopOpacity="0" />
        </radialGradient>

        <linearGradient id="car_body_grad" x1="15" y1="35" x2="95" y2="55" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="60%" stopColor="#F8FAFC" />
          <stop offset="100%" stopColor="#CBD5E1" />
        </linearGradient>

        <linearGradient id="car_roof_orange" x1="30" y1="18" x2="80" y2="35" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FB923C" />
          <stop offset="45%" stopColor="#F97316" />
          <stop offset="100%" stopColor="#EA580C" />
        </linearGradient>
      </defs>

      {/* Ground Shadow */}
      <ellipse cx="55" cy="62" rx="46" ry="6.5" fill="url(#car_shadow)" />

      {/* Rear Wheel */}
      <circle cx="28" cy="54" r="11" fill="#1E293B" />
      <circle cx="28" cy="54" r="6" fill="#94A3B8" />
      <circle cx="28" cy="54" r="3" fill="#F8FAFC" />

      {/* Front Wheel */}
      <circle cx="82" cy="54" r="11" fill="#1E293B" />
      <circle cx="82" cy="54" r="6" fill="#94A3B8" />
      <circle cx="82" cy="54" r="3" fill="#F8FAFC" />

      {/* Lower White Body Shell */}
      <path
        d="M14 47 C14 40 24 38 34 38 L76 38 C88 38 98 42 98 48 C98 54 94 56 86 56 C86 51 78 51 78 56 L32 56 C32 51 24 51 24 56 C16 56 14 52 14 47 Z"
        fill="url(#car_body_grad)"
      />

      {/* Orange Cabin Roof & Pillars */}
      <path
        d="M30 38 L40 20 C42 18 46 17 52 17 L70 17 C76 17 80 19 82 22 L88 38 Z"
        fill="url(#car_roof_orange)"
      />

      {/* Dark Tinted Windshield & Side Windows */}
      <path
        d="M42 22 L54 22 L54 36 L36 36 Z"
        fill="#0F172A"
        opacity="0.85"
      />
      <path
        d="M58 22 L72 22 L82 36 L58 36 Z"
        fill="#0F172A"
        opacity="0.85"
      />

      {/* Headlights */}
      <path
        d="M94 44 L98 46 L94 48 Z"
        fill="#FEF08A"
      />
    </svg>
  );
}

// Hyper-Realistic 3D Isometric Scooter with Pink SheSend Delivery Thermal Box
function SheSendInstantBike3D({ width = 88, height = 62 }) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 120 84"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0, filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.14))' }}
    >
      <defs>
        <radialGradient id="ss_shadow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#1E293B" stopOpacity="0.32" />
          <stop offset="65%" stopColor="#64748B" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#94A3B8" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ss_body_main" x1="20" y1="25" x2="85" y2="70" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="45%" stopColor="#F8FAFC" />
          <stop offset="85%" stopColor="#E2E8F0" />
          <stop offset="100%" stopColor="#CBD5E1" />
        </linearGradient>
        <linearGradient id="ss_box_grad" x1="12" y1="12" x2="38" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FF4B72" />
          <stop offset="40%" stopColor="#E11D48" />
          <stop offset="100%" stopColor="#9F1239" />
        </linearGradient>
        <linearGradient id="ss_box_top" x1="14" y1="12" x2="36" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FDA4AF" />
          <stop offset="100%" stopColor="#F43F5E" />
        </linearGradient>
        <radialGradient id="ss_tire_grad" cx="40%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#475569" />
          <stop offset="55%" stopColor="#1E293B" />
          <stop offset="100%" stopColor="#0F172A" />
        </radialGradient>
      </defs>

      {/* Ground Shadow */}
      <ellipse cx="58" cy="74" rx="48" ry="7.5" fill="url(#ss_shadow)" />

      {/* Rear Wheel */}
      <ellipse cx="28" cy="58" rx="14" ry="17" fill="url(#ss_tire_grad)" transform="rotate(-10 28 58)" />
      <ellipse cx="28" cy="58" rx="8" ry="10.5" fill="#94A3B8" transform="rotate(-10 28 58)" />
      <ellipse cx="28" cy="58" rx="4.5" ry="5.5" fill="#E2E8F0" transform="rotate(-10 28 58)" />

      {/* Front Wheel */}
      <ellipse cx="88" cy="58" rx="15" ry="18" fill="url(#ss_tire_grad)" transform="rotate(-10 88 58)" />
      <ellipse cx="88" cy="58" rx="8.5" ry="11" fill="#94A3B8" transform="rotate(-10 88 58)" />
      <ellipse cx="88" cy="58" rx="4.5" ry="5.5" fill="#F8FAFC" transform="rotate(-10 88 58)" />

      {/* Underbody Chassis */}
      <path
        d="M28 54 C34 54 48 54 62 52 C74 50 82 46 84 52 C84 56 68 62 44 62 C32 62 26 58 28 54 Z"
        fill="#334155"
      />

      {/* Main Scooter Body */}
      <path
        d="M18 46 C16 34 28 32 44 34 C58 36 68 40 76 47 C77 52 70 56 56 57 C38 58 20 56 18 46 Z"
        fill="url(#ss_body_main)"
      />

      {/* Front Fairing */}
      <path
        d="M68 44 C67 36 74 24 82 22 C88 22 94 30 96 42 C98 52 92 56 84 54 C78 52 70 50 68 44 Z"
        fill="#FFFFFF"
      />
      <path d="M78 52 C78 48 93 47 98 54 C98 58 90 62 83 60 C80 58 78 55 78 52 Z" fill="#F8FAFC" />

      {/* Headlight with Rose Accent */}
      <ellipse cx="91" cy="30" rx="3.5" ry="6" fill="#FFFFFF" transform="rotate(15 91 30)" />
      <ellipse cx="91" cy="30" rx="2" ry="4" fill="#F472B6" opacity="0.85" transform="rotate(15 91 30)" />

      {/* Handlebars & Mirrors */}
      <path d="M76 21 L85 21 L93 18" stroke="#475569" strokeWidth="3" strokeLinecap="round" />
      <circle cx="74" cy="14" r="2.8" fill="#1E293B" />
      <line x1="76" y1="18" x2="74" y2="14" stroke="#475569" strokeWidth="1.8" />
      <circle cx="91" cy="12" r="2.8" fill="#1E293B" />
      <line x1="89" y1="17" x2="91" y2="12" stroke="#475569" strokeWidth="1.8" />

      {/* Driver Seat */}
      <path d="M40 37 C42 32 50 31 58 33 C61 35 60 38 56 40 C48 41 42 40 40 37 Z" fill="#1E293B" />

      {/* Rear Insulated Thermal Delivery Box (SheSend Signature in Pink & White) */}
      <g filter="drop-shadow(0 4px 6px rgba(0,0,0,0.18))">
        <path d="M12 20 L34 16 L42 22 L42 42 L20 47 L12 40 Z" fill="url(#ss_box_grad)" />
        <path d="M12 20 L24 13 L46 15 L34 22 Z" fill="url(#ss_box_top)" />
        <path d="M22 17 L22 46" stroke="#FFFFFF" strokeWidth="1.8" strokeDasharray="3 1" />
        <path d="M33 16 L33 44" stroke="#FFFFFF" strokeWidth="1.8" strokeDasharray="3 1" />
        <rect x="23" y="27" width="10" height="9" rx="2" fill="#FFFFFF" />
        <path d="M25.5 30 L28 32 L30.5 30" stroke="#E11D48" strokeWidth="1.2" strokeLinecap="round" />
      </g>
    </svg>
  );
}

// Hyper-Realistic 3D Isometric Scooter with Orange Cargo Box (SheSend Hemat)
function SheSendHematBike3D({ width = 88, height = 62 }) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 120 84"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0, filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.14))' }}
    >
      <defs>
        <radialGradient id="ssh_shadow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#1E293B" stopOpacity="0.32" />
          <stop offset="65%" stopColor="#64748B" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#94A3B8" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ssh_body_main" x1="20" y1="25" x2="85" y2="70" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="45%" stopColor="#F8FAFC" />
          <stop offset="85%" stopColor="#E2E8F0" />
          <stop offset="100%" stopColor="#CBD5E1" />
        </linearGradient>
        <linearGradient id="ssh_box_grad" x1="12" y1="12" x2="38" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FB923C" />
          <stop offset="40%" stopColor="#EA580C" />
          <stop offset="100%" stopColor="#9A3412" />
        </linearGradient>
        <linearGradient id="ssh_box_top" x1="14" y1="12" x2="36" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FDBA74" />
          <stop offset="100%" stopColor="#F97316" />
        </linearGradient>
        <radialGradient id="ssh_tire_grad" cx="40%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#475569" />
          <stop offset="55%" stopColor="#1E293B" />
          <stop offset="100%" stopColor="#0F172A" />
        </radialGradient>
      </defs>

      <ellipse cx="58" cy="74" rx="48" ry="7.5" fill="url(#ssh_shadow)" />
      <ellipse cx="28" cy="58" rx="14" ry="17" fill="url(#ssh_tire_grad)" transform="rotate(-10 28 58)" />
      <ellipse cx="28" cy="58" rx="8" ry="10.5" fill="#94A3B8" transform="rotate(-10 28 58)" />
      <ellipse cx="88" cy="58" rx="15" ry="18" fill="url(#ssh_tire_grad)" transform="rotate(-10 88 58)" />
      <ellipse cx="88" cy="58" rx="8.5" ry="11" fill="#94A3B8" transform="rotate(-10 88 58)" />

      <path d="M28 54 C34 54 48 54 62 52 C74 50 82 46 84 52 C84 56 68 62 44 62 C32 62 26 58 28 54 Z" fill="#334155" />
      <path d="M18 46 C16 34 28 32 44 34 C58 36 68 40 76 47 C77 52 70 56 56 57 C38 58 20 56 18 46 Z" fill="url(#ssh_body_main)" />
      <path d="M68 44 C67 36 74 24 82 22 C88 22 94 30 96 42 C98 52 92 56 84 54 C78 52 70 50 68 44 Z" fill="#FFFFFF" />

      <path d="M76 21 L85 21 L93 18" stroke="#475569" strokeWidth="3" strokeLinecap="round" />
      <circle cx="74" cy="14" r="2.8" fill="#1E293B" />
      <circle cx="91" cy="12" r="2.8" fill="#1E293B" />
      <path d="M40 37 C42 32 50 31 58 33 C61 35 60 38 56 40 C48 41 42 40 40 37 Z" fill="#1E293B" />

      <g filter="drop-shadow(0 4px 6px rgba(0,0,0,0.18))">
        <path d="M12 20 L34 16 L42 22 L42 42 L20 47 L12 40 Z" fill="url(#ssh_box_grad)" />
        <path d="M12 20 L24 13 L46 15 L34 22 Z" fill="url(#ssh_box_top)" />
        <rect x="23" y="27" width="10" height="9" rx="2" fill="#FFFFFF" />
        <path d="M25 29 L31 29 M25 32 L29 32" stroke="#EA580C" strokeWidth="1.2" strokeLinecap="round" />
      </g>
    </svg>
  );
}

// Hyper-Realistic 3D Isometric SheSend Car Cargo
function SheSendCargo3D({ width = 88, height = 58 }) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 110 70"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0, filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.14))' }}
    >
      <defs>
        <radialGradient id="car_cargo_shadow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#1E293B" stopOpacity="0.32" />
          <stop offset="65%" stopColor="#64748B" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#94A3B8" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="car_cargo_body" x1="15" y1="35" x2="95" y2="55" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="60%" stopColor="#F8FAFC" />
          <stop offset="100%" stopColor="#CBD5E1" />
        </linearGradient>
        <linearGradient id="car_cargo_pink" x1="20" y1="18" x2="80" y2="35" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FB7185" />
          <stop offset="50%" stopColor="#E11D48" />
          <stop offset="100%" stopColor="#BE123C" />
        </linearGradient>
      </defs>

      <ellipse cx="55" cy="62" rx="46" ry="6.5" fill="url(#car_cargo_shadow)" />
      <circle cx="28" cy="54" r="11" fill="#1E293B" />
      <circle cx="28" cy="54" r="6" fill="#94A3B8" />
      <circle cx="82" cy="54" r="11" fill="#1E293B" />
      <circle cx="82" cy="54" r="6" fill="#94A3B8" />

      <path
        d="M14 47 C14 40 24 38 34 38 L76 38 C88 38 98 42 98 48 C98 54 94 56 86 56 C86 51 78 51 78 56 L32 56 C32 51 24 51 24 56 C16 56 14 52 14 47 Z"
        fill="url(#car_cargo_body)"
      />
      <path
        d="M26 38 L36 17 C38 15 44 14 52 14 L72 14 C78 14 82 17 84 22 L88 38 Z"
        fill="url(#car_cargo_pink)"
      />
      <path d="M38 20 L52 20 L52 36 L34 36 Z" fill="#0F172A" opacity="0.85" />
      <path d="M56 20 L72 20 L80 36 L56 36 Z" fill="#0F172A" opacity="0.85" />

      <rect x="42" y="42" width="16" height="10" rx="2" fill="#E11D48" />
      <path d="M45 47 L47 49 L51 45" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" />
      <text x="61" y="49" fill="#1E293B" fontSize="7" fontWeight="bold" fontFamily="sans-serif">CARGO</text>
      <path d="M94 44 L98 46 L94 48 Z" fill="#FEF08A" />
    </svg>
  );
}

export default function RideConfirmationPage({
  pickup,
  dropoff,
  driverNotes = '',
  onBack,
  onBook,
  distanceKm = 6.5,
  durationMinutes = 17,
  onEditPickup,
  selectedVehicleType = 'bike',
  activeTab = 'ride'
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const routePolylineRef = useRef(null);
  const pickupMarkerRef = useRef(null);
  const dropoffMarkerRef = useRef(null);
  const bestBadgeMarkerRef = useRef(null);

  const isSendMode = selectedVehicleType === 'express' || activeTab === 'send';
  const defaultRide = isSendMode
    ? 'shesend-instant'
    : selectedVehicleType === 'car'
    ? 'hemat-car'
    : 'standard-bike';
  const [selectedRide, setSelectedRide] = useState(defaultRide);
  const [toastMessage, setToastMessage] = useState(null);

  // SheSend Package Info for booking payload
  const [packageData] = useState({
    itemName: 'Paket SheSend',
    category: 'goods',
    weightTier: 'light',
    senderName: 'Pelanggan SheRide',
    senderPhone: '',
    recipientName: '',
    recipientPhone: '',
    specialNotes: driverNotes || ''
  });

  // Dynamic Route Metrics (Accurate driving distance & duration)
  const [actualDist, setActualDist] = useState(distanceKm || 6.5);
  const [actualDur, setActualDur] = useState(durationMinutes || 17);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2800);
  };

  // Base coordinates: Indo Mode Tamalate (Pickup) -> Jalan Andi Tonro (Dropoff)
  const pickupLat = pickup?.lat || -5.1843;
  const pickupLng = pickup?.lng || 119.4182;
  const dropoffLat = dropoff?.lat || -5.2045;
  const dropoffLng = dropoff?.lng || 119.4550;

  // Dynamic Fares for SheRide (Passenger)
  const baseStandardFare = calculateFare({
    serviceType: 'ride',
    vehicleType: 'motor',
    distanceKm: actualDist
  }).totalFare;
  const standardBikePrice = Math.max(10000, Math.round(baseStandardFare / 100) * 100);
  const hematBikePrice = Math.max(9000, Math.round((standardBikePrice * 0.92) / 100) * 100);

  const baseCarFare = calculateFare({
    serviceType: 'ride',
    vehicleType: 'mobil',
    distanceKm: actualDist
  }).totalFare;
  const hematCarPrice = Math.max(18000, Math.round(baseCarFare / 500) * 500);

  // Dynamic Fares for SheSend (Package delivery with weight surcharge)
  const sendFareResult = calculateFare({
    serviceType: 'send',
    weightCategory: packageData.weightTier,
    distanceKm: actualDist
  });
  const baseSendInstantFare = Math.max(12000, Math.round(sendFareResult.totalFare / 100) * 100);
  const baseSendHematFare = Math.max(10000, Math.round((baseSendInstantFare * 0.88) / 500) * 500);
  const baseSendCarFare = Math.max(25000, Math.round((baseSendInstantFare * 1.6) / 1000) * 1000);

  // Ride options matching current mode with dynamic fares
  const rideOptions = isSendMode
    ? [
        {
          id: 'shesend-instant',
          name: 'SheSend Instant',
          eta: `${Math.min(5, Math.max(2, Math.round(actualDur * 0.3)))} mins away`,
          capacity: 'Max 10 kg',
          price: baseSendInstantFare,
          hasDiscount: false,
          ComponentIcon: SheSendInstantBike3D
        },
        {
          id: 'shesend-hemat',
          name: 'SheSend Hemat',
          eta: `${Math.min(6, Math.max(3, Math.round(actualDur * 0.35)))} mins away`,
          capacity: 'Max 5 kg',
          price: baseSendHematFare,
          hasDiscount: true,
          ComponentIcon: SheSendHematBike3D
        },
        {
          id: 'shesend-cargo',
          name: 'SheSend Car Cargo',
          eta: `${Math.min(7, Math.max(4, Math.round(actualDur * 0.45)))} mins away`,
          capacity: 'Max 50 kg',
          price: baseSendCarFare,
          hasDiscount: false,
          ComponentIcon: SheSendCargo3D
        }
      ]
    : [
        {
          id: 'standard-bike',
          name: 'Standard Bike',
          eta: `${Math.min(5, Math.max(2, Math.round(actualDur * 0.3)))} mins away`,
          capacity: '1',
          price: standardBikePrice,
          hasDiscount: false,
          ComponentIcon: StandardBike3D
        },
        {
          id: 'hemat-bike',
          name: 'Hemat Bike',
          eta: `${Math.min(5, Math.max(2, Math.round(actualDur * 0.3)))} mins away`,
          capacity: '1',
          price: hematBikePrice,
          hasDiscount: true,
          ComponentIcon: HematBike3D
        },
        {
          id: 'hemat-car',
          name: 'Hemat Car',
          eta: `${Math.min(6, Math.max(3, Math.round(actualDur * 0.4)))} mins away`,
          capacity: '4',
          price: hematCarPrice,
          hasDiscount: true,
          ComponentIcon: HematCar3D
        }
      ];

  const currentRide = rideOptions.find((r) => r.id === selectedRide) || rideOptions[0];

  // Initialize Leaflet Map with clean OpenStreetMap tiles & Anchored Pin Points
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [pickupLat, pickupLng],
        zoom: 15,
        zoomControl: false,
        attributionControl: false
      });

      // Google Maps Clean Roadmap Layer
      L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Draw route polyline and attach dynamic markers
    const loadRouteAndPins = async () => {
      let coords = [
        [pickupLat, pickupLng],
        [dropoffLat, dropoffLng]
      ];
      let calcDistance = distanceKm || calculateHaversineDistance(pickupLat, pickupLng, dropoffLat, dropoffLng);
      let calcDuration = durationMinutes || Math.max(1, Math.round(calcDistance * 3.5));

      try {
        const osrmRoute = await fetchOSRMRoute(pickupLat, pickupLng, dropoffLat, dropoffLng);
        if (osrmRoute && osrmRoute.coordinates && osrmRoute.coordinates.length > 1) {
          coords = osrmRoute.coordinates;
          calcDistance = osrmRoute.distanceKm;
          calcDuration = osrmRoute.durationMinutes;
        }
      } catch (err) {
        console.warn('OSRM route fallback used:', err);
      }

      setActualDist(calcDistance);
      setActualDur(calcDuration);

      // 1. Polyline Route
      if (routePolylineRef.current) {
        routePolylineRef.current.remove();
      }

      routePolylineRef.current = L.polyline(coords, {
        color: '#00B14F',
        weight: 6,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(map);

      // 2. Pickup Marker (Anchored Blue Beacon Pin & Bubble Card)
      if (pickupMarkerRef.current) {
        pickupMarkerRef.current.remove();
      }

      const pickupDivIcon = L.divIcon({
        className: 'leaflet-pickup-pin-wrapper',
        html: `
          <div class="map-pickup-bubble-card leaflet-anchored-card">
            <div class="map-pickup-blue-pin">
              <div class="blue-pin-dot"></div>
            </div>
            <div class="map-pickup-bubble-details">
              <span class="bubble-pickup-name">${escapeHtml(pickup?.name || 'Home')}</span>
              <span class="bubble-pickup-sub">${escapeHtml(pickup?.address || 'Titik Jemput')}</span>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B7280" stroke-width="2.5"><path d="M9 18l6-6-6-6"/></svg>
          </div>
        `,
        iconSize: [210, 44],
        iconAnchor: [13, 22] // Centered on blue circular pin
      });

      pickupMarkerRef.current = L.marker([pickupLat, pickupLng], {
        icon: pickupDivIcon,
        zIndexOffset: 1000
      }).addTo(map);

      pickupMarkerRef.current.on('click', () => {
        if (onEditPickup) onEditPickup();
        else if (onBack) onBack();
      });

      // 3. Destination / Dropoff Marker (Anchored Red Teardrop Pin & Target Title)
      if (dropoffMarkerRef.current) {
        dropoffMarkerRef.current.remove();
      }

      const dropoffDivIcon = L.divIcon({
        className: 'leaflet-dropoff-pin-wrapper',
        html: `
          <div class="map-dropoff-pin-anchor">
            <div class="dropoff-pin-label">${escapeHtml(dropoff?.name || 'Tujuan')}</div>
            <div class="dropoff-pin-marker">
              <div class="dropoff-pin-head">
                <div class="dropoff-pin-inner"></div>
              </div>
              <div class="dropoff-pin-shadow"></div>
            </div>
          </div>
        `,
        iconSize: [140, 56],
        iconAnchor: [70, 56] // Point of pin anchored exactly on dropoff coordinate
      });

      dropoffMarkerRef.current = L.marker([dropoffLat, dropoffLng], {
        icon: dropoffDivIcon,
        zIndexOffset: 900
      }).addTo(map);

      // 4. Best Route Badge (Anchored directly along the route line)
      if (bestBadgeMarkerRef.current) {
        bestBadgeMarkerRef.current.remove();
      }

      const midIdx = Math.floor(coords.length / 2);
      const midCoord = coords[midIdx] || [(pickupLat + dropoffLat) / 2, (pickupLng + dropoffLng) / 2];

      const bestDivIcon = L.divIcon({
        className: 'leaflet-best-badge-wrapper',
        html: `
          <div class="map-badge-best leaflet-anchored-best">
            <span class="badge-best-title">Best</span>
            <span class="badge-best-meta">${calcDuration} min · ${calcDistance} km</span>
          </div>
        `,
        iconSize: [100, 42],
        iconAnchor: [50, 21]
      });

      bestBadgeMarkerRef.current = L.marker(midCoord, {
        icon: bestDivIcon,
        zIndexOffset: 800
      }).addTo(map);

      // Fit bounds nicely so both pickup and dropoff markers are comfortably framed in visible map area
      const bounds = L.latLngBounds([
        [pickupLat, pickupLng],
        [dropoffLat, dropoffLng]
      ]);
      map.fitBounds(bounds, {
        paddingTopLeft: [45, 80],
        paddingBottomRight: [45, 360],
        maxZoom: 16
      });

      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 150);
    };

    loadRouteAndPins();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [pickupLat, pickupLng, dropoffLat, dropoffLng]);

  const handleRecenter = () => {
    if (mapInstanceRef.current) {
      const bounds = L.latLngBounds([
        [pickupLat, pickupLng],
        [dropoffLat, dropoffLng]
      ]);
      mapInstanceRef.current.fitBounds(bounds, {
        paddingTopLeft: [45, 80],
        paddingBottomRight: [45, 360],
        maxZoom: 16
      });
    }
  };

  return (
    <div className="ride-confirm-container">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="ridego-toast-banner">
          <CheckCircle2 size={16} color="#00B14F" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Fullscreen Map Layer (Spans full viewport behind bottom sheet) */}
      <div className="ride-confirm-map-wrap">
        <div ref={mapContainerRef} className="ride-confirm-map" />

        {/* Top Floating Navigation Bar */}
        <div className="ride-confirm-topbar">
          <button
            type="button"
            className="ride-confirm-btn-back"
            onClick={onBack}
            aria-label="Kembali ke pemilihan titik jemput"
          >
            <ArrowLeft size={20} color="#1F2937" strokeWidth={2.4} />
          </button>
        </div>
      </div>

      {/* 2. Floating Bottom Sheet (Ride Options & Checkout Panel) */}
      <div className="ride-confirm-bottom-sheet">
        {/* Floating Recenter GPS Button Docked Above Top-Right */}
        <button
          type="button"
          className="ride-confirm-recenter-fab"
          onClick={handleRecenter}
          title="Pusatkan peta ke rute perjalanan"
          aria-label="Pusatkan peta ke rute perjalanan"
        >
          <Crosshair size={20} color="#1F2937" strokeWidth={2.2} />
        </button>

        {/* Drag Handle Bar */}
        <div className="sheet-drag-handle" />

        {/* Scrollable Ride Options List */}
        <div className="sheet-rides-list">
          {rideOptions.map((ride) => {
            const isSelected = selectedRide === ride.id;
            const IconComponent = ride.ComponentIcon;

            return (
              <div
                key={ride.id}
                className={`sheet-ride-card ${isSelected ? 'selected' : ''}`}
                onClick={() => setSelectedRide(ride.id)}
              >
                <div className="ride-card-left">
                  <div className="ride-card-visual">
                    <IconComponent width={82} height={56} />
                  </div>

                  <div className="ride-card-info">
                    <div className="ride-card-title-row">
                      <span className="ride-card-title">{ride.name}</span>
                      {ride.desc && <span className="ride-badge-shesend">{ride.desc}</span>}
                    </div>
                    <div className="ride-card-meta">
                      <span>{ride.eta}</span>
                      <span className="meta-sep">·</span>
                      <span className="meta-capacity">{isSendMode ? `📦 ${ride.capacity}` : `👤 ${ride.capacity}`}</span>
                      <button
                        type="button"
                        className="btn-info-icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          showToast(`ℹ️ Informasi layanan ${ride.name}`);
                        }}
                      >
                        <Info size={13} color="#9CA3AF" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="ride-card-right">
                  <div className="ride-card-price-row">
                    <span className="ride-card-price">
                      Rp{ride.price.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 4. Bottom Payment & Action Bar (Cash, Offers, More) */}
        <div className="sheet-payment-bar">
          <button
            type="button"
            className="payment-bar-btn payment-cash-btn"
            onClick={() => showToast('💵 Metode pembayaran: Tunai (Cash)')}
          >
            <div className="cash-icon-bubble">
              <Banknote size={15} color="#00B14F" />
            </div>
            <span>Cash</span>
          </button>

          <div className="payment-bar-divider" />

          <button
            type="button"
            className="payment-bar-btn payment-offers-btn"
            onClick={() => showToast('🎟️ Promo "RIDEGO" diterapkan!')}
          >
            <Tag size={15} color="#6B7280" />
            <span>Offers</span>
          </button>

          <div className="payment-bar-divider" />

          <button
            type="button"
            className="payment-bar-btn payment-more-btn"
            onClick={() => showToast('⚙️ Opsi perjalanan lainnya')}
          >
            <MoreHorizontal size={18} color="#4B5563" />
          </button>
        </div>

        {/* 5. Big CTA Button */}
        <button
          type="button"
          className={`btn-book-with-cash ${isSendMode ? 'btn-book-shesend' : ''}`}
          onClick={() => {
            if (onBook) {
              onBook({
                ride: currentRide,
                serviceType: isSendMode ? 'send' : 'ride',
                packageData: isSendMode ? packageData : null
              });
            }
          }}
        >
          {isSendMode ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <Package size={18} />
              <span>Kirim Paket Sekarang · Rp{currentRide.price.toLocaleString('id-ID')}</span>
            </span>
          ) : (
            <span>Book with cash · Rp{currentRide.price.toLocaleString('id-ID')}</span>
          )}
        </button>
      </div>
    </div>
  );
}
