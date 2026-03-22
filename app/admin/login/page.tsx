"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { auth } from "../../../lib/firebase";
import { ADMIN_EMAIL, isAdminEmail } from "../../../lib/admin";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";

export default function AdminLoginPage() {
  const [email, setEmail] = useState(ADMIN_EMAIL);
  const [password, setPassword] = useState("");
  const [checkingSession, setCheckingSession] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Enter the admin password to continue.");

  useEffect(() => {
    setReady(true);
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser && isAdminEmail(currentUser.email)) {
        window.location.href = "/admin";
        return;
      }

      setCheckingSession(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAdminLogin = async () => {
    if (!ready) {
      setStatusMessage("Page is still loading. Try again in a moment.");
      return;
    }

    if (!email.trim() || !password.trim()) {
      setStatusMessage("Enter the admin email and password.");
      return;
    }

    try {
      setSubmitting(true);
      setStatusMessage("Signing in as admin...");
      const credential = await signInWithEmailAndPassword(auth, email, password);

      if (!isAdminEmail(credential.user.email)) {
        await signOut(auth);
        setStatusMessage("This account is not authorized for admin access.");
        return;
      }

      setStatusMessage("Admin login successful. Redirecting...");
      window.location.href = "/admin";
    } catch (error) {
      console.error(error);
      if (error instanceof Error) {
        setStatusMessage(`Admin login failed: ${error.message}`);
      } else {
        setStatusMessage("Admin login failed.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (checkingSession) {
    return (
      <main style={{ padding: 20 }}>
        <p>Loading...</p>
      </main>
    );
  }

  return (
    <main style={{ padding: 20 }}>
      <Link
        href="/login"
        style={{
          display: "inline-block",
          marginBottom: 20,
          padding: "8px 14px",
          backgroundColor: "#1f2937",
          color: "white",
          textDecoration: "none",
          borderRadius: 8,
        }}
      >
        Back to Login
      </Link>

      <h1>Admin Login</h1>
      <p style={{ maxWidth: 500 }}>
        This page only allows the authorized admin account to sign in.
      </p>

      <div style={{ marginTop: 20, maxWidth: 400 }}>
        {statusMessage ? (
          <p style={{ marginBottom: 12, color: statusMessage.includes("failed") || statusMessage.includes("not authorized") ? "#b91c1c" : "#1d4ed8" }}>
            {statusMessage}
          </p>
        ) : null}

        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Admin Email"
          style={{ display: "block", marginBottom: 10, padding: 8, width: "100%" }}
        />

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          style={{ display: "block", marginBottom: 10, padding: 8, width: "100%" }}
        />

        <button
          type="button"
          onClick={handleAdminLogin}
          disabled={submitting}
          style={{
            padding: "10px 16px",
            backgroundColor: "#7c3aed",
            color: "white",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          Admin Login
        </button>
      </div>
    </main>
  );
}
