import React from "react";

export function GlassPanel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 999999, display: "flex",
        alignItems: "center", justifyContent: "center", padding: 16,
        background: "linear-gradient(135deg, rgba(15,23,42,0.4), rgba(49,46,129,0.3), rgba(15,23,42,0.5))",
        backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        animation: "unfryFade .7s ease both",
      }}
    >
      <style>{`
        @keyframes unfryFade { from {opacity:0} to {opacity:1} }
        @keyframes unfryRise { from {opacity:0; transform:translateY(16px)} to {opacity:1; transform:translateY(0)} }
        @media (prefers-reduced-motion: reduce){ *{animation:none!important;transition:none!important} }
      `}</style>
      <div
        style={{
          position: "relative", width: "100%", maxWidth: 440,
          borderRadius: 24, background: "rgba(255,255,255,0.10)",
          backdropFilter: "blur(28px)", WebkitBackdropFilter: "blur(28px)",
          border: "1px solid rgba(255,255,255,0.20)",
          boxShadow: "0 8px 40px rgba(31,38,135,0.4)", padding: 30,
          animation: "unfryRise .5s ease both",
          fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
        }}
      >
        {children}
      </div>
    </div>
  );
}
