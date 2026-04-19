import { useEffect, useState } from 'react';

const COLORS = ['#6366f1', '#818cf8', '#f59e0b', '#10b981', '#a78bfa', '#fbbf24'];

function generatePieces(count) {
  return Array.from({ length: count }).map((_, i) => {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
    const distance = 90 + Math.random() * 60;
    return {
      cx: Math.cos(angle) * distance,
      cy: Math.sin(angle) * distance,
      cr: (Math.random() - 0.5) * 720,
      color: COLORS[i % COLORS.length],
      delay: Math.random() * 80,
    };
  });
}

export default function Confetti({ show = false, duration = 900, count = 14, onDone }) {
  const [visible, setVisible] = useState(false);
  const [pieces, setPieces] = useState([]);

  useEffect(() => {
    if (!show) return;
    setPieces(generatePieces(count)); // eslint-disable-line react-hooks/set-state-in-effect
    setVisible(true);
    const t = setTimeout(() => {
      setVisible(false);
      onDone?.();
    }, duration + 50);
    return () => clearTimeout(t);
  }, [show, duration, count, onDone]);

  if (!visible) return null;

  return (
    <div className="confetti-layer" aria-hidden="true">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{
            background: p.color,
            animationDelay: `${p.delay}ms`,
            '--cx': `${p.cx}px`,
            '--cy': `${p.cy}px`,
            '--cr': `${p.cr}deg`,
          }}
        />
      ))}
    </div>
  );
}
