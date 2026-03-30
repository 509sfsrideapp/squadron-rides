import { NextRequest, NextResponse } from "next/server";
import { isAdminEmail } from "../../../../lib/admin";
import { buildHomeAddress } from "../../../../lib/home-address";
import { normalizeOfficeValue } from "../../../../lib/offices";
import { formatAddressPart, formatStateCode, formatVehicleField, formatVehiclePlate, normalizeVehicleYear } from "../../../../lib/text-format";
import { isValidUsername, normalizeUsername } from "../../../../lib/username";
import { verifyAdminRequest } from "../../../../lib/server/admin-access";
import { writeAuditLog } from "../../../../lib/server/audit-log";
import { createFirestoreDocument, deleteFirestoreDocument, getFirestoreDocument, patchFirestoreDocument } from "../../../../lib/server/firestore-admin";
import { deleteUserOwnedDocuments } from "../../../../lib/server/account-cleanup";
import { deleteIdentityUser, setIdentityUserDisabled, updateIdentityUserEmail } from "../../../../lib/server/identity-toolkit";

type AdminAccountAction = "freeze" | "unfreeze" | "delete" | "update";

type RequestBody = {
  action?: AdminAccountAction;
  userId?: string;
  username?: string;
  email?: string;
  updates?: {
    firstName?: string;
    lastName?: string;
    username?: string;
    email?: string;
    phone?: string;
    rank?: string;
    flight?: string;
    jobDescription?: string;
    bio?: string;
    homeStreet?: string;
    homeCity?: string;
    homeState?: string;
    homeZip?: string;
    riderPhotoUrl?: string;
    driverPhotoUrl?: string;
    carYear?: string;
    carMake?: string;
    carModel?: string;
    carColor?: string;
    carPlate?: string;
    locationServicesEnabled?: boolean;
    emergencyRideAddressConsent?: boolean;
    emergencyRideDispatchMode?: string;
    available?: boolean;
  };
};

type UserProfileRecord = {
  username?: string | null;
  email?: string | null;
};

