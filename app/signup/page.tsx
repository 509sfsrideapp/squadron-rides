"use client";

import Link from "next/link";
import { useState } from "react";
import { auth, db } from "../../lib/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSignup = async () => {
    if (!name.trim() || !phone.trim() || !email.trim() || !password.trim()) {
      alert("Fill out all fields");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      await setDoc(doc(db, "users", userCredential.user.uid), {
        name,
        phone,
        email,
        available: false,
        createdAt: new Date(),
      });

      alert("Account created");
      window.location.href = "/login";
    } catch (error) {
      console.error(error);
      alert("Signup failed");
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

      <h1>Create Account</h1>

      <div style={{ marginTop: 20, maxWidth: 400 }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Full Name"
          style={{ display: "block", marginBottom: 10, padding: 8, width: "100%" }}
        />

        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone Number"
          style={{ display: "block", marginBottom: 10, padding: 8, width: "100%" }}
        />

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

        <button onClick={handleSignup} style={{ padding: 10 }}>
          Create Account
        </button>
      </div>
    </main>
  );
}