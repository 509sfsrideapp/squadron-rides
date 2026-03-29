import { getGoogleAccessToken } from "./google-service-account";

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "ride-app-dd741";

async function callIdentityToolkit(path: string, body: Record<string, unknown>) {
  const accessToken = await getGoogleAccessToken();
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${projectId}/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`Identity Toolkit request failed: ${details || response.statusText}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json().catch(() => null);
}

export async function setIdentityUserDisabled(userId: string, disabled: boolean) {
  await callIdentityToolkit("accounts:update", {
    localId: userId,
    disableUser: disabled,
    validSince: String(Math.floor(Date.now() / 1000)),
  });
}

export async function updateIdentityUserEmail(userId: string, email: string) {
  await callIdentityToolkit("accounts:update", {
    localId: userId,
    email,
  });
}

export async function deleteIdentityUser(userId: string) {
  await callIdentityToolkit("accounts:delete", {
    localId: userId,
  });
}
