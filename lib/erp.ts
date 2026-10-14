import "server-only";

/**
 * Link to the Packaging Glamour ERP (ERPNext, app glampack_ops).
 *
 * - Server-side only: the API key/secret come from ERP_API_KEY / ERP_API_SECRET and never reach
 *   the browser. The key belongs to a dedicated ERP user whose only role is "Delivery Integration".
 * - Disabled unless ERP_URL, ERP_API_KEY and ERP_API_SECRET are all set: the app then behaves
 *   exactly as before.
 * - Status updates never throw — an ERP problem must not block a rider (same policy as
 *   lib/mattermost.ts and the push notifications).
 */

export type ErpOrder = {
  ref: string;
  type: "Sales Order" | "Sales Invoice";
  customerName: string;
  phone: string;
  address: string;
  deliveryDate: string;
  warehouse: "Amrahia" | "Pantang West" | null;
  items: { item: string; qty: number; uom: string }[];
};

export type ErpDeliveryStatus = "Pending" | "In Progress" | "On Hold" | "Completed" | "Cancelled";

// ERPNext document names for submitted orders/invoices, e.g. SAL-ORD-2026-00018, ACC-SINV-2026-00013.
const ERP_REF = /^(SAL-ORD|ACC-SINV)-\d{4}-\d{5}$/;
const TIMEOUT_MS = 8000;

function config() {
  const url = process.env.ERP_URL?.replace(/\/+$/, "");
  const key = process.env.ERP_API_KEY;
  const secret = process.env.ERP_API_SECRET;
  return url && key && secret ? { url, auth: `token ${key}:${secret}` } : null;
}

export function erpEnabled(): boolean {
  return config() !== null;
}

export function isErpOrderRef(orderId: string | null | undefined): boolean {
  return !!orderId && ERP_REF.test(orderId.trim());
}

/** Map an ERP warehouse ("Amrahia - V") to this app's warehouse names. */
function mapWarehouse(name: string): ErpOrder["warehouse"] {
  const n = name.toLowerCase();
  if (n.startsWith("amrahia")) return "Amrahia";
  if (n.startsWith("pantang")) return "Pantang West";
  return null;
}

function erpError(body: unknown, status: number): string {
  try {
    const msgs = JSON.parse((body as { _server_messages?: string })._server_messages ?? "[]");
    const first = JSON.parse(msgs[0] ?? "{}").message;
    if (first) return String(first).replace(/<[^>]+>/g, "");
  } catch {
    /* fall through */
  }
  if (status === 401 || status === 403) return "The delivery app is not authorised in the ERP.";
  if (status === 404) return "Order not found in the ERP (it must be a submitted Sales Order or Sales Invoice).";
  return "The ERP could not be reached. Please try again.";
}

/** Look up a submitted Sales Order / Sales Invoice to prefill a delivery. */
export async function lookupErpOrder(ref: string): Promise<{ order: ErpOrder } | { error: string }> {
  const cfg = config();
  if (!cfg) return { error: "The ERP link is not configured." };
  const clean = ref.trim().toUpperCase();
  if (!ERP_REF.test(clean)) return { error: "Enter an ERP order number like SAL-ORD-2026-00012 or ACC-SINV-2026-00034." };
  try {
    const res = await fetch(`${cfg.url}/api/method/glampack_ops.api.delivery.lookup?ref=${encodeURIComponent(clean)}`, {
      headers: { Authorization: cfg.auth, Accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { error: erpError(body, res.status) };
    const m = (body as { message: Record<string, unknown> }).message;
    return {
      order: {
        ref: String(m.ref),
        type: m.type as ErpOrder["type"],
        customerName: String(m.customer_name ?? ""),
        phone: String(m.phone ?? ""),
        address: String(m.address ?? ""),
        deliveryDate: String(m.delivery_date ?? ""),
        warehouse: mapWarehouse(String(m.warehouse ?? "")),
        items: Array.isArray(m.items) ? (m.items as ErpOrder["items"]) : [],
      },
    };
  } catch (err) {
    console.error("[erp] lookup failed:", err instanceof Error ? err.message : err);
    return { error: "The ERP could not be reached. Please try again." };
  }
}

/** Report a delivery's status to the ERP. No-op unless enabled and the order is an ERP order. Never throws. */
export async function pushErpDeliveryStatus(d: {
  orderId: string | null | undefined;
  deliveryCode: string;
  status: ErpDeliveryStatus;
  riderName?: string | null;
  deliveryDate?: string | null;
  completedAt?: Date;
  riderComment?: string | null;
}): Promise<void> {
  const cfg = config();
  if (!cfg || !isErpOrderRef(d.orderId)) return;
  const body = new URLSearchParams({
    ref: d.orderId!.trim().toUpperCase(),
    delivery_code: d.deliveryCode,
    status: d.status,
  });
  if (d.riderName) body.set("rider", d.riderName);
  if (d.deliveryDate) body.set("delivery_date", d.deliveryDate);
  if (d.completedAt) body.set("completed_at", d.completedAt.toISOString().slice(0, 19).replace("T", " "));
  if (d.riderComment) body.set("rider_comment", d.riderComment);
  const appUrl = (process.env.APP_URL || "https://delivery.packglamour.com").replace(/\/+$/, "");
  body.set("tracking_url", `${appUrl}/track/${encodeURIComponent(d.deliveryCode)}`);
  try {
    const res = await fetch(`${cfg.url}/api/method/glampack_ops.api.delivery.update_status`, {
      method: "POST",
      headers: { Authorization: cfg.auth, Accept: "application/json" },
      body,
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error(`[erp] status update ${d.deliveryCode} -> ${d.status} failed: ${res.status} ${erpError(err, res.status)}`);
    }
  } catch (err) {
    console.error(`[erp] status update ${d.deliveryCode} -> ${d.status} failed:`, err instanceof Error ? err.message : err);
  }
}
