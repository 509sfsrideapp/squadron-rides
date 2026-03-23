"use client";

import { useState } from "react";
import HomeIconLink from "../components/HomeIconLink";
import { auth, db } from "../../lib/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, writeBatch } from "firebase/firestore";
import { isValidUsername, normalizeUsername } from "../../lib/username";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  const handleSignup = async () => {
    if (!name.trim() || !phone.trim() || !email.trim() || !password.trim()) {
      setStatusMessage("Fill out name, phone, email, and password.");
      return;
    }

    try {
      const normalizedUsername = normalizeUsername(username);

      if (normalizedUsername && !isValidUsername(normalizedUsername)) {
        setStatusMessage("Usernames must be 3-24 characters using letters, numbers, dots, dashes, or underscores.");
        return;
      }

      if (normalizedUsername) {
        const usernameSnap = await getDoc(doc(db, "usernames", normalizedUsername));

        if (usernameSnap.exists()) {
          setStatusMessage("That username is already taken.");
          return;
        }
      }

      setStatusMessage("Creating account...");

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      const batch = writeBatch(db);
      batch.set(doc(db, "users", userCredential.user.uid), {
        name: name.trim(),
        username: normalizedUsername || "",
        phone: phone.trim(),
        email: email.trim(),
        available: false,
        createdAt: new Date(),
      });

      if (normalizedUsername) {
        batch.set(doc(db, "usernames", normalizedUsername), {
          uid: userCredential.user.uid,
          username: normalizedUsername,
          email: userCredential.user.email,
          createdAt: new Date(),
        });
      }

      await batch.commit();

      alert("Account created");
      window.location.href = "/login";
    } catch (error) {
      console.error(error);
      setStatusMessage("Signup failed.");
    }
  };

  return (
    <main style={{ padding: 20 }}>
      <HomeIconLink />

      <h1>Create Account</h1>

      <div style={{ marginTop: 20, maxWidth: 400 }}>
        {statusMessage ? <p style={{ marginBottom: 12 }}>{statusMessage}</p> : null}

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Full Name"
          style={{ display: "block", marginBottom: 10, padding: 8, width: "100%" }}
        />

        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username (optional for now)"
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
