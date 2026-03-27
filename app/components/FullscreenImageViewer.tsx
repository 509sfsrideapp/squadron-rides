"use client";

import { useEffect, useRef, useState } from "react";

type FullscreenImageViewerProps = {
  src: string;
  alt: string;
  open: boolean;
  onClose: () => void;
};

export default function FullscreenImageViewer({
  src,
  alt,
  open,
  onClose,
}: FullscreenImageViewerProps) {
  const startYRef = useRef<number | null>(null);
  const [dragY, setDragY] = useState(0);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(2, 6, 23, 0.96)",
        zIndex: 120,
        display: "grid",
        placeItems: "center",
        padding: 20,
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        onTouchStart={(event) => {
          startYRef.current = event.touches[0]?.clientY ?? null;
        }}
        onTouchMove={(event) => {
          const startY = startYRef.current;
          const currentY = event.touches[0]?.clientY;

          if (startY == null || currentY == null) {
            return;
          }

          setDragY(Math.max(0, currentY - startY));
        }}
        onTouchEnd={() => {
          if (dragY > 140) {
            onClose();
          }

          startYRef.current = null;
          setDragY(0);
        }}
        style={{
          width: "100%",
          height: "100%",
          display: "grid",
          placeItems: "center",
          transform: `translateY(${dragY}px)`,
          transition: dragY === 0 ? "transform 180ms ease" : "none",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          style={{
            position: "fixed",
            top: 18,
            left: 18,
            width: 44,
            height: 44,
            borderRadius: 999,
            display: "grid",
            placeItems: "center",
            backgroundColor: "rgba(15, 23, 42, 0.9)",
            color: "#e2e8f0",
            border: "1px solid rgba(148, 163, 184, 0.24)",
            fontSize: 24,
            lineHeight: 1,
            zIndex: 2,
          }}
          aria-label="Close image"
        >
          ×
        </button>
        <img
          src={src}
          alt={alt}
          style={{
            maxWidth: "100%",
            maxHeight: "100%",
            objectFit: "contain",
            borderRadius: 18,
            boxShadow: "0 20px 46px rgba(0, 0, 0, 0.38)",
          }}
        />
      </div>
    </div>
  );
}
