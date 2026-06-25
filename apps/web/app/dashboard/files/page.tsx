"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Plus, Trash2, Search, FileUp } from "lucide-react";
import {
  Button,
  Card,
  EmptyState,
  Input,
  PageHeader,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableCell,
  Badge,
  Modal,
} from "@/components/ui";

interface UploadedFile {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  sha256: string;
  createdAt: string;
  applications: { id: string; name: string }[];
}

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function FilesPage() {
  const { data: session } = useSession();
  const canMutate = session?.user?.role === "ADMIN" || session?.user?.role === "OPERATOR";

  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function fetchFiles() {
    setLoading(true);
    const res = await fetch("/api/files");
    const data = res.ok ? await res.json() : [];
    const allFiles = Array.isArray(data) ? data : [];
    const term = search.toLowerCase();
    setFiles(
      term
        ? allFiles.filter(
            (f: UploadedFile) =>
              f.originalName.toLowerCase().includes(term) ||
              f.mimeType.toLowerCase().includes(term)
          )
        : allFiles
    );
    setLoading(false);
  }

  useEffect(() => {
    fetchFiles();
  }, [search]);

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    const res = await fetch(`/api/files/${deleteId}`, { method: "DELETE" });
    setDeleting(false);
    setDeleteId(null);
    if (res.ok) {
      fetchFiles();
    } else {
      alert("Failed to delete file");
    }
  }

  return (
    <div>
      <PageHeader
        title="Files"
        subtitle="Uploaded installers and assets"
        action={
          canMutate && (
            <Link href="/dashboard/files/upload">
              <Button>
                <Plus className="h-4 w-4" />
                Upload file
              </Button>
            </Link>
          )
        }
      />

      <Card className="mb-6">
        <div className="flex items-center gap-3">
          <Search className="h-4 w-4 text-zinc-400" />
          <Input
            placeholder="Search files..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm border-0 shadow-none focus:ring-0"
          />
        </div>
      </Card>

      {loading ? (
        <div className="py-12 text-center text-zinc-500">Loading...</div>
      ) : files.length === 0 ? (
        <EmptyState message="No files uploaded yet. Upload one to get started." />
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Name</TableHeader>
              <TableHeader>Type</TableHeader>
              <TableHeader>Size</TableHeader>
              <TableHeader>SHA256</TableHeader>
              <TableHeader>Used by</TableHeader>
              <TableHeader>Uploaded</TableHeader>
              <TableHeader className="text-right">Actions</TableHeader>
            </TableRow>
          </TableHead>
          <tbody>
            {files.map((file) => (
              <TableRow key={file.id}>
                <TableCell>
                  <div className="flex items-center gap-2 font-medium">
                    <FileUp className="h-4 w-4 text-zinc-400" />
                    {file.originalName}
                  </div>
                </TableCell>
                <TableCell>{file.mimeType}</TableCell>
                <TableCell>{formatBytes(file.size)}</TableCell>
                <TableCell className="max-w-[12rem] truncate font-mono text-xs">{file.sha256}</TableCell>
                <TableCell>
                  {file.applications.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {file.applications.map((app) => (
                        <Badge key={app.id} variant="default">
                          {app.name}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell>{new Date(file.createdAt).toLocaleString()}</TableCell>
                <TableCell className="text-right">
                  {canMutate && (
                    <button
                      onClick={() => setDeleteId(file.id)}
                      className="rounded-lg p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </tbody>
        </Table>
      )}

      <Modal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Delete file"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button variant="danger" loading={deleting} onClick={handleDelete}>
              Delete
            </Button>
          </>
        }
      >
        Are you sure you want to delete this file? Applications referencing it will be unlinked.
      </Modal>
    </div>
  );
}
