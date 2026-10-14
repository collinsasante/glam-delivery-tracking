/**
 * Manual integration check for lib/erp.ts against a real ERP (staging):
 *   ERP_URL=… ERP_API_KEY=… ERP_API_SECRET=… ORDER=SAL-ORD-… \
 *   node --conditions=react-server --import tsx scripts/erp-link-check.ts
 * Prints PASS/FAIL; never prints credentials.
 */
import { erpEnabled, isErpOrderRef, lookupErpOrder, pushErpDeliveryStatus } from "../lib/erp";

const order = process.env.ORDER ?? "";
const code = `DEL-T${Date.now().toString().slice(-6)}`;
let fails = 0;
const ok = (n: string, c: boolean, d = "") => { if (!c) fails++; console.log(`${c ? "PASS" : "FAIL"}  ${n}${d ? "  -- " + d : ""}`); };

async function main() {
  ok("enabled with all three env vars", erpEnabled());
  ok("recognises ERP order numbers only", isErpOrderRef(order) && isErpOrderRef("acc-sinv-2026-00001".toUpperCase()) && !isErpOrderRef("12345") && !isErpOrderRef("PAKKMAX"));

  const r = await lookupErpOrder(order.toLowerCase());
  ok("lookup: order found (case-insensitive)", "order" in r, "error" in r ? r.error : "");
  if ("order" in r) {
    ok("lookup: customer, phone and warehouse mapped", !!r.order.customerName && !!r.order.phone && r.order.warehouse === "Amrahia", JSON.stringify({ ...r.order, items: r.order.items.length }));
  }
  const bad = await lookupErpOrder("SAL-ORD-2026-99999");
  ok("lookup: unknown order gives a clear message", "error" in bad && /not found/i.test(bad.error), "error" in bad ? bad.error : "");
  const junk = await lookupErpOrder("12345");
  ok("lookup: non-ERP numbers rejected without calling the ERP", "error" in junk && /SAL-ORD/.test(junk.error));

  for (const status of ["Pending", "In Progress", "On Hold", "Completed"] as const) {
    await pushErpDeliveryStatus({ orderId: order, deliveryCode: code, status, riderName: "TEST Rider", completedAt: status === "Completed" ? new Date() : undefined, riderComment: status === "On Hold" ? "TEST gate locked" : undefined });
  }
  await pushErpDeliveryStatus({ orderId: "12345", deliveryCode: code + "X", status: "Pending" }); // non-ERP order: must be a no-op
  console.log(`CODE=${code}`);
}

main().then(() => { console.log(`== ${fails === 0 ? "all passed" : fails + " failed"}`); process.exit(fails ? 1 : 0); });
