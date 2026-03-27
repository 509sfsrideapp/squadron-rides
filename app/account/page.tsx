"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppLoadingState from "../components/AppLoadingState";
import HomeIconLink from "../components/HomeIconLink";
import ImageCropField from "../components/ImageCropField";
import { auth, db } from "../../lib/firebase";
import { isAdminEmail } from "../../lib/admin";
import { buildHomeAddress, splitHomeAddress } from "../../lib/home-address";
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
  emergencyRideAddressConsent?: boolean;
};

export default function AccountPage() {
  const flightOptions = ["Alpha", "Bravo", "Charlie", "Delta", "Foxtrot", "Staff"] as const;
  const rankOptions = ["AB", "Amn", "A1C", "SrA", "SSgt", "TSgt", "MSgt", "SMSgt", "CMSgt", "2d Lt", "1st Lt", "Capt", "Maj", "Lt Col", "Col", "Brig Gen", "Maj Gen", "Lt Gen", "Gen"] as const;
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [originalUsername, setOriginalUsername] = useState("");
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
  const isAdminAccount = isAdminEmail(user?.email);

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

  const handleSave = async () => {
    if (!user) {
      setStatusMessage("You need to log in first.");
      return;
    }

    if (
      !isAdminAccount &&
      (!form.firstName.trim() ||
        !form.lastName.trim() ||
        !form.rank.trim() ||
        !form.flight.trim() ||
        !form.phone.trim() ||
        !form.email.trim() ||
        !form.username.trim())
    ) {
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
      const fullName = `${form.firstName.trim()} ${form.lastName.trim()}`.trim() || user.email?.split("@")[0] || "Admin";
      batch.set(
        doc(db, "users", user.uid),
        {
          name: fullName,
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          username: normalizedUsername,
          phone: form.phone.trim(),
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
      if (error instanceof Error && "code" in error && (error as { code?: string }).code === "permission-denied") {
        setStatusMessage("Could not save account settings. Some protected account fields cannot be changed here.");
      } else {
        setStatusMessage("Could not save account details.");
      }
    } finally {
      setSaving(false);
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
        <input value={form.email} readOnly placeholder="Email" style={{ marginBottom: 4, opacity: 0.78, cursor: "not-allowed" }} />
        <p style={{ marginTop: 0, marginBottom: 10, fontSize: 13, color: "#94a3b8" }}>
          Email is managed through your login account and cannot be changed here.
        </p>
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

          <ImageCropField
            value={form.profilePhotoUrl}
            onChange={(nextValue) => {
              setForm((prev) => ({ ...prev, profilePhotoUrl: nextValue }));
              setStatusMessage(nextValue ? "Profile photo is ready. Save account details to keep it." : "");
            }}
            cropShape="circle"
            previewSize={104}
            outputSize={480}
            maxEncodedLength={180000}
            disabled={uploadingPhoto}
            helperText="Use a clear photo that shows what you look like so riders and drivers know who to look for."
            statusMessage={uploadingPhoto ? "Preparing profile photo..." : ""}
            onStatusMessageChange={(message) => {
              setUploadingPhoto(message.includes("Preparing") || message.includes("Saving"));
              setStatusMessage(message);
            }}
          />
        </div>

        <input
          value={form.profilePhotoUrl}
          onChange={(e) => handleChange("profilePhotoUrl", e.target.value)}
          placeholder="Profile photo URL or leave your uploaded photo"
          style={{ marginBottom: 10 }}
        />

        <h2 style={{ marginTop: 24 }}>App Permissions</h2>
        <p style={{ marginTop: 0, marginBottom: 10, fontSize: 13, color: "#94a3b8" }}>
          Review emergency ride permissions, notifications, and location settings here.
        </p>
        <Link
          href="/account/permissions"
          style={{
            display: "inline-block",
            padding: "10px 16px",
            backgroundColor: "#111827",
            color: "white",
            textDecoration: "none",
            borderRadius: 8,
            marginBottom: 18,
          }}
        >
          Open App Permissions
        </Link>

        <h2 style={{ marginTop: 24 }}>Security</h2>
        <p style={{ marginTop: 0, marginBottom: 10, fontSize: 13, color: "#94a3b8" }}>
          Update your password from a separate secure page.
        </p>
        <Link
          href="/account/change-password"
          style={{
            display: "inline-block",
            padding: "10px 16px",
            backgroundColor: "#111827",
            color: "white",
            textDecoration: "none",
            borderRadius: 8,
            marginBottom: 18,
          }}
        >
          Change Password
        </Link>

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
        {statusMessage ? (
          <p style={{ marginTop: 10, marginBottom: 0, color: statusMessage === "Account details saved." ? "#86efac" : "#cbd5e1" }}>
            {statusMessage}
          </p>
        ) : null}
      </div>
    </main>
  );
}
