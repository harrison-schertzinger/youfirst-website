/**
 * Thin REST client for the Roster Command Sheet spreadsheet.
 * No googleapis SDK — plain fetch against the Sheets v4 API with a
 * service-account token from @/lib/google-auth.
 *
 * Required env:
 *   GOOGLE_SERVICE_ACCOUNT_JSON — service-account key (shared with legacy sync)
 *   ROSTER_COMMAND_SHEET_ID     — the command spreadsheet's id
 *
 * Every method throws on HTTP failure; the engine catches and fails soft.
 */

import { getAccessToken, getServiceAccount } from "@/lib/google-auth";

const BASE = "https://sheets.googleapis.com/v4/spreadsheets";

export interface SheetTabInfo {
  sheetId: number;
  title: string;
  rowCount: number;
  columnCount: number;
  conditionalFormatCount: number;
}

export class SheetsClient {
  private constructor(
    private readonly token: string,
    readonly spreadsheetId: string,
  ) {}

  /** Null when creds/sheet id are not configured — callers fail soft. */
  static async connect(): Promise<SheetsClient | null> {
    const spreadsheetId = process.env.ROSTER_COMMAND_SHEET_ID;
    const sa = getServiceAccount();
    if (!spreadsheetId || !sa) return null;
    const token = await getAccessToken(sa);
    if (!token) return null;
    return new SheetsClient(token, spreadsheetId);
  }

  private async call<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${BASE}/${this.spreadsheetId}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Sheets API ${res.status} on ${path.split("?")[0]}: ${text.slice(0, 300)}`);
    }
    return (await res.json()) as T;
  }

  /** Tab inventory — titles, ids, sizes, and how many conditional rules each carries. */
  async getTabs(): Promise<SheetTabInfo[]> {
    const data = await this.call<{
      sheets?: Array<{
        properties?: {
          sheetId?: number;
          title?: string;
          gridProperties?: { rowCount?: number; columnCount?: number };
        };
        conditionalFormats?: unknown[];
      }>;
    }>("?fields=sheets(properties(sheetId,title,gridProperties),conditionalFormats)");
    return (data.sheets ?? []).map((s) => ({
      sheetId: s.properties?.sheetId ?? 0,
      title: s.properties?.title ?? "",
      rowCount: s.properties?.gridProperties?.rowCount ?? 0,
      columnCount: s.properties?.gridProperties?.columnCount ?? 0,
      conditionalFormatCount: s.conditionalFormats?.length ?? 0,
    }));
  }

  /** Read several ranges in one call. Missing tabs/ranges come back empty. */
  async batchGetValues(ranges: string[]): Promise<Record<string, string[][]>> {
    if (ranges.length === 0) return {};
    const qs = ranges.map((r) => `ranges=${encodeURIComponent(r)}`).join("&");
    const data = await this.call<{
      valueRanges?: Array<{ range?: string; values?: string[][] }>;
    }>(`/values:batchGet?${qs}&valueRenderOption=UNFORMATTED_VALUE`);
    const out: Record<string, string[][]> = {};
    (data.valueRanges ?? []).forEach((vr, i) => {
      out[ranges[i]] = (vr.values ?? []).map((row) => row.map((c) => String(c ?? "")));
    });
    return out;
  }

  /** Write many ranges in ONE API call (the no-per-cell-writes rule). */
  async batchUpdateValues(
    data: Array<{ range: string; values: (string | number)[][] }>,
  ): Promise<void> {
    if (data.length === 0) return;
    await this.call("/values:batchUpdate", {
      method: "POST",
      body: JSON.stringify({ valueInputOption: "RAW", data }),
    });
  }

  /** Clear ranges (used to trim stale rows below the rendered grid). */
  async batchClearValues(ranges: string[]): Promise<void> {
    if (ranges.length === 0) return;
    await this.call("/values:batchClear", {
      method: "POST",
      body: JSON.stringify({ ranges }),
    });
  }

  /** Structural + formatting requests (addSheet, repeatCell, validation, …). */
  async batchUpdateSpreadsheet(requests: object[]): Promise<void> {
    if (requests.length === 0) return;
    await this.call(":batchUpdate", {
      method: "POST",
      body: JSON.stringify({ requests }),
    });
  }
}
