"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Application, Extension, StartupAction } from "@prisma/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Package } from "lucide-react";

type ApplicationWithFile = Application & { file: { originalName: string } | null };

interface GenerateBundleFormProps {
  applications: ApplicationWithFile[];
  extensions: Extension[];
  startupActions: StartupAction[];
}

export function GenerateBundleForm({
  applications,
  extensions,
  startupActions,
}: GenerateBundleFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [selectedApps, setSelectedApps] = useState<Set<string>>(new Set());
  const [selectedExts, setSelectedExts] = useState<Set<string>>(new Set());
  const [selectedActions, setSelectedActions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(set: Set<string>, id: string) {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/bundles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          applicationIds: Array.from(selectedApps),
          extensionIds: Array.from(selectedExts),
          startupActionIds: Array.from(selectedActions),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Bundle generation failed");
      }

      router.push("/admin/bundles");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bundle generation failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Bundle details</CardTitle>
          <CardDescription>
            Choose a name and select the items to include in the bundle.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Bundle name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Developer Workstation"
              required
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Applications</CardTitle>
          <CardDescription>
            Applications without an uploaded file will be included as metadata only.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {applications.length === 0 ? (
            <p className="text-sm text-zinc-500">No applications available.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {applications.map((app) => (
                <label
                  key={app.id}
                  className="flex cursor-pointer items-start gap-3 rounded-md border border-black/10 p-3 transition-colors hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
                >
                  <input
                    type="checkbox"
                    checked={selectedApps.has(app.id)}
                    onChange={() => setSelectedApps(toggle(selectedApps, app.id))}
                    className="mt-1 h-4 w-4 rounded border-black/20"
                  />
                  <div className="flex-1 text-sm">
                    <div className="font-medium">{app.name}</div>
                    <div className="text-zinc-500">
                      {app.category} {app.file && <Badge variant="outline" className="ml-2">file</Badge>}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Extensions</CardTitle>
        </CardHeader>
        <CardContent>
          {extensions.length === 0 ? (
            <p className="text-sm text-zinc-500">No extensions available.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {extensions.map((ext) => (
                <label
                  key={ext.id}
                  className="flex cursor-pointer items-start gap-3 rounded-md border border-black/10 p-3 transition-colors hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
                >
                  <input
                    type="checkbox"
                    checked={selectedExts.has(ext.id)}
                    onChange={() => setSelectedExts(toggle(selectedExts, ext.id))}
                    className="mt-1 h-4 w-4 rounded border-black/20"
                  />
                  <div className="flex-1 text-sm">
                    <div className="font-medium">{ext.name}</div>
                    <div className="text-zinc-500">{ext.browser}</div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Startup Actions</CardTitle>
        </CardHeader>
        <CardContent>
          {startupActions.length === 0 ? (
            <p className="text-sm text-zinc-500">No startup actions available.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {startupActions.map((action) => (
                <label
                  key={action.id}
                  className="flex cursor-pointer items-start gap-3 rounded-md border border-black/10 p-3 transition-colors hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
                >
                  <input
                    type="checkbox"
                    checked={selectedActions.has(action.id)}
                    onChange={() =>
                      setSelectedActions(toggle(selectedActions, action.id))
                    }
                    className="mt-1 h-4 w-4 rounded border-black/20"
                  />
                  <div className="flex-1 text-sm">
                    <div className="font-medium">{action.name}</div>
                    <div className="text-zinc-500">
                      {action.actionType} • order {action.order}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-200">
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <Button type="submit" loading={loading}>
          {loading ? (
            <>
              <Spinner className="h-4 w-4" /> Generating…
            </>
          ) : (
            <>
              <Package className="h-4 w-4" /> Generate bundle
            </>
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/dashboard/bundles")}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
