"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import HomeIconLink from "../components/HomeIconLink";
import ImageCropField from "../components/ImageCropField";
import { validateSignupDraft, SIGNUP_DRAFT_STORAGE_KEY, type SignupDraft } from "../../lib/signup";

const flightOptions = ["Alpha", "Bravo", "Charlie", "Delta", "Foxtrot", "Staff"] as const;
const rankOptions = ["CIV", "AB", "Amn", "A1C", "SrA", "SSgt", "TSgt", "MSgt", "SMSgt", "CMSgt", "2d Lt", "1st Lt", "Capt", "Maj", "Lt Col", "Col", "Brig Gen", "Maj Gen", "Lt Gen", "Gen"] as const;

function loadInitialSignupDraft(): SignupDraft | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawDraft = window.sessionStorage.getItem(SIGNUP_DRAFT_STORAGE_KEY);

    if (!rawDraft) {
      return null;
    }

    return JSON.parse(rawDraft) as SignupDraft;
  } catch (error) {
    console.error(error);
    return null;
  }
}

export default function SignupPage() {
  const router = useRouter();
  const [initialDraft] = useState<SignupDraft | null>(() => loadInitialSignupDraft());
  const [firstName, setFirstName] = useState(() => initialDraft?.firstName || "");
  const [lastName, setLastName] = useState(() => initialDraft?.lastName || "");
  const [rank, setRank] = useState(() => initialDraft?.rank || "");
  const [flight, setFlight] = useState(() => initialDraft?.flight || "");
  const [jobDescription, setJobDescription] = useState(() => initialDraft?.jobDescription || "");
  const [phone, setPhone] = useState(() => initialDraft?.phone || "");
  const [confirmPhone, setConfirmPhone] = useState(() => initialDraft?.confirmPhone || "");
  const [username, setUsername] = useState(() => initialDraft?.username || "");
  const [email, setEmail] = useState(() => initialDraft?.email || "");
  const [password, setPassword] = useState(() => initialDraft?.password || "");
  const [confirmPassword, setConfirmPassword] = useState(() => initialDraft?.confirmPassword || "");
  const [homeStreet, setHomeStreet] = useState(() => initialDraft?.homeStreet || "");
  const [homeCity, setHomeCity] = useState(() => initialDraft?.homeCity || "");
  const [homeState, setHomeState] = useState(() => initialDraft?.homeState || "");
  const [homeZip, setHomeZip] = useState(() => initialDraft?.homeZip || "");
  const [profilePhotoUrl, setProfilePhotoUrl] = useState(() => initialDraft?.profilePhotoUrl || "");
  const [carYear, setCarYear] = useState(() => initialDraft?.carYear || "");
  const [carMake, setCarMake] = useState(() => initialDraft?.carMake || "");
  const [carModel, setCarModel] = useState(() => initialDraft?.carModel || "");
  const [carColor, setCarColor] = useState(() => initialDraft?.carColor || "");
  const [statusMessage, setStatusMessage] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const draft: SignupDraft = {
      firstName,
      lastName,
      rank,
      flight,
      jobDescription,
      phone,
      confirmPhone,
      username,
      email,
      password,
      confirmPassword,
      homeStreet,
      homeCity,
      homeState,
      homeZip,
      profilePhotoUrl,
      carYear,
      carMake,
      carModel,
      carColor,
    };

    const hasAnyValue = Object.values(draft).some((value) => value.trim().length > 0);

    if (!hasAnyValue) {
      window.sessionStorage.removeItem(SIGNUP_DRAFT_STORAGE_KEY);
      return;
    }

    window.sessionStorage.setItem(SIGNUP_DRAFT_STORAGE_KEY, JSON.stringify(draft));
  }, [
    carColor,
    carMake,
    carModel,
    carYear,
    confirmPassword,
    confirmPhone,
    email,
    firstName,
    flight,
    jobDescription,
    homeCity,
    homeState,
    homeStreet,
    homeZip,
    lastName,
    password,
    phone,
    profilePhotoUrl,
    rank,
    username,
  ]);

  const handleSignup = async () => {
    try {
      const draft: SignupDraft = {
        firstName,
        lastName,
        rank,
        flight,
        jobDescription,
        phone,
        confirmPhone,
        username,
        email,
        password,
        confirmPassword,
        homeStreet,
        homeCity,
        homeState,
        homeZip,
        profilePhotoUrl,
        carYear,
        carMake,
        carModel,
        carColor,
      };

      const validation = await validateSignupDraft(draft);

      if (!validation.ok) {
        setStatusMessage(validation.message);
        return;
      }

      setStatusMessage("Saving your signup info and opening terms...");
      window.sessionStorage.setItem(SIGNUP_DRAFT_STORAGE_KEY, JSON.stringify(draft));
      router.push("/signup/terms");
    } catch (error) {
      console.error(error);
      setStatusMessage(error instanceof Error ? error.message : "Could not prepare your signup.");
    }
  };

  return (
    <main style={{ padding: 20 }}>
      <HomeIconLink />

      <h1>Create Account</h1>

      <div style={{ marginTop: 20, maxWidth: 460 }}>
        <input
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder="First Name"
          style={{ display: "block", marginBottom: 10, width: "100%" }}
        />

        <input
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          placeholder="Last Name"
          style={{ display: "block", marginBottom: 10, width: "100%" }}
        />

        <select
          value={rank}
          onChange={(e) => setRank(e.target.value)}
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
          value={flight}
          onChange={(e) => setFlight(e.target.value)}
          style={{ display: "block", marginBottom: 10, width: "100%" }}
        >
          <option value="">Select Flight</option>
          {flightOptions.map((flightOption) => (
            <option key={flightOption} value={flightOption}>
              {flightOption}
            </option>
          ))}
        </select>

        <input
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          placeholder="Job Description (optional)"
          style={{ display: "block", marginBottom: 10, width: "100%" }}
        />

        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
          style={{ display: "block", marginBottom: 10, width: "100%" }}
        />

        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          style={{ display: "block", marginBottom: 10, width: "100%" }}
        />

        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone Number"
          style={{ display: "block", marginBottom: 10, width: "100%" }}
        />

        <input
          value={confirmPhone}
          onChange={(e) => setConfirmPhone(e.target.value)}
          placeholder="Verify Phone Number"
          style={{ display: "block", marginBottom: 10, width: "100%" }}
        />

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          style={{ display: "block", marginBottom: 10, width: "100%" }}
        />

        <p style={{ marginTop: -2, marginBottom: 12, fontSize: 13, color: "#94a3b8" }}>
          Password must be at least 8 characters and include 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character.
        </p>

        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Verify Password"
          style={{ display: "block", marginBottom: 16, width: "100%" }}
        />

        <div style={{ marginBottom: 16 }}>
          <ImageCropField
            value={profilePhotoUrl}
            onChange={(nextValue) => {
              setProfilePhotoUrl(nextValue);
              setStatusMessage(nextValue ? "Profile photo is ready and will be saved with your account." : "");
            }}
            cropShape="circle"
            previewSize={96}
            outputSize={480}
            maxEncodedLength={180000}
            disabled={uploadingPhoto}
            helperText="Use a clear photo that shows what you look like. This is required before your account can be created."
            statusMessage={uploadingPhoto ? "Preparing profile photo..." : ""}
            onStatusMessageChange={(message) => {
              setUploadingPhoto(message.includes("Preparing") || message.includes("Saving"));
              setStatusMessage(message);
            }}
          />
        </div>

        <div
          style={{
            marginBottom: 16,
            padding: 16,
            borderRadius: 14,
            border: "1px solid rgba(148, 163, 184, 0.18)",
            backgroundColor: "rgba(9, 15, 25, 0.88)",
          }}
        >
          <input
            value={homeStreet}
            onChange={(e) => {
              setHomeStreet(e.target.value);
            }}
            placeholder="Street Address"
            style={{ display: "block", marginBottom: 10, width: "100%" }}
          />

          <input
            value={homeCity}
            onChange={(e) => {
              setHomeCity(e.target.value);
            }}
            placeholder="City"
            style={{ display: "block", marginBottom: 10, width: "100%" }}
          />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <input
              value={homeState}
              onChange={(e) => {
                setHomeState(e.target.value.toUpperCase());
              }}
              placeholder="State"
              style={{ width: "100%" }}
              maxLength={2}
            />

            <input
              value={homeZip}
              onChange={(e) => {
                setHomeZip(e.target.value);
              }}
              placeholder="ZIP Code"
              style={{ width: "100%" }}
            />
          </div>
          <p style={{ marginTop: 0, marginBottom: 12, fontSize: 13, color: "#94a3b8" }}>
            Address and vehicle details below are optional for account creation, but adding them later helps with ride and driver readiness.
          </p>

          <input
            value={carYear}
            onChange={(e) => setCarYear(e.target.value)}
            placeholder="Vehicle Year"
            style={{ display: "block", marginBottom: 10, width: "100%" }}
          />

          <input
            value={carMake}
            onChange={(e) => setCarMake(e.target.value)}
            placeholder="Vehicle Make"
            style={{ display: "block", marginBottom: 10, width: "100%" }}
          />

          <input
            value={carModel}
            onChange={(e) => setCarModel(e.target.value)}
            placeholder="Vehicle Model"
            style={{ display: "block", marginBottom: 10, width: "100%" }}
          />

          <input
            value={carColor}
            onChange={(e) => setCarColor(e.target.value)}
            placeholder="Vehicle Color"
            style={{ display: "block", marginBottom: 0, width: "100%" }}
          />
        </div>

        <button type="button" onClick={handleSignup} style={{ padding: 10 }} disabled={uploadingPhoto}>
          Continue to Terms
        </button>
        {statusMessage ? (
          <p style={{ marginTop: 12, marginBottom: 0, color: statusMessage.includes("opening terms") ? "#86efac" : "#fca5a5" }}>
            {statusMessage}
          </p>
        ) : null}
      </div>
    </main>
  );
}
