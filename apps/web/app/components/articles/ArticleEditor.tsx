"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect } from "react";
import { EditorToolbar } from "./EditorToolbar";
import { C, FONT_BODY } from "@/app/lib/design-system";

// Only allow http(s) links/images — blocks `javascript:`/data: URIs in pasted or
// typed content, since this is rendered back out without dangerouslySetInnerHTML
// but still shouldn't accept arbitrary URI schemes.
const extensions = [
  StarterKit.configure({
    heading: { levels: [2, 3] },
  }),
  Link.configure({
    openOnClick: false,
    autolink: true,
    protocols: ["https"],
    HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" },
  }),
  Image.configure({
    HTMLAttributes: { class: "rounded-sm max-w-full" },
  }),
];

const EMPTY_DOC = JSON.stringify({ type: "doc", content: [{ type: "paragraph" }] });

type ArticleEditorProps = {
  content: string;
  onChange?: (json: string) => void;
  editable?: boolean;
  placeholder?: string;
  className?: string;
};

export function ArticleEditor({
  content,
  onChange,
  editable = true,
  placeholder = "Write your article…",
  className,
}: ArticleEditorProps) {
  const editor = useEditor({
    extensions: editable
      ? [...extensions, Placeholder.configure({ placeholder })]
      : extensions,
    content: parseContent(content),
    editable,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange?.(JSON.stringify(editor.getJSON()));
    },
    editorProps: {
      attributes: {
        class: "outline-none min-h-[240px] max-w-none",
      },
    },
  });

  // Keep the editor in sync if `content` changes from outside (e.g. loading a draft).
  useEffect(() => {
    if (!editor) return;
    const current = JSON.stringify(editor.getJSON());
    const next = parseContent(content);
    if (current !== JSON.stringify(next)) {
      editor.commands.setContent(next, { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, content]);

  return (
    <div
      className={className}
      style={{
        border: editable ? `1px solid ${C.border}` : "none",
        borderRadius: 2,
        backgroundColor: editable ? C.bg : "transparent",
      }}
    >
      {editable ? <EditorToolbar editor={editor} /> : null}
      <div
        className="px-4 py-4 tiptap-content"
        style={{ color: C.text, fontFamily: FONT_BODY, fontSize: 16, lineHeight: 1.7 }}
      >
        <EditorContent editor={editor} />
      </div>
      <style>{`
        .tiptap-content .ProseMirror h2 { font-size: 1.4em; font-weight: 500; margin: 1em 0 0.4em; color: ${C.text}; }
        .tiptap-content .ProseMirror h3 { font-size: 1.15em; font-weight: 500; margin: 1em 0 0.4em; color: ${C.text}; }
        .tiptap-content .ProseMirror p { margin: 0.6em 0; }
        .tiptap-content .ProseMirror ul, .tiptap-content .ProseMirror ol { padding-left: 1.4em; margin: 0.6em 0; }
        .tiptap-content .ProseMirror blockquote { border-left: 2px solid ${C.gold}; padding-left: 1em; color: ${C.textMuted}; margin: 0.8em 0; }
        .tiptap-content .ProseMirror code { background: ${C.bgAlt}; padding: 0.1em 0.4em; border-radius: 2px; font-size: 0.9em; }
        .tiptap-content .ProseMirror pre { background: ${C.bgAlt}; padding: 0.8em; border-radius: 2px; overflow-x: auto; }
        .tiptap-content .ProseMirror a { color: ${C.gold}; text-decoration: underline; }
        .tiptap-content .ProseMirror img { border-radius: 2px; margin: 0.6em 0; }
        .tiptap-content .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: ${C.textDim};
          pointer-events: none;
          height: 0;
        }
      `}</style>
    </div>
  );
}

function parseContent(raw: string) {
  if (!raw || !raw.trim()) {
    return JSON.parse(EMPTY_DOC);
  }

  try {
    return JSON.parse(raw);
  } catch {
    return JSON.parse(EMPTY_DOC);
  }
}
