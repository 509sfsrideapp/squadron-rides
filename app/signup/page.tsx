"use client";

import Image from "next/image";
import { ChangeEvent, useState } from "react";
import HomeIconLink from "../components/HomeIconLink";
import { auth, db } from "../../lib/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, writeBatch } from "firebase/firestore";
import { buildHomeAddress } from "../../lib/home-address";
import { isValidUsername, normalizeUsername } from "../../lib/username";

const flightOptions = ["Alpha", "Bravo", "Charlie", "Delta", "Foxtrot", "Staff"] as const;
const rankOptions = ["AB", "Amn", "A1C", "SrA", "SSgt", "TSgt", "MSgt", "SMSgt", "CMSgt", "2d Lt", "1st Lt", "Capt", "Maj", "Lt Col", "Col", "Brig Gen", "Maj Gen", "Lt Gen", "Gen"] as const;

function getSignupErrorMessage(error: unknown) {
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";

  switch (code) {
    case "auth/email-already-in-use":
      return "That email is already being used by another account.";
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/weak-password":
      return "Password must be at least 6 characters.";
    case "auth/network-request-failed":
      return "Network error while creating the account. Try again.";
    default:
      if (error instanceof Error && error.message) {
        return `Signup failed: ${error.message}`;
      }

      return "Signup failed. Check the email and password and try again.";
  }
}

export default function SignupPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [rank, setRank] = useState("");
  const [flight, setFlight] = useState("");
  const [phone, setPhone] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [homeStreet, setHomeStreet] = useState("");
  const [homeCity, setHomeCity] = useState("");
  const [homeState, setHomeState] = useState("");
  const [homeZip, setHomeZip] = useState("");
  const [profilePhotoUrl, setProfilePhotoUrl] = useState("");
  const [carYear, setCarYear] = useState("");
  const [carMake, setCarMake] = useState("");
  const [carModel, setCarModel] = useState("");
  const [carColor, setCarColor] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

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

    if (!file.type.startsWith("image/")) {
      setStatusMessage("Please choose an image file.");
      return;
    }

    try {
      setUploadingPhoto(true);
      setStatusMessage("Preparing profile photo...");
      const compressedPhoto = await shrinkImage(file);
      setProfilePhotoUrl(compressedPhoto);
      setStatusMessage("Profile photo is ready and will be saved with your account.");
    } catch (error) {
      console.error(error);
      setStatusMessage(error instanceof Error ? error.message : "Could not process the profile photo.");
    } finally {
      setUploadingPhoto(false);
      event.target.value = "";
    }
  };

  const handleSignup = async () => {
    if (
      !firstName.trim() ||
      !lastName.trim() ||
      !rank.trim() ||
      !flight.trim() ||
      !phone.trim() ||
      !username.trim() ||
      !email.trim() ||
      !password.trim() ||
      !confirmPassword.trim()
    ) {
      setStatusMessage("Fill out every required field before creating your account.");
      return;
    }

    if (password !== confirmPassword) {
      setStatusMessage("Password and verify password must match.");
      return;
    }

    try {
      const normalizedUsername = normalizeUsername(username);

      if (!isValidUsername(normalizedUsername)) {
        setStatusMessage("Usernames must be 3-24 characters using letters, numbers, dots, dashes, or underscores.");
        return;
      }

      const usernameSnap = await getDoc(doc(db, "usernames", normalizedUsername));

      if (usernameSnap.exists()) {
        setStatusMessage("That username is already taken.");
        return;
      }

      const rawHomeAddress = buildHomeAddress({
        street: homeStreet,
        city: homeCity,
        state: homeState,
        zip: homeZip,
      });
      const hasAnyAddressField = Boolean(homeStreet.trim() || homeCity.trim() || homeState.trim() || homeZip.trim());
      const normalizedHomeAddress = rawHomeAddress;

      if (hasAnyAddressField) {
        if (!homeStreet.trim() || !homeCity.trim() || !homeState.trim() || !homeZip.trim()) {
          setStatusMessage("Complete street address, city, state, and ZIP code or leave the address blank for now.");
          return;
        }
      }

      setStatusMessage("Creating account...");

      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
      const trimmedPhoto = profilePhotoUrl.trim();

      const batch = writeBatch(db);
      batch.set(doc(db, "users", userCredential.user.uid), {
        name: fullName,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        rank: rank.trim(),
        rankOrRole: rank.trim(),
        flight: flight.trim(),
        username: normalizedUsername,
        phone: phone.trim(),
        email: email.trim(),
        homeAddress: normalizedHomeAddress,
        homeStreet: homeStreet.trim(),
        homeCity: homeCity.trim(),
        homeState: homeState.trim().toUpperCase(),
        homeZip: homeZip.trim(),
        riderPhotoUrl: trimmedPhoto,
        driverPhotoUrl: trimmedPhoto,
        carYear: carYear.trim(),
        carMake: carMake.trim(),
        carModel: carModel.trim(),
        carColor: carColor.trim(),
        carPlate: "",
        available: false,
        createdAt: new Date(),
      });

      batch.set(doc(db, "usernames", normalizedUsername), {
        uid: userCredential.user.uid,
        username: normalizedUsername,
        email: userCredential.user.email,
        createdAt: new Date(),
      });

      await batch.commit();

      alert("Account created");
      window.location.href = "/login";
    } catch (error) {
      console.error(error);
      setStatusMessage(getSignupErrorMessage(error));
    }
  };

  return (
    <main style={{ padding: 20 }}>
      <HomeIconLink />

      <h1>Create Account</h1>

      <div style={{ marginTop: 20, maxWidth: 460 }}>
        {statusMessage ? <p style={{ marginBottom: 12 }}>{statusMessage}</p> : null}
        <h2 style={{ marginTop: 0 }}>Required Now</h2>

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
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone Number"
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
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          style={{ display: "block", marginBottom: 10, width: "100%" }}
        />

        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Verify Password"
          style={{ display: "block", marginBottom: 16, width: "100%" }}
        />

        <h2>Complete Now or Later</h2>
        <p style={{ marginTop: 0, marginBottom: 12, color: "#94a3b8" }}>
          Certain features will not be available until this information is completed.
        </p>
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
            Double-check that this information is correct so an accurate address is given to your driver.
          </p>

          <div style={{ marginBottom: 12 }}>
            {profilePhotoUrl ? (
              <Image
                src={profilePhotoUrl}
                alt="Profile preview"
                width={96}
                height={96}
                unoptimized
                style={{
                  width: 96,
                  height: 96,
                  objectFit: "cover",
                  borderRadius: 999,
                  border: "1px solid rgba(148, 163, 184, 0.22)",
                  display: "block",
                  marginBottom: 10,
                }}
              />
            ) : null}

            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              disabled={uploadingPhoto}
              style={{ marginBottom: 6 }}
            />
            <p style={{ marginTop: 0, marginBottom: 0, fontSize: 13, color: "#94a3b8" }}>
              Use a clear photo that shows what you look like so riders and drivers know who to look for.
            </p>
          </div>

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
          Create Account
        </button>
      </div>
    </main>
  );
}
