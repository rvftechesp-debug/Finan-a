"use client";

import { useEffect, useRef, useState } from "react";

type Particle = {
  left: number;
  delay: number;
  duration: number;
  size: number;
};

export default function CoinLoader({ onFinish }: { onFinish?: () => void }) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const dropSound = useRef<HTMLAudioElement | null>(null);
  const flipSound = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setParticles(
      Array.from({ length: 15 }, () => ({
        left: Math.random() * 100,
        delay: Math.random() * 5,
        duration: 3 + Math.random() * 4,
        size: 10 + Math.random() * 15,
      }))
    );
  }, []);

  useEffect(() => {
    dropSound.current?.play().catch(() => {});
    const flipTimer = setTimeout(() => flipSound.current?.play().catch(() => {}), 1500);
    const finishTimer = setTimeout(() => onFinish?.(), 6000);
    return () => {
      clearTimeout(flipTimer);
      clearTimeout(finishTimer);
    };
  }, [onFinish]);

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black overflow-hidden">
      <audio ref={dropSound} src="/coin-drop.mp3" preload="auto" />
      <audio ref={flipSound} src="/coin-flip.mp3" preload="auto" />

      {/* Partículas */}
      {particles.map((p, i) => (
        <span
          key={i}
          className="particle"
          style={{
            left: `${p.left}%`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            width: `${p.size}px`,
            height: `${p.size}px`,
          }}
        />
      ))}

      <div className="glow-bg" />

      {/* Cena 3D da moeda */}
      <div className="coin-scene">
        <div className="coin-drop">
          <div className="coin">
            <div className="coin-face coin-front">
              <img src="/coin-front.png" alt="cara" className="w-full h-full object-contain" />
            </div>
            <div className="coin-face coin-crown">
              <img src="/coin-back.png" alt="coroa" className="w-full h-full object-contain" />
            </div>
          </div>
        </div>
      </div>

      <p className="mt-8 text-lg font-bold tracking-[0.3em] text-[#d4af37] loading-text">
        CARREGANDO...
      </p>

            <style jsx>{`
        .coin-scene {
          -webkit-perspective: 1200px;
          perspective: 1200px;
          width: min(300px, 70vw);
          height: min(300px, 70vw);
          z-index: 2;
        }
        .coin-drop {
          width: 100%;
          height: 100%;
          -webkit-transform-style: preserve-3d;
          transform-style: preserve-3d;
          -webkit-animation: coinIn 1.2s ease-out forwards;
          animation: coinIn 1.2s ease-out forwards;
        }
        .coin {
          position: relative;
          width: 100%;
          height: 100%;
          -webkit-transform-style: preserve-3d;
          transform-style: preserve-3d;
          -webkit-animation: spin 2.5s ease-out 0.3s 1 forwards;
          animation: spin 2.5s ease-out 0.3s 1 forwards;
        }
        .coin-face {
          position: absolute;
          inset: 0;
          -webkit-backface-visibility: hidden;
          backface-visibility: hidden;
          border-radius: 50%;
          overflow: hidden;
          filter: drop-shadow(0 0 25px rgba(212, 175, 55, 0.5));
        }
        .coin-front { -webkit-transform: rotateY(0deg); transform: rotateY(0deg); }
        .coin-crown { -webkit-transform: rotateY(180deg); transform: rotateY(180deg); }
        .coin::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 50%;
          box-shadow: inset 0 0 20px rgba(212, 175, 55, 0.4);
          pointer-events: none;
        }

        @-webkit-keyframes coinIn {
          0%   { -webkit-transform: translateY(-120vh); opacity: 0; }
          70%  { opacity: 1; }
          100% { -webkit-transform: translateY(0); opacity: 1; }
        }
        @keyframes coinIn {
          0%   { transform: translateY(-120vh); opacity: 0; }
          70%  { opacity: 1; }
          100% { transform: translateY(0); opacity: 1; }
        }

        @-webkit-keyframes spin {
          0%   { -webkit-transform: rotateY(0deg); }
          100% { -webkit-transform: rotateY(180deg); }
        }
        @keyframes spin {
          0%   { transform: rotateY(0deg); }
          100% { transform: rotateY(180deg); }
        }

        .glow-bg {
          position: absolute;
          width: min(500px, 100vw);
          height: min(500px, 100vw);
          background: radial-gradient(circle, rgba(212, 175, 55, 0.15) 0%, transparent 70%);
          -webkit-animation: bgPulse 3s ease-in-out infinite;
          animation: bgPulse 3s ease-in-out infinite;
          z-index: 1;
        }
        .loading-text {
          -webkit-animation: textPulse 1.5s ease-in-out infinite;
          animation: textPulse 1.5s ease-in-out infinite;
          z-index: 2;
        }
        .particle {
          position: absolute;
          top: -30px;
          border-radius: 50%;
          background: radial-gradient(circle at 30% 30%, #ffe680, #d4af37 60%, #a67c00);
          box-shadow: 0 0 8px rgba(212, 175, 55, 0.7);
          -webkit-animation-name: fall;
          animation-name: fall;
          -webkit-animation-timing-function: linear;
          animation-timing-function: linear;
          -webkit-animation-iteration-count: infinite;
          animation-iteration-count: infinite;
          opacity: 0.8;
          z-index: 0;
        }

        @-webkit-keyframes fall {
          0%   { -webkit-transform: translateY(0) rotate(0deg); opacity: 0; }
          10%  { opacity: 0.9; }
          90%  { opacity: 0.9; }
          100% { -webkit-transform: translateY(105vh) rotate(360deg); opacity: 0; }
        }
        @keyframes fall {
          0%   { transform: translateY(0) rotate(0deg); opacity: 0; }
          10%  { opacity: 0.9; }
          90%  { opacity: 0.9; }
          100% { transform: translateY(105vh) rotate(360deg); opacity: 0; }
        }

        @keyframes bgPulse {
          0%,100% { opacity: 0.4; transform: scale(1); }
          50%     { opacity: 0.8; transform: scale(1.1); }
        }
        @keyframes textPulse {
          0%,100% { opacity: 0.6; text-shadow: 0 0 8px rgba(212,175,55,0.4); }
          50%     { opacity: 1;   text-shadow: 0 0 16px rgba(212,175,55,0.8); }
        }
      `}</style>

    </div>
  );
}
