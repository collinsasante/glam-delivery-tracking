import "server-only";

/**
 * Fire-and-forget notification to a Mattermost channel via an incoming webhook.
 * Mirrors Slack's incoming-webhook format ({ text }), so this works unmodified
 * against a Slack webhook URL too if ever needed again.
 *
 * Never throws — a notification failure should never break the action that
 * triggered it (same policy as the FCM push notifications in lib/notifications.ts).
 */
export async function sendMattermostNotification(text: string): Promise<void> {
  const url = process.env.MATTERMOST_WEBHOOK_URL;
  if (!url) return;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, username: "Delivery Bot" }),
    });
    if (!res.ok) {
      console.error(`[mattermost] webhook returned ${res.status}: ${await res.text()}`);
    }
  } catch (err) {
    console.error("[mattermost] failed to send notification:", err);
  }
}
