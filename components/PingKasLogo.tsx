import React from "react";
import Image from "next/image";

interface PingKasLogoProps {
  size?: number;
  showText?: boolean;
  horizontal?: boolean;
  useImage?: boolean;
  className?: string;
}

export function PingKasLogo({
  size = 48,
  showText = true,
  horizontal = true,
  useImage = false,
  className = "",
}: PingKasLogoProps) {
  if (useImage) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <Image
          src="/logo.png"
          alt="PingKas Logo"
          width={size}
          height={size}
          className="rounded-2xl object-contain shadow-md hover:scale-105 transition-transform"
        />
        {showText && (
          <div className="flex flex-col">
            <span className="font-extrabold text-2xl tracking-tight leading-none flex items-center">
              <span className="text-pingkas-teal">Ping</span>
              <span className="text-pingkas-teal-dark">Kas</span>
            </span>
            <span className="text-xs font-semibold text-slate-500 tracking-wide mt-0.5">
              Financial Companion
            </span>
          </div>
        )}
      </div>
    );
  }

  // Pure SVG / CSS Mascot recreation matching Flutter widget
  const mascot = (
    <div
      style={{ width: `${size}px`, height: `${size}px` }}
      className="relative rounded-full flex items-center justify-center shrink-0 shadow-lg shadow-orange-500/30 transition-transform duration-300 hover:scale-105"
    >
      {/* Outer Orange Speech Bubble Body */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: "radial-gradient(circle at 50% 30%, #FF9E40 0%, #FF6D00 60%, #E65100 100%)",
        }}
      />

      {/* Bubble Tail Hint */}
      <div
        className="absolute rounded-bl-lg"
        style={{
          width: `${size * 0.28}px`,
          height: `${size * 0.28}px`,
          bottom: `${size * 0.07}px`,
          left: `${size * 0.12}px`,
          backgroundColor: "#E65100",
          transform: "rotate(-25deg)",
          zIndex: 1,
        }}
      />

      {/* Inner Glowing Gold Coin */}
      <div
        className="relative rounded-full flex flex-col items-center justify-center z-10 shadow-sm border"
        style={{
          width: `${size * 0.72}px`,
          height: `${size * 0.72}px`,
          background: "linear-gradient(180deg, #FFE082 0%, #FFCA28 50%, #FFA000 100%)",
          borderColor: "#FFF8E1",
          borderWidth: `${Math.max(1.5, size * 0.035)}px`,
        }}
      >
        {/* Cute Eyes */}
        <div
          className="flex items-center justify-between"
          style={{
            width: `${size * 0.28}px`,
            marginTop: `${size * 0.04}px`,
          }}
        >
          <span
            className="rounded-full inline-block bg-[#5D4037]"
            style={{ width: `${size * 0.065}px`, height: `${size * 0.04}px` }}
          />
          <span
            className="rounded-full inline-block bg-[#5D4037]"
            style={{ width: `${size * 0.065}px`, height: `${size * 0.04}px` }}
          />
        </div>

        {/* "Rp" Text */}
        <span
          className="font-black text-white leading-none tracking-tight select-none"
          style={{
            fontSize: `${size * 0.3}px`,
            textShadow: "0 2px 4px rgba(230, 81, 0, 0.6)",
            marginTop: `${size * 0.02}px`,
          }}
        >
          Rp
        </span>
      </div>

      {/* Top Right Golden Notification Ping Orb */}
      <div
        className="absolute rounded-full border-2 border-white shadow-md z-20"
        style={{
          width: `${size * 0.24}px`,
          height: `${size * 0.24}px`,
          top: `${size * 0.04}px`,
          right: `${size * 0.04}px`,
          background: "linear-gradient(135deg, #FFF9C4 0%, #FFCA28 60%, #FF9800 100%)",
        }}
      />
    </div>
  );

  if (!showText) {
    return <div className={className}>{mascot}</div>;
  }

  const textSizeClass = size >= 64 ? "text-3xl" : size >= 48 ? "text-2xl" : "text-xl";

  return (
    <div
      className={`flex ${
        horizontal ? "flex-row items-center gap-3" : "flex-col items-center gap-2 text-center"
      } ${className}`}
    >
      {mascot}
      <div className="flex flex-col">
        <span className={`font-extrabold ${textSizeClass} tracking-tight leading-none flex items-center`}>
          <span className="text-pingkas-teal">Ping</span>
          <span className="text-pingkas-teal-dark">Kas</span>
        </span>
        <span className="text-[11px] font-medium text-slate-500 tracking-wide mt-0.5">
          Catat Cepat via WhatsApp
        </span>
      </div>
    </div>
  );
}
