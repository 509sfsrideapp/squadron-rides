import { auth, db } from "./firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, writeBatch } from "firebase/firestore";
import { buildHomeAddress } from "./home-address";
import { isValidUsername, normalizeUsername } from "./username";

export const SIGNUP_DRAFT_STORAGE_KEY = "defender-drivers-signup-draft";

export type SignupDraft = {
  firstName: string;
  lastName: string;
  rank: string;
  flight: string;
  phone: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  homeStreet: string;
  homeCity: string;
  homeState: string;
  homeZip: string;
  profilePhotoUrl: string;
  carYear: string;
  carMake: string;
  carModel: string;
  carColor: string;
};

export function getSignupErrorMessage(error: unknown) {
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";

  switch (code) {
    case "auth/email-already-in-use":
      return "That email is already being used by another account.";
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/weak-password":
      return "Password must be at least 8 characters and include uppercase, lowercase, number, and special character requirements.";
    case "auth/network-request-failed":
      return "Network error while creating the account. Try again.";
    default:
      if (error instanceof Error && error.message) {
        return `Signup failed: ${error.message}`;
      }

      return "Signup failed. Check the email and password and try again.";
  }
}

const passwordRule = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

function getMissingRequiredFieldMessage(draft: SignupDraft) {
  const requiredFields: Array<[value: string, label: string]> = [
    [draft.firstName, "First name is required."],
    [draft.lastName, "Last name is required."],
    [draft.rank, "Rank is required."],
    [draft.flight, "Flight is required."],
    [draft.username, "Username is required."],
    [draft.email, "Email is required."],
    [draft.phone, "Phone number is required."],
    [draft.password, "Password is required."],
    [draft.confirmPassword, "Verify password is required."],
  ];

  return requiredFields.find(([value]) => !value.trim())?.[1] || null;
}

export async function validateSignupDraft(draft: SignupDraft) {
  const missingFieldMessage = getMissingRequiredFieldMessage(draft);

  if (missingFieldMessage) {
    return { ok: false as const, message: missingFieldMessage };
  }

  if (draft.password !== draft.confirmPassword) {
    return { ok: false as const, message: "Password and verify password must match." };
  }

  if (!passwordRule.test(draft.password)) {
    return {
      ok: false as const,
      message:
        "Password must be at least 8 characters and include 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character.",
    };
  }

  const normalizedUsername = normalizeUsername(draft.username);

  if (!isValidUsername(normalizedUsername)) {
    return {
      ok: false as const,
      message: "Usernames must be 3-24 characters using letters, numbers, dots, dashes, or underscores.",
    };
  }

  const usernameSnap = await getDoc(doc(db, "usernames", normalizedUsername));

  if (usernameSnap.exists()) {
    return { ok: false as const, message: "That username is already taken." };
  }

  const hasAnyAddressField = Boolean(
    draft.homeStreet.trim() || draft.homeCity.trim() || draft.homeState.trim() || draft.homeZip.trim()
  );

  if (hasAnyAddressField) {
    if (!draft.homeStreet.trim() || !draft.homeCity.trim() || !draft.homeState.trim() || !draft.homeZip.trim()) {
      return {
        ok: false as const,
        message: "Complete street address, city, state, and ZIP code or leave the address blank for now.",
      };
    }
  }

  return { ok: true as const, normalizedUsername };
}

export async function finalizeSignupFromDraft(
  draft: SignupDraft,
  options?: {
    emergencyRideAddressConsent?: boolean;
  }
) {
  const validation = await validateSignupDraft(draft);

  if (!validation.ok) {
    throw new Error(validation.message);
  }

  const normalizedUsername = validation.normalizedUsername;
  const normalizedHomeAddress = buildHomeAddress({
    street: draft.homeStreet,
    city: draft.homeCity,
    state: draft.homeState,
    zip: draft.homeZip,
  });

  const userCredential = await createUserWithEmailAndPassword(auth, draft.email.trim(), draft.password);
  const fullName = `${draft.firstName.trim()} ${draft.lastName.trim()}`.trim();
  const trimmedPhoto = draft.profilePhotoUrl.trim();

  const batch = writeBatch(db);
  batch.set(doc(db, "users", userCredential.user.uid), {
    name: fullName,
    firstName: draft.firstName.trim(),
    lastName: draft.lastName.trim(),
    rank: draft.rank.trim(),
    rankOrRole: draft.rank.trim(),
    flight: draft.flight.trim(),
    username: normalizedUsername,
    phone: draft.phone.trim(),
    email: draft.email.trim(),
    homeAddress: normalizedHomeAddress,
    homeStreet: draft.homeStreet.trim(),
    homeCity: draft.homeCity.trim(),
    homeState: draft.homeState.trim().toUpperCase(),
    homeZip: draft.homeZip.trim(),
    riderPhotoUrl: trimmedPhoto,
    driverPhotoUrl: trimmedPhoto,
    carYear: draft.carYear.trim(),
    carMake: draft.carMake.trim(),
    carModel: draft.carModel.trim(),
    carColor: draft.carColor.trim(),
    carPlate: "",
    emergencyRideAddressConsent: Boolean(options?.emergencyRideAddressConsent),
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
}
