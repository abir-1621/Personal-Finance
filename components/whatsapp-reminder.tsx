"use client";

import { useMemo, useState } from "react";
import { Check, Clipboard, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type ReminderMember = {
  name: string;
  amount: string;
};

type WhatsAppReminderProps = {
  members: ReminderMember[];
  monthLabel: string;
};

export function WhatsAppReminder({ members, monthLabel }: WhatsAppReminderProps) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const message = useMemo(() => buildReminderMessage(members, monthLabel), [members, monthLabel]);
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;

  if (!members.length) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" className="btn-secondary min-h-9 px-3 py-1.5" onClick={copyMessage}>
        {copyState === "copied" ? <Check className="h-4 w-4 text-teal-700" aria-hidden="true" /> : <Clipboard className="h-4 w-4" aria-hidden="true" />}
        {copyState === "copied" ? "Copied" : "Copy message"}
      </button>
      <a className="btn-primary min-h-9 px-3 py-1.5" href={whatsappUrl} target="_blank" rel="noreferrer">
        <MessageCircle className="h-4 w-4" aria-hidden="true" />
        Open WhatsApp
      </a>
      <p className={cn("basis-full text-xs text-slate-500", copyState === "copied" && "text-teal-700", copyState === "failed" && "text-red-600")}>
        {copyState === "failed"
          ? "Copy was blocked by the browser. Open WhatsApp and copy the list from the table."
          : "WhatsApp opens with the message ready; choose the group and send it there."}
      </p>
    </div>
  );

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(message);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }

    window.setTimeout(() => setCopyState("idle"), 2200);
  }
}

function buildReminderMessage(members: ReminderMember[], monthLabel: string) {
  const lines = members.map((member, index) => `${index + 1}. ${member.name} - ${member.amount}`);

  return [
    `Friends & Fund reminder for ${monthLabel}`,
    "",
    "The following members have not submitted this month's deposit yet:",
    ...lines,
    "",
    "Please submit your deposit when you can. Thank you."
  ].join("\n");
}
