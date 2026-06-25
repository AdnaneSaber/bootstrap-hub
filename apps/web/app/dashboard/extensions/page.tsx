"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Plus, Pencil, Trash2, Search, Puzzle } from "lucide-react";
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
  cn,
} from "@/components/ui";

interface Extension {
  id: string;
  name: string;
  extensionId: string;
  browser: string;
  installMethod: string;
}

export default function ExtensionsPage() {
  const { data: session } = useSession();
  const canMutate = session?.user?.role === "ADMIN" || session?.user?.role === "OPERATOR";

  const [extensions, setExtensions] = useState<Extension[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function fetchExtensions() {
    setLoading(true);
    const res = await fetch(`/api/extensions?search=${encodeURIComponent(search)}`);
    const data = await res.json();
    setExtensions(data.extensions || []);
    setLoading(false);
  }

  useEffect(() => {
    fetchExtensions();
  }, [search]);

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    const res = await fetch(`/api/extensions/${deleteId}`, { method: "DELETE" });
    setDeleting(false);
    setDeleteId(null);
    if (res.ok) {
      fetchExtensions();
    } else {
      alert("Failed to delete extension");
    }
  }

  return (
    <div>
      <PageHeader
        title="Extensions"
        subtitle="Manage browser extension policies"
        action={
          canMutate && (
            <Link href="/dashboard/extensions/new">
              <Button>
                <Plus className="h-4 w-4" />
                New extension
              </Button>
            </Link>
          )
        }
      />

      <Card className="mb-6">
        <div className="flex items-center gap-3">
          <Search className="h-4 w-4 text-zinc-400" />
          <Input
            placeholder="Search extensions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm border-0 shadow-none focus:ring-0"
          />
        </div>
      </Card>

      {loading ? (
        <div className="py-12 text-center text-zinc-500">Loading...</div>
      ) : extensions.length === 0 ? (
        <EmptyState message="No extensions found. Create one to get started." />
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Name</TableHeader>
              <TableHeader>Extension ID</TableHeader>
              <TableHeader>Browser</TableHeader>
              <TableHeader>Install Method</TableHeader>
              <TableHeader className="text-right">Actions</TableHeader>
            </TableRow>
          </TableHead>
          <tbody>
            {extensions.map((ext) => (
              <TableRow key={ext.id}>
                <TableCell>
                  <div className="flex items-center gap-2 font-medium">
                    <Puzzle className="h-4 w-4 text-zinc-400" />
                    {ext.name}
                  </div>
                </TableCell>
                <TableCell className="max-w-[16rem] truncate font-mono text-xs">{ext.extensionId}</TableCell>
                <TableCell>
                  <Badge variant="info">{ext.browser}</Badge>
                </TableCell>
                <TableCell>{ext.installMethod}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {canMutate && (
                      <Link
                        href={`/dashboard/extensions/${ext.id}/edit`}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                          "bg-zinc-100 text-foreground hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                        )}
                      >
                        <Pencil className="h-4 w-4" />
                        Edit
                      </Link>
                    )}
                    {canMutate && (
                      <button
                        onClick={() => setDeleteId(ext.id)}
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
        title="Delete extension"
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
        Are you sure you want to delete this extension? This action cannot be undone.
      </Modal>
    </div>
  );
}
