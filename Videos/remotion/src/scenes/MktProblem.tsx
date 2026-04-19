import React from 'react';
import { AbsoluteFill, OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { BRAND, SAFE_LANDSCAPE } from '../brand';

/** Marketing Scene 1: Problem — chaos, red timer */
export const MktProblem: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const deskOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });

  const titleOpacity = interpolate(frame, [25, 45], [0, 1], { extrapolateRight: 'clamp' });
  const titleY = interpolate(frame, [25, 45], [30, 0], { extrapolateRight: 'clamp' });

  // Timer ticking: just show 03:47:22 style rolling seconds
  const seconds = Math.floor(frame / 3) % 60;
  const hours = 3;
  const minutes = 47 + Math.floor(frame / 180);

  const fmtHours = String(hours).padStart(2, '0');
  const fmtMin = String(minutes % 60).padStart(2, '0');
  const fmtSec = String(seconds).padStart(2, '0');

  // Darken at end to transition to next
  const fadeOut = interpolate(frame, [durationInFrames - 20, durationInFrames], [1, 0.4], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ background: BRAND.bgDeep }}>
      {/* Desk video — cover landscape by stretching; source is 9:16, so fit contain-ish with blur bg */}
      <AbsoluteFill style={{ opacity: deskOpacity * fadeOut, filter: 'blur(8px) saturate(0.7)', transform: 'scale(1.4)' }}>
        <OffthreadVideo src={staticFile('desk.mp4')} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </AbsoluteFill>
      <AbsoluteFill style={{ opacity: deskOpacity * fadeOut }}>
        <OffthreadVideo src={staticFile('desk.mp4')} muted style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      </AbsoluteFill>

      {/* Dark overlay */}
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.55), rgba(15,0,30,0.7))', opacity: fadeOut }} />

      {/* Title */}
      <div style={{
        position: 'absolute',
        top: SAFE_LANDSCAPE.top + 80,
        left: SAFE_LANDSCAPE.side, right: SAFE_LANDSCAPE.side,
        textAlign: 'center',
        opacity: titleOpacity * fadeOut,
        transform: `translateY(${titleY}px)`,
      }}>
        <div style={{ fontFamily: BRAND.fontStack, fontSize: 36, fontWeight: 600, color: '#F87171', letterSpacing: 3, textTransform: 'uppercase' }}>
          Problem
        </div>
        <div style={{ fontFamily: BRAND.fontStack, fontSize: 96, fontWeight: 800, color: '#fff', marginTop: 14, letterSpacing: -2.5, lineHeight: 1.05, textShadow: '0 8px 30px rgba(0,0,0,0.6)' }}>
          Dokumentenchaos kostet Zeit.
        </div>
      </div>

      {/* Red timer */}
      <div style={{
        position: 'absolute', bottom: SAFE_LANDSCAPE.bottom + 60, right: SAFE_LANDSCAPE.side,
        padding: '28px 42px',
        background: 'rgba(239,68,68,0.18)',
        border: '2px solid #EF4444',
        borderRadius: 20,
        fontFamily: '"SF Mono", Menlo, Monaco, monospace',
        fontSize: 88,
        fontWeight: 800,
        color: '#F87171',
        letterSpacing: 4,
        boxShadow: '0 20px 50px rgba(239,68,68,0.35)',
        opacity: interpolate(frame, [40, 70], [0, 1], { extrapolateRight: 'clamp' }) * fadeOut,
        textShadow: '0 0 30px rgba(239,68,68,0.5)',
      }}>
        {fmtHours}:{fmtMin}:{fmtSec}
      </div>
      <div style={{
        position: 'absolute', bottom: SAFE_LANDSCAPE.bottom + 30, right: SAFE_LANDSCAPE.side,
        fontFamily: BRAND.fontStack, fontSize: 28, color: '#F87171', fontWeight: 600, letterSpacing: 2,
        opacity: interpolate(frame, [55, 80], [0, 1], { extrapolateRight: 'clamp' }) * fadeOut,
      }}>
        VERBRACHTE ZEIT MIT PAPIER
      </div>
    </AbsoluteFill>
  );
};
