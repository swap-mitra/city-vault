"use client";

import { useMemo, useState } from "react";
import {
  formatFileSize,
  MAX_UPLOAD_SIZE_BYTES,
  UPLOAD_ACCEPT_ATTRIBUTE,
  validateUploadFile,
} from "@/upload-validation";
import type { VaultNotice } from "@/vault-ui";

type UploadResult = {
  message?: string;
};

type FileUploadProps = {
  onUploaded?: () => void;
  onNotice?: (notice: VaultNotice) => void;
};

export function FileUpload({ onUploaded, onNotice }: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);

  const acceptedFormats = useMemo(
    () => ["PNG", "JPG", "WEBP", "GIF", "PDF", "TXT", "JSON", "CSV", "ZIP"],
    []
  );

  const assignFile = (nextFile: File | null) => {
    if (!nextFile) {
      setFile(null);
      return;
    }

    const validationError = validateUploadFile(nextFile);

    if (validationError) {
      onNotice?.({ type: "error", message: validationError });
      return;
    }

    setFile(nextFile);
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = (await res.json()) as UploadResult & { error?: string };

      if (!res.ok) {
        throw new Error(data.error || "Upload failed");
      }

      onUploaded?.();
      onNotice?.({
        type: "success",
        message: data.message || `${file.name} uploaded successfully.`,
      });
      setFile(null);
    } catch (error) {
      console.error(error);
      onNotice?.({
        type: "error",
        message:
          error instanceof Error ? error.message : "Upload failed unexpectedly.",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <section className="brutal-panel motion-rise overflow-hidden p-6 sm:p-8">
      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          <div className="space-y-4">
            <p className="section-kicker">
              <span className="h-2.5 w-2.5 bg-[var(--shadow)]" />
              Upload lane
            </p>
            <div className="space-y-3">
              <h2 className="display-font text-5xl leading-none tracking-[0.08em] text-[var(--ink)] sm:text-6xl">
                Drop it in.
              </h2>
              <p className="max-w-2xl text-base leading-8 text-[var(--muted)] sm:text-lg">
                The upload surface is blunt by design. Bring in a supported file, validate it fast,
                then push it into your vault without opening another screen.
              </p>
            </div>
          </div>

          <div
            className={`brutal-panel brutal-grid border-[3px] p-6 sm:p-8 ${
              isDragActive
                ? "border-[var(--accent)] bg-[color-mix(in_oklch,var(--accent)_18%,var(--surface-1))]"
                : "bg-[color-mix(in_oklch,var(--surface-0)_92%,black)]"
            }`}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragActive(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              setIsDragActive(false);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setIsDragActive(false);
              assignFile(event.dataTransfer.files?.[0] || null);
            }}
          >
            <div className="space-y-5">
              <div className="flex h-16 w-16 items-center justify-center border-[3px] border-[var(--line)] bg-[var(--accent)] text-[var(--shadow)] shadow-[6px_6px_0_var(--shadow)]">
                <svg className="h-7 w-7" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                  <path
                    d="M28 8H12a4 4 0 0 0-4 4v20m32-12v8m0 0v8a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4v-4m32-4-3.172-3.172a4 4 0 0 0-5.656 0L28 28M8 32l9.172-9.172a4 4 0 0 1 5.656 0L28 28m0 0 4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth={2.3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              <div className="space-y-2">
                <h3 className="display-font text-4xl leading-none tracking-[0.08em] text-[var(--ink)]">
                  Drag a file here or hit browse.
                </h3>
                <p className="text-sm leading-7 text-[var(--muted)] sm:text-base">
                  Max size {formatFileSize(MAX_UPLOAD_SIZE_BYTES)}. Duplicate uploads stay scoped to
                  your own vault entry instead of leaking across users.
                </p>
              </div>

              <div className="command-strip">
                {acceptedFormats.map((format) => (
                  <span key={format} className="brutal-chip">
                    {format}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="brutal-panel brutal-panel--paper p-5 sm:p-6">
          <input
            id="file-input"
            type="file"
            accept={UPLOAD_ACCEPT_ATTRIBUTE}
            onChange={(event) => assignFile(event.target.files?.[0] || null)}
            className="hidden"
          />

          <div className="space-y-5">
            <div>
              <p className="metric-label">Selected file</p>
              <div className="mt-3 brutal-panel border-[var(--shadow)] bg-[color-mix(in_oklch,var(--paper)_22%,var(--surface-1))] p-4 text-[var(--shadow)] shadow-[8px_8px_0_var(--shadow)]">
                {file ? (
                  <div className="space-y-3">
                    <div>
                      <p className="display-font break-all text-4xl leading-none tracking-[0.08em]">
                        {file.name}
                      </p>
                      <p className="mt-3 text-sm font-bold uppercase tracking-[0.08em] text-[var(--shadow)]/72">
                        {file.type || "Unknown type"} / {formatFileSize(file.size)}
                      </p>
                    </div>
                    <div className="h-3 border-[2px] border-[var(--shadow)] bg-[var(--paper)]/35">
                      <div
                        className="h-full bg-[var(--shadow)]"
                        style={{
                          width: `${Math.min(100, (file.size / MAX_UPLOAD_SIZE_BYTES) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="display-font text-4xl leading-none tracking-[0.08em]">
                      Waiting
                    </p>
                    <p className="text-sm leading-7 text-[var(--shadow)]/78">
                      No file is staged yet. Pick one local file and the vault will validate the same
                      rules the server enforces.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label htmlFor="file-input" className="brutal-button brutal-button--ghost cursor-pointer">
                Browse files
              </label>
              <button onClick={handleUpload} disabled={!file || uploading} className="brutal-button">
                {uploading ? "Uploading" : "Upload to IPFS"}
              </button>
            </div>

            <div className="brutal-callout">
              <p className="metric-label">Validation stack</p>
              <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                Size, type, ownership, and duplicate CID handling are all checked before metadata is
                committed. The UI stays loud, the rules stay strict.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
