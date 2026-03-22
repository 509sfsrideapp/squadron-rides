"use client";

import Image from "next/image";
import Link from "next/link";
import { ChangeEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../../lib/firebase";
import { useActiveRides } from "../../lib/use-active-rides";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, writeBatch } from "firebase/firestore";
import { isValidUsername, normalizeUsername } from "../../lib/username";

type UserProfile = {
  name?: string;
  username?: string;
  phone?: string;
  email?: string;
  homeAddress?: string;
  available?: boolean;
  rankOrRole?: string;
  carYear?: string;
  carMake?: string;
  carModel?: string;
  carColor?: string;
  carPlate?: string;
  driverPhotoUrl?: string;
};

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [originalUsername, setOriginalUsername] = useState("");
  const { riderActiveRide, driverActiveRide, loading: activeRideLoading } = useActiveRides(user);
  const [form, setForm] = useState({
    name: "",
    username: "",
    phone: "",
    email: "",
    homeAddress: "",
    rankOrRole: "",
    carYear: "",
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
          username: data?.username || "",
          phone: data?.phone || "",
          email: data?.email || currentUser.email || "",
          homeAddress: data?.homeAddress || "",
          rankOrRole: data?.rankOrRole || "",
          carYear: data?.carYear || "",
          carMake: data?.carMake || "",
          carModel: data?.carModel || "",
          carColor: data?.carColor || "",
          carPlate: data?.carPlate || "",
          driverPhotoUrl: data?.driverPhotoUrl || "",
        });
        setOriginalUsername(data?.username || "");
      } catch (error) {
        console.error(error);
        setStatusMessage("We could not load your account details.");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || activeRideLoading) return;

    if (driverActiveRide) {
      router.replace(`/driver/active/${driverActiveRide.id}`);
      return;
    }

    if (riderActiveRide) {
      router.replace(`/ride-status?rideId=${riderActiveRide.id}`);
    }
  }, [activeRideLoading, driverActiveRide, riderActiveRide, router, user]);

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const convertImageToDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
          return;
        }

        reject(new Error("Could not read the selected image."));
      };
      reader.onerror = () => reject(new Error("Could not read the selected image."));
      reader.readAsDataURL(file);
    });

  const shrinkImage = async (file: File) => {
    const sourceUrl = await convertImageToDataUrl(file);
    const image = new window.Image();

    const loaded = new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Could not load the selected image."));
    });

    image.src = sourceUrl;
    await loaded;

    const maxDimension = 480;
    const scale = Math.min(maxDimension / image.width, maxDimension / image.height, 1);
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Could not process the selected image.");
    }

    context.drawImage(image, 0, 0, width, height);

    let quality = 0.82;
    let compressed = canvas.toDataURL("image/jpeg", quality);

    while (compressed.length > 180000 && quality > 0.45) {
      quality -= 0.08;
      compressed = canvas.toDataURL("image/jpeg", quality);
    }

    if (compressed.length > 180000) {
      throw new Error("That photo is still too large. Please choose a smaller image.");
    }

    return compressed;
  };

  const handlePhotoUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!user) {
      setStatusMessage("You need to log in first.");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setStatusMessage("Please choose an image file.");
      return;
    }

    try {
      setUploadingPhoto(true);
      setStatusMessage("Preparing profile photo...");

      const compressedPhoto = await shrinkImage(file);

      setForm((prev) => ({ ...prev, driverPhotoUrl: compressedPhoto }));
      setStatusMessage("Profile photo is ready. Save account details to keep it.");
    } catch (error) {
      console.error(error);
      setStatusMessage(error instanceof Error ? error.message : "Could not process the profile photo.");
    } finally {
      setUploadingPhoto(false);
      event.target.value = "";
    }
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

      const normalizedUsername = normalizeUsername(form.username);
      const previousUsername = normalizeUsername(originalUsername);

      if (normalizedUsername && !isValidUsername(normalizedUsername)) {
        setStatusMessage("Usernames must be 3-24 characters using letters, numbers, dots, dashes, or underscores.");
        return;
      }

      if (normalizedUsername && normalizedUsername !== previousUsername) {
        const usernameSnap = await getDoc(doc(db, "usernames", normalizedUsername));

        if (usernameSnap.exists()) {
          const usernameData = usernameSnap.data() as { uid?: string };

          if (usernameData.uid !== user.uid) {
            setStatusMessage("That username is already taken.");
            return;
          }
        }
      }

      const batch = writeBatch(db);
      batch.set(
        doc(db, "users", user.uid),
        {
          name: form.name.trim(),
          username: normalizedUsername,
          phone: form.phone.trim(),
          email: form.email.trim(),
          homeAddress: form.homeAddress.trim(),
          rankOrRole: form.rankOrRole.trim(),
          carYear: form.carYear.trim(),
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

      if (normalizedUsername) {
        batch.set(doc(db, "usernames", normalizedUsername), {
          uid: user.uid,
          username: normalizedUsername,
          email: user.email || form.email.trim(),
          updatedAt: new Date(),
        });
      }

      if (previousUsername && previousUsername !== normalizedUsername) {
        batch.delete(doc(db, "usernames", previousUsername));
      }

      await batch.commit();

      setOriginalUsername(normalizedUsername);
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

  if (driverActiveRide || riderActiveRide) {
    return <main style={{ padding: 20 }}><p>Redirecting to your active ride...</p></main>;
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
        <input value={form.username} onChange={(e) => handleChange("username", e.target.value)} placeholder="Username" style={{ marginBottom: 10 }} />
        <input value={form.phone} onChange={(e) => handleChange("phone", e.target.value)} placeholder="Phone Number" style={{ marginBottom: 10 }} />
        <input value={form.email} onChange={(e) => handleChange("email", e.target.value)} placeholder="Email" style={{ marginBottom: 10 }} />
        <input value={form.homeAddress} onChange={(e) => handleChange("homeAddress", e.target.value)} placeholder="Home Address" style={{ marginBottom: 10 }} />
        <input value={form.rankOrRole} onChange={(e) => handleChange("rankOrRole", e.target.value)} placeholder="Rank or role (optional)" style={{ marginBottom: 10 }} />

        <h2 style={{ marginTop: 24 }}>Driver Profile</h2>
        <div style={{ marginBottom: 14 }}>
          <p style={{ marginBottom: 10 }}>
            <strong>Profile Photo</strong>
          </p>

          {form.driverPhotoUrl ? (
            <Image
              src={form.driverPhotoUrl}
              alt="Profile preview"
              width={104}
              height={104}
              unoptimized
              style={{
                objectFit: "cover",
                borderRadius: 999,
                border: "1px solid rgba(148, 163, 184, 0.22)",
                display: "block",
                marginBottom: 12,
              }}
            />
          ) : (
            <div
              style={{
                width: 104,
                height: 104,
                borderRadius: 999,
                display: "grid",
                placeItems: "center",
                marginBottom: 12,
                backgroundColor: "rgba(18, 37, 63, 0.72)",
                color: "#dbeafe",
                border: "1px solid rgba(96, 165, 250, 0.2)",
                fontFamily: "var(--font-display)",
                fontSize: "1.5rem",
              }}
            >
              {form.name ? form.name.charAt(0).toUpperCase() : "?"}
            </div>
          )}

          <input
            type="file"
            accept="image/*"
            onChange={handlePhotoUpload}
            disabled={uploadingPhoto}
            style={{ marginBottom: 10 }}
          />
        </div>

        <input value={form.carYear} onChange={(e) => handleChange("carYear", e.target.value)} placeholder="Car year (optional)" style={{ marginBottom: 10 }} />
        <input value={form.carMake} onChange={(e) => handleChange("carMake", e.target.value)} placeholder="Car make (optional)" style={{ marginBottom: 10 }} />
        <input value={form.carModel} onChange={(e) => handleChange("carModel", e.target.value)} placeholder="Car model (optional)" style={{ marginBottom: 10 }} />
        <input value={form.carColor} onChange={(e) => handleChange("carColor", e.target.value)} placeholder="Car color (optional)" style={{ marginBottom: 10 }} />
        <input value={form.carPlate} onChange={(e) => handleChange("carPlate", e.target.value)} placeholder="License plate (optional)" style={{ marginBottom: 10 }} />
        <input
          value={form.driverPhotoUrl}
          onChange={(e) => handleChange("driverPhotoUrl", e.target.value)}
          placeholder="Driver photo URL or leave your uploaded photo"
          style={{ marginBottom: 10 }}
        />

        <button type="button" onClick={handleSave} disabled={saving || uploadingPhoto}>
          Save Account Details
        </button>
      </div>
    </main>
  );
}
