import React from 'react';
import { BRAND } from '../brand';

export const KDocLogo: React.FC<{ size?: number; tagline?: boolean }>= ({ size = 110, tagline = false }) => {
  const pad = size * 0.16;
  const radius = size * 0.26;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: size * 0.2 }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          background: `linear-gradient(135deg, ${BRAND.primaryLight}, ${BRAND.primary} 55%, ${BRAND.primaryDeep})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 18px 40px ${BRAND.primary}55, inset 0 1px 0 rgba(255,255,255,0.25)`,
          position: 'relative',
        }}
      >
        <svg width={size - pad * 2} height={size - pad * 2} viewBox="0 0 24 24" fill="none">
          <path d="M6 3h9l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M15 3v5h5" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M9 13h7M9 17h5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
        <div style={{ fontFamily: BRAND.fontStack, fontSize: size * 0.62, fontWeight: 800, color: '#fff', letterSpacing: -2 }}>
          kdoc
        </div>
        {tagline && (
          <div style={{ fontFamily: BRAND.fontStack, fontSize: size * 0.2, fontWeight: 500, color: BRAND.textDim, marginTop: size * 0.08, letterSpacing: 0.5 }}>
            Intelligent organisiert
          </div>
        )}
      </div>
    </div>
  );
};
