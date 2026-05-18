"use client";

import { useEffect, useState } from "react";

export const VENDOR_DATALIST_ID = "vendor-suggestions";

interface VendorRow {
  name: string;
  last_used: string;
  usage_count: number;
}

interface VendorsResponse {
  vendors?: VendorRow[];
}

/**
 * Renders the shared <datalist> for vendor name autocomplete. Fetches the
 * top 50 most-recently-used vendors once on mount; failures fall back to
 * an empty list so the form still works as a plain text input.
 *
 * Bind via <input list={VENDOR_DATALIST_ID}> wherever you need it.
 */
export default function VendorDatalist() {
  const [vendors, setVendors] = useState<VendorRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/expenses/vendors", {
      method: "GET",
      headers: { Accept: "application/json" },
    })
      .then(async (res) => {
        if (!res.ok) return null;
        return (await res.json()) as VendorsResponse;
      })
      .then((data) => {
        if (cancelled || !data?.vendors) return;
        setVendors(data.vendors);
      })
      .catch(() => {
        // Silent — the input still works without suggestions.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <datalist id={VENDOR_DATALIST_ID}>
      {vendors.map((v) => (
        <option key={v.name} value={v.name} />
      ))}
    </datalist>
  );
}
