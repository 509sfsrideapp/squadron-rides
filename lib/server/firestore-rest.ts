import { getGoogleAccessToken } from "./google-service-account";

type FirestoreValue =
  | { stringValue: string }
  | { booleanValue: boolean }
  | { integerValue: string }
  | { doubleValue: number }
  | { nullValue: null }
  | { arrayValue: { values?: FirestoreValue[] } }
  | { mapValue: { fields?: Record<string, FirestoreValue> } }
  | { timestampValue: string };

type FirestoreDocument = {
  name: string;
  fields?: Record<string, FirestoreValue>;
};

export type FirestoreUserDoc = {
  id: string;
  available?: boolean;
  name?: string;
  email?: string;
  notificationTokens?: string[];
};

export type FirestoreRideDoc = {
  id: string;
  riderId?: string;
  acceptedBy?: string;
  status?: string;
  riderName?: string;
  pickup?: string;
  driverName?: string;
  carYear?: string;
  carMake?: string;
  carModel?: string;
  carColor?: string;
};

const projectId = "ride-app-dd741";

function parseValue(value: FirestoreValue | undefined): unknown {
  if (!value) return undefined;
  if ("stringValue" in value) return value.stringValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue;
  if ("nullValue" in value) return null;
  if ("timestampValue" in value) return value.timestampValue;
  if ("arrayValue" in value) return (value.arrayValue.values || []).map(parseValue);
  if ("mapValue" in value) {
    return Object.fromEntries(
      Object.entries(value.mapValue.fields || {}).map(([key, nestedValue]) => [key, parseValue(nestedValue)])
    );
  }
  return undefined;
}

function parseDocument(document: FirestoreDocument): FirestoreUserDoc {
  const id = document.name.split("/").pop() || "";
  const fields = document.fields || {};

  return {
    id,
    available: parseValue(fields.available) as boolean | undefined,
    name: parseValue(fields.name) as string | undefined,
    email: parseValue(fields.email) as string | undefined,
    notificationTokens: (parseValue(fields.notificationTokens) as string[] | undefined) || [],
  };
}

export async function getAvailableDriverNotificationTokens() {
  const accessToken = await getGoogleAccessToken();
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: "users" }],
          where: {
            fieldFilter: {
              field: { fieldPath: "available" },
              op: "EQUAL",
              value: { booleanValue: true },
            },
          },
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error("Could not load available drivers for notifications.");
  }

  const data = (await response.json()) as Array<{ document?: FirestoreDocument }>;

  return data
    .map((entry) => (entry.document ? parseDocument(entry.document) : null))
    .filter((entry): entry is FirestoreUserDoc => Boolean(entry))
    .flatMap((entry) => entry.notificationTokens || []);
}

export async function getUserNotificationTokens(userId: string) {
  const accessToken = await getGoogleAccessToken();
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${userId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Could not load notification target user.");
  }

  const document = (await response.json()) as FirestoreDocument;
  const parsed = parseDocument(document);
  return parsed.notificationTokens || [];
}

export async function getRideDoc(rideId: string) {
  const accessToken = await getGoogleAccessToken();
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/rides/${rideId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Could not load ride for notifications.");
  }

  const document = (await response.json()) as FirestoreDocument;
  const fields = document.fields || {};

  return {
    id: document.name.split("/").pop() || rideId,
    riderId: parseValue(fields.riderId) as string | undefined,
    acceptedBy: parseValue(fields.acceptedBy) as string | undefined,
    status: parseValue(fields.status) as string | undefined,
    riderName: parseValue(fields.riderName) as string | undefined,
    pickup: parseValue(fields.pickup) as string | undefined,
    driverName: parseValue(fields.driverName) as string | undefined,
    carYear: parseValue(fields.carYear) as string | undefined,
    carMake: parseValue(fields.carMake) as string | undefined,
    carModel: parseValue(fields.carModel) as string | undefined,
    carColor: parseValue(fields.carColor) as string | undefined,
  } satisfies FirestoreRideDoc;
}
