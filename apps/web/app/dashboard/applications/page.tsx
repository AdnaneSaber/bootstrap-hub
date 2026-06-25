"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Plus, Pencil, Trash2, Search, Package } from "lucide-react";
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

interface Application {
  id: string;
  name: string;
  category: string;
  version: string | null;
  installMethod: string;
  detectionMethod: string;
  isDraft: boolean;
  updatedAt: string;
}

export default function ApplicationsPage() {
  const { data: session } = useSession();
  const canMutate = session?.user?.role === "ADMIN" || session?.user?.role === "OPERATOR";

  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function fetchApplications() {
    setLoading(true);
    const res = await fetch(`/api/applications?search=${encodeURIComponent(search)}`);
    const data = await res.json();
    setApplications(data.applications || []);
    setLoading(false);
  }

  useEffect(() => {
    fetchApplications();
  }, [search]);

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    const res = await fetch(`/api/applications/${deleteId}`, { method: "DELETE" });
    setDeleting(false);
    setDeleteId(null);
    if (res.ok) {
      fetchApplications();
    } else {
      alert("Failed to delete application");
    }
  }

  return (
    <div>
      <PageHeader
        title="Applications"
        subtitle="Manage software installers and detection rules"
        action={
          canMutate && (
            <Link href="/dashboard/applications/new">
              <Button>
                <Plus className="h-4 w-4" />
                New application
              </Button>
            </Link>
          )
        }
      />

      <Card className="mb-6">
        <div className="flex items-center gap-3">
          <Search className="h-4 w-4 text-zinc-400" />
          <Input
            placeholder="Search applications..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm border-0 shadow-none focus:ring-0"
          />
        </div>
      </Card>

      {loading ? (
        <div className="py-12 text-center text-zinc-500">Loading...</div>
      ) : applications.length === 0 ? (
        <EmptyState message="No applications found. Create one to get started." />
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Name</TableHeader>
              <TableHeader>Category</TableHeader>
              <TableHeader>Version</TableHeader>
              <TableHeader>Install</TableHeader>
              <TableHeader>Detection</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader className="text-right">Actions</TableHeader>
            </TableRow>
          </TableHead>
          <tbody>
            {applications.map((app) => (
              <TableRow key={app.id}>
                <TableCell>
                  <div className="flex items-center gap-2 font-medium">
                    <Package className="h-4 w-4 text-zinc-400" />
                    {app.name}
                  </div>
                </TableCell>
                <TableCell>{app.category}</TableCell>
                <TableCell>{app.version || "—"}</TableCell>
                <TableCell>
                  <Badge variant="info">{app.installMethod}</Badge>
                </TableCell>
                <TableCell>{app.detectionMethod}</TableCell>
                <TableCell>
                  {app.isDraft ? (
                    <Badge variant="warning">Draft</Badge>
                  ) : (
                    <Badge variant="success">Active</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {canMutate && (
                      <Link
                        href={`/dashboard/applications/${app.id}/edit`}
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
                        onClick={() => setDeleteId(app.id)}
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
        title="Delete application"
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
        Are you sure you want to delete this application? This action cannot be undone.
      </Modal>
    </div>
  );
}
