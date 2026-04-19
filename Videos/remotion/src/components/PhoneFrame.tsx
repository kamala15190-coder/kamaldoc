import React from 'react';
import { Img, staticFile } from 'remotion';
import { BRAND } from '../brand';

/** Mobile phone bezel wrapping an app screenshot. */
export const PhoneFrame: React.FC<{
  src: string;
  width: number;
  tilt?: number;
  /** image shown aspect is ~9:19.5 (945x2048 typical) */
}>= ({ src, width, tilt = 0 }) => {
  const height = width * (19.5 / 9);
  const bezel = Math.max(6, width * 0.015);
  const radius = width * 0.08;

  return (
    <div style={{
      width,
      height,
      borderRadius: radius,
      background: '#0A0F1A',
      padding: bezel,
      boxShadow: `0 40px 90px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.08), inset 0 0 0 2px #000`,
      transform: `rotate(${tilt}deg)`,
      position: 'relative',
    }}>
      <div style={{
        width: '100%', height: '100%',
        borderRadius: radius - bezel,
        overflow: 'hidden',
        background: '#000',
        position: 'relative',
      }}>
        <Img src={staticFile(src)} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      </div>
      {/* Glow behind phone */}
      <div style={{
        position: 'absolute', inset: -40,
        borderRadius: radius + 40,
        background: `radial-gradient(50% 40% at 50% 50%, ${BRAND.primary}33 0%, transparent 70%)`,
        zIndex: -1,
      }} />
    </div>
  );
};
