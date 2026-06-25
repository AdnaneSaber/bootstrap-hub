"use client";

import { useState } from "react";
import {
  Sparkles,
  Loader2,
  Save,
  AlertCircle,
  Check,
  FileText,
  Wrench,
  Search,
} from "lucide-react";

type Draft = {
  id?: string;
  name: string;
  description?: string | null;
  category: string;
  version?: string | null;
  downloadUrl?: string | null;
  installMethod: string;
  silentInstallCommand?: string | null;
  detectionMethod: string;
  detectionRule: Record<string, unknown>;
  launchAfterInstall?: boolean;
  launchArguments?: string | null;
};

export interface AgentAnalyzerProps {
  canCreate: boolean;
  userRole: string;
}

export function AgentAnalyzer({ canCreate, userRole }: AgentAnalyzerProps) {
  const [prompt, setPrompt] = useState("");
  const [createDrafts, setCreateDrafts] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setDrafts([]);
    setSaved(false);

    try {
      const res = await fetch("/api/agent/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, createDrafts }),
      });

      const data = (await res.json()) as {
        error?: string;
        drafts?: Draft[];
      };

      if (!res.ok) {
        throw new Error(data.error || `Request failed (${res.status})`);
      }

      setDrafts(data.drafts ?? []);
      if (createDrafts) {
        setSaved(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 p-6">
      <div className="space-y-2">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Sparkles className="h-6 w-6 text-amber-500" />
          AI Packaging Agent
        </h1>
        <p className="text-sm text-zinc-500">
          Describe the software you want to deploy. The agent will draft
          Application records for silent installation.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div className="space-y-2">
          <label
            htmlFor="prompt"
            className="flex items-center gap-2 text-sm font-medium"
          >
            <FileText className="h-4 w-4" />
            Request
          </label>
          <textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. Install Google Chrome, 7-Zip, and Visual Studio Code on engineering workstations"
            rows={5}
            className="w-full resize-y rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-950"
            required
          />
        </div>

        {canCreate && (
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
            <input
              type="checkbox"
              checked={createDrafts}
              onChange={(e) => setCreateDrafts(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500"
            />
            <div className="flex items-center gap-2 text-sm font-medium">
              <Save className="h-4 w-4" />
              Save drafts to the application library
            </div>
          </label>
        )}

        {!canCreate && (
          <div className="flex items-center gap-2 rounded-lg bg-zinc-50 p-3 text-xs text-zinc-500 dark:bg-zinc-900">
            <AlertCircle className="h-4 w-4" />
            Your role ({userRole}) can analyze requests but cannot save drafts.
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !prompt.trim()}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              {createDrafts ? "Analyze & Save Drafts" : "Analyze"}
            </>
          )}
        </button>
      </form>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {saved && (
        <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-200">
          <Check className="h-4 w-4 shrink-0" />
          Drafts saved successfully.
        </div>
      )}

      {drafts.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">
            {createDrafts ? "Saved Drafts" : "Suggested Drafts"}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {drafts.map((draft, index) => (
              <div
                key={draft.id ?? `${draft.name}-${index}`}
                className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <h3 className="font-semibold">{draft.name}</h3>
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                    {draft.category}
                  </span>
                </div>

                {draft.description && (
                  <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
                    {draft.description}
                  </p>
                )}

                <dl className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <dt className="flex items-center gap-1 text-zinc-500">
                      <Wrench className="h-3.5 w-3.5" />
                      Install:
                    </dt>
                    <dd className="font-medium">{draft.installMethod}</dd>
                  </div>
                  {draft.silentInstallCommand && (
                    <div className="flex items-center gap-2">
                      <dt className="text-zinc-500">Command:</dt>
                      <dd className="truncate font-mono text-xs">
                        {draft.silentInstallCommand}
                      </dd>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <dt className="flex items-center gap-1 text-zinc-500">
                      <Search className="h-3.5 w-3.5" />
                      Detection:
                    </dt>
                    <dd className="font-medium">{draft.detectionMethod}</dd>
                  </div>
                  {draft.version && (
                    <div className="flex items-center gap-2">
                      <dt className="text-zinc-500">Version:</dt>
                      <dd>{draft.version}</dd>
                    </div>
                  )}
                  {draft.downloadUrl && (
                    <div className="flex items-center gap-2">
                      <dt className="text-zinc-500">Source:</dt>
                      <dd className="truncate">
                        <a
                          href={draft.downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline dark:text-blue-400"
                        >
                          {draft.downloadUrl}
                        </a>
                      </dd>
                    </div>
                  )}
                </dl>

                {Object.keys(draft.detectionRule).length > 0 && (
                  <details className="mt-4">
                    <summary className="cursor-pointer text-xs font-medium text-zinc-500">
                      Detection rule
                    </summary>
                    <pre className="mt-2 overflow-x-auto rounded-lg bg-zinc-50 p-3 text-xs text-zinc-700 dark:bg-zinc-950 dark:text-zinc-300">
                      {JSON.stringify(draft.detectionRule, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
