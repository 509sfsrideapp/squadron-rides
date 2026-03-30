"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import InitialAppSplash from "../../components/InitialAppSplash";

export default function DeveloperLoaderTestClient() {
  const router = useRouter();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      router.replace("/developer");
    }, 4200);

    return () => window.clearTimeout(timer);
  }, [router]);

  return <InitialAppSplash forceReplay />;
}
