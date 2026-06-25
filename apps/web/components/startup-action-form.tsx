"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { StartupAction, StartupActionType } from "@prisma/client";
import FormInput from "@/components/form-input";
import FormSelect from "@/components/form-select";
import FormTextarea from "@/components/form-textarea";
import FormCheckbox from "@/components/form-checkbox";
import SubmitButton from "@/components/submit-button";

interface StartupActionFormProps {
  initialData?: StartupAction | null;
}

const actionTypes: StartupActionType[] = ["EXECUTE", "POWERSHELL", "CMD", "URL"];

export default function StartupActionForm({ initialData }: StartupActionFormProps) {
  const router = useRouter();
  const isEditing = !!initialData;
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    name: initialData?.name ?? "",
    actionType: initialData?.actionType ?? "EXECUTE",
    target: initialData?.target ?? "",
    arguments: initialData?.arguments ?? "",
    workingDir: initialData?.workingDir ?? "",
    order: initialData?.order ?? 0,
    enabled: initialData?.enabled ?? true,
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
      arguments: form.arguments || null,
      workingDir: form.workingDir || null,
    };

    const url = isEditing ? `/api/startup-actions/${initialData.id}` : "/api/startup-actions";
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
          alert(data.error || "Failed to save startup action");
        }
        return;
      }

      router.push("/dashboard/startup-actions");
      router.refresh();
    } catch (err) {
      alert("Failed to save startup action");
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
        <FormSelect
          label="Action Type"
          required
          value={form.actionType}
          onChange={(e) => updateField("actionType", e.target.value as StartupActionType)}
          options={actionTypes.map((t) => ({ value: t, label: t }))}
        />
        <div className="md:col-span-2">
          <FormInput
            label="Target"
            required
            value={form.target}
            onChange={(e) => updateField("target", e.target.value)}
            placeholder="Path, URL, or command"
            error={errors.target}
          />
        </div>
        <FormInput
          label="Arguments"
          value={form.arguments}
          onChange={(e) => updateField("arguments", e.target.value)}
        />
        <FormInput
          label="Working Directory"
          value={form.workingDir}
          onChange={(e) => updateField("workingDir", e.target.value)}
        />
        <FormInput
          label="Order"
          type="number"
          required
          value={form.order}
          onChange={(e) => updateField("order", Number(e.target.value))}
        />
        <FormCheckbox
          label="Enabled"
          checked={form.enabled}
          onChange={(e) => updateField("enabled", e.target.checked)}
        />
      </div>

      <div className="flex items-center gap-3 pt-4">
        <SubmitButton loading={loading}>{isEditing ? "Update" : "Create"} Startup Action</SubmitButton>
        <a
          href="/dashboard/startup-actions"
          className="rounded-lg border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          Cancel
        </a>
      </div>
    </form>
  );
}
