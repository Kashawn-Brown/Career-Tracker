"use client";

import { useState } from "react";
import { Button }   from "@/components/ui/button";
import { generateCoverLetterDocx, downloadDocx } from "@/lib/cover-letter-docx";
import type { CoverLetterPayload } from "@/types/api";

interface Props {
  payload: CoverLetterPayload;
}

export function CoverLetterResult({ payload }: Props) {
  const [copied,      setCopied]      = useState(false);
  const [downloading, setDownloading] = useState(false);

  function handleCopy() {
    void navigator.clipboard.writeText(payload.draft).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function handleDownload() {
    setDownloading(true);
    try {
      const blob = await generateCoverLetterDocx(payload);
      downloadDocx(blob, "cover-letter.docx");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="space-y-5 text-sm">
      {/* Summary */}
      <p className="text-muted-foreground leading-relaxed">{payload.summary}</p>

      {/* Draft */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h4 className="font-medium text-foreground">Draft</h4>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleDownload} disabled={downloading}>
              {downloading ? "Generating…" : "Download .docx"}
            </Button>
            <Button variant="outline" size="sm" onClick={handleCopy}>
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>
        </div>
        <div className="rounded-md border bg-muted/40 p-4">
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">
            {payload.draft}
          </pre>
        </div>
      </div>

      {/* Placeholders */}
      {payload.placeholders.length > 0 && (
        <div>
          <h4 className="mb-2 font-medium text-foreground">Placeholders to fill in</h4>
          <div className="flex flex-wrap gap-1.5">
            {payload.placeholders.map((p) => (
              <span
                key={p}
                className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-300"
              >
                {p}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Evidence used */}
      {payload.evidence.length > 0 && (
        <ListSection title="Evidence used" items={payload.evidence} />
      )}

      {/* Notes */}
      {payload.notes.length > 0 && (
        <ListSection title="Customization notes" items={payload.notes} />
      )}
    </div>
  );
}

function ListSection({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h4 className="mb-2 font-medium text-foreground">{title}</h4>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 text-muted-foreground">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
            <span className="leading-relaxed">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}