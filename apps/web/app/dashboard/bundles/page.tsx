"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Download, Plus, Trash2, FileJson, Search } from "lucide-react";
import {
  Button,
  Card,
  EmptyState,
  Input,
  PageHeader,
  Table,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  cn,
} from "@/components/ui";
import { Modal } from "@/components/ui";

interface Bundle {
  id: string;
  name: string;
  fileSize: number;
  downloadCount: number;
  sha256: string;
  createdAt: string;
  createdBy: { name: string | null; email: string | null } | null;
}

export default function BundlesPage() {
  const { data: session } = useSession();
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const canMutate = session?.user?.role === "ADMIN" || session?.user?.role === "OPERATOR";

  async function fetchBundles() {
    setLoading(true);
    const res = await fetch(`/api/bundles?search=${encodeURIComponent(search)}`);
    const data = await res.json();
    setBundles(data.bundles || []);
    setLoading(false);
  }

  useEffect(() => {
    fetchBundles();
  }, [search]);

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    const res = await fetch(`/api/bundles/${deleteId}`, { method: "DELETE" });
    setDeleting(false);
    setDeleteId(null);
    if (res.ok) {
      fetchBundles();
    } else {
      alert("Failed to delete bundle");
    }
  }

  function formatBytes(bytes: number) {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }

  return (
    <div>
      <PageHeader
        title="Bundles"
        subtitle="Multi-select installation bundles"
        action={
          canMutate && (
            <Link href="/dashboard/bundles/new">
              <Button>
                <Plus className="h-4 w-4" />
                New bundle
              </Button>
            </Link>
          )
        }
      />

      <Card className="mb-6">
        <div className="flex items-center gap-3">
          <Search className="h-4 w-4 text-zinc-400" />
          <Input
            placeholder="Search bundles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm border-0 shadow-none focus:ring-0"
          />
        </div>
      </Card>

      {loading ? (
        <div className="py-12 text-center text-zinc-500">Loading...</div>
      ) : bundles.length === 0 ? (
        <EmptyState message="No bundles found. Create one to get started." />
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Name</TableHeader>
              <TableHeader>Size</TableHeader>
              <TableHeader>Downloads</TableHeader>
              <TableHeader>Created</TableHeader>
              <TableHeader>Created by</TableHeader>
              <TableHeader className="text-right">Actions</TableHeader>
            </TableRow>
          </TableHead>
          <tbody>
            {bundles.map((bundle) => (
              <TableRow key={bundle.id}>
                <TableCell>
                  <div className="flex items-center gap-2 font-medium">
                    <FileJson className="h-4 w-4 text-zinc-400" />
                    {bundle.name}
                  </div>
                </TableCell>
                <TableCell>{formatBytes(bundle.fileSize)}</TableCell>
                <TableCell>{bundle.downloadCount}</TableCell>
                <TableCell>{new Date(bundle.createdAt).toLocaleString()}</TableCell>
                <TableCell>{bundle.createdBy?.name || bundle.createdBy?.email || "—"}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <a
                      href={`/api/bundles/${bundle.id}/download`}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                        "bg-zinc-100 text-foreground hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                      )}
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </a>
                    {canMutate && (
                      <button
                        onClick={() => setDeleteId(bundle.id)}
                        className="rounded-lg p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </tbody>
        </Table>
      )}

      <Modal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Delete bundle"
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
        Are you sure you want to delete this bundle? This action cannot be undone.
      </Modal>
    </div>
  );
}
