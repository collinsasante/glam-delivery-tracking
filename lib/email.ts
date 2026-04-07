import "server-only";

export async function sendInviteEmail({
  to,
  name,
  role,
  inviteLink,
}: {
  to: string;
  name: string;
  role: string;
  inviteLink: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.FROM_EMAIL ?? "Drop <noreply@glam-delivery.pages.dev>";

  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY not set — skipping invite email");
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: `You've been invited to Drop`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#111">
          <img src="https://glam-delivery.pages.dev/logo.png" width="48" height="48" style="border-radius:10px;margin-bottom:24px" />
          <h2 style="margin:0 0 8px;font-size:22px">Welcome to Drop, ${name}!</h2>
          <p style="color:#555;margin:0 0 24px">
            You've been added as a <strong>${role}</strong>. Click the button below to set your password and sign in.
          </p>
          <a href="${inviteLink}"
            style="display:inline-block;background:#991b1b;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:15px">
            Set your password
          </a>
          <p style="color:#999;font-size:12px;margin-top:24px">
            This link expires in 24 hours. If you didn't expect this email, you can ignore it.
          </p>
        </div>
      `,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[email] Resend error:", err);
  }
}
