"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { auth } from "../../lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Enter your email and password.");

  useEffect(() => {
    setReady(true);
    setStatusMessage("Enter your email and password.");
  }, []);

  const handleLogin = async () => {
    if (!ready) {
      setStatusMessage("Page is still loading. Try again in a moment.");
      return;
    }

    if (!email.trim() || !password.trim()) {
      setStatusMessage("Enter email and password.");
      return;
    }

    try {
      setSubmitting(true);
      setStatusMessage("Signing in...");
      await signInWithEmailAndPassword(auth, email, password);
      setStatusMessage("Login successful. Redirecting...");
      window.location.href = "/";
    } catch (error) {
      console.error(error);
      if (error instanceof Error) {
        setStatusMessage(`Login failed: ${error.message}`);
      } else {
        setStatusMessage("Login failed.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main style={{ padding: 20 }}>
      <Link
        href="/"
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
        Home
      </Link>

      <h1>Login</h1>

      <div style={{ marginTop: 20, maxWidth: 400 }}>
        {statusMessage ? (
          <p
            style={{
              marginBottom: 12,
              color: statusMessage.startsWith("Login failed") ? "#b91c1c" : "#1d4ed8",
            }}
          >
            {statusMessage}
          </p>
        ) : null}

        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          style={{ display: "block", marginBottom: 10, padding: 8, width: "100%" }}
        />

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          style={{ display: "block", marginBottom: 10, padding: 8, width: "100%" }}
        />

        <button type="button" onClick={handleLogin} style={{ padding: 10 }} disabled={submitting || !ready}>
          Login
        </button>

        <div style={{ marginTop: 16 }}>
          <Link
            href="/admin/login"
            style={{
              display: "inline-block",
              padding: "10px 16px",
              backgroundColor: "#7c3aed",
              color: "white",
              textDecoration: "none",
              borderRadius: 8,
            }}
          >
            Admin Login
          </Link>
        </div>
      </div>
    </main>
  );
}
