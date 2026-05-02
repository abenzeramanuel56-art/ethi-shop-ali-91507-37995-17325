import React from "react";

export default function RotatingBadge() {
  return (
    <div aria-hidden className="fixed bottom-20 right-4 sm:bottom-4 z-50 pointer-events-none">
      <div
        style={{
          width: 80,
          height: 80,
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            padding: 6,
            boxSizing: "border-box",
            animation: "rotatingBadge 8s linear infinite",
            background:
              "conic-gradient(#ff8a00 0deg, #ff9a1a 120deg, #ffc26b 240deg, #ff8a00 360deg)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 6,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.06)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              padding: 6,
              color: "#fff",
              fontWeight: 700,
              fontSize: 11,
              pointerEvents: "none",
            }}
          >
            abeni express
          </div>
        </div>

      <style>{`@keyframes rotatingBadge{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );
}
