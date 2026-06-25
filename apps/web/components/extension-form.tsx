"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Extension, Browser, ExtensionInstallMethod } from "@prisma/client";
import FormInput from "@/components/form-input";
import FormSelect from "@/components/form-select";
import SubmitButton from "@/components/submit-button";

interface ExtensionFormProps {
  initialData?: Extension | null;
}

const browsers: Browser[] = ["CHROME", "BRAVE", "EDGE"];
const installMethods: ExtensionInstallMethod[] = ["POLICY", "WEBSTORE"];

export default function ExtensionForm({ initialData }: ExtensionFormProps) {
  const router = useRouter();
  const isEditing = !!initialData;
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    name: initialData?.name ?? "",
    extensionId: initialData?.extensionId ?? "",
    browser: initialData?.browser ?? "CHROME",
    chromeStoreUrl: initialData?.chromeStoreUrl ?? "",
    installMethod: initialData?.installMethod ?? "POLICY",
  });

  function updateField<K extends keyof typeof form>(field: K, value: typeof form[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    const payload = {
      ...form,
      chromeStoreUrl: form.chromeStoreUrl || null,
    };

    const url = isEditing ? `/api/extensions/${initialData.id}` : "/api/extensions";
    const method = isEditing ? "PATCH" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({ error: "Request failed" }));

      if (!res.ok) {
        if (data.error && typeof data.error === "object") {
          const fieldErrors: Record<string, string> = {};
          Object.entries(data.error).forEach(([key, value]) => {
            if (Array.isArray(value)) fieldErrors[key] = value.join(", ");
          });
          setErrors(fieldErrors);
        } else {
          alert(data.error || "Failed to save extension");
        }
        return;
      }

      router.push("/dashboard/extensions");
      router.refresh();
    } catch (err) {
      alert("Failed to save extension");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <FormInput
          label="Name"
          required
          value={form.name}
          onChange={(e) => updateField("name", e.target.value)}
          error={errors.name}
        />
        <FormInput
          label="Extension ID"
          required
          value={form.extensionId}
          onChange={(e) => updateField("extensionId", e.target.value)}
          error={errors.extensionId}
        />
        <FormSelect
          label="Browser"
          required
          value={form.browser}
          onChange={(e) => updateField("browser", e.target.value as Browser)}
          options={browsers.map((b) => ({ value: b, label: b }))}
        />
        <FormSelect
          label="Install Method"
          required
          value={form.installMethod}
          onChange={(e) => updateField("installMethod", e.target.value as ExtensionInstallMethod)}
          options={installMethods.map((m) => ({ value: m, label: m }))}
        />
        <div className="md:col-span-2">
          <FormInput
            label="Chrome Web Store URL"
            type="url"
            value={form.chromeStoreUrl}
            onChange={(e) => updateField("chromeStoreUrl", e.target.value)}
            placeholder="https://chrome.google.com/webstore/detail/..."
          />
        </div>
      </div>

      <div className="flex items-center gap-3 pt-4">
        <SubmitButton loading={loading}>{isEditing ? "Update" : "Create"} Extension</SubmitButton>
        <a
          href="/dashboard/extensions"
          className="rounded-lg border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          Cancel
        </a>
      </div>
    </form>
  );
}
