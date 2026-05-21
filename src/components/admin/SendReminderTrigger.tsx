"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import SendReminderModal, {
  type ReminderGuardian,
} from "@/components/admin/SendReminderModal";

interface Props {
  playerId: string;
  playerName: string;
  parentFirstName: string | null;
  parentLastName: string | null;
  guardians: ReminderGuardian[];
  outstandingCents: number;
  season: string | null;
}

export default function SendReminderTrigger(props: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#4A90D9] text-[#4A90D9] text-[13px] font-semibold hover:bg-[#4A90D9]/[0.08] transition-colors"
      >
        <Mail className="w-4 h-4" />
        Send Payment Reminder
      </button>
      <SendReminderModal
        open={open}
        onClose={() => setOpen(false)}
        {...props}
      />
    </>
  );
}
