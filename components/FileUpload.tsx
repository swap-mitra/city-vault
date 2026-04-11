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
    <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/70 p-6 shadow-[0_24px_80px_rgba(2,6,23,0.55)] backdrop-blur-xl sm:p-8">
      <div className="grid gap-8 lg:grid-cols-[1fr_0.74fr]">
        <div className="space-y-6">
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-200/80">
              Upload
            </p>
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold tracking-[-0.03em] text-white sm:text-3xl">
                Add a file without leaving the workspace.
              </h2>
              <p className="max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                Drag a file into the drop zone or browse locally. Accepted
                formats stay narrow by design, and the server enforces the same
                rules.
              </p>
            </div>
          </div>

          <div
            className={`relative overflow-hidden rounded-[1.75rem] border p-6 sm:p-8 ${
              isDragActive
                ? "border-blue-400/60 bg-blue-500/10 shadow-[0_0_0_1px_rgba(96,165,250,0.3)]"
                : "border-white/10 bg-white/[0.03]"
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
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/40 to-transparent" />
            <div className="space-y-5">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-500/10 text-blue-300">
                <svg
                  className="h-6 w-6"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                  aria-hidden="true"
                >
                  <path
                    d="M28 8H12a4 4 0 0 0-4 4v20m32-12v8m0 0v8a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4v-4m32-4-3.172-3.172a4 4 0 0 0-5.656 0L28 28M8 32l9.172-9.172a4 4 0 0 1 5.656 0L28 28m0 0 4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-medium text-white">
                  Drop a file here or browse from disk
                </h3>
                <p className="text-sm text-slate-400">
                  Max size {formatFileSize(MAX_UPLOAD_SIZE_BYTES)}. Duplicate
                  uploads stay scoped to your own vault entry.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {acceptedFormats.map((format) => (
                  <span
                    key={format}
                    className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-medium text-slate-300"
                  >
                    {format}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-5 rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-5 sm:p-6">
          <input
            id="file-input"
            type="file"
            accept={UPLOAD_ACCEPT_ATTRIBUTE}
            onChange={(event) => assignFile(event.target.files?.[0] || null)}
            className="hidden"
          />

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Selected file
            </p>
            <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-4">
              {file ? (
                <div className="space-y-3">
                  <div>
                    <p className="truncate text-sm font-medium text-white">
                      {file.name}
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      {file.type || "Unknown type"} · {formatFileSize(file.size)}
                    </p>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full bg-blue-400"
                      style={{
                        width: `${Math.min(
                          100,
                          (file.size / MAX_UPLOAD_SIZE_BYTES) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ) : (
                <p className="text-sm leading-6 text-slate-400">
                  No file selected yet. Choose a local file to prepare the IPFS
                  upload.
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label
              htmlFor="file-input"
              className="inline-flex cursor-pointer items-center justify-center rounded-full border border-white/10 px-4 py-3 text-sm font-medium text-slate-200 hover:border-white/20 hover:bg-white/5"
            >
              Browse files
            </label>
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="inline-flex items-center justify-center rounded-full bg-blue-500 px-4 py-3 text-sm font-medium text-white shadow-[0_0_40px_rgba(79,140,255,0.25)] hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {uploading ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="h-4 w-4 animate-spin"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647Z"
                    />
                  </svg>
                  Uploading
                </span>
              ) : (
                "Upload to IPFS"
              )}
            </button>
          </div>

          <p className="text-xs leading-6 text-slate-500">
            The API validates size, type, ownership, and duplicate CID handling
            before committing metadata.
          </p>
        </div>
      </div>
    </section>
  );
}