export async function POST(request: NextRequest) {
  try {
    const adminToken = await verifyAdminRequest(request.headers);

    const body = (await request.json()) as RequestBody;
    const action = body.action;
    const userId = body.userId?.trim();
    const username = body.username?.trim();
    const targetEmail = body.email?.trim();

    if (!action || !userId) {
      return NextResponse.json({ error: "Action and userId are required." }, { status: 400 });
    }

    if (targetEmail && isAdminEmail(targetEmail)) {
      return NextResponse.json({ error: "The admin account cannot be frozen or deleted here." }, { status: 400 });
    }

    if (action === "freeze") {
      await setIdentityUserDisabled(userId, true);
      await patchFirestoreDocument(`users/${userId}`, {
        accountFrozen: true,
        frozenAt: new Date(),
        frozenByAdminEmail: adminToken.email || "admin",
        available: false,
      });
      await writeAuditLog({
        action: "admin.account.freeze",
        actor: { uid: adminToken.sub, email: adminToken.email },
        targetType: "user",
        targetId: userId,
        status: "success",
        message: `Froze account ${targetEmail || userId}.`,
        details: { email: targetEmail || null, username: username || null },
      });

      return NextResponse.json({ ok: true });
    }

    if (action === "unfreeze") {
      await setIdentityUserDisabled(userId, false);
      await patchFirestoreDocument(`users/${userId}`, {
        accountFrozen: false,
        frozenAt: null,
        frozenByAdminEmail: null,
        unfrozenAt: new Date(),
        unfrozenByAdminEmail: adminToken.email || "admin",
        available: false,
      });
      await writeAuditLog({
        action: "admin.account.unfreeze",
        actor: { uid: adminToken.sub, email: adminToken.email },
        targetType: "user",
        targetId: userId,
        status: "success",
        message: `Unfroze account ${targetEmail || userId}.`,
        details: { email: targetEmail || null, username: username || null },
      });

      return NextResponse.json({ ok: true });
    }

    if (action === "delete") {
      await patchFirestoreDocument(`users/${userId}`, {
        accountFrozen: true,
        deletedAt: new Date(),
        deletedByAdminEmail: adminToken.email || "admin",
        available: false,
      });

      const cleanupResult = await deleteUserOwnedDocuments(userId);

      if (username) {
        await deleteFirestoreDocument(`usernames/${username.toLowerCase()}`);
      }

      await deleteIdentityUser(userId);
      await deleteFirestoreDocument(`users/${userId}`);
      await writeAuditLog({
        action: "admin.account.delete",
        actor: { uid: adminToken.sub, email: adminToken.email },
        targetType: "user",
        targetId: userId,
        status: "success",
        message: `Deleted account ${targetEmail || userId}.`,
        details: {
          email: targetEmail || null,
          username: username || null,
          cleanupDeletedCount: cleanupResult.totalDeleted,
          cleanupDeletedByCollection: cleanupResult.deletedByCollection,
          preservedCollections: ["rides"],
        },
      });

      return NextResponse.json({ ok: true });
    }

    if (action === "update") {
      const updates = body.updates;

      if (!updates) {
        return NextResponse.json({ error: "updates are required for account edits." }, { status: 400 });
      }

      const existingUser = await getFirestoreDocument<UserProfileRecord>(`users/${userId}`);

      if (!existingUser) {
        return NextResponse.json({ error: "That user account could not be found." }, { status: 404 });
      }

      const normalizedUsername = normalizeUsername(updates.username || "");

      if (!normalizedUsername || !isValidUsername(normalizedUsername)) {
        return NextResponse.json(
          { error: "Usernames must be 3-24 characters using letters, numbers, dots, dashes, or underscores." },
          { status: 400 }
        );
      }

      const trimmedEmail = updates.email?.trim() || "";

      if (!trimmedEmail) {
        return NextResponse.json({ error: "Email is required." }, { status: 400 });
      }

      const previousUsername = normalizeUsername(existingUser.username || "");
      const previousEmail = existingUser.email?.trim() || targetEmail || "";

      if (normalizedUsername !== previousUsername) {
        const usernameDocument = await getFirestoreDocument<{ uid?: string | null }>(`usernames/${normalizedUsername}`);

        if (usernameDocument?.uid && usernameDocument.uid !== userId) {
          return NextResponse.json({ error: "That username is already taken." }, { status: 400 });
        }
      }

      const normalizedHomeStreet = formatAddressPart(updates.homeStreet || "");
      const normalizedHomeCity = formatAddressPart(updates.homeCity || "");
      const normalizedHomeState = formatStateCode(updates.homeState || "");
      const normalizedHomeZip = updates.homeZip?.trim() || "";
      const hasAnyAddressField = Boolean(
        normalizedHomeStreet || normalizedHomeCity || normalizedHomeState || normalizedHomeZip
      );

      if (hasAnyAddressField && (!normalizedHomeStreet || !normalizedHomeCity || !normalizedHomeState || !normalizedHomeZip)) {
        return NextResponse.json(
          { error: "Complete street address, city, state, and ZIP code or leave the address blank." },
          { status: 400 }
        );
      }

      const normalizedCarYear = normalizeVehicleYear(updates.carYear || "");
      const normalizedOffice = normalizeOfficeValue(updates.flight);

      if (!normalizedOffice) {
        return NextResponse.json({ error: "A valid office is required." }, { status: 400 });
      }

      const patch = {
        name: `${updates.firstName?.trim() || ""} ${updates.lastName?.trim() || ""}`.trim(),
        firstName: updates.firstName?.trim() || "",
        lastName: updates.lastName?.trim() || "",
        username: normalizedUsername,
        email: trimmedEmail,
        phone: updates.phone?.trim() || "",
        rank: updates.rank?.trim() || "",
        rankOrRole: updates.rank?.trim() || "",
        flight: normalizedOffice,
        jobDescription: updates.jobDescription?.trim() || "",
        bio: updates.bio?.trim() || "",
        homeStreet: normalizedHomeStreet,
        homeCity: normalizedHomeCity,
        homeState: normalizedHomeState,
        homeZip: normalizedHomeZip,
        homeAddress: hasAnyAddressField
          ? buildHomeAddress({
              street: normalizedHomeStreet,
              city: normalizedHomeCity,
              state: normalizedHomeState,
              zip: normalizedHomeZip,
            })
          : "",
        riderPhotoUrl: updates.riderPhotoUrl?.trim() || "",
        driverPhotoUrl: updates.driverPhotoUrl?.trim() || "",
        carYear: normalizedCarYear,
        carMake: formatVehicleField(updates.carMake || ""),
        carModel: formatVehicleField(updates.carModel || ""),
        carColor: formatVehicleField(updates.carColor || ""),
        carPlate: formatVehiclePlate(updates.carPlate || ""),
        locationServicesEnabled: updates.locationServicesEnabled !== false,
        emergencyRideAddressConsent: Boolean(updates.emergencyRideAddressConsent),
        emergencyRideDispatchMode: updates.emergencyRideDispatchMode?.trim() || "closest_available",
        available: Boolean(updates.available),
        updatedAt: new Date(),
      };

      await patchFirestoreDocument(`users/${userId}`, patch);

      if (trimmedEmail !== previousEmail) {
        await updateIdentityUserEmail(userId, trimmedEmail);
      }

      await createFirestoreDocument(
        "usernames",
        {
          uid: userId,
          username: normalizedUsername,
          email: trimmedEmail,
          updatedAt: new Date(),
        },
        normalizedUsername
      ).catch(async () => {
        await patchFirestoreDocument(`usernames/${normalizedUsername}`, {
          uid: userId,
          username: normalizedUsername,
          email: trimmedEmail,
          updatedAt: new Date(),
        });
      });

      if (previousUsername && previousUsername !== normalizedUsername) {
        await deleteFirestoreDocument(`usernames/${previousUsername}`);
      }

      await writeAuditLog({
        action: "admin.account.update",
        actor: { uid: adminToken.sub, email: adminToken.email },
        targetType: "user",
        targetId: userId,
        status: "success",
        message: `Updated account ${trimmedEmail || userId}.`,
        details: {
          email: trimmedEmail,
          previousEmail: previousEmail || null,
          username: normalizedUsername,
          previousUsername: previousUsername || null,
        },
      });

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  } catch (error) {
    console.error(error);
    await writeAuditLog({
      action: "admin.account.error",
      status: "failure",
      message: error instanceof Error ? error.message : "Could not manage that account.",
    }).catch((auditError) => {
      console.error("Audit log write failed", auditError);
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not manage that account." },
      { status: 500 }
    );
  }
}
