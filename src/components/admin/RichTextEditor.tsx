"use client";

import { useEffect, useRef, useState } from "react";
import { Bold, Italic, Underline, List, ListOrdered, Link2, Heading } from "lucide-react";

// Minimal rich-text editor: a contentEditable surface with a small toolbar,
// mirroring its HTML into a hidden input so it posts with the form. The HTML is
// sanitized server-side on save (see lib/sanitize).
export function RichTextEditor({
  name,
  defaultValue = "",
  placeholder = "Write here…",
}: {
  name: string;
  defaultValue?: string;
  placeholder?: string;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [html, setHtml] = useState(defaultValue);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== defaultValue) {
      editorRef.current.innerHTML = defaultValue;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function sync() {
    if (editorRef.current) setHtml(editorRef.current.innerHTML);
  }

  function exec(command: string, value?: string) {
    editorRef.current?.focus();
    // eslint-disable-next-line deprecation/deprecation
    document.execCommand(command, false, value);
    sync();
  }

  function addLink() {
    const url = window.prompt("Link URL (https://…)");
    if (url) exec("createLink", url);
  }

  return (
    <div className="rounded-lg border border-slate-300 focus-within:border-brand-400 focus-within:ring-1 focus-within:ring-brand-400">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-200 p-1.5">
        <TB onClick={() => exec("bold")} title="Bold"><Bold size={15} /></TB>
        <TB onClick={() => exec("italic")} title="Italic"><Italic size={15} /></TB>
        <TB onClick={() => exec("underline")} title="Underline"><Underline size={15} /></TB>
        <span className="mx-1 h-5 w-px bg-slate-200" />
        <TB onClick={() => exec("formatBlock", "<h3>")} title="Heading"><Heading size={15} /></TB>
        <TB onClick={() => exec("insertUnorderedList")} title="Bulleted list"><List size={15} /></TB>
        <TB onClick={() => exec("insertOrderedList")} title="Numbered list"><ListOrdered size={15} /></TB>
        <TB onClick={addLink} title="Link"><Link2 size={15} /></TB>
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={sync}
        data-placeholder={placeholder}
        className="tc-richtext min-h-32 max-h-96 overflow-y-auto px-3 py-2 text-sm text-ink focus:outline-none"
      />
      <input type="hidden" name={name} value={html} />
    </div>
  );
}

function TB({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={title}
      className="rounded p-1.5 text-ink-soft hover:bg-slate-100 hover:text-ink"
    >
      {children}
    </button>
  );
}
