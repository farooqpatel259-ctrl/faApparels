"use client";

import { useRef, useState } from "react";

interface CsvActionsProps {
  onExport: () => void;
  onImport?: (file: File) => Promise<void> | void;
  exportLabel?: string;
  importLabel?: string;
  disabled?: boolean;
  templateHint?: string;
}

export function CsvActions({
  onExport,
  onImport,
  exportLabel = "Export CSV",
  importLabel = "Import CSV",
  disabled,
  templateHint,
}: CsvActionsProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file || !onImport) return;
    setBusy(true);
    setMessage(null);
    try {
      await onImport(file);
      setMessage(`Imported ${file.name}`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Import failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="csv-actions">
      <div className="csv-actions__buttons">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onExport}
          disabled={disabled || busy}
        >
          {exportLabel}
        </button>
        {onImport && (
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => inputRef.current?.click()}
              disabled={disabled || busy}
            >
              {busy ? "Importing…" : importLabel}
            </button>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              hidden
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </>
        )}
      </div>
      {templateHint && <p className="csv-actions__hint">{templateHint}</p>}
      {message && <p className="csv-actions__msg">{message}</p>}
    </div>
  );
}
