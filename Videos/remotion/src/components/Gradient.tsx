import React from 'react';
import { BRAND } from '../brand';

/** Animated radial/linear gradient background shared by several scenes. */
export const GradientBg: React.FC<{ progress?: number }>= ({ progress = 0 }) => {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: BRAND.bgDeep }}>
      <div style={{
        position: 'absolute',
        inset: -200,
        background: `
          radial-gradient(40% 40% at 50% ${30 + progress * 10}%, ${BRAND.primary}55 0%, transparent 70%),
          radial-gradient(60% 60% at ${20 + progress * 15}% 80%, ${BRAND.primaryDeep}44 0%, transparent 65%),
          radial-gradient(50% 50% at ${80 - progress * 10}% 20%, ${BRAND.accent}22 0%, transparent 60%)
        `,
        filter: 'blur(2px)',
      }} />
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
        backgroundSize: '48px 48px',
        opacity: 0.6,
      }} />
    </div>
  );
};

/** Subtle moving dots for depth. */
export const StarField: React.FC<{ progress: number }>= ({ progress }) => {
  const dots = Array.from({ length: 30 }).map((_, i) => ({
    x: (i * 97) % 100,
    y: ((i * 53) % 100),
    r: 1 + (i % 3),
    a: 0.15 + (i % 7) * 0.05,
  }));
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {dots.map((d, i) => (
        <span key={i} style={{
          position: 'absolute',
          left: `${d.x}%`,
          top: `${(d.y + progress * 8) % 100}%`,
          width: d.r, height: d.r, borderRadius: '50%',
          background: `rgba(255,255,255,${d.a})`,
          boxShadow: `0 0 ${d.r * 4}px rgba(139,130,255,${d.a})`,
        }} />
      ))}
    </div>
  );
};
