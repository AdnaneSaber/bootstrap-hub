"use client";

import { useEffect, useState } from "react";
import { Search, Filter, ChevronLeft, ChevronRight } from "lucide-react";
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
  Badge,
  Modal,
} from "@/components/ui";

interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  meta: Record<string, unknown> | null;
  createdAt: string;
  user: { id: string; email: string | null; name: string | null } | null;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [selected, setSelected] = useState<AuditLog | null>(null);

  async function fetchLogs() {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(limit));
    if (search) params.set("search", search);
    if (actionFilter) params.set("action", actionFilter);
    if (entityFilter) params.set("entity", entityFilter);

    const res = await fetch(`/api/audit-logs?${params.toString()}`);
    const data = await res.json();
    setLogs(data.logs || []);
    setTotal(data.total || 0);
    setLoading(false);
  }

  useEffect(() => {
    fetchLogs();
  }, [page, search, actionFilter, entityFilter]);

  const totalPages = Math.ceil(total / limit);

  function getActionVariant(action: string) {
    if (action.startsWith("CREATE")) return "success";
    if (action.startsWith("UPDATE")) return "info";
    if (action.startsWith("DELETE")) return "danger";
    if (action.startsWith("AI_")) return "warning";
    return "default";
  }

  return (
    <div>
      <PageHeader title="Audit Logs" subtitle="Track changes across the platform" />

      <Card className="mb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex flex-1 items-center gap-3">
            <Search className="h-4 w-4 text-zinc-400" />
            <Input
              placeholder="Search action, entity, or user..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="max-w-sm border-0 shadow-none focus:ring-0"
            />
          </div>
          <div className="flex items-center gap-3">
            <Filter className="h-4 w-4 text-zinc-400" />
            <Input
              placeholder="Action"
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
              className="w-32"
            />
            <Input
              placeholder="Entity"
              value={entityFilter}
              onChange={(e) => {
                setEntityFilter(e.target.value);
                setPage(1);
              }}
              className="w-32"
            />
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="py-12 text-center text-zinc-500">Loading...</div>
      ) : logs.length === 0 ? (
        <EmptyState message="No audit logs found." />
      ) : (
        <>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Time</TableHeader>
                <TableHeader>Action</TableHeader>
                <TableHeader>Entity</TableHeader>
                <TableHeader>Entity ID</TableHeader>
                <TableHeader>User</TableHeader>
                <TableHeader className="text-right">Details</TableHeader>
              </TableRow>
            </TableHead>
            <tbody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>{new Date(log.createdAt).toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant={getActionVariant(log.action)}>{log.action}</Badge>
                  </TableCell>
                  <TableCell>{log.entity}</TableCell>
                  <TableCell className="max-w-[12rem] truncate">{log.entityId || "—"}</TableCell>
                  <TableCell>{log.user?.email || "System"}</TableCell>
                  <TableCell className="text-right">
                    <button
                      onClick={() => setSelected(log)}
                      className="text-sm font-medium text-zinc-600 hover:text-foreground dark:text-zinc-400"
                    >
                      View
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </tbody>
          </Table>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-zinc-500">
              Showing {logs.length} of {total} entries
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                Page {page} of {totalPages || 1}
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Audit log details"
        footer={
          <Button variant="ghost" onClick={() => setSelected(null)}>
            Close
          </Button>
        }
      >
        {selected && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-3 gap-2">
              <span className="text-zinc-500">ID</span>
              <span className="col-span-2 break-all">{selected.id}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <span className="text-zinc-500">Action</span>
              <span className="col-span-2">{selected.action}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <span className="text-zinc-500">Entity</span>
              <span className="col-span-2">
                {selected.entity} {selected.entityId ? `(${selected.entityId})` : ""}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <span className="text-zinc-500">Time</span>
              <span className="col-span-2">{new Date(selected.createdAt).toLocaleString()}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <span className="text-zinc-500">User</span>
              <span className="col-span-2">{selected.user?.email || "System"}</span>
            </div>
            <div>
              <span className="text-zinc-500">Metadata</span>
              <pre className="mt-1 max-h-64 overflow-auto rounded-lg bg-zinc-100 p-3 text-xs dark:bg-zinc-900">
                {JSON.stringify(selected.meta ?? {}, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
