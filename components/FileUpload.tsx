"use client";

import { useState } from "react";

export function FileUpload({ onUploaded }: { onUploaded?: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");

      setResult(data);
      onUploaded?.();
    } catch (e) {
      console.error(e);
      alert("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-4 border border-slate-800 rounded-lg space-y-3">
      <input
        type="file"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        className="block w-full text-sm text-slate-200"
      />
      <button
        onClick={handleUpload}
        disabled={!file || uploading}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded disabled:opacity-60"
      >
        {uploading ? "Uploading..." : "Upload to IPFS"}
      </button>

      {result && (
        <div className="mt-2 text-sm space-y-1">
          <div>
            <span className="font-semibold">CID:</span> {result.cid}
          </div>
          <div>
            <span className="font-semibold">Filename:</span> {result.filename}
          </div>
          <a
            href={result.gatewayUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 underline"
          >
            View File
          </a>
        </div>
      )}
    </div>
  );
}
