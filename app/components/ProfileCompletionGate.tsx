"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../../lib/firebase";
import { isAdminEmail } from "../../lib/admin";
import { hasRequiredAccountInfo } from "../../lib/profile-readiness";

const allowedPaths = new Set([
  "/account",
  "/account-required",
  "/login",
  "/signup",
]);

type GateProfile = {
  firstName?: string;
  lastName?: string;
  rank?: string;
  flight?: string;
  username?: string;
  phone?: string;
};

export default function ProfileCompletionGate() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser || isAdminEmail(currentUser.email)) {
        return;
      }

      const snap = await getDoc(doc(db, "users", currentUser.uid)).catch(() => null);
      const profile = snap?.exists() ? (snap.data() as GateProfile) : null;
      const complete = hasRequiredAccountInfo(profile);

      if (!complete && !allowedPaths.has(pathname)) {
        router.replace("/account-required");
        return;
      }

      if (complete && pathname === "/account-required") {
        router.replace("/");
      }
    });

    return () => unsubscribe();
  }, [pathname, router]);

  return null;
}
