 "use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "../../lib/firebase";
import { isAdminEmail } from "../../lib/admin";

const linkStyle: CSSProperties = {
  display: "inline-block",
  textDecoration: "none",
  color: "#8ea0b3",
  fontSize: 12,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  background: "transparent",
  border: "none",
  padding: 0,
  cursor: "pointer",
};

export default function BottomUtilityNav() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    return onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
  }, []);

  const showAdminLink = Boolean(user && isAdminEmail(user.email));

  return (
    <nav
      aria-label="Feedback links"
      style={{
        display: "flex",
        justifyContent: "center",
        gap: 18,
        padding: "4px 16px 0",
        flexWrap: "wrap",
      }}
    >
      <Link href="/report-bug" style={linkStyle}>Report Bug</Link>
      <Link href="/developer" style={linkStyle}>Dev</Link>
      {showAdminLink ? <Link href="/admin" style={linkStyle}>Admin</Link> : null}
      <Link href="/suggestions" style={linkStyle}>Suggestions</Link>
    </nav>
  );
}
