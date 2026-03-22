"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { auth, db } from "../../lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

type UserProfile = {
  name?: string;
  phone?: string;
  email?: string;
  available?: boolean;
  rankOrRole?: string;
  carMake?: string;
  carModel?: string;
  carColor?: string;
  carPlate?: string;
  driverPhotoUrl?: string;
};

export default function AccountPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    rankOrRole: "",
    carMake: "",
    carModel: "",
    carColor: "",
    carPlate: "",
    driverPhotoUrl: "",
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (!currentUser) {
        setLoading(false);
        return;
      }

      try {
        const snap = await getDoc(doc(db, "users", currentUser.uid));
        const data = snap.exists() ? (snap.data() as UserProfile) : null;

        setForm({
          name: data?.name || "",
          phone: data?.phone || "",
          email: data?.email || currentUser.email || "",
          rankOrRole: data?.rankOrRole || "",
          carMake: data?.carMake || "",
          carModel: data?.carModel || "",
          carColor: data?.carColor || "",
          carPlate: data?.carPlate || "",
          driverPhotoUrl: data?.driverPhotoUrl || "",
        });
      } catch (error) {
        console.error(error);
        setStatusMessage("We could not load your account details.");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!user) {
      setStatusMessage("You need to log in first.");
      return;
    }

    if (!form.name.trim() || !form.phone.trim() || !form.email.trim()) {
      setStatusMessage("Name, phone, and email are required.");
      return;
    }

    try {
      setSaving(true);
      setStatusMessage("Saving account details...");

      await setDoc(
        doc(db, "users", user.uid),
        {
          name: form.name.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          rankOrRole: form.rankOrRole.trim(),
          carMake: form.carMake.trim(),
          carModel: form.carModel.trim(),
          carColor: form.carColor.trim(),
          carPlate: form.carPlate.trim(),
          driverPhotoUrl: form.driverPhotoUrl.trim(),
          available: false,
          updatedAt: new Date(),
        },
        { merge: true }
      );

      setStatusMessage("Account details saved.");
    } catch (error) {
      console.error(error);
      setStatusMessage("Could not save account details.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <main style={{ padding: 20 }}><p>Loading account details...</p></main>;
  }

  if (!user) {
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
          Login
        </Link>
        <p>You need to log in first.</p>
      </main>
    );
  }

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

      <h1>Account Details</h1>
      <p style={{ maxWidth: 640 }}>
        Update your rider details here. Driver-facing profile fields are included too, so later we can show your
        photo and car information to riders automatically.
      </p>

      {statusMessage ? <p style={{ marginTop: 12 }}>{statusMessage}</p> : null}

      <div
        style={{
          marginTop: 20,
          maxWidth: 700,
          padding: 20,
          borderRadius: 16,
          border: "1px solid rgba(148, 163, 184, 0.18)",
          backgroundColor: "rgba(9, 15, 25, 0.88)",
          boxShadow: "0 12px 32px rgba(2, 6, 23, 0.18)",
        }}
      >
        <h2 style={{ marginTop: 0 }}>Basic Info</h2>
        <input value={form.name} onChange={(e) => handleChange("name", e.target.value)} placeholder="Full Name" style={{ marginBottom: 10 }} />
        <input value={form.phone} onChange={(e) => handleChange("phone", e.target.value)} placeholder="Phone Number" style={{ marginBottom: 10 }} />
        <input value={form.email} onChange={(e) => handleChange("email", e.target.value)} placeholder="Email" style={{ marginBottom: 10 }} />
        <input value={form.rankOrRole} onChange={(e) => handleChange("rankOrRole", e.target.value)} placeholder="Rank or role (optional)" style={{ marginBottom: 10 }} />

        <h2 style={{ marginTop: 24 }}>Driver Profile</h2>
        <input value={form.carMake} onChange={(e) => handleChange("carMake", e.target.value)} placeholder="Car make (optional)" style={{ marginBottom: 10 }} />
        <input value={form.carModel} onChange={(e) => handleChange("carModel", e.target.value)} placeholder="Car model (optional)" style={{ marginBottom: 10 }} />
        <input value={form.carColor} onChange={(e) => handleChange("carColor", e.target.value)} placeholder="Car color (optional)" style={{ marginBottom: 10 }} />
        <input value={form.carPlate} onChange={(e) => handleChange("carPlate", e.target.value)} placeholder="License plate (optional)" style={{ marginBottom: 10 }} />
        <input value={form.driverPhotoUrl} onChange={(e) => handleChange("driverPhotoUrl", e.target.value)} placeholder="Driver photo URL (optional for now)" style={{ marginBottom: 10 }} />

        <button type="button" onClick={handleSave} disabled={saving}>
          Save Account Details
        </button>
      </div>
    </main>
  );
}
