import React from 'react';
import { AbsoluteFill } from 'remotion';
import { V2 } from '../brandV2';

/** Deep-black base with a single, soft radial glow. Very subtle — premium look. */
export const AmbientBg: React.FC<{ intensity?: number; glowY?: number; glowX?: number }>= ({ intensity = 1, glowY = 42, glowX = 50 }) => {
  return (
    <AbsoluteFill style={{ background: V2.bg }}>
      <AbsoluteFill style={{
        background: `radial-gradient(55% 50% at ${glowX}% ${glowY}%, rgba(99, 89, 255, ${0.22 * intensity}) 0%, rgba(99, 89, 255, 0) 70%)`,
      }} />
      <AbsoluteFill style={{
        background: `radial-gradient(45% 40% at ${100 - glowX}% ${100 - glowY}%, rgba(167, 139, 250, ${0.08 * intensity}) 0%, transparent 70%)`,
      }} />
    </AbsoluteFill>
  );
};

/** Subtle floating particles for the CTA scene — extremely low opacity. */
export const ParticleField: React.FC<{ frame: number; count?: number }>= ({ frame, count = 40 }) => {
  const dots = Array.from({ length: count }).map((_, i) => {
    const seed = i * 37;
    return {
      x: ((seed * 17) % 100) + ((frame / 100 + (seed % 13)) % 1) * 2 - 1,
      y: (((seed * 53) % 100) + frame * 0.03 + (seed % 11) * 0.7) % 100,
      r: 1 + (i % 3) * 0.6,
      a: 0.15 + ((seed % 7) / 7) * 0.1,
    };
  });
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {dots.map((d, i) => (
        <span key={i} style={{
          position: 'absolute',
          left: `${d.x}%`,
          top: `${d.y}%`,
          width: d.r * 2,
          height: d.r * 2,
          borderRadius: '50%',
          background: `rgba(167,139,250,${d.a})`,
        }} />
      ))}
    </AbsoluteFill>
  );
};
