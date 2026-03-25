import { getGoogleAccessToken } from "./google-service-account";

type PushMessageInput = {
  tokens: string[];
  title: string;
  body: string;
  link?: string;
  origin?: string;
};

function resolveNotificationLink(link: string, origin?: string) {
  if (/^https?:\/\//i.test(link)) {
    return link;
  }

  if (!origin) {
    return link;
  }

  return new URL(link, origin).toString();
}

export async function sendPushMessage({ tokens, title, body, link = "/", origin }: PushMessageInput) {
  const uniqueTokens = Array.from(new Set(tokens.filter(Boolean)));

  if (uniqueTokens.length === 0) {
    return;
  }

  const accessToken = await getGoogleAccessToken();
  const resolvedLink = resolveNotificationLink(link, origin);

  await Promise.all(
    uniqueTokens.map(async (token) => {
      const response = await fetch(
        "https://fcm.googleapis.com/v1/projects/ride-app-dd741/messages:send",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            message: {
              token,
              webpush: {
                fcm_options: {
                  link: resolvedLink,
                },
              },
              data: {
                title,
                body,
                link: resolvedLink,
              },
            },
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("FCM send failed", errorText);
      }
    })
  );
}
