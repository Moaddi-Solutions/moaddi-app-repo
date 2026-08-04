"use client";

import { Button } from "@/../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/../components/ui/dropdown-menu";
import { FileText, Image as ImageIcon, MapPin, Paperclip } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef } from "react";

const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";
const DOCUMENT_ACCEPT =
  ".pdf,.doc,.docx,.xls,.xlsx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain";

export function AttachMenu({
  onPickImage,
  onPickDocument,
  onPickLocation,
}: {
  onPickImage: (file: File) => void;
  onPickDocument: (file: File) => void;
  onPickLocation: () => void;
}) {
  const t = useTranslations("Chat");
  const imageInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t("media.attach")}
            />
          }
        >
          <Paperclip aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="top">
          <DropdownMenuItem onClick={() => imageInputRef.current?.click()}>
            <ImageIcon aria-hidden="true" />
            {t("media.photo")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => documentInputRef.current?.click()}>
            <FileText aria-hidden="true" />
            {t("media.document")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onPickLocation}>
            <MapPin aria-hidden="true" />
            {t("media.location")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <input
        ref={imageInputRef}
        type="file"
        accept={IMAGE_ACCEPT}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onPickImage(file);
        }}
      />
      <input
        ref={documentInputRef}
        type="file"
        accept={DOCUMENT_ACCEPT}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onPickDocument(file);
        }}
      />
    </>
  );
}
