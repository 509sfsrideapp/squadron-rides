"use client";

import Link from "next/link";
import { useState } from "react";
import HomeIconLink from "../../components/HomeIconLink";
import { auth } from "../../../lib/firebase";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";

function getPasswordErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return "Could not update your password.";
  }

  if ("code" in error && typeof (error as { code?: string }).code === "string") {
    switch ((error as { code: string }).code) {
      case "auth/wrong-password":
      case "auth/invalid-credential":
        return "Your current password is incorrect.";
      case "auth/weak-password":
        return "Your new password is too weak. Please choose a stronger password.";
      case "auth/too-many-requests":
        return "Too many attempts. Wait a bit and try again.";
      case "auth/requires-recent-login":
        return "For security, sign in again and then try changing your password.";
      default:
        break;
    }
  }

  return error.message || "Could not update your password.";
}

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const handleSubmit = async () => {
    const currentUser = auth.currentUser;

    if (!currentUser || !currentUser.email) {
      setStatusMessage("You need to be logged in to change your password.");
      return;
    }

    if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      setStatusMessage("Enter your current password, new password, and confirm the new password.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setStatusMessage("New password and confirm password must match.");
      return;
    }

    if (newPassword.length < 6) {
      setStatusMessage("New password must be at least 6 characters.");
      return;
    }

    if (newPassword === currentPassword) {
      setStatusMessage("Choose a new password that is different from your current password.");
      return;
    }

    try {
      setSaving(true);
      setStatusMessage("Updating password...");

      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, newPassword);

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setStatusMessage("Password updated successfully.");
    } catch (error) {
      console.error(error);
      setStatusMessage(getPasswordErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <main style={{ padding: 20 }}>
      <HomeIconLink />

      <h1>Change Password</h1>
      <p style={{ maxWidth: 620 }}>
        Enter your current password, then set a new one for your account.
      </p>

      {statusMessage ? <p style={{ marginTop: 12 }}>{statusMessage}</p> : null}

      <div
        style={{
          marginTop: 20,
          maxWidth: 560,
          padding: 20,
          borderRadius: 16,
          border: "1px solid rgba(148, 163, 184, 0.18)",
          backgroundColor: "rgba(9, 15, 25, 0.88)",
          boxShadow: "0 12px 32px rgba(2, 6, 23, 0.18)",
        }}
      >
        <input
          type="password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          placeholder="Current Password"
          style={{ marginBottom: 10 }}
        />
        <input
          type="password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          placeholder="New Password"
          style={{ marginBottom: 10 }}
        />
        <input
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="Confirm New Password"
          style={{ marginBottom: 10 }}
        />

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
          <button type="button" onClick={handleSubmit} disabled={saving}>
            {saving ? "Updating..." : "Update Password"}
          </button>
          <Link
            href="/account"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "10px 16px",
              backgroundColor: "#111827",
              color: "white",
              textDecoration: "none",
              borderRadius: 8,
            }}
          >
            Back to Account Settings
          </Link>
        </div>
      </div>
    </main>
  );
}
