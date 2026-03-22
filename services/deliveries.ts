import "server-only";
import {
  airtableList,
  airtableGet,
  airtableCreate,
  airtableUpdate,
  airtableDelete,
  escapeAirtableValue,
} from "@/lib/airtable";
import type { Delivery, DeliveryStatus } from "@/types/delivery";

interface DeliveryFields {
  "Delivery ID": string;
  "Order ID": string;
  "Customer Name": string;
  "Customer Phone"?: string;
  "Dropoff Location": string;
  "Dropoff Coordinates"?: string;
  "Assigned Rider"?: string[];
  Warehouse: string;
  Status: DeliveryStatus;
  Priority: string;
  "Created Date"?: string;
  "Delivery Date": string;
  "Pickup Time"?: string;
  "Delivery Time"?: string;
  Notes?: string;
  Distance?: number;
}

function parseCoords(
  str?: string
): { lat: number; lng: number } | null {
  if (!str) return null;
  const [lat, lng] = str.split(",").map(Number);
  if (isNaN(lat) || isNaN(lng)) return null;
  return { lat, lng };
}

function mapToDelivery(
  record: { id: string; fields: DeliveryFields; createdTime: string }
): Delivery {
  const f = record.fields;
  return {
    id: record.id,
    deliveryId: f["Delivery ID"] ?? "",
    orderId: f["Order ID"] ?? "",
    customerName: f["Customer Name"] ?? "",
    customerPhone: f["Customer Phone"] ?? null,
    dropoffLocation: f["Dropoff Location"] ?? "",
    dropoffCoordinates: parseCoords(f["Dropoff Coordinates"]),
    assignedRiderId: f["Assigned Rider"]?.[0] ?? null,
    assignedRiderName: null,
    warehouse: (f["Warehouse"] as Delivery["warehouse"]) ?? "Pantang West",
    status: f["Status"] ?? "Pending",
    priority: (f["Priority"] as Delivery["priority"]) ?? "Normal",
    createdAt: f["Created Date"] ?? record.createdTime,
    deliveryDate: f["Delivery Date"] ?? "",
    pickupTime: f["Pickup Time"] ?? null,
    deliveryTime: f["Delivery Time"] ?? null,
    notes: f["Notes"] ?? null,
    distance: f["Distance"] ?? null,
  };
}

export interface DeliveryFilters {
  status?: DeliveryStatus | "All";
  riderId?: string;
  date?: "today" | "week" | "month" | "all";
  search?: string;
}

export async function getDeliveries(
  filters: DeliveryFilters = {}
): Promise<Delivery[]> {
  const conditions: string[] = [];

  if (filters.status && filters.status !== "All") {
    conditions.push(`{Status} = "${escapeAirtableValue(filters.status)}"`);
  }

  if (filters.date === "today") {
    conditions.push(`IS_SAME({Delivery Date}, TODAY(), "day")`);
  } else if (filters.date === "week") {
    conditions.push(`IS_SAME({Delivery Date}, TODAY(), "week")`);
  } else if (filters.date === "month") {
    conditions.push(`IS_SAME({Delivery Date}, TODAY(), "month")`);
  }

  const filterByFormula =
    conditions.length > 1
      ? `AND(${conditions.join(", ")})`
      : conditions[0] ?? "";

  const params: { filterByFormula?: string } = {};
  if (filterByFormula) params.filterByFormula = filterByFormula;

  const records = await airtableList<DeliveryFields>("Deliveries", { ...params, maxRecords: "500" });

  // Sort by Airtable record creation time descending (newest first)
  records.sort(
    (a, b) => new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime()
  );

  let deliveries = records.map(mapToDelivery);

  if (filters.riderId) {
    deliveries = deliveries.filter((d) => d.assignedRiderId === filters.riderId);
  }

  if (filters.search) {
    const q = filters.search.toLowerCase();
    deliveries = deliveries.filter(
      (d) =>
        d.orderId.toLowerCase().includes(q) ||
        d.customerName.toLowerCase().includes(q) ||
        d.dropoffLocation.toLowerCase().includes(q)
    );
  }

  return deliveries;
}

