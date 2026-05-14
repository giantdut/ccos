"use client";

import { useEffect, useRef, useState } from "react";

type Upload = {
  id: string;
  filename: string;
  size: number;
  uploadedAt: string;
};

function formatSize(bytes: number): string {
  return (bytes / 1024).toFixed(1) + " KB";
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

export default function KnowledgePage() {
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function fetchUploads() {
    try {
      const res = await fetch("/api/knowledge-uploads");
      if (!res.ok) throw new Error("Failed to fetch uploads");
      setUploads(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    }
  }

  useEffect(() => {
    fetchUploads();
  }, []);

  async function handleUpload() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/knowledge-uploads", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      if (fileInputRef.current) fileInputRef.current.value = "";
      await fetchUploads();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    setError(null);
    try {
      const res = await fetch(`/api/knowledge-uploads/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      await fetchUploads();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    }
  }

  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-bold tracking-tight mb-6">
        Knowledge Uploads
      </h1>

      <div className="flex items-center gap-3 mb-8">
        <input
          ref={fileInputRef}
          type="file"
          className="block text-sm text-gray-700 file:mr-3 file:rounded file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-gray-200"
        />
        <button
          onClick={handleUpload}
          disabled={uploading}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {uploading ? "Uploading…" : "Upload"}
        </button>
      </div>

      {error && (
        <p className="mb-4 rounded bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {uploads.length === 0 ? (
        <p className="text-gray-500 text-sm">No uploads yet.</p>
      ) : (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="pb-2 font-medium">Filename</th>
              <th className="pb-2 font-medium">Size</th>
              <th className="pb-2 font-medium">Uploaded</th>
              <th className="pb-2"></th>
            </tr>
          </thead>
          <tbody>
            {uploads.map((u) => (
              <tr key={u.id} className="border-b last:border-0">
                <td className="py-2 pr-4 font-mono">{u.filename}</td>
                <td className="py-2 pr-4 text-gray-600">
                  {formatSize(u.size)}
                </td>
                <td className="py-2 pr-4 text-gray-600">
                  {formatDate(u.uploadedAt)}
                </td>
                <td className="py-2">
                  <button
                    onClick={() => handleDelete(u.id)}
                    className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
