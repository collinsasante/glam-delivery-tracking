import "server-only";
import {
  airtableList,
  airtableGet,
  airtableCreate,
  airtableUpdate,
  airtableDelete,
  escapeAirtableValue,
} from "@/lib/airtable";
import type { Rider } from "@/types/rider";

interface RiderFields {
  "Rider ID": string;
  Name: string;
  Email: string;
  Phone?: string;
  Role: string;
  "Vehicle Type"?: string;
  Active?: boolean;
  "Joined Date"?: string;
  "Photo URL"?: string;
}

function mapToRider(record: { id: string; fields: RiderFields }): Rider {
  const f = record.fields;
  return {
    id: record.id,
    riderId: f["Rider ID"] ?? "",
    name: f["Name"] ?? "",
    email: f["Email"] ?? "",
    phone: f["Phone"] ?? "",
    role: (f["Role"] as Rider["role"]) ?? "Rider",
    vehicleType: (f["Vehicle Type"] as Rider["vehicleType"]) ?? null,
    active: f["Active"] ?? true,
    joinedDate: f["Joined Date"] ?? "",
    photoUrl: f["Photo URL"] ?? null,
  };
}

export async function getRiders(): Promise<Rider[]> {
  const records = await airtableList<RiderFields>("Riders", { maxRecords: "200" });
  return records.map(mapToRider);
}

export async function getActiveRiders(): Promise<Rider[]> {
  const records = await airtableList<RiderFields>("Riders", {
    filterByFormula: `AND({Active} = TRUE(), {Role} = "Rider")`,
  });
  return records.map(mapToRider);
}

export async function getRiderById(id: string): Promise<Rider | null> {
  try {
    const record = await airtableGet<RiderFields>("Riders", id);
    return mapToRider(record);
  } catch {
    return null;
  }
}

export async function getRiderByEmail(email: string): Promise<Rider | null> {
  const records = await airtableList<RiderFields>("Riders", {
    filterByFormula: `LOWER({Email}) = LOWER("${escapeAirtableValue(email)}")`,
    maxRecords: "1",
  });
  if (!records.length) return null;
  return mapToRider(records[0]);
}

export async function getNextRiderId(): Promise<string> {
  const records = await airtableList<RiderFields>("Riders", { maxRecords: "200" });
  if (!records.length) return "R-001";
  let max = 0;
  for (const r of records) {
    const match = (r.fields["Rider ID"] ?? "").match(/R-(\d+)/);
    if (match) max = Math.max(max, parseInt(match[1], 10));
  }
  return `R-${String(max + 1).padStart(3, "0")}`;
}

export async function createRider(data: {
  name: string;
  email: string;
  phone?: string;
  role: string;
  vehicleType?: string;
  active?: boolean;
}): Promise<Rider> {
  const riderId = await getNextRiderId();
  const record = await airtableCreate<RiderFields>("Riders", {
    "Rider ID": riderId,
    Name: data.name,
    Email: data.email,
    Phone: data.phone ?? "",
    Role: data.role,
    "Vehicle Type": data.vehicleType ?? "",
    Active: data.active ?? true,
    "Joined Date": new Date().toISOString().split("T")[0],
  });
  return mapToRider(record);
}

export async function updateRider(
  id: string,
  data: Partial<{
    name: string;
    email: string;
    phone: string;
    role: string;
    vehicleType: string;
    active: boolean;
    photoUrl: string;
  }>
): Promise<Rider> {
  const fields: Record<string, unknown> = {};
  if (data.name !== undefined) fields["Name"] = data.name;
  if (data.email !== undefined) fields["Email"] = data.email;
  if (data.phone !== undefined) fields["Phone"] = data.phone;
  if (data.role !== undefined) fields["Role"] = data.role;
  if (data.vehicleType !== undefined) fields["Vehicle Type"] = data.vehicleType;
  if (data.active !== undefined) fields["Active"] = data.active;
  if (data.photoUrl !== undefined) fields["Photo URL"] = data.photoUrl;

  const record = await airtableUpdate<RiderFields>("Riders", id, fields);
  return mapToRider(record);
}

export async function deleteRider(id: string): Promise<void> {
  await airtableDelete("Riders", id);
}
