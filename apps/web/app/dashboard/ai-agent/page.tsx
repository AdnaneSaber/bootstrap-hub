"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Bot, Search, ShieldCheck, Send, Loader2 } from "lucide-react";
import { Button, Card, Input, Textarea, Select, PageHeader, Badge, cn } from "@/components/ui";

const queryTypes = [
  { value: "general", label: "General" },
  { value: "application", label: "Application" },
  { value: "extension", label: "Extension" },
  { value: "startup", label: "Startup Action" },
  { value: "bundle", label: "Bundle" },
];

export default function AiAgentPage() {
  const { data: session } = useSession();
  const canReview = session?.user?.role === "ADMIN" || session?.user?.role === "OPERATOR";

  const [tab, setTab] = useState<"query" | "review">("query");
  const [queryType, setQueryType] = useState("general");
  const [queryPrompt, setQueryPrompt] = useState("");
  const [reviewType, setReviewType] = useState("bundle manifest");
  const [reviewContent, setReviewContent] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleQuery(e: React.FormEvent) {
    e.preventDefault();
    await sendRequest({ mode: "query", type: queryType, prompt: queryPrompt });
  }

  async function handleReview(e: React.FormEvent) {
    e.preventDefault();
    await sendRequest({ mode: "review", contentType: reviewType, content: reviewContent });
  }

  async function sendRequest(payload: Record<string, string>) {
    setError("");
    setResult("");
    setLoading(true);
    const res = await fetch("/api/ai-agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      setResult(data.result);
    } else {
      setError(data.error || "Request failed");
    }
  }

  return (
    <div>
      <PageHeader
        title="AI Agent"
        subtitle="Query deployment guidance or review bundle manifests"
      />

      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setTab("query")}
          className={cn(
            "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            tab === "query"
              ? "bg-foreground text-background"
              : "bg-white text-zinc-600 hover:bg-zinc-100 dark:bg-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900"
          )}
        >
          <Search className="h-4 w-4" />
          Query
        </button>
        <button
          onClick={() => setTab("review")}
          disabled={!canReview}
          className={cn(
            "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            tab === "review"
              ? "bg-foreground text-background"
              : "bg-white text-zinc-600 hover:bg-zinc-100 dark:bg-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900",
            !canReview && "opacity-50 cursor-not-allowed"
          )}
        >
          <ShieldCheck className="h-4 w-4" />
          Review
          {!canReview && <Badge variant="default">Viewer</Badge>}
        </button>
      </div>

      {tab === "query" ? (
        <Card>
          <form onSubmit={handleQuery} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Select label="Topic" value={queryType} onChange={(e) => setQueryType(e.target.value)}>
                {queryTypes.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
              <div />
            </div>
            <Textarea
              label="Question"
              value={queryPrompt}
              onChange={(e) => setQueryPrompt(e.target.value)}
              placeholder="e.g. What are common silent install switches for MSI installers?"
              rows={4}
              required
            />
            <div className="flex justify-end">
              <Button type="submit" loading={loading}>
                <Send className="h-4 w-4" />
                Ask AI
              </Button>
            </div>
          </form>
        </Card>
      ) : (
        <Card>
          <form onSubmit={handleReview} className="space-y-4">
            <Input
              label="Content type"
              value={reviewType}
              onChange={(e) => setReviewType(e.target.value)}
              placeholder="e.g. bundle manifest"
              required
            />
            <Textarea
              label="Content to review"
              value={reviewContent}
              onChange={(e) => setReviewContent(e.target.value)}
              placeholder="Paste JSON manifest, script, or configuration here..."
              rows={10}
              required
            />
            <div className="flex justify-end">
              <Button type="submit" loading={loading}>
                <ShieldCheck className="h-4 w-4" />
                Review
              </Button>
            </div>
          </form>
        </Card>
      )}

      {error && (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-200">
          {error}
        </div>
      )}

      {result && (
        <Card className="mt-6">
          <div className="mb-3 flex items-center gap-2">
            <Bot className="h-5 w-5" />
            <h2 className="text-lg font-semibold">AI Response</h2>
          </div>
          <div className="prose prose-zinc max-w-none whitespace-pre-wrap dark:prose-invert">
            {result}
          </div>
        </Card>
      )}
    </div>
  );
}