export async function getDeliveryById(id: string): Promise<Delivery | null> {
  // id can be either the Airtable record ID or the "DEL-001-A" display ID
  const isRecordId = id.startsWith("rec");

  try {
    if (isRecordId) {
      const record = await airtableGet<DeliveryFields>("Deliveries", id);
      return mapToDelivery(record);
    }

    const records = await airtableList<DeliveryFields>("Deliveries", {
      filterByFormula: `{Delivery ID} = "${escapeAirtableValue(id)}"`,
      maxRecords: "1",
    });
    return records[0] ? mapToDelivery(records[0]) : null;
  } catch {
    return null;
  }
}

export async function getDeliveriesForRider(riderId: string): Promise<Delivery[]> {
  return getDeliveries({ riderId });
}

export async function getNextDeliveryNumber(): Promise<number> {
  const records = await airtableList<DeliveryFields>("Deliveries", { maxRecords: "500" });
  if (!records.length) return 1;
  let max = 0;
  for (const r of records) {
    const match = (r.fields["Delivery ID"] ?? "").match(/DEL-(\d+)/);
    if (match) max = Math.max(max, parseInt(match[1], 10));
  }
  return max + 1;
}

export async function createDeliveryRecord(fields: {
  deliveryId: string;
  orderId: string;
  customerName: string;
  customerPhone?: string;
  dropoffLocation: string;
  dropoffCoordinates?: string;
  assignedRiderId?: string;
  warehouse: string;
  priority: string;
  deliveryDate: string;
  notes?: string;
  distanceKm?: number;
}): Promise<Delivery> {
  const record = await airtableCreate<DeliveryFields>("Deliveries", {
    "Delivery ID": fields.deliveryId,
    "Order ID": fields.orderId,
    "Customer Name": fields.customerName,
    ...(fields.customerPhone && { "Customer Phone": fields.customerPhone }),
    "Dropoff Location": fields.dropoffLocation,
    ...(fields.dropoffCoordinates && {
      "Dropoff Coordinates": fields.dropoffCoordinates,
    }),
    ...(fields.assignedRiderId && {
      "Assigned Rider": [fields.assignedRiderId],
    }),
    Warehouse: fields.warehouse,
    Status: "Pending",
    Priority: fields.priority,
    "Delivery Date": fields.deliveryDate,
    ...(fields.notes && { Notes: fields.notes }),
    ...(fields.distanceKm !== undefined && { Distance: fields.distanceKm }),
  });
  return mapToDelivery(record);
}

export async function updateDeliveryStatus(
  id: string,
  status: DeliveryStatus,
  extra?: { pickupTime?: string; deliveryTime?: string }
): Promise<void> {
  const fields: Record<string, unknown> = { Status: status };
  if (extra?.pickupTime) fields["Pickup Time"] = extra.pickupTime;
  if (extra?.deliveryTime) fields["Delivery Time"] = extra.deliveryTime;
  await airtableUpdate("Deliveries", id, fields);
}

export async function updateDelivery(
  id: string,
  fields: Partial<{
    orderId: string;
    customerName: string;
    customerPhone: string;
    dropoffLocation: string;
    dropoffCoordinates: string;
    assignedRiderId: string;
    warehouse: string;
    priority: string;
    deliveryDate: string;
    notes: string;
    distance: number;
  }>
): Promise<void> {
  const airtableFields: Record<string, unknown> = {};
  if (fields.orderId !== undefined) airtableFields["Order ID"] = fields.orderId;
  if (fields.customerName !== undefined) airtableFields["Customer Name"] = fields.customerName;
  if (fields.customerPhone !== undefined) airtableFields["Customer Phone"] = fields.customerPhone;
  if (fields.dropoffLocation !== undefined) airtableFields["Dropoff Location"] = fields.dropoffLocation;
  if (fields.dropoffCoordinates !== undefined) airtableFields["Dropoff Coordinates"] = fields.dropoffCoordinates;
  if (fields.assignedRiderId !== undefined) airtableFields["Assigned Rider"] = [fields.assignedRiderId];
  if (fields.warehouse !== undefined) airtableFields["Warehouse"] = fields.warehouse;
  if (fields.priority !== undefined) airtableFields["Priority"] = fields.priority;
  if (fields.deliveryDate !== undefined) airtableFields["Delivery Date"] = fields.deliveryDate;
  if (fields.notes !== undefined) airtableFields["Notes"] = fields.notes;
  if (fields.distance !== undefined) airtableFields["Distance"] = fields.distance;
  await airtableUpdate("Deliveries", id, airtableFields);
}

export async function deleteDelivery(id: string): Promise<void> {
  await airtableDelete("Deliveries", id);
}
