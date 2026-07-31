"use client";

import type { ChatAttachment } from "@/(root)/context/chat-context";
import { FileSpreadsheet, FileText, File as FileIcon } from "lucide-react";
import { useTranslations } from "next-intl";

function documentIcon(mime?: string) {
  if (mime?.includes("spreadsheet") || mime?.includes("excel")) {
    return FileSpreadsheet;
  }
  if (mime === "application/pdf" || mime?.includes("word")) return FileText;
  return FileIcon;
}

function formatBytes(bytes?: number) {
  if (!bytes || bytes <= 0) return "";
  const units = ["B", "KB", "MB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}

export function DocumentBubble({
  href,
  attachment,
}: {
  href: string;
  attachment?: ChatAttachment;
}) {
  const t = useTranslations("Chat");
  const Icon = documentIcon(attachment?.mime);
  const name = attachment?.name || t("media.previewDocument", { name: "" }).trim();

  return (
    <a
      href={href}
      download={attachment?.name || true}
      className="group/doc flex min-w-[14rem] items-center gap-3 px-3.5 py-2.5"
    >
      <span className="bg-background/60 flex size-9 shrink-0 items-center justify-center rounded-lg">
        <Icon className="size-4.5" aria-hidden="true" />
      </span>
      {/* dir="auto": a document name can be Arabic or Latin script and must
          not be forced into the surrounding LTR/RTL direction. */}
      <span className="min-w-0 flex-1" dir="auto">
        <span className="block truncate text-sm font-semibold">{name}</span>
        {attachment?.bytes ? (
          <span className="block text-xs opacity-70">
            {formatBytes(attachment.bytes)}
          </span>
        ) : null}
      </span>
    </a>
  );
}
