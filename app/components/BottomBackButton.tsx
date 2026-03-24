"use client";

import BackIconButton from "./BackIconButton";

export default function BottomBackButton() {
  return (
    <div
      style={{
        position: "fixed",
        left: "calc(env(safe-area-inset-left) + 18px)",
        bottom: "calc(env(safe-area-inset-bottom) + 22px)",
        zIndex: 70,
      }}
    >
      <BackIconButton />
    </div>
  );
}
