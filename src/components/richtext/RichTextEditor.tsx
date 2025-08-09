import React, { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";


import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Link as LinkIcon,
  List as ListIcon,
  ListOrdered,
  Quote,
  Code2,
  Table as TableIcon,
  Undo2,
  Redo2,
  Heading2,
  Heading3,
  Type as ParagraphIcon,
  Eraser,
} from "lucide-react";

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false, autolink: true, protocols: ["http", "https", "mailto"] }),
      Placeholder.configure({ placeholder: placeholder || "Start typing..." }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class: cn(
          "min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none",
          "prose max-w-none dark:prose-invert",
          className
        ),
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value && value !== current) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
    if (!value && current !== "") {
      editor.commands.clearContent(false);
    }
  }, [value, editor]);

  if (!editor) return null;

  const setLink = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Enter URL", prev || "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const clearFormatting = () => {
    editor.chain().focus().unsetAllMarks().clearNodes().run();
  };

  return (
    <div className="w-full rounded-md border border-input bg-background">
      <div className="flex flex-wrap items-center gap-1 p-2">
        <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleBold().run()} aria-pressed={editor.isActive("bold")} className={cn(editor.isActive("bold") && "bg-accent text-accent-foreground")}> <Bold className="h-4 w-4" /> </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleItalic().run()} aria-pressed={editor.isActive("italic")} className={cn(editor.isActive("italic") && "bg-accent text-accent-foreground")}> <Italic className="h-4 w-4" /> </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleUnderline().run()} aria-pressed={editor.isActive("underline")} className={cn(editor.isActive("underline") && "bg-accent text-accent-foreground")}> <UnderlineIcon className="h-4 w-4" /> </Button>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().setParagraph().run()} aria-pressed={editor.isActive("paragraph")} className={cn(editor.isActive("paragraph") && "bg-accent text-accent-foreground")}> <ParagraphIcon className="h-4 w-4" /> </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} aria-pressed={editor.isActive("heading", { level: 2 })} className={cn(editor.isActive("heading", { level: 2 }) && "bg-accent text-accent-foreground")}> <Heading2 className="h-4 w-4" /> </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} aria-pressed={editor.isActive("heading", { level: 3 })} className={cn(editor.isActive("heading", { level: 3 }) && "bg-accent text-accent-foreground")}> <Heading3 className="h-4 w-4" /> </Button>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleBulletList().run()} aria-pressed={editor.isActive("bulletList")} className={cn(editor.isActive("bulletList") && "bg-accent text-accent-foreground")}> <ListIcon className="h-4 w-4" /> </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleOrderedList().run()} aria-pressed={editor.isActive("orderedList")} className={cn(editor.isActive("orderedList") && "bg-accent text-accent-foreground")}> <ListOrdered className="h-4 w-4" /> </Button>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleBlockquote().run()} aria-pressed={editor.isActive("blockquote")} className={cn(editor.isActive("blockquote") && "bg-accent text-accent-foreground")}> <Quote className="h-4 w-4" /> </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleCodeBlock().run()} aria-pressed={editor.isActive("codeBlock")} className={cn(editor.isActive("codeBlock") && "bg-accent text-accent-foreground")}> <Code2 className="h-4 w-4" /> </Button>
        <Button type="button" variant="ghost" size="sm" onClick={setLink} aria-pressed={editor.isActive("link")} className={cn(editor.isActive("link") && "bg-accent text-accent-foreground")}> <LinkIcon className="h-4 w-4" /> </Button>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <div className="flex items-center gap-1">
          <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().insertTable({ rows: 2, cols: 2, withHeaderRow: true }).run()}> <TableIcon className="h-4 w-4" /> </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().addRowAfter().run()}>+row</Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().addColumnAfter().run()}>+col</Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().deleteTable().run()}>del</Button>
        </div>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().undo().run()}> <Undo2 className="h-4 w-4" /> </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => editor.chain().focus().redo().run()}> <Redo2 className="h-4 w-4" /> </Button>

        <Separator orientation="vertical" className="mx-1 h-6" />

        <Button type="button" variant="ghost" size="sm" onClick={clearFormatting}> <Eraser className="h-4 w-4" /> </Button>
      </div>
      <Separator />
      <EditorContent editor={editor} />
    </div>
  );
}
