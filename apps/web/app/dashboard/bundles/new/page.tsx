"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Box } from "lucide-react";
import { Button, Card, Input, Select, PageHeader, Badge, cn } from "@/components/ui";
import { Label } from "@/components/ui/label";

interface Application {
  id: string;
  name: string;
  category: string;
  installMethod: string;
}

interface Extension {
  id: string;
  name: string;
  browser: string;
}

interface StartupAction {
  id: string;
  name: string;
  actionType: string;
  target: string;
}

export default function NewBundlePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [applications, setApplications] = useState<Application[]>([]);
  const [extensions, setExtensions] = useState<Extension[]>([]);
  const [startupActions, setStartupActions] = useState<StartupAction[]>([]);
  const [selectedApps, setSelectedApps] = useState<string[]>([]);
  const [selectedExtensions, setSelectedExtensions] = useState<string[]>([]);
  const [selectedStartup, setSelectedStartup] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      const [appsRes, extRes, startupRes] = await Promise.all([
        fetch("/api/applications"),
        fetch("/api/extensions"),
        fetch("/api/startup-actions"),
      ]);
      const apps = appsRes.ok ? await appsRes.json() : { applications: [] };
      const exts = extRes.ok ? await extRes.json() : { extensions: [] };
      const startup = startupRes.ok ? await startupRes.json() : { startupActions: [] };
      setApplications(apps.applications || []);
      setExtensions(exts.extensions || []);
      setStartupActions(startup.startupActions || []);
      setLoading(false);
    }
    fetchData();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedApps.length + selectedExtensions.length + selectedStartup.length === 0) {
      setError("Select at least one item");
      return;
    }
    setSaving(true);
    setError(null);
    setStatus("Downloading installers and building the bundle. This may take a few minutes...");

    try {
      const res = await fetch("/api/bundles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          applicationIds: selectedApps,
          extensionIds: selectedExtensions,
          startupActionIds: selectedStartup,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setStatus(data.data?.existing ? "Existing bundle reused. Redirecting..." : "Bundle created. Redirecting...");
        router.push("/dashboard/bundles");
        return;
      }

      setStatus(null);
      let message = "Failed to create bundle";
      try {
        const data = await res.json();
        message = data.error?.formErrors?.[0] || data.error || `Server error ${res.status}`;
      } catch {
        message = `Server error ${res.status}`;
      }
      setError(message);
    } catch (err) {
      setStatus(null);
      setError(err instanceof Error ? err.message : "Network error while creating bundle");
    } finally {
      setSaving(false);
    }
  }

  function toggleSelection(id: string, selected: string[], setSelected: (v: string[]) => void) {
    if (selected.includes(id)) {
      setSelected(selected.filter((x) => x !== id));
    } else {
      setSelected([...selected, id]);
    }
  }

  if (loading) {
    return <div className="py-12 text-center text-zinc-500">Loading...</div>;
  }

  return (
    <div>
      <PageHeader
        title="New bundle"
        subtitle="Select applications, extensions, and startup actions"
        action={
          <Link href="/dashboard/bundles">
            <Button variant="ghost">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <div className="space-y-4">
            <Label htmlFor="bundle-name">Bundle name</Label>
            <Input
              id="bundle-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Gaming Workstation"
              required
            />
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <Box className="h-5 w-5" />
            Applications
          </h2>
          {applications.length === 0 ? (
            <p className="text-zinc-500">No applications available.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {applications.map((app) => (
                <label
                  key={app.id}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors",
                    selectedApps.includes(app.id)
                      ? "border-foreground bg-zinc-50 dark:bg-zinc-900"
                      : "border-zinc-200 hover:border-zinc-400 dark:border-zinc-800"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={selectedApps.includes(app.id)}
                    onChange={() => toggleSelection(app.id, selectedApps, setSelectedApps)}
                    className="mt-1 h-4 w-4"
                  />
                  <div>
                    <p className="font-medium">{app.name}</p>
                    <div className="mt-1 flex gap-2">
                      <Badge variant="info">{app.category}</Badge>
                      <Badge variant="default">{app.installMethod}</Badge>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-semibold">Extensions</h2>
          {extensions.length === 0 ? (
            <p className="text-zinc-500">No extensions available.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {extensions.map((ext) => (
                <label
                  key={ext.id}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors",
                    selectedExtensions.includes(ext.id)
                      ? "border-foreground bg-zinc-50 dark:bg-zinc-900"
                      : "border-zinc-200 hover:border-zinc-400 dark:border-zinc-800"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={selectedExtensions.includes(ext.id)}
                    onChange={() => toggleSelection(ext.id, selectedExtensions, setSelectedExtensions)}
                    className="mt-1 h-4 w-4"
                  />
                  <div>
                    <p className="font-medium">{ext.name}</p>
                    <Badge variant="info">{ext.browser}</Badge>
                  </div>
                </label>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-semibold">Startup Actions</h2>
          {startupActions.length === 0 ? (
            <p className="text-zinc-500">No startup actions available.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {startupActions.map((action) => (
                <label
                  key={action.id}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors",
                    selectedStartup.includes(action.id)
                      ? "border-foreground bg-zinc-50 dark:bg-zinc-900"
                      : "border-zinc-200 hover:border-zinc-400 dark:border-zinc-800"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={selectedStartup.includes(action.id)}
                    onChange={() => toggleSelection(action.id, selectedStartup, setSelectedStartup)}
                    className="mt-1 h-4 w-4"
                  />
                  <div>
                    <p className="font-medium">{action.name}</p>
                    <div className="mt-1 flex gap-2">
                      <Badge variant="info">{action.actionType}</Badge>
                      <Badge variant="default" className="truncate max-w-[12rem]">
                        {action.target}
                      </Badge>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </Card>

        {status && (
          <div className="rounded-md bg-blue-50 p-4 text-sm text-blue-800 dark:bg-blue-950 dark:text-blue-200">
            <div className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              {status}
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950 dark:text-red-200">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          <Link href="/dashboard/bundles">
            <Button variant="ghost" type="button" disabled={saving}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" loading={saving}>
            Create bundle
          </Button>
        </div>
      </form>
    </div>
  );
}
