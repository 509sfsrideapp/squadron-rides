import { getGoogleAccessToken } from "./google-service-account";

type FirestoreValue =
  | { stringValue: string }
  | { booleanValue: boolean }
  | { integerValue: string }
  | { doubleValue: number }
  | { nullValue: null }
  | { timestampValue: string }
  | { mapValue: { fields?: Record<string, FirestoreValue> } }
  | { arrayValue: { values?: FirestoreValue[] } };

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "ride-app-dd741";

function toFirestoreValue(value: unknown): FirestoreValue {
  if (value === null || value === undefined) {
    return { nullValue: null };
  }

  if (value instanceof Date) {
    return { timestampValue: value.toISOString() };
  }

  if (typeof value === "string") {
    return { stringValue: value };
  }

  if (typeof value === "boolean") {
    return { booleanValue: value };
  }

  if (typeof value === "number") {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }

  if (Array.isArray(value)) {
    return {
      arrayValue: {
        values: value.map((entry) => toFirestoreValue(entry)),
      },
    };
  }

  if (typeof value === "object") {
    return {
      mapValue: {
        fields: Object.fromEntries(
          Object.entries(value as Record<string, unknown>).map(([field, nestedValue]) => [
            field,
            toFirestoreValue(nestedValue),
          ])
        ),
      },
    };
  }

  throw new Error("Unsupported Firestore admin value type.");
}

function fromFirestoreValue(value: FirestoreValue | undefined): unknown {
  if (!value) {
    return null;
  }

  if ("stringValue" in value) {
    return value.stringValue;
  }

  if ("booleanValue" in value) {
    return value.booleanValue;
  }

  if ("integerValue" in value) {
    return Number(value.integerValue);
  }

  if ("doubleValue" in value) {
    return value.doubleValue;
  }

  if ("timestampValue" in value) {
    return value.timestampValue;
  }

  if ("nullValue" in value) {
    return null;
  }

  if ("mapValue" in value) {
    const fields = value.mapValue.fields || {};
    return Object.fromEntries(
      Object.entries(fields).map(([field, fieldValue]) => [field, fromFirestoreValue(fieldValue)])
    );
  }

  if ("arrayValue" in value) {
    return (value.arrayValue.values || []).map((entry) => fromFirestoreValue(entry));
  }

  return null;
}

export async function patchFirestoreDocument(documentPath: string, fields: Record<string, unknown>) {
  const accessToken = await getGoogleAccessToken();
  const fieldEntries = Object.entries(fields);
  const updateMask = fieldEntries.map(([field]) => `updateMask.fieldPaths=${encodeURIComponent(field)}`).join("&");
  const encodedPath = documentPath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${encodedPath}?${updateMask}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        fields: Object.fromEntries(fieldEntries.map(([field, value]) => [field, toFirestoreValue(value)])),
      }),
      cache: "no-store",
    }
  );

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`Could not update Firestore document ${documentPath}: ${details || response.statusText}`);
  }
}

export async function createFirestoreDocument(collectionPath: string, fields: Record<string, unknown>, documentId?: string) {
  const accessToken = await getGoogleAccessToken();
  const encodedPath = collectionPath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  const documentIdQuery = documentId ? `?documentId=${encodeURIComponent(documentId)}` : "";
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${encodedPath}${documentIdQuery}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        fields: Object.fromEntries(Object.entries(fields).map(([field, value]) => [field, toFirestoreValue(value)])),
      }),
      cache: "no-store",
    }
  );

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`Could not create Firestore document in ${collectionPath}: ${details || response.statusText}`);
  }

  return response.json();
}

export async function deleteFirestoreDocument(documentPath: string) {
  const accessToken = await getGoogleAccessToken();
  const encodedPath = documentPath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${encodedPath}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    }
  );

  if (!response.ok && response.status !== 404) {
    const details = await response.text().catch(() => "");
    throw new Error(`Could not delete Firestore document ${documentPath}: ${details || response.statusText}`);
  }
}

export async function listFirestoreDocuments(collectionPath: string) {
  const accessToken = await getGoogleAccessToken();
  const encodedPath = collectionPath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${encodedPath}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`Could not list Firestore documents for ${collectionPath}: ${details || response.statusText}`);
  }

  const data = (await response.json()) as {
    documents?: Array<{
      name: string;
      fields?: Record<string, FirestoreValue>;
    }>;
  };

  return (data.documents || []).map((document) => ({
    id: document.name.split("/").pop() || "",
    ...Object.fromEntries(
      Object.entries(document.fields || {}).map(([field, value]) => [field, fromFirestoreValue(value)])
    ),
  }));
}

export async function getFirestoreDocument<T extends Record<string, unknown>>(documentPath: string) {
  const accessToken = await getGoogleAccessToken();
  const encodedPath = documentPath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${encodedPath}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    }
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`Could not get Firestore document ${documentPath}: ${details || response.statusText}`);
  }

  const data = (await response.json()) as {
    name: string;
    fields?: Record<string, FirestoreValue>;
  };

  return {
    id: data.name.split("/").pop() || "",
    ...Object.fromEntries(
      Object.entries(data.fields || {}).map(([field, value]) => [field, fromFirestoreValue(value)])
    ),
  } as { id: string } & T;
}
