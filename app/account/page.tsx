"use client";

import Image from "next/image";
import Link from "next/link";
import { ChangeEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppLoadingState from "../components/AppLoadingState";
import HomeIconLink from "../components/HomeIconLink";
import { auth, db } from "../../lib/firebase";
import { buildHomeAddress, splitHomeAddress } from "../../lib/home-address";
import { disablePushNotifications, enablePushNotifications } from "../../lib/push-notifications";
import { useActiveRides } from "../../lib/use-active-rides";
import { onAuthStateChanged, User } from "firebase/auth";
import { collection, doc, getDoc, onSnapshot, query, where, writeBatch } from "firebase/firestore";
import { isValidUsername, normalizeUsername } from "../../lib/username";

type UserProfile = {
  name?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  phone?: string;
  email?: string;
  homeAddress?: string;
  homeStreet?: string;
  homeCity?: string;
  homeState?: string;
  homeZip?: string;
  available?: boolean;
  rank?: string;
  flight?: string;
  rankOrRole?: string;
  riderPhotoUrl?: string;
  carYear?: string;
  carMake?: string;
  carModel?: string;
  carColor?: string;
  carPlate?: string;
  driverPhotoUrl?: string;
  locationServicesEnabled?: boolean;
};

export default function AccountPage() {
  const flightOptions = ["Alpha", "Bravo", "Charlie", "Delta", "Foxtrot", "Staff"] as const;
  const rankOptions = ["AB", "Amn", "A1C", "SrA", "SSgt", "TSgt", "MSgt", "SMSgt", "CMSgt", "2d Lt", "1st Lt", "Capt", "Maj", "Lt Col", "Col", "Brig Gen", "Maj Gen", "Lt Gen", "Gen"] as const;
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [updatingNotifications, setUpdatingNotifications] = useState(false);
  const [updatingLocationServices, setUpdatingLocationServices] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [originalUsername, setOriginalUsername] = useState("");
  const [notificationTokenCount, setNotificationTokenCount] = useState(0);
  const [notificationPermission, setNotificationPermission] = useState("unknown");
  const [locationServicesEnabled, setLocationServicesEnabled] = useState(true);
  const [hasRideHistory, setHasRideHistory] = useState(false);
  const [hasDriverHistory, setHasDriverHistory] = useState(false);
  const { riderActiveRide, driverActiveRide, loading: activeRideLoading } = useActiveRides(user);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    username: "",
    phone: "",
    email: "",
    homeStreet: "",
    homeCity: "",
    homeState: "",
    homeZip: "",
    rank: "",
    flight: "",
    profilePhotoUrl: "",
    carYear: "",
    carMake: "",
    carModel: "",
    carColor: "",
    carPlate: "",
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
        const idToken = await currentUser.getIdToken();
        const notificationResponse = await fetch("/api/notifications/debug", {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        }).catch(() => null);

        if (typeof window !== "undefined" && "Notification" in window) {
          setNotificationPermission(Notification.permission);
        }

        if (notificationResponse?.ok) {
          const notificationDetails = (await notificationResponse.json()) as { tokenCount?: number };
          setNotificationTokenCount(notificationDetails.tokenCount ?? 0);
        }

        const [fallbackFirstName = "", ...fallbackLastNameParts] = (data?.name || "").trim().split(/\s+/);
        const fallbackAddress = splitHomeAddress(data?.homeAddress);
        const parsedAddress = {
          street: data?.homeStreet || fallbackAddress.street,
          city: data?.homeCity || fallbackAddress.city,
          state: data?.homeState || fallbackAddress.state,
          zip: data?.homeZip || fallbackAddress.zip,
        };

        setForm({
          firstName: data?.firstName || fallbackFirstName,
          lastName: data?.lastName || fallbackLastNameParts.join(" "),
          username: data?.username || "",
          phone: data?.phone || "",
          email: data?.email || currentUser.email || "",
          homeStreet: parsedAddress.street,
          homeCity: parsedAddress.city,
          homeState: parsedAddress.state,
          homeZip: parsedAddress.zip,
          rank: data?.rank || data?.rankOrRole || "",
          flight: data?.flight || "",
          profilePhotoUrl: data?.driverPhotoUrl || data?.riderPhotoUrl || "",
          carYear: data?.carYear || "",
          carMake: data?.carMake || "",
          carModel: data?.carModel || "",
          carColor: data?.carColor || "",
          carPlate: data?.carPlate || "",
        });
        setOriginalUsername(data?.username || "");
        setLocationServicesEnabled(data?.locationServicesEnabled !== false);
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

  useEffect(() => {
    if (!user) {
      setHasRideHistory(false);
      setHasDriverHistory(false);
      return;
    }

    const riderHistoryQuery = query(collection(db, "rides"), where("riderId", "==", user.uid));
    const driverHistoryQuery = query(collection(db, "rides"), where("acceptedBy", "==", user.uid));

    const unsubscribeRider = onSnapshot(riderHistoryQuery, (snapshot) => {
      setHasRideHistory(snapshot.docs.some((docSnap) => {
        const status = docSnap.data().status;
        return status === "completed" || status === "canceled";
      }));
    });

    const unsubscribeDriver = onSnapshot(driverHistoryQuery, (snapshot) => {
      setHasDriverHistory(snapshot.docs.some((docSnap) => {
        const status = docSnap.data().status;
        return status === "completed" || status === "canceled";
      }));
    });

    return () => {
      unsubscribeRider();
      unsubscribeDriver();
    };
  }, [user]);

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

      setForm((prev) => ({ ...prev, profilePhotoUrl: compressedPhoto }));
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

    if (!form.firstName.trim() || !form.lastName.trim() || !form.rank.trim() || !form.flight.trim() || !form.phone.trim() || !form.email.trim() || !form.username.trim()) {
      setStatusMessage("First name, last name, rank, flight, username, phone, and email are required.");
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

      const rawHomeAddress = buildHomeAddress({
        street: form.homeStreet,
        city: form.homeCity,
        state: form.homeState,
        zip: form.homeZip,
      });
      const hasAnyAddressField = Boolean(
        form.homeStreet.trim() || form.homeCity.trim() || form.homeState.trim() || form.homeZip.trim()
      );
      const normalizedHomeAddress = rawHomeAddress;

      if (hasAnyAddressField) {
        if (!form.homeStreet.trim() || !form.homeCity.trim() || !form.homeState.trim() || !form.homeZip.trim()) {
          setStatusMessage("Complete street address, city, state, and ZIP code before saving your home address.");
          return;
        }
      }

      const batch = writeBatch(db);
      const profilePhotoUrl = form.profilePhotoUrl.trim();
      const fullName = `${form.firstName.trim()} ${form.lastName.trim()}`.trim();
      batch.set(
        doc(db, "users", user.uid),
        {
          name: fullName,
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          username: normalizedUsername,
          phone: form.phone.trim(),
          email: form.email.trim(),
          homeAddress: normalizedHomeAddress,
          homeStreet: form.homeStreet.trim(),
          homeCity: form.homeCity.trim(),
          homeState: form.homeState.trim().toUpperCase(),
          homeZip: form.homeZip.trim(),
          rank: form.rank.trim(),
          flight: form.flight.trim(),
          rankOrRole: form.rank.trim(),
          riderPhotoUrl: profilePhotoUrl,
          carYear: form.carYear.trim(),
          carMake: form.carMake.trim(),
          carModel: form.carModel.trim(),
          carColor: form.carColor.trim(),
          carPlate: form.carPlate.trim(),
          driverPhotoUrl: profilePhotoUrl,
          locationServicesEnabled,
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
      setForm((prev) => ({
        ...prev,
        homeStreet: form.homeStreet.trim(),
        homeCity: form.homeCity.trim(),
        homeState: form.homeState.trim().toUpperCase(),
        homeZip: form.homeZip.trim(),
      }));
      setStatusMessage("Account details saved.");
    } catch (error) {
      console.error(error);
      setStatusMessage("Could not save account details.");
    } finally {
      setSaving(false);
    }
  };

  const handleNotificationToggle = async () => {
    try {
      setUpdatingNotifications(true);

      if (notificationTokenCount > 0 && notificationPermission === "granted") {
        await disablePushNotifications();
        setNotificationTokenCount(0);
        setStatusMessage("Notifications disabled on this device.");
        return;
      }

      await enablePushNotifications();
      setNotificationPermission("granted");

      const currentUser = auth.currentUser;

      if (currentUser) {
        const idToken = await currentUser.getIdToken();
        const response = await fetch("/api/notifications/debug", {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });

        if (response.ok) {
          const details = (await response.json()) as { tokenCount?: number };
          setNotificationTokenCount(details.tokenCount ?? 0);
        }
      }

      setStatusMessage("Notifications enabled on this device.");
    } catch (error) {
      console.error(error);
      setStatusMessage(error instanceof Error ? error.message : "Could not update notification settings.");
    } finally {
      setUpdatingNotifications(false);
    }
  };

  const handleLocationServicesToggle = async () => {
    if (!user) {
      setStatusMessage("You need to log in first.");
      return;
    }

    const nextValue = !locationServicesEnabled;

    try {
      setUpdatingLocationServices(true);
      await writeBatch(db)
        .set(
          doc(db, "users", user.uid),
          {
            locationServicesEnabled: nextValue,
            updatedAt: new Date(),
          },
          { merge: true }
        )
        .commit();

      setLocationServicesEnabled(nextValue);
      setStatusMessage(
        nextValue
          ? "Location services turned on for this account."
          : "Location services turned off. The app will stop using GPS until you turn it back on."
      );
    } catch (error) {
      console.error(error);
      setStatusMessage("Could not update location services.");
    } finally {
      setUpdatingLocationServices(false);
    }
  };

  if (loading) {
    return <main style={{ padding: 20 }}><AppLoadingState title="Loading Account Settings" caption="Pulling your account profile and device settings." /></main>;
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
    return <main style={{ padding: 20 }}><AppLoadingState title="Active Ride Found" caption="Redirecting you back to your live ride screen." /></main>;
  }

  return (
    <main style={{ padding: 20 }}>
      <HomeIconLink />

      <h1>Account Settings</h1>
      <p style={{ maxWidth: 640 }}>
        Update your basic info, one profile photo, and your vehicle details here.
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
        <input value={form.firstName} onChange={(e) => handleChange("firstName", e.target.value)} placeholder="First Name" style={{ marginBottom: 10 }} />
        <input value={form.lastName} onChange={(e) => handleChange("lastName", e.target.value)} placeholder="Last Name" style={{ marginBottom: 10 }} />
        <input value={form.username} onChange={(e) => handleChange("username", e.target.value)} placeholder="Username" style={{ marginBottom: 10 }} />
        <p style={{ marginTop: -2, marginBottom: 10, fontSize: 13, color: "#94a3b8" }}>
          Username is only used for login.
        </p>
        <input value={form.phone} onChange={(e) => handleChange("phone", e.target.value)} placeholder="Phone Number" style={{ marginBottom: 10 }} />
        <input value={form.email} onChange={(e) => handleChange("email", e.target.value)} placeholder="Email" style={{ marginBottom: 10 }} />
        <h2 style={{ marginTop: 24 }}>Home Address</h2>
        <input value={form.homeStreet} onChange={(e) => {
          handleChange("homeStreet", e.target.value);
        }} placeholder="Street Address" style={{ marginBottom: 10 }} />
        <input value={form.homeCity} onChange={(e) => {
          handleChange("homeCity", e.target.value);
        }} placeholder="City" style={{ marginBottom: 10 }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 6, maxWidth: "28rem" }}>
          <input value={form.homeState} onChange={(e) => {
            handleChange("homeState", e.target.value.toUpperCase());
          }} placeholder="State" maxLength={2} />
          <input value={form.homeZip} onChange={(e) => {
            handleChange("homeZip", e.target.value);
          }} placeholder="ZIP Code" />
        </div>
        <p style={{ marginTop: 0, marginBottom: 10, fontSize: 13, color: "#94a3b8" }}>
          Double-check that this information is correct so an accurate address is given to your driver.
        </p>
        <select
          value={form.rank}
          onChange={(e) => handleChange("rank", e.target.value)}
          style={{ display: "block", marginBottom: 10, width: "100%" }}
        >
          <option value="">Select Rank</option>
          {rankOptions.map((rankOption) => (
            <option key={rankOption} value={rankOption}>
              {rankOption}
            </option>
          ))}
        </select>
        <select
          value={form.flight}
          onChange={(e) => handleChange("flight", e.target.value)}
          style={{ display: "block", marginBottom: 6, width: "100%" }}
        >
          <option value="">Select Flight</option>
          {flightOptions.map((flight) => (
            <option key={flight} value={flight}>
              {flight}
            </option>
          ))}
        </select>
        <p style={{ marginTop: 0, marginBottom: 10, fontSize: 13, color: "#94a3b8" }}>
          Flight options: Alpha, Bravo, Charlie, Delta, Foxtrot, or Staff.
        </p>

        <h2 style={{ marginTop: 24 }}>Profile Photo</h2>
        <div style={{ marginBottom: 14 }}>
          <p style={{ marginBottom: 10 }}>
            <strong>Account Photo</strong>
          </p>

              {form.profilePhotoUrl ? (
            <Image
              src={form.profilePhotoUrl}
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
              {form.firstName ? form.firstName.charAt(0).toUpperCase() : "?"}
            </div>
          )}

          <input
            type="file"
            accept="image/*"
            onChange={handlePhotoUpload}
            disabled={uploadingPhoto}
            style={{ marginBottom: 6 }}
          />
          <p style={{ marginTop: 0, marginBottom: 10, fontSize: 13, color: "#94a3b8" }}>
            Use a clear photo that shows what you look like so riders and drivers know who to look for.
          </p>
        </div>

        <input
          value={form.profilePhotoUrl}
          onChange={(e) => handleChange("profilePhotoUrl", e.target.value)}
          placeholder="Profile photo URL or leave your uploaded photo"
          style={{ marginBottom: 10 }}
        />

        <h2 style={{ marginTop: 24 }}>Notifications</h2>
        <p style={{ marginTop: 0, color: "#cbd5e1" }}>
          Status: {notificationTokenCount > 0 && notificationPermission === "granted" ? "Enabled on this device" : "Not enabled on this device"}
        </p>
        <button
          type="button"
          onClick={handleNotificationToggle}
          disabled={updatingNotifications}
          style={{ marginBottom: 18 }}
        >
          {updatingNotifications
            ? "Updating..."
            : notificationTokenCount > 0 && notificationPermission === "granted"
              ? "Turn Off Notifications"
              : "Turn On Notifications"}
        </button>

        <h2 style={{ marginTop: 24 }}>Location Services</h2>
        <p style={{ marginTop: 0, color: "#cbd5e1" }}>
          Status: {locationServicesEnabled ? "Enabled for this account" : "Turned off for this account"}
        </p>
        <p style={{ marginTop: 0, marginBottom: 10, fontSize: 13, color: "#94a3b8" }}>
          This controls whether the app uses GPS for ride requests and driver live location. Browser permission still lives in your device settings.
        </p>
        <button
          type="button"
          onClick={handleLocationServicesToggle}
          disabled={updatingLocationServices}
          style={{ marginBottom: 18 }}
        >
          {updatingLocationServices
            ? "Updating..."
            : locationServicesEnabled
              ? "Turn Off Location Services"
              : "Turn On Location Services"}
        </button>

        <h2 style={{ marginTop: 24 }}>Vehicle Details</h2>
        <input value={form.carYear} onChange={(e) => handleChange("carYear", e.target.value)} placeholder="Car year (optional)" style={{ marginBottom: 10 }} />
        <input value={form.carMake} onChange={(e) => handleChange("carMake", e.target.value)} placeholder="Car make (optional)" style={{ marginBottom: 10 }} />
        <input value={form.carModel} onChange={(e) => handleChange("carModel", e.target.value)} placeholder="Car model (optional)" style={{ marginBottom: 10 }} />
        <input value={form.carColor} onChange={(e) => handleChange("carColor", e.target.value)} placeholder="Car color (optional)" style={{ marginBottom: 10 }} />
        <input value={form.carPlate} onChange={(e) => handleChange("carPlate", e.target.value)} placeholder="License plate (optional)" style={{ marginBottom: 10 }} />

        <h2 style={{ marginTop: 24 }}>Readiness Alerts</h2>
        <div
          style={{
            marginBottom: 18,
            padding: 16,
            borderRadius: 14,
            border: "1px solid rgba(148, 163, 184, 0.18)",
            backgroundColor: "rgba(7, 11, 18, 0.76)",
          }}
        >
          <p style={{ marginTop: 0, color: form.profilePhotoUrl.trim() ? "#86efac" : "#fca5a5" }}>
            {form.profilePhotoUrl.trim()
              ? "Ready for identity photo checks."
              : "Upload a clear profile picture before requesting rides or driving."}
          </p>
          <p style={{ color: form.homeStreet.trim() && form.homeCity.trim() && form.homeState.trim() && form.homeZip.trim() ? "#86efac" : "#fca5a5" }}>
            {form.homeStreet.trim() && form.homeCity.trim() && form.homeState.trim() && form.homeZip.trim()
              ? "Home address is ready for rider use."
              : "Add your home address before requesting rides."}
          </p>
          <p style={{ marginBottom: 0, color: form.carYear.trim() && form.carMake.trim() && form.carModel.trim() && form.carColor.trim() ? "#86efac" : "#fca5a5" }}>
            {form.carYear.trim() && form.carMake.trim() && form.carModel.trim() && form.carColor.trim()
              ? "Vehicle details are ready for driver use."
              : "Add your vehicle year, make, model, and color before driving."}
          </p>
        </div>

        <h2 style={{ marginTop: 24 }}>History</h2>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
          <Link
            href="/history"
            style={{
              display: "inline-block",
              padding: "10px 16px",
              backgroundColor: hasRideHistory ? "#111827" : "rgba(15, 23, 42, 0.72)",
              color: "white",
              textDecoration: "none",
              borderRadius: 8,
              opacity: hasRideHistory ? 1 : 0.74,
            }}
          >
            Rider History
          </Link>
          <Link
            href="/driver/history"
            style={{
              display: "inline-block",
              padding: "10px 16px",
              backgroundColor: hasDriverHistory ? "#111827" : "rgba(15, 23, 42, 0.72)",
              color: "white",
              textDecoration: "none",
              borderRadius: 8,
              opacity: hasDriverHistory ? 1 : 0.74,
            }}
          >
            Driver History
          </Link>
        </div>

        <button type="button" onClick={handleSave} disabled={saving || uploadingPhoto}>
          Save Account Settings
        </button>
      </div>
    </main>
  );
}
