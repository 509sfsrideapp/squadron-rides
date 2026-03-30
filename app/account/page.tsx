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
import { OFFICE_OPTIONS, normalizeOfficeValue } from "../../lib/offices";
import { formatAddressPart, formatStateCode, formatVehicleField, formatVehiclePlate, normalizeVehicleYear, shouldClearCorruptedVehicleYear } from "../../lib/text-format";
import { useActiveRides } from "../../lib/use-active-rides";
import { EmailAuthProvider, onAuthStateChanged, reauthenticateWithCredential, User } from "firebase/auth";
import { collection, deleteField, doc, getDoc, onSnapshot, query, updateDoc, where, writeBatch } from "firebase/firestore";
import { isValidUsername, normalizeUsername } from "../../lib/username";

type UserProfile = {
  name?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  jobDescription?: string;
  bio?: string;
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
  const rankOptions = ["CIV", "AB", "Amn", "A1C", "SrA", "SSgt", "TSgt", "MSgt", "SMSgt", "CMSgt", "2d Lt", "1st Lt", "Capt", "Maj", "Lt Col", "Col", "Brig Gen", "Maj Gen", "Lt Gen", "Gen"] as const;
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deletePanelOpen, setDeletePanelOpen] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [deleteStatusMessage, setDeleteStatusMessage] = useState("");
  const [originalUsername, setOriginalUsername] = useState("");
  const [hasRideHistory, setHasRideHistory] = useState(false);
  const [hasDriverHistory, setHasDriverHistory] = useState(false);
  const { riderActiveRide, driverActiveRide, loading: activeRideLoading } = useActiveRides(user);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    username: "",
    jobDescription: "",
    phone: "",
    email: "",
    homeStreet: "",
    homeCity: "",
    homeState: "",
    homeZip: "",
    rank: "",
    flight: "",
    profilePhotoUrl: "",
    bio: "",
    carYear: "",
    carMake: "",
    carModel: "",
    carColor: "",
    carPlate: "",
  });
  const [deleteForm, setDeleteForm] = useState({
    vehicleYear: "",
    vehicleMake: "",
    vehicleModel: "",
    vehicleColor: "",
    password: "",
  });
  const isAdminAccount = isAdminEmail(user?.email);
  const infoDisplayStyle: React.CSSProperties = {
    marginBottom: 10,
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid rgba(126, 142, 160, 0.18)",
    background: "linear-gradient(180deg, rgba(21, 28, 36, 0.9) 0%, rgba(11, 15, 21, 0.96) 100%)",
    color: "#e5edf7",
  };

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

        const normalizedOffice = normalizeOfficeValue(data?.flight);
        const shouldRepairCorruptedYear = data
          ? shouldClearCorruptedVehicleYear({
              carYear: data.carYear,
              homeAddress: data.homeAddress,
              homeStreet: data.homeStreet,
            })
          : false;
        const shouldRepairOffice = Boolean(data) && (data?.flight?.trim() || "") !== normalizedOffice;

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
          jobDescription: data?.jobDescription || "",
          phone: data?.phone || "",
          email: data?.email || currentUser.email || "",
          homeStreet: parsedAddress.street,
          homeCity: parsedAddress.city,
          homeState: parsedAddress.state,
          homeZip: parsedAddress.zip,
          rank: data?.rank || data?.rankOrRole || "",
          flight: normalizedOffice,
          profilePhotoUrl: data?.driverPhotoUrl || data?.riderPhotoUrl || "",
          bio: data?.bio || "",
          carYear: normalizeVehicleYear(data?.carYear || ""),
          carMake: data?.carMake || "",
          carModel: data?.carModel || "",
          carColor: data?.carColor || "",
          carPlate: data?.carPlate || "",
        });
        setOriginalUsername(data?.username || "");

        if (data && (shouldRepairCorruptedYear || shouldRepairOffice)) {
          await updateDoc(doc(db, "users", currentUser.uid), {
            ...(shouldRepairCorruptedYear ? { carYear: "" } : {}),
            ...(shouldRepairOffice ? { flight: normalizedOffice } : {}),
            updatedAt: new Date(),
          });
        }

        if (data && ("appPinEnabled" in data || "appPinHash" in data || "appPinSalt" in data)) {
          await updateDoc(doc(db, "users", currentUser.uid), {
            appPinEnabled: deleteField(),
            appPinHash: deleteField(),
            appPinSalt: deleteField(),
            appPinUpdatedAt: deleteField(),
          });
        }
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

  const handleDeleteFormChange = (field: keyof typeof deleteForm, value: string) => {
    setDeleteForm((prev) => ({ ...prev, [field]: value }));
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
        !normalizeOfficeValue(form.flight) ||
        !form.phone.trim() ||
        !form.email.trim() ||
        !form.username.trim())
    ) {
      setStatusMessage("First name, last name, rank, office, username, phone, and email are required.");
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
        street: formatAddressPart(form.homeStreet),
        city: formatAddressPart(form.homeCity),
        state: formatStateCode(form.homeState),
        zip: form.homeZip.trim(),
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
      const normalizedHomeStreet = formatAddressPart(form.homeStreet);
      const normalizedHomeCity = formatAddressPart(form.homeCity);
      const normalizedHomeState = formatStateCode(form.homeState);
      const normalizedHomeZip = form.homeZip.trim();
      const normalizedCarYear = normalizeVehicleYear(form.carYear);
      const normalizedCarMake = formatVehicleField(form.carMake);
      const normalizedCarModel = formatVehicleField(form.carModel);
      const normalizedCarColor = formatVehicleField(form.carColor);
      const normalizedCarPlate = formatVehiclePlate(form.carPlate);
      const fullName = `${form.firstName.trim()} ${form.lastName.trim()}`.trim() || user.email?.split("@")[0] || "Admin";
      batch.set(
        doc(db, "users", user.uid),
        {
          name: fullName,
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          username: normalizedUsername,
          jobDescription: form.jobDescription.trim(),
          phone: form.phone.trim(),
          homeAddress: normalizedHomeAddress,
          homeStreet: normalizedHomeStreet,
          homeCity: normalizedHomeCity,
          homeState: normalizedHomeState,
          homeZip: normalizedHomeZip,
          rank: form.rank.trim(),
          flight: normalizeOfficeValue(form.flight),
          rankOrRole: form.rank.trim(),
          riderPhotoUrl: profilePhotoUrl,
          bio: form.bio.trim(),
          carYear: normalizedCarYear,
          carMake: normalizedCarMake,
          carModel: normalizedCarModel,
          carColor: normalizedCarColor,
          carPlate: normalizedCarPlate,
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
        homeStreet: normalizedHomeStreet,
        homeCity: normalizedHomeCity,
        homeState: normalizedHomeState,
        homeZip: normalizedHomeZip,
        carYear: normalizedCarYear,
        carMake: normalizedCarMake,
        carModel: normalizedCarModel,
        carColor: normalizedCarColor,
        carPlate: normalizedCarPlate,
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

  const handleDeleteAccount = async () => {
    if (!user || !user.email) {
      setDeleteStatusMessage("You need to log in again before deleting your account.");
      return;
    }

    if (
      !deleteForm.vehicleYear.trim() ||
      !deleteForm.vehicleMake.trim() ||
      !deleteForm.vehicleModel.trim() ||
      !deleteForm.vehicleColor.trim() ||
      !deleteForm.password
    ) {
      setDeleteStatusMessage("Enter your current vehicle year, make, model, color, and password.");
      return;
    }

    const confirmed = window.confirm("Delete this account permanently?");
    if (!confirmed) {
      return;
    }

    try {
      setDeletingAccount(true);
      setDeleteStatusMessage("Authenticating account deletion...");

      const currentUser = auth.currentUser;

      if (!currentUser || !currentUser.email) {
        throw new Error("You need to log in again before deleting your account.");
      }

      const credential = EmailAuthProvider.credential(currentUser.email, deleteForm.password);
      await reauthenticateWithCredential(currentUser, credential);

      const idToken = await currentUser.getIdToken();
      const response = await fetch("/api/account/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          vehicleYear: deleteForm.vehicleYear,
          vehicleMake: deleteForm.vehicleMake,
          vehicleModel: deleteForm.vehicleModel,
          vehicleColor: deleteForm.vehicleColor,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Could not verify this account for deletion.");
      }

      window.location.href = "/";
    } catch (error) {
      console.error(error);
      setDeleteStatusMessage(error instanceof Error ? error.message : "Could not delete this account.");
    } finally {
      setDeletingAccount(false);
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
          border: "1px solid rgba(126, 142, 160, 0.18)",
          background: "linear-gradient(180deg, rgba(18, 23, 29, 0.95) 0%, rgba(9, 12, 17, 0.99) 100%)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), 0 18px 34px rgba(0,0,0,0.26)",
        }}
      >
        <h2 style={{ marginTop: 0 }}>Basic Info</h2>
        <input value={form.firstName} onChange={(e) => handleChange("firstName", e.target.value)} placeholder="First Name" style={{ marginBottom: 10 }} />
        <input value={form.lastName} onChange={(e) => handleChange("lastName", e.target.value)} placeholder="Last Name" style={{ marginBottom: 10 }} />
        <input value={form.username} onChange={(e) => handleChange("username", e.target.value)} placeholder="Username" style={{ marginBottom: 10 }} />
        <p style={{ marginTop: -2, marginBottom: 10, fontSize: 13, color: "#94a3b8" }}>
          Username is only used for login.
        </p>
        <div style={infoDisplayStyle}>
          <strong style={{ display: "block", marginBottom: 4, color: "#94a3b8", fontSize: 13, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Phone Number
          </strong>
          <span>{form.phone || "No phone number on file"}</span>
        </div>
        <div style={infoDisplayStyle}>
          <strong style={{ display: "block", marginBottom: 4, color: "#94a3b8", fontSize: 13, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Email
          </strong>
          <span>{form.email || "No email on file"}</span>
        </div>
        <p style={{ marginTop: 0, marginBottom: 10, fontSize: 13, color: "#94a3b8" }}>
          Phone number and email are tied to your account and cannot be changed here.
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
          <option value="">Select Office</option>
          {OFFICE_OPTIONS.map((officeOption) => (
            <option key={officeOption} value={officeOption}>
              {officeOption}
            </option>
          ))}
        </select>
        <input
          value={form.jobDescription}
          onChange={(e) => handleChange("jobDescription", e.target.value)}
          placeholder="Job Description"
          style={{ marginBottom: 10 }}
        />

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

        <h2 style={{ marginTop: 24 }}>Bio</h2>
        <textarea
          value={form.bio}
          onChange={(e) => handleChange("bio", e.target.value)}
          placeholder="Add a short bio."
          rows={3}
          style={{
            display: "block",
            width: "100%",
            marginBottom: 10,
            padding: "12px 14px",
            borderRadius: 12,
            border: "1px solid rgba(126, 142, 160, 0.18)",
            background: "linear-gradient(180deg, rgba(21, 28, 36, 0.9) 0%, rgba(11, 15, 21, 0.96) 100%)",
            color: "#e5edf7",
            resize: "vertical",
          }}
        />

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

        <h2 style={{ marginTop: 24 }}>App Permissions</h2>
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

        <div
          style={{
            marginBottom: 18,
            padding: 16,
            borderRadius: 14,
            border: "1px solid rgba(239, 68, 68, 0.28)",
            background: "linear-gradient(180deg, rgba(69, 10, 10, 0.32) 0%, rgba(28, 8, 8, 0.52) 100%)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <div>
              <strong style={{ display: "block", marginBottom: 4 }}>Delete Account</strong>
            </div>

            <button
              type="button"
              onClick={() => {
                setDeletePanelOpen((current) => !current);
                setDeleteStatusMessage("");
              }}
              style={{
                background: "linear-gradient(180deg, rgba(127, 29, 29, 0.92) 0%, rgba(69, 10, 10, 0.98) 100%)",
                border: "1px solid rgba(248, 113, 113, 0.32)",
              }}
            >
              {deletePanelOpen ? "Close Delete Form" : "Delete Account"}
            </button>
          </div>

          <div
            className={`app-collapsible-panel${deletePanelOpen ? " app-collapsible-panel-open" : ""}`}
            style={{ marginTop: deletePanelOpen ? 16 : 0, display: "grid", gap: 12, maxHeight: deletePanelOpen ? 560 : 0 }}
            aria-hidden={!deletePanelOpen}
          >
              <p style={{ margin: 0, color: "#fecaca" }}>
                Confirm your current vehicle details exactly as saved in your account, then enter your password.
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                <input value={deleteForm.vehicleYear} onChange={(e) => handleDeleteFormChange("vehicleYear", e.target.value)} placeholder="Vehicle Year" />
                <input value={deleteForm.vehicleMake} onChange={(e) => handleDeleteFormChange("vehicleMake", e.target.value)} placeholder="Vehicle Make" />
                <input value={deleteForm.vehicleModel} onChange={(e) => handleDeleteFormChange("vehicleModel", e.target.value)} placeholder="Vehicle Model" />
                <input value={deleteForm.vehicleColor} onChange={(e) => handleDeleteFormChange("vehicleColor", e.target.value)} placeholder="Vehicle Color" />
              </div>

              <input
                type="password"
                value={deleteForm.password}
                onChange={(e) => handleDeleteFormChange("password", e.target.value)}
                placeholder="Current Password"
              />

              <div>
                <button
                  type="button"
                  onClick={() => void handleDeleteAccount()}
                  disabled={deletingAccount}
                  style={{
                    background: "linear-gradient(180deg, rgba(127, 29, 29, 0.92) 0%, rgba(69, 10, 10, 0.98) 100%)",
                    border: "1px solid rgba(248, 113, 113, 0.32)",
                  }}
                >
                  {deletingAccount ? "Deleting Account..." : "Permanently Delete Account"}
                </button>
              </div>

              {deleteStatusMessage ? (
                <p style={{ margin: 0, color: deleteStatusMessage.includes("Authenticating") ? "#fecaca" : "#fda4af" }}>
                  {deleteStatusMessage}
                </p>
              ) : null}
            </div>
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
