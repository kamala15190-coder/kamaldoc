import React from 'react';
import { V2 } from '../brandV2';

/** Clean line icons in a glass pill — used in every scene for visual rhythm. */
export const IconOrb: React.FC<{
  children: React.ReactNode;
  size?: number;
  tint?: string;
}>= ({ children, size = 140, tint = V2.primary }) => {
  return (
    <div style={{
      width: size, height: size, borderRadius: '28%',
      background: `${tint}15`,
      border: `1px solid ${V2.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative',
      backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
    }}>
      {/* inner glass highlight */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 'inherit',
        background: `linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 40%)`,
        pointerEvents: 'none',
      }} />
      {/* soft outer glow */}
      <div style={{
        position: 'absolute', inset: -20, borderRadius: '36%',
        background: `radial-gradient(60% 60% at 50% 50%, ${tint}22 0%, transparent 70%)`,
        filter: 'blur(6px)', zIndex: -1,
      }} />
      {children}
    </div>
  );
};

const strokeProps = { stroke: '#fff', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };

export const CameraIcon = ({ size = 72 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path {...strokeProps} d="M3 8a2 2 0 0 1 2-2h2l2-2h6l2 2h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8Z" />
    <circle {...strokeProps} cx="12" cy="13" r="4" />
  </svg>
);

export const StethoscopeIcon = ({ size = 72 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path {...strokeProps} d="M6 3v6a4 4 0 0 0 8 0V3M4 3h4M12 3h4" />
    <path {...strokeProps} d="M10 13v3a4 4 0 0 0 4 4h0a4 4 0 0 0 4-4v-2" />
    <circle {...strokeProps} cx="18" cy="11" r="2" />
  </svg>
);

export const CalendarPulseIcon = ({ size = 72 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <rect {...strokeProps} x="3" y="5" width="18" height="16" rx="2" />
    <path {...strokeProps} d="M8 3v4M16 3v4M3 10h18" />
    <path {...strokeProps} d="M7 15h2l1.5-3 2 5 1.5-2h3" />
  </svg>
);

export const PenLetterIcon = ({ size = 72 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path {...strokeProps} d="M4 7h10l6 6v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Z" />
    <path {...strokeProps} d="M14 7v6h6" />
    <path {...strokeProps} d="M7 13l4-4 3 3-4 4H7v-3Z" />
  </svg>
);

export const PlugIcon = ({ size = 72 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path {...strokeProps} d="M9 3v5M15 3v5M7 8h10v3a5 5 0 0 1-5 5h0a5 5 0 0 1-5-5V8ZM12 16v5" />
  </svg>
);

export const SparkleIcon = ({ size = 40, color = V2.primaryLight }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path d="M12 2l2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6Z" fill={color} />
  </svg>
);

export const CheckIcon = ({ size = 32, color = V2.success }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M4 12l5 5L20 6" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const SearchIcon = ({ size = 28 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <circle {...strokeProps} cx="11" cy="11" r="7" />
    <path {...strokeProps} d="M20 20l-3.5-3.5" />
  </svg>
);

// kdoc logomark: purple rounded square with a stylised "k" + doc page
export const KdocMark: React.FC<{ size?: number }>= ({ size = 100 }) => {
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.26,
      background: `linear-gradient(135deg, ${V2.primaryLight} 0%, ${V2.primary} 60%, ${V2.primaryDeep} 100%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: `linear-gradient(180deg, rgba(255,255,255,0.22) 0%, transparent 45%)`,
      }} />
      <svg width={size * 0.56} height={size * 0.56} viewBox="0 0 24 24" fill="none">
        <path d="M6 3h9l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M15 3v5h5" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M9 18V10m0 4 3-3m-3 3 3 3" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
};
