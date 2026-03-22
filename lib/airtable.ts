import "server-only";

const BASE_URL = "https://api.airtable.com/v0";

/**
 * Escapes a value for safe interpolation into an Airtable filterByFormula string.
 * Prevents formula injection via user-controlled input.
 */
export function escapeAirtableValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function getConfig() {
  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;
  if (!apiKey || !baseId) {
    throw new Error("Missing AIRTABLE_API_KEY or AIRTABLE_BASE_ID env vars");
  }
  return { apiKey, baseId };
}

type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

export interface AirtableRecord<T = Record<string, unknown>> {
  id: string;
  fields: T;
  createdTime: string;
}

interface AirtableListResponse<T> {
  records: AirtableRecord<T>[];
  offset?: string;
}

async function airtableFetch<T>(
  path: string,
  method: HttpMethod = "GET",
  body?: unknown
): Promise<T> {
  const { apiKey, baseId } = getConfig();
  const url = `${BASE_URL}/${baseId}/${path}`;

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(
      `Airtable ${method} ${path} failed [${res.status}]: ${error}`
    );
  }

  return res.json() as T;
}

interface AirtableListParams {
  filterByFormula?: string;
  maxRecords?: string;
  sort?: Array<{ field: string; direction: "asc" | "desc" }>;
  [key: string]: string | Array<{ field: string; direction: string }> | undefined;
}

export async function airtableList<T>(
  table: string,
  params?: AirtableListParams
): Promise<AirtableRecord<T>[]> {
  const allRecords: AirtableRecord<T>[] = [];
  let offset: string | undefined;

  do {
    const parts: string[] = [];

    if (params) {
      for (const [key, val] of Object.entries(params)) {
        if (val === undefined) continue;
        if (key === "sort" && Array.isArray(val)) {
          val.forEach((s, i) => {
            parts.push(`sort[${i}][field]=${encodeURIComponent(s.field)}`);
            parts.push(`sort[${i}][direction]=${encodeURIComponent(s.direction)}`);
          });
        } else {
          parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(val as string)}`);
        }
      }
    }

    if (offset) parts.push(`offset=${encodeURIComponent(offset)}`);

    const query = parts.length ? "?" + parts.join("&") : "";

    const data = await airtableFetch<AirtableListResponse<T>>(
      `${encodeURIComponent(table)}${query}`
    );

    allRecords.push(...data.records);
    offset = data.offset;
  } while (offset);

  return allRecords;
}

export async function airtableGet<T>(
  table: string,
  recordId: string
): Promise<AirtableRecord<T>> {
  return airtableFetch<AirtableRecord<T>>(
    `${encodeURIComponent(table)}/${recordId}`
  );
}

export async function airtableCreate<T>(
  table: string,
  fields: Record<string, unknown>
): Promise<AirtableRecord<T>> {
  return airtableFetch<AirtableRecord<T>>(
    `${encodeURIComponent(table)}`,
    "POST",
    { fields }
  );
}

export async function airtableUpdate<T>(
  table: string,
  recordId: string,
  fields: Record<string, unknown>
): Promise<AirtableRecord<T>> {
  return airtableFetch<AirtableRecord<T>>(
    `${encodeURIComponent(table)}/${recordId}`,
    "PATCH",
    { fields }
  );
}

export async function airtableDelete(
  table: string,
  recordId: string
): Promise<void> {
  await airtableFetch(`${encodeURIComponent(table)}/${recordId}`, "DELETE");
}
