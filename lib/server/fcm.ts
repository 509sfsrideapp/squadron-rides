import { getGoogleAccessToken } from "./google-service-account";

type PushMessageInput = {
  tokens: string[];
  title: string;
  body: string;
  link?: string;
};

export async function sendPushMessage({ tokens, title, body, link = "/" }: PushMessageInput) {
  const uniqueTokens = Array.from(new Set(tokens.filter(Boolean)));

  if (uniqueTokens.length === 0) {
    return;
  }

  const accessToken = await getGoogleAccessToken();

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
              notification: {
                title,
                body,
              },
              webpush: {
                notification: {
                  title,
                  body,
                  icon: "/window.svg",
                },
                fcm_options: {
                  link,
                },
              },
              data: {
                link,
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
