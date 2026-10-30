"use client";

import React, { useState } from "react";
import { Copy, Check, Terminal, ExternalLink } from "lucide-react";
import { cn, isSafeMarkdownUrl } from "@/lib/utils";

/**
 * Pure React Markdown & Code Renderer
 * 
 * Safely parses and renders Markdown without dangerouslySetInnerHTML.
 * Supports:
 * - Headings (H1 - H4)
 * - Paragraphs with bold, italic, code, links
 * - Ordered & unordered lists with nested formatting
 * - Code blocks with language tags, line numbering, and copy button
 * - Responsive tables with headers and subtle borders
 * - Blockquotes & horizontal rules
 * - Math / Formula notation highlighting ($...$ and $$...$$)
 */

function InlineContent({ text }) {
  if (!text) return null;

  // Split by inline markdown: **bold**, *italic*, `code`, [link](url), $math$
  // Tokenizer pattern
  const tokens = [];
  let remaining = text;
  let keyIdx = 0;

  while (remaining.length > 0) {
    // 1. Inline code: `code`
    const codeMatch = remaining.match(/^`([^`]+)`/);
    if (codeMatch) {
      tokens.push(
        <code
          key={`code-${keyIdx++}`}
          className="px-1.5 py-0.5 rounded-md bg-slate-800/90 text-teal-300 font-mono text-[0.85em] border border-slate-700/60 selection:bg-teal-500/30"
        >
          {codeMatch[1]}
        </code>
      );
      remaining = remaining.slice(codeMatch[0].length);
      continue;
    }

    // 2. Inline Math: $math$
    const mathMatch = remaining.match(/^\$([^$]+)\$/);
    if (mathMatch) {
      tokens.push(
        <span
          key={`math-${keyIdx++}`}
          className="px-1.5 py-0.5 rounded bg-violet-950/50 text-violet-300 font-mono text-[0.9em] border border-violet-800/40"
        >
          {mathMatch[1]}
        </span>
      );
      remaining = remaining.slice(mathMatch[0].length);
      continue;
    }

    // 3. Bold: **text** or __text__
    const boldMatch = remaining.match(/^(\*\*|__)(.*?)\1/);
    if (boldMatch) {
      tokens.push(
        <strong key={`b-${keyIdx++}`} className="font-bold text-white">
          <InlineContent text={boldMatch[2]} />
        </strong>
      );
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }

    // 4. Italic: *text* or _text_
    const italicMatch = remaining.match(/^(\*|_)(.*?)\1/);
    if (italicMatch && italicMatch[2]?.trim()) {
      tokens.push(
        <em key={`i-${keyIdx++}`} className="italic text-slate-200">
          <InlineContent text={italicMatch[2]} />
        </em>
      );
      remaining = remaining.slice(italicMatch[0].length);
      continue;
    }

    // 5. Link: [label](url)
    const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch) {
      const rawUrl = linkMatch[2];
      const isSafe = isSafeMarkdownUrl(rawUrl);

      if (isSafe) {
        const cleanedUrl = rawUrl.replace(/^[\x00-\x20\x7F]+|[\x00-\x20\x7F]+$/g, "");
        const isExternal = cleanedUrl.startsWith("http://") || cleanedUrl.startsWith("https://");
        tokens.push(
          <a
            key={`link-${keyIdx++}`}
            href={cleanedUrl}
            target={isExternal ? "_blank" : undefined}
            rel={isExternal ? "noopener noreferrer" : undefined}
            className="inline-flex items-center gap-1 text-brand-400 hover:text-brand-300 underline underline-offset-2 transition-colors font-medium"
          >
            <span>{linkMatch[1]}</span>
            {isExternal && <ExternalLink className="w-2.5 h-2.5 inline" />}
          </a>
        );
      } else {
        // Unsafe URLs (javascript:, vbscript:, data:, file:, blob:, protocol-relative //, etc.) must not be clickable
        tokens.push(
          <span key={`link-${keyIdx++}`} className="text-slate-300 font-medium">
            {linkMatch[1]}
          </span>
        );
      }
      remaining = remaining.slice(linkMatch[0].length);
      continue;
    }

    // Regular plain text up to next special char
    const nextSpecial = remaining.search(/[`$*_\[]/);
    if (nextSpecial === -1) {
      tokens.push(remaining);
      break;
    } else if (nextSpecial === 0) {
      // Unmatched marker, consume 1 char
      tokens.push(remaining[0]);
      remaining = remaining.slice(1);
    } else {
      tokens.push(remaining.slice(0, nextSpecial));
      remaining = remaining.slice(nextSpecial);
    }
  }

  return <>{tokens}</>;
}

