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

export async function validateSignupDraft(draft: SignupDraft) {
  if (
    !draft.firstName.trim() ||
    !draft.lastName.trim() ||
    !draft.rank.trim() ||
    !draft.flight.trim() ||
    !draft.phone.trim() ||
    !draft.username.trim() ||
    !draft.email.trim() ||
    !draft.password.trim() ||
    !draft.confirmPassword.trim()
  ) {
    return { ok: false as const, message: "Fill out every required field before creating your account." };
  }

  if (draft.password !== draft.confirmPassword) {
    return { ok: false as const, message: "Password and verify password must match." };
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

export async function finalizeSignupFromDraft(draft: SignupDraft) {
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
