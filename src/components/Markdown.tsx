import React, { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/utils/cn";

/** Inline formatting: **bold**, *italic*, `code`, [link](url). No HTML injection. */
function inline(text: string, keyPrefix: string): React.ReactNode[] {
  const tokens: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) tokens.push(text.slice(last, m.index));
    const t = m[0];
    const key = `${keyPrefix}-${i++}`;
    if (t.startsWith("**")) tokens.push(<strong key={key}>{t.slice(2, -2)}</strong>);
    else if (t.startsWith("`")) tokens.push(<code key={key}>{t.slice(1, -1)}</code>);
    else if (t.startsWith("[")) {
      const mm = t.match(/\[([^\]]+)\]\(([^)]+)\)/);
      tokens.push(
        <a key={key} href={mm?.[2]} target="_blank" rel="noreferrer noopener">
          {mm?.[1] ?? t}
        </a>,
      );
    } else tokens.push(<em key={key}>{t.slice(1, -1)}</em>);
    last = m.index + t.length;
  }
  if (last < text.length) tokens.push(text.slice(last));
  return tokens;
}

function CodeBlock({ code, lang }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    const done = () => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    };
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(code).then(done).catch(done);
    else done();
  };
  return (
    <div className="my-3 overflow-hidden rounded-2xl border border-[rgb(var(--txt)/0.1)] bg-[#0d1526] shadow-[0_14px_30px_-20px_rgba(9,20,40,0.8)]">
      <div className="flex items-center justify-between border-b border-white/10 px-3.5 py-2">
        <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-white/45">{lang || "code"}</span>
        <button onClick={copy} className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] text-white/60 hover:text-white">
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="thin-scroll overflow-x-auto px-4 py-3.5 text-[12.5px] leading-relaxed text-[#dbe8ff]">
        <code className="font-mono">{code}</code>
      </pre>
    </div>
  );
}

/** Compact markdown renderer used for Gemini replies and agent results. */
export default function Markdown({ text, className }: { text: string; className?: string }) {
  const blocks = text.split(/```/);
  const out: React.ReactNode[] = [];

  blocks.forEach((block, bi) => {
    if (bi % 2 === 1) {
      const nl = block.indexOf("\n");
      const lang = nl > -1 ? block.slice(0, nl).trim() : "";
      const code = nl > -1 ? block.slice(nl + 1) : block;
      out.push(<CodeBlock key={`code-${bi}`} code={code.replace(/\n$/, "")} lang={lang} />);
      return;
    }

    const lines = block.split("\n");
    let list: { type: "ul" | "ol"; items: string[] } | null = null;
    let table: string[][] | null = null;

    const flushList = () => {
      if (!list) return;
      const Tag = list.type;
      out.push(
        React.createElement(
          Tag === "ul" ? "ul" : "ol",
          { key: `list-${bi}-${out.length}` },
          list.items.map((it, ii) => <li key={ii}>{inline(it, `li-${bi}-${ii}`)}</li>),
        ),
      );
      list = null;
    };
    const flushTable = () => {
      if (!table) return;
      const [head, ...rows] = table;
      out.push(
        <div key={`tbl-${bi}-${out.length}`} className="thin-scroll my-2 overflow-x-auto">
          <table>
            <thead>
              <tr>{head.map((h, i) => <th key={i}>{inline(h, `th-${i}`)}</th>)}</tr>
            </thead>
            <tbody>
              {rows.filter((r) => !r.every((c) => /^-+$/.test(c.trim()))).map((r, ri) => (
                <tr key={ri}>{r.map((c, ci) => <td key={ci}>{inline(c, `td-${ri}-${ci}`)}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      table = null;
    };

    lines.forEach((raw, li) => {
      const line = raw.trimEnd();
      if (/^\|.*\|$/.test(line.trim())) {
        flushList();
        const cells = line.trim().slice(1, -1).split("|").map((c) => c.trim());
        table = table ?? [];
        table.push(cells);
        return;
      }
      flushTable();

      const ol = line.match(/^\s*(\d+)\.\s+(.*)$/);
      const ul = line.match(/^\s*[-*]\s+(.*)$/);
      if (ol) {
        if (!list || list.type !== "ol") {
          flushList();
          list = { type: "ol", items: [] };
        }
        list.items.push(ol[2]);
        return;
      }
      if (ul) {
        if (!list || list.type !== "ul") {
          flushList();
          list = { type: "ul", items: [] };
        }
        list.items.push(ul[1]);
        return;
      }
      flushList();
      if (!line.trim()) return;
      const h = line.match(/^(#{1,3})\s+(.*)$/);
      if (h) {
        const Tag = (h[1].length === 1 ? "h1" : h[1].length === 2 ? "h2" : "h3") as "h1" | "h2" | "h3";
        out.push(<Tag key={`h-${bi}-${li}`}>{inline(h[2], `h-${bi}-${li}`)}</Tag>);
        return;
      }
      if (/^(---|___|\*\*\*)$/.test(line.trim())) {
        out.push(<hr key={`hr-${bi}-${li}`} />);
        return;
      }
      if (/^>\s?/.test(line)) {
        out.push(<blockquote key={`bq-${bi}-${li}`}>{inline(line.replace(/^>\s?/, ""), `bq-${bi}-${li}`)}</blockquote>);
        return;
      }
      out.push(<p key={`p-${bi}-${li}`}>{inline(line, `p-${bi}-${li}`)}</p>);
    });
    flushList();
    flushTable();
  });

  return <div className={cn("md text-[14px] leading-relaxed text-sec", className)}>{out}</div>;
}
