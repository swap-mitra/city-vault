"use client";

import { useMemo, useState } from "react";
import {
  formatFileSize,
  MAX_UPLOAD_SIZE_BYTES,
  UPLOAD_ACCEPT_ATTRIBUTE,
  validateUploadFile,
} from "@/upload-validation";
import type { VaultNotice } from "@/vault-ui";

type RecordComposerProps = {
  onCreated?: () => void;
  onNotice?: (notice: VaultNotice) => void;
};

export function RecordComposer({ onCreated, onNotice }: RecordComposerProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);
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

    if (!title.trim()) {
      setTitle(nextFile.name);
    }
  };

  const handleCreate = async () => {
    if (!file || !title.trim()) {
      onNotice?.({
        type: "error",
        message: "Add a record title and choose one file before creating.",
      });
      return;
    }

    setCreating(true);

    const formData = new FormData();
    formData.append("title", title.trim());
    formData.append("description", description.trim());
    formData.append("file", file);

    try {
      const response = await fetch("/api/records", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json()) as { error?: string; title?: string };

      if (!response.ok) {
        throw new Error(data.error || "Failed to create record.");
      }

      onCreated?.();
      onNotice?.({
        type: "success",
        message: `${title.trim()} created with version 1.`,
      });
      setTitle("");
      setDescription("");
      setFile(null);
    } catch (error) {
      console.error(error);
      onNotice?.({
        type: "error",
        message:
          error instanceof Error ? error.message : "Failed to create record.",
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <section className="brutal-panel motion-rise overflow-hidden p-6 sm:p-8">
      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          <div className="space-y-4">
            <p className="section-kicker">
              <span className="h-2.5 w-2.5 bg-[var(--shadow)]" />
              Record intake
            </p>
            <div className="space-y-3">
              <h2 className="display-font text-5xl leading-none tracking-[0.08em] text-[var(--ink)] sm:text-6xl">
                Create the record.
              </h2>
              <p className="max-w-xl text-base leading-8 text-[var(--muted)] sm:text-lg">
                Capture a title, optional context, and the first file version in one pass.
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
                    d="M24 8v20m0 0-7-7m7 7 7-7M12 34h24"
                    strokeWidth={2.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              <div className="space-y-2">
                <h3 className="display-font text-4xl leading-none tracking-[0.08em] text-[var(--ink)]">
                  Drag the first version here.
                </h3>
                <p className="text-sm leading-7 text-[var(--muted)] sm:text-base">
                  Max size {formatFileSize(MAX_UPLOAD_SIZE_BYTES)}. The selected file becomes
                  version 1 of the record.
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
            id="record-file-input"
            type="file"
            accept={UPLOAD_ACCEPT_ATTRIBUTE}
            onChange={(event) => assignFile(event.target.files?.[0] || null)}
            className="hidden"
          />

          <div className="space-y-5 paper-copy">
            <div className="space-y-2">
              <label className="text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--muted)]">
                Record title
              </label>
              <input
                className="brutal-input"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Monthly compliance register"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--muted)]">
                Description
              </label>
              <textarea
                className="brutal-input min-h-28 resize-y"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Optional context for the record."
              />
            </div>

            <div>
              <p className="metric-label">Selected version file</p>
              <div className="mt-3 brutal-panel bg-[color-mix(in_oklch,var(--paper)_18%,var(--surface-1))] p-4 text-[var(--ink)]">
                {file ? (
                  <div className="space-y-3">
                    <div>
                      <p className="display-font break-all text-4xl leading-none tracking-[0.08em]">
                        {file.name}
                      </p>
                      <p className="mt-3 text-sm font-bold uppercase tracking-[0.08em] paper-muted">
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
                    <p className="text-sm leading-7 paper-muted">
                      Choose one file to open the record with version 1.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label
                htmlFor="record-file-input"
                className="brutal-button brutal-button--ghost cursor-pointer"
              >
                Browse files
              </label>
              <button onClick={handleCreate} disabled={creating} className="brutal-button">
                {creating ? "Creating" : "Create record"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
