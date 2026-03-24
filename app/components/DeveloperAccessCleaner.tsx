"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const developerSafePrefixes = [
  "/developer",
  "/chat",
  "/loading-preview",
] as const;

export default function DeveloperAccessCleaner() {
  const pathname = usePathname();

  useEffect(() => {
    if (developerSafePrefixes.some((prefix) => pathname.startsWith(prefix))) {
      return;
    }

    fetch("/api/developer/logout", {
      method: "POST",
      keepalive: true,
    }).catch(() => undefined);
  }, [pathname]);

  return null;
}
