import { Download } from "lucide-react";

interface Props {
  href: string;
  label?: string;
}

/**
 * Server-rendered <a download>. No JS, no blob construction — the
 * server returns the file with Content-Disposition: attachment and
 * the browser handles the download natively.
 */
export default function CsvDownloadButton({
  href,
  label = "Export CSV",
}: Props) {
  return (
    <a
      href={href}
      download
      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white border border-[#E5E7EB] text-[12px] font-semibold text-[#0A0A0B] hover:bg-[#F8F9FA] transition-colors"
    >
      <Download className="w-3.5 h-3.5" />
      {label}
    </a>
  );
}
