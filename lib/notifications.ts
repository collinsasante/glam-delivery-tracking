import "server-only";
import { SignJWT, importPKCS8 } from "jose";

async function getAccessToken(): Promise<string> {
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKeyPem = process.env.FIREBASE_PRIVATE_KEY;
  if (!clientEmail || !privateKeyPem) return "";

  const pem = privateKeyPem.replace(/\\n/g, "\n");
  const now = Math.floor(Date.now() / 1000);
  const privateKey = await importPKCS8(pem, "RS256");

  const assertion = await new SignJWT({
    iss: clientEmail,
    sub: clientEmail,
    aud: "https://oauth2.googleapis.com/token",
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    iat: now,
    exp: now + 3600,
  })
    .setProtectedHeader({ alg: "RS256" })
    .sign(privateKey);

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!res.ok) return "";
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

export async function sendPushNotification(
  fcmToken: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<void> {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId || !fcmToken) return;

  try {
    const accessToken = await getAccessToken();
    if (!accessToken) return;

    await fetch(
      `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          message: {
            token: fcmToken,
            notification: { title, body },
            ...(data && { data }),
          },
        }),
      }
    );
  } catch {
    // Notification failures are non-fatal
  }
}

export async function sendPushToTokens(
  fcmTokens: string[],
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<void> {
  await Promise.allSettled(
    fcmTokens.map((t) => sendPushNotification(t, title, body, data))
  );
}