function CodeBlock({ language, code }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 rounded-xl overflow-hidden border border-slate-800 bg-slate-950/90 shadow-md">
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-slate-900/90 border-b border-slate-800 text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5 font-mono text-slate-300">
          <Terminal className="w-3.5 h-3.5 text-teal-400" />
          <span>{language || "code"}</span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-white px-2 py-0.5 rounded hover:bg-slate-800/70 transition-colors"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-[11px] text-emerald-400 font-medium">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span className="text-[11px]">Copy</span>
            </>
          )}
        </button>
      </div>
      <div className="p-3.5 overflow-x-auto text-xs font-mono text-slate-200 leading-relaxed selection:bg-brand-500/30">
        <pre className="whitespace-pre">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
}

function MarkdownTable({ rows }) {
  if (!rows || rows.length === 0) return null;

  // First row is header
  const headerRow = rows[0]
    .split("|")
    .map((c) => c.trim())
    .filter((c, i, a) => !(i === 0 && c === "") && !(i === a.length - 1 && c === ""));

  // Subsequent rows, skipping separator row if it contains dashes
  const bodyRows = rows.slice(1).filter((r) => !r.match(/^\|?(\s*:?-+:?\s*\|?)+$/));

  return (
    <div className="my-3 overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60 shadow-sm">
      <table className="w-full text-left text-xs border-collapse">
        <thead className="bg-slate-900/90 border-b border-slate-800 text-slate-300">
          <tr>
            {headerRow.map((col, idx) => (
              <th key={idx} className="px-3.5 py-2.5 font-semibold text-slate-200">
                <InlineContent text={col} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60 text-slate-300">
          {bodyRows.map((row, rIdx) => {
            const cols = row
              .split("|")
              .map((c) => c.trim())
              .filter((c, i, a) => !(i === 0 && c === "") && !(i === a.length - 1 && c === ""));
            return (
              <tr key={rIdx} className="hover:bg-slate-900/40 transition-colors">
                {cols.map((col, cIdx) => (
                  <td key={cIdx} className="px-3.5 py-2 align-top">
                    <InlineContent text={col} />
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function MarkdownRenderer({ content, className = "" }) {
  if (!content) return null;

  // Split lines and parse blocks
  const lines = content.split("\n");
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // 1. Multi-line code block: ```lang
    if (line.trim().startsWith("```")) {
      const lang = line.trim().slice(3).trim();
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      blocks.push(
        <CodeBlock
          key={`code-block-${blocks.length}`}
          language={lang}
          code={codeLines.join("\n")}
        />
      );
      i++;
      continue;
    }

    // 2. Block Math: $$...$$
    if (line.trim().startsWith("$$")) {
      const mathLines = [];
      if (line.trim().endsWith("$$") && line.trim().length > 4) {
        mathLines.push(line.trim().slice(2, -2).trim());
      } else {
        i++;
        while (i < lines.length && !lines[i].trim().startsWith("$$")) {
          mathLines.push(lines[i]);
          i++;
        }
      }
      blocks.push(
        <div
          key={`math-block-${blocks.length}`}
          className="my-3 p-3 rounded-xl bg-violet-950/40 border border-violet-800/40 text-violet-200 text-center font-mono text-sm overflow-x-auto"
        >
          {mathLines.join("\n")}
        </div>
      );
      i++;
      continue;
    }

    // 3. Tables: lines starting with "|"
    if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
      const tableLines = [];
      while (i < lines.length && lines[i].trim().startsWith("|") && lines[i].trim().endsWith("|")) {
        tableLines.push(lines[i].trim());
        i++;
      }
      blocks.push(<MarkdownTable key={`table-${blocks.length}`} rows={tableLines} />);
      continue;
    }

    // 4. Headings
    if (line.startsWith("#### ")) {
      blocks.push(
        <h4 key={`h4-${blocks.length}`} className="text-xs font-bold text-white mt-4 mb-1.5 flex items-center gap-1.5 tracking-wide uppercase text-slate-300">
          <InlineContent text={line.slice(5)} />
        </h4>
      );
      i++;
      continue;
    }
    if (line.startsWith("### ")) {
      blocks.push(
        <h3 key={`h3-${blocks.length}`} className="text-sm font-bold text-white mt-4 mb-1.5 flex items-center gap-1.5 tracking-tight text-brand-300">
          <InlineContent text={line.slice(4)} />
        </h3>
      );
      i++;
      continue;
    }
    if (line.startsWith("## ")) {
      blocks.push(
        <h2 key={`h2-${blocks.length}`} className="text-base font-bold text-white mt-5 mb-2 pb-1 border-b border-slate-800/80 tracking-tight text-white">
          <InlineContent text={line.slice(3)} />
        </h2>
      );
      i++;
      continue;
    }
    if (line.startsWith("# ")) {
      blocks.push(
        <h1 key={`h1-${blocks.length}`} className="text-lg font-extrabold text-white mt-5 mb-2.5 tracking-tight text-white">
          <InlineContent text={line.slice(2)} />
        </h1>
      );
      i++;
      continue;
    }

    // 5. Horizontal rule
    if (line.trim() === "---" || line.trim() === "***" || line.trim() === "___") {
      blocks.push(
        <hr key={`hr-${blocks.length}`} className="my-4 border-slate-800" />
      );
      i++;
      continue;
    }

    // 6. Blockquote
    if (line.startsWith("> ")) {
      const quoteLines = [];
      while (i < lines.length && lines[i].startsWith("> ")) {
        quoteLines.push(lines[i].slice(2));
        i++;
      }
      blocks.push(
        <blockquote
          key={`quote-${blocks.length}`}
          className="my-3 border-l-2 border-brand-500/70 bg-brand-950/20 pl-3.5 py-1.5 text-xs text-slate-300 italic rounded-r-lg"
        >
          {quoteLines.map((ql, qIdx) => (
            <p key={qIdx} className={qIdx > 0 ? "mt-1" : ""}>
              <InlineContent text={ql} />
            </p>
          ))}
        </blockquote>
      );
      continue;
    }

    // 7. Unordered list (- or *)
    if (line.match(/^(\s*)([-*])\s+(.*)/)) {
      const listItems = [];
      while (i < lines.length && lines[i].match(/^(\s*)([-*])\s+(.*)/)) {
        const match = lines[i].match(/^(\s*)([-*])\s+(.*)/);
        listItems.push(match[3]);
        i++;
      }
      blocks.push(
        <ul key={`ul-${blocks.length}`} className="my-2 space-y-1 pl-4 list-disc marker:text-brand-400 text-xs text-slate-300 leading-relaxed">
          {listItems.map((item, idx) => (
            <li key={idx}>
              <InlineContent text={item} />
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // 8. Ordered list (1. 2. etc.)
    if (line.match(/^(\s*)(\d+)\.\s+(.*)/)) {
      const listItems = [];
      while (i < lines.length && lines[i].match(/^(\s*)(\d+)\.\s+(.*)/)) {
        const match = lines[i].match(/^(\s*)(\d+)\.\s+(.*)/);
        listItems.push(match[3]);
        i++;
      }
      blocks.push(
        <ol key={`ol-${blocks.length}`} className="my-2 space-y-1 pl-4 list-decimal marker:text-teal-400 marker:font-semibold text-xs text-slate-300 leading-relaxed">
          {listItems.map((item, idx) => (
            <li key={idx}>
              <InlineContent text={item} />
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // 9. Blank line
    if (!line.trim()) {
      i++;
      continue;
    }

    // 10. Regular Paragraph
    const paraLines = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].trim().startsWith("```") &&
      !lines[i].trim().startsWith("#") &&
      !lines[i].trim().startsWith(">") &&
      !lines[i].trim().startsWith("|") &&
      !lines[i].trim().startsWith("---") &&
      !lines[i].match(/^(\s*)([-*]|\d+\.)\s+/)
    ) {
      paraLines.push(lines[i]);
      i++;
    }

    blocks.push(
      <p key={`p-${blocks.length}`} className="text-xs sm:text-sm text-slate-200 leading-relaxed mb-2 last:mb-0">
        <InlineContent text={paraLines.join(" ")} />
      </p>
    );
  }

  return <div className={cn("space-y-1 selection:bg-brand-500/30", className)}>{blocks}</div>;
}

