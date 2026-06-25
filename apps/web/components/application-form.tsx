"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Application, UploadedFile, InstallMethod, DetectionMethod } from "@prisma/client";
import FormInput from "@/components/form-input";
import FormSelect from "@/components/form-select";
import FormTextarea from "@/components/form-textarea";
import FormCheckbox from "@/components/form-checkbox";
import SubmitButton from "@/components/submit-button";

interface ApplicationFormProps {
  initialData?: Application | null;
  files: Pick<UploadedFile, "id" | "originalName" | "size">[];
}

const installMethods: InstallMethod[] = ["EXE", "MSI", "ZIP", "PORTABLE", "WINGET", "CHOCO"];
const detectionMethods: DetectionMethod[] = ["REGISTRY", "PROGRAM", "FILE", "CUSTOM"];

export default function ApplicationForm({ initialData, files }: ApplicationFormProps) {
  const router = useRouter();
  const isEditing = !!initialData;
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    name: initialData?.name ?? "",
    description: initialData?.description ?? "",
    category: initialData?.category ?? "",
    version: initialData?.version ?? "",
    downloadUrl: initialData?.downloadUrl ?? "",
    installMethod: initialData?.installMethod ?? "EXE",
    silentInstallCommand: initialData?.silentInstallCommand ?? "",
    detectionMethod: initialData?.detectionMethod ?? "REGISTRY",
    detectionRule: JSON.stringify((initialData?.detectionRule as Record<string, unknown>) ?? {}, null, 2),
    launchAfterInstall: initialData?.launchAfterInstall ?? false,
    launchArguments: initialData?.launchArguments ?? "",
    sha256: initialData?.sha256 ?? "",
    fileId: initialData?.fileId ?? "",
    isDraft: initialData?.isDraft ?? false,
  });

  function updateField<K extends keyof typeof form>(field: K, value: typeof form[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    let detectionRule: Record<string, unknown> = {};
    try {
      detectionRule = JSON.parse(form.detectionRule || "{}");
    } catch {
      setErrors({ detectionRule: "Invalid JSON" });
      setLoading(false);
      return;
    }

    const payload = {
      ...form,
      detectionRule,
      fileId: form.fileId || null,
      downloadUrl: form.downloadUrl || null,
    };

    const url = isEditing ? `/api/applications/${initialData.id}` : "/api/applications";
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
          alert(data.error || "Failed to save application");
        }
        return;
      }

      router.push("/dashboard/applications");
      router.refresh();
    } catch (err) {
      alert("Failed to save application");
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
          label="Category"
          required
          value={form.category}
          onChange={(e) => updateField("category", e.target.value)}
          error={errors.category}
        />
        <FormInput
          label="Version"
          value={form.version}
          onChange={(e) => updateField("version", e.target.value)}
        />
        <FormInput
          label="Download URL"
          type="url"
          value={form.downloadUrl}
          onChange={(e) => updateField("downloadUrl", e.target.value)}
          placeholder="https://"
        />
        <FormSelect
          label="Install Method"
          required
          value={form.installMethod}
          onChange={(e) => updateField("installMethod", e.target.value as InstallMethod)}
          options={installMethods.map((m) => ({ value: m, label: m }))}
        />
        <FormSelect
          label="Detection Method"
          required
          value={form.detectionMethod}
          onChange={(e) => updateField("detectionMethod", e.target.value as DetectionMethod)}
          options={detectionMethods.map((m) => ({ value: m, label: m }))}
        />
        <FormInput
          label="SHA256"
          value={form.sha256}
          onChange={(e) => updateField("sha256", e.target.value)}
        />
        <FormSelect
          label="Uploaded File"
          value={form.fileId}
          onChange={(e) => updateField("fileId", e.target.value)}
          options={[
            { value: "", label: "None" },
            ...files.map((f) => ({ value: f.id, label: `${f.originalName} (${(f.size / 1024).toFixed(1)} KB)` })),
          ]}
        />
        <FormInput
          label="Silent Install Command"
          value={form.silentInstallCommand}
          onChange={(e) => updateField("silentInstallCommand", e.target.value)}
        />
        <FormInput
          label="Launch Arguments"
          value={form.launchArguments}
          onChange={(e) => updateField("launchArguments", e.target.value)}
        />
        <div className="md:col-span-2">
          <FormTextarea
            label="Detection Rule (JSON)"
            required
            value={form.detectionRule}
            onChange={(e) => updateField("detectionRule", e.target.value)}
            rows={5}
            error={errors.detectionRule}
          />
        </div>
        <div className="md:col-span-2">
          <FormTextarea
            label="Description"
            value={form.description}
            onChange={(e) => updateField("description", e.target.value)}
            rows={3}
          />
        </div>
        <div className="flex gap-6 md:col-span-2">
          <FormCheckbox
            label="Launch after install"
            checked={form.launchAfterInstall}
            onChange={(e) => updateField("launchAfterInstall", e.target.checked)}
          />
          <FormCheckbox
            label="Draft"
            checked={form.isDraft}
            onChange={(e) => updateField("isDraft", e.target.checked)}
          />
        </div>
      </div>

      <div className="flex items-center gap-3 pt-4">
        <SubmitButton loading={loading}>{isEditing ? "Update" : "Create"} Application</SubmitButton>
        <a
          href="/dashboard/applications"
          className="rounded-lg border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          Cancel
        </a>
      </div>
    </form>
  );
}
