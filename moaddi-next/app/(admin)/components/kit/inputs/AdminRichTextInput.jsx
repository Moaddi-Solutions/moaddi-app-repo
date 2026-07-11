"use client";

// Minimal tiptap-based rich text input, replacing ra-input-rich-text's
// MUI-styled editor. Persists the same HTML string contract.

import { Button } from "@/../components/ui/button";
import { cn } from "@/../lib/utils";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { Bold, Heading2, Italic, Link2, List, ListOrdered, Redo, Strikethrough, Undo } from "lucide-react";
import { useInput } from "ra-core";
import { humanize } from "../AdminUI";
import { Label } from "@/../components/ui/label";

const ToolbarButton = ({ active, onClick, children, label }) => (
  <Button
    type="button"
    variant="ghost"
    size="icon"
    aria-label={label}
    aria-pressed={active}
    onClick={onClick}
    className={cn("size-8 rounded-lg", active && "bg-accent text-accent-foreground")}
  >
    {children}
  </Button>
);

export const RichTextInput = ({ source, label, helperText, className }) => {
  const { id, field, fieldState, isRequired } = useInput({ source });
  const error = fieldState.error?.message;

  const editor = useEditor({
    extensions: [StarterKit, Link.configure({ openOnClick: false })],
    content: field.value || "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none min-h-40 rounded-b-xl px-3 py-2.5 text-sm font-medium text-foreground focus:outline-none dark:prose-invert",
      },
    },
    onUpdate: ({ editor: instance }) => {
      field.onChange(instance.getHTML());
    },
    onBlur: () => field.onBlur(),
  });

  return (
    <div className={cn("flex flex-col gap-1.5 sm:col-span-2", className)}>
      {label !== false ? (
        <Label htmlFor={id} className="text-xs font-extrabold uppercase tracking-[0.06em] text-muted-foreground">
          {label ?? humanize(source)}
          {isRequired ? <span className="ms-0.5 text-destructive">*</span> : null}
        </Label>
      ) : null}
      <div className={cn("overflow-hidden rounded-xl border border-border bg-background", error && "border-destructive")}>
        {editor ? (
          <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/40 p-1">
            <ToolbarButton label="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
              <Bold className="size-4" />
            </ToolbarButton>
            <ToolbarButton label="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
              <Italic className="size-4" />
            </ToolbarButton>
            <ToolbarButton label="Strikethrough" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}>
              <Strikethrough className="size-4" />
            </ToolbarButton>
            <ToolbarButton label="Heading" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
              <Heading2 className="size-4" />
            </ToolbarButton>
            <ToolbarButton label="Bullet list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
              <List className="size-4" />
            </ToolbarButton>
            <ToolbarButton label="Numbered list" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
              <ListOrdered className="size-4" />
            </ToolbarButton>
            <ToolbarButton
              label="Link"
              active={editor.isActive("link")}
              onClick={() => {
                const url = window.prompt("URL");
                if (url) editor.chain().focus().setLink({ href: url }).run();
              }}
            >
              <Link2 className="size-4" />
            </ToolbarButton>
            <span className="mx-1 h-5 w-px bg-border" />
            <ToolbarButton label="Undo" onClick={() => editor.chain().focus().undo().run()}>
              <Undo className="size-4" />
            </ToolbarButton>
            <ToolbarButton label="Redo" onClick={() => editor.chain().focus().redo().run()}>
              <Redo className="size-4" />
            </ToolbarButton>
          </div>
        ) : null}
        <EditorContent editor={editor} id={id} />
      </div>
      {error ? (
        <p className="text-xs font-semibold text-destructive">{error}</p>
      ) : helperText ? (
        <p className="text-xs font-medium text-muted-foreground">{helperText}</p>
      ) : null}
    </div>
  );
};

export default RichTextInput;
