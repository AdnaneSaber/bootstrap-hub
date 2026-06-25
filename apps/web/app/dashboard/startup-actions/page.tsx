"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Plus, Pencil, Trash2, Search, PlayCircle } from "lucide-react";
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

interface StartupAction {
  id: string;
  name: string;
  actionType: string;
  target: string;
  arguments: string | null;
  order: number;
  enabled: boolean;
}

export default function StartupActionsPage() {
  const { data: session } = useSession();
  const canMutate = session?.user?.role === "ADMIN" || session?.user?.role === "OPERATOR";

  const [actions, setActions] = useState<StartupAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function fetchActions() {
    setLoading(true);
    const res = await fetch(`/api/startup-actions?search=${encodeURIComponent(search)}`);
    const data = await res.json();
    setActions(data.startupActions || []);
    setLoading(false);
  }

  useEffect(() => {
    fetchActions();
  }, [search]);

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    const res = await fetch(`/api/startup-actions/${deleteId}`, { method: "DELETE" });
    setDeleting(false);
    setDeleteId(null);
    if (res.ok) {
      fetchActions();
    } else {
      alert("Failed to delete startup action");
    }
  }

  return (
    <div>
      <PageHeader
        title="Startup Actions"
        subtitle="Define first-run actions for bundles"
        action={
          canMutate && (
            <Link href="/dashboard/startup-actions/new">
              <Button>
                <Plus className="h-4 w-4" />
                New action
              </Button>
            </Link>
          )
        }
      />

      <Card className="mb-6">
        <div className="flex items-center gap-3">
          <Search className="h-4 w-4 text-zinc-400" />
          <Input
            placeholder="Search startup actions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm border-0 shadow-none focus:ring-0"
          />
        </div>
      </Card>

      {loading ? (
        <div className="py-12 text-center text-zinc-500">Loading...</div>
      ) : actions.length === 0 ? (
        <EmptyState message="No startup actions found. Create one to get started." />
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Order</TableHeader>
              <TableHeader>Name</TableHeader>
              <TableHeader>Type</TableHeader>
              <TableHeader>Target</TableHeader>
              <TableHeader>Arguments</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader className="text-right">Actions</TableHeader>
            </TableRow>
          </TableHead>
          <tbody>
            {actions.map((action) => (
              <TableRow key={action.id}>
                <TableCell>{action.order}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 font-medium">
                    <PlayCircle className="h-4 w-4 text-zinc-400" />
                    {action.name}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="info">{action.actionType}</Badge>
                </TableCell>
                <TableCell className="max-w-[12rem] truncate">{action.target}</TableCell>
                <TableCell className="max-w-[12rem] truncate">{action.arguments || "—"}</TableCell>
                <TableCell>
                  {action.enabled ? (
                    <Badge variant="success">Enabled</Badge>
                  ) : (
                    <Badge variant="warning">Disabled</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {canMutate && (
                      <Link
                        href={`/dashboard/startup-actions/${action.id}/edit`}
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
                        onClick={() => setDeleteId(action.id)}
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
        title="Delete startup action"
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
        Are you sure you want to delete this startup action? This action cannot be undone.
      </Modal>
    </div>
  );
}
