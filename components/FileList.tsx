"use client";

import { useEffect, useState } from "react";

type FileRecord = {
  id: string;
  filename: string;
  cid: string;
  fileSize: number;
  mimeType: string | null;
  uploadedAt: string;
  gatewayUrl: string;
};

export function FileList() {
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const loadFiles = async (query?: string) => {
    setLoading(true);
    try {
      const url = query
        ? `/api/files?filename=${encodeURIComponent(query)}`
        : "/api/files";
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setFiles(data);
      } else {
        console.error(data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
  }, []);

  const handleDelete = async (cid: string) => {
    if (!confirm("Delete this file?")) return;
    const res = await fetch(`/api/files/${cid}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Failed to delete");
      return;
    }
    await loadFiles(search || undefined);
  };

  return (
    <div className="space-y-3 mt-6">
      <div className="flex gap-2 items-center">
        <input
          placeholder="Search by filename"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
        />
        <button
          onClick={() => loadFiles(search || undefined)}
          className="px-3 py-2 rounded bg-slate-800 text-sm"
        >
          Search
        </button>
      </div>

      {loading && <p className="text-sm text-slate-400">Loading...</p>}

      {!loading && files.length === 0 && (
        <p className="text-sm text-slate-400">No files yet.</p>
      )}

      <ul className="space-y-2">
        {files.map((file) => (
          <li
            key={file.id}
            className="border border-slate-800 rounded p-3 flex justify-between gap-3 items-center"
          >
            <div className="space-y-1 text-sm">
              <div className="font-medium">{file.filename}</div>
              <div className="text-xs text-slate-400 break-all">
                CID: {file.cid}
              </div>
              <div className="text-xs text-slate-500">
                {(file.fileSize / 1024).toFixed(1)} KB ·{" "}
                {file.mimeType || "unknown"} ·{" "}
                {new Date(file.uploadedAt).toLocaleString()}
              </div>
              <a
                href={file.gatewayUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 underline"
              >
                View on IPFS
              </a>
            </div>
            <button
              onClick={() => handleDelete(file.cid)}
              className="text-xs px-3 py-1 rounded bg-red-700 hover:bg-red-600"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
