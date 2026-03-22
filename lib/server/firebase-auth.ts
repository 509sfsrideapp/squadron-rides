import { createVerify } from "node:crypto";

type FirebaseTokenPayload = {
  aud: string;
  iss: string;
  sub: string;
  user_id?: string;
  email?: string;
  exp: number;
  iat: number;
};

let certCache:
  | {
      expiresAt: number;
      certs: Record<string, string>;
    }
  | null = null;

function base64UrlDecode(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return Buffer.from(`${normalized}${padding}`, "base64").toString("utf8");
}

async function getFirebaseCerts() {
  if (certCache && certCache.expiresAt > Date.now()) {
    return certCache.certs;
  }

  const response = await fetch(
    "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com",
    { cache: "no-store" }
  );

  if (!response.ok) {
    throw new Error("Could not load Firebase token certificates.");
  }

  const cacheControl = response.headers.get("cache-control") || "";
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
  const maxAge = maxAgeMatch ? Number(maxAgeMatch[1]) * 1000 : 60 * 60 * 1000;
  const certs = (await response.json()) as Record<string, string>;

  certCache = {
    certs,
    expiresAt: Date.now() + maxAge,
  };

  return certs;
}

export async function verifyFirebaseIdToken(idToken: string) {
  const [encodedHeader, encodedPayload, encodedSignature] = idToken.split(".");

  if (!encodedHeader || !encodedPayload || !encodedSignature) {
    throw new Error("Invalid Firebase ID token format.");
  }

  const header = JSON.parse(base64UrlDecode(encodedHeader)) as { alg?: string; kid?: string };
  const payload = JSON.parse(base64UrlDecode(encodedPayload)) as FirebaseTokenPayload;

  if (header.alg !== "RS256" || !header.kid) {
    throw new Error("Unsupported Firebase ID token header.");
  }

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "ride-app-dd741";
  const expectedIssuer = `https://securetoken.google.com/${projectId}`;

  if (payload.aud !== projectId || payload.iss !== expectedIssuer || !payload.sub) {
    throw new Error("Firebase ID token claims are invalid.");
  }

  if (payload.exp * 1000 < Date.now()) {
    throw new Error("Firebase ID token has expired.");
  }

  const certs = await getFirebaseCerts();
  const certificate = certs[header.kid];

  if (!certificate) {
    throw new Error("Firebase certificate for token was not found.");
  }

  const verifier = createVerify("RSA-SHA256");
  verifier.update(`${encodedHeader}.${encodedPayload}`);
  verifier.end();

  const signature = Buffer.from(encodedSignature.replace(/-/g, "+").replace(/_/g, "/"), "base64");
  const valid = verifier.verify(certificate, signature);

  if (!valid) {
    throw new Error("Firebase ID token signature is invalid.");
  }

  return payload;
}
