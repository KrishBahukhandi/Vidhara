"use client";

import { useState } from "react";

import { track } from "@/lib/analytics";

/**
 * Share a section into the group chats where this audience lives. The link
 * carries ?via=share so inbound reads attribute to sharing (analytics-plan
 * `via` discipline). Share text leads with the mapping — that's the wedge.
 */
export function SectionShare({
  act,
  number,
  note,
  counterpart,
  url,
  bodyText,
}: {
  act: string;
  number: string;
  note: string;
  /** e.g. "BNS §318" — empty string when the section has no counterpart. */
  counterpart: string;
  url: string;
  /** Plain statute text for "Copy text" — students paste sections into notes daily. */
  bodyText: string;
}) {
  const [copied, setCopied] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  const shareUrl = `${url}?via=share`;
  const text =
    `${act} §${number} — ${note}` +
    (counterpart ? ` (now ${counterpart})` : "") +
    ` · full text: ${shareUrl}`;

  const fire = (channel: "whatsapp" | "telegram" | "copy" | "copy_text") =>
    track("share_clicked", { act, number, channel });

  const copy = async () => {
    fire("copy");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable (http / permissions) — nothing to do
    }
  };

  const copyText = async () => {
    fire("copy_text");
    try {
      await navigator.clipboard.writeText(
        `${act} §${number} — ${note}\n\n${bodyText}\n\n(${shareUrl})`,
      );
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    } catch {
      // clipboard unavailable — nothing to do
    }
  };

  const linkClass =
    "inline-flex h-9 items-center rounded-md border border-border px-3 text-small font-medium text-text-muted transition-colors hover:border-brand hover:text-text";

  return (
    <div className="mt-6 flex flex-wrap items-center gap-2">
      <span className="text-small text-text-faint">Share:</span>
      <a
        className={linkClass}
        href={`https://wa.me/?text=${encodeURIComponent(text)}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => fire("whatsapp")}>
        WhatsApp
      </a>
      <a
        className={linkClass}
        href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(
          `${act} §${number} — ${note}${counterpart ? ` (now ${counterpart})` : ""}`,
        )}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => fire("telegram")}>
        Telegram
      </a>
      <button type="button" className={linkClass} onClick={copy}>
        {copied ? "Copied ✓" : "Copy link"}
      </button>
      <button type="button" className={linkClass} onClick={copyText}>
        {copiedText ? "Copied ✓" : "Copy text"}
      </button>
    </div>
  );
}
