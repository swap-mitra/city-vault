"use client";

import { useState } from "react";
import {
  formatFileSize,
  MAX_UPLOAD_SIZE_BYTES,
  UPLOAD_ACCEPT_ATTRIBUTE,
} from "@/upload-validation";
import type { VaultNotice } from "@/vault-ui";

type UploadResult = {
  cid: string;
  filename: string;
  fileId: string;
  gatewayUrl: string;
  message?: string;
};

type FileUploadProps = {
  onUploaded?: () => void;
  onNotice?: (notice: VaultNotice) => void;
};

function noticeClasses(type: VaultNotice["type"]) {
  if (type === "success") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
  }

  if (type === "error") {
    return "border-red-500/30 bg-red-500/10 text-red-200";
  }

  return "border-blue-500/30 bg-blue-500/10 text-blue-200";
}

export function FileUpload({ onUploaded, onNotice }: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [status, setStatus] = useState<VaultNotice | null>(null);

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setResult(null);
    setStatus(null);

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

      const notice: VaultNotice = {
        type: "success",
        message: data.message || `${file.name} uploaded successfully.`,
      };

      setResult(data);
      setStatus(notice);
      setFile(null);
      onUploaded?.();
      onNotice?.(notice);
    } catch (error) {
      const notice: VaultNotice = {
        type: "error",
        message:
          error instanceof Error ? error.message : "Upload failed unexpectedly.",
      };

      console.error(error);
      setStatus(notice);
      onNotice?.(notice);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="border border-slate-800 rounded-xl bg-slate-900/50 backdrop-blur-sm p-6 space-y-4 shadow-xl">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-slate-100">Upload File</h2>
        <p className="text-sm text-slate-400">
          Upload images, PDFs, text, JSON, CSV, or ZIP files up to{" "}
          {formatFileSize(MAX_UPLOAD_SIZE_BYTES)}.
        </p>
      </div>

      <div className="space-y-4">
        <div className="relative">
          <input
            id="file-input"
            type="file"
            accept={UPLOAD_ACCEPT_ATTRIBUTE}
            onChange={(event) => setFile(event.target.files?.[0] || null)}
            className="hidden"
          />
          <label
            htmlFor="file-input"
            className="flex items-center justify-center w-full px-4 py-8 border-2 border-dashed border-slate-700 rounded-lg cursor-pointer hover:border-slate-600 hover:bg-slate-800/50 transition-all duration-200"
          >
            <div className="text-center space-y-2">
              <svg
                className="mx-auto h-12 w-12 text-slate-500"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
                aria-hidden="true"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div className="text-sm text-slate-400">
                {file ? (
                  <span className="font-medium text-slate-200">
                    {file.name}
                  </span>
                ) : (
                  <span className="font-medium text-blue-400">
                    Click to choose a file
                  </span>
                )}
              </div>
              {file && (
                <p className="text-xs text-slate-500">
                  {formatFileSize(file.size)}
                </p>
              )}
            </div>
          </label>
        </div>

        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-blue-600/20 hover:shadow-blue-600/40"
        >
          {uploading ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="animate-spin h-4 w-4"
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
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Uploading...
            </span>
          ) : (
            "Upload to IPFS"
          )}
        </button>
      </div>

      {status && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${noticeClasses(status.type)}`}>
          {status.message}
        </div>
      )}

      {result && (
        <div className="mt-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700 space-y-2">
          <div className="flex items-start gap-2">
            <svg
              className="h-5 w-5 text-green-500 mt-0.5 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="flex-1 space-y-2 text-sm">
              <p className="text-slate-200 font-medium">Upload details</p>
              <div className="space-y-1 text-slate-400">
                <p className="break-all">
                  <span className="text-slate-500">CID:</span> {result.cid}
                </p>
                <p>
                  <span className="text-slate-500">Filename:</span>{" "}
                  {result.filename}
                </p>
              </div>
              <a
                href={result.gatewayUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
              >
                View on IPFS
                <svg
                  className="h-3 w-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}