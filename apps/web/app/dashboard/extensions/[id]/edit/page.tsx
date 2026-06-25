"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Extension } from "@prisma/client";
import { Button, Card, PageHeader } from "@/components/ui";
import ExtensionForm from "@/components/extension-form";

export default function EditExtensionPage() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";

  const [extension, setExtension] = useState<Extension | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    async function fetchExtension() {
      const res = await fetch(`/api/extensions/${id}`);
      if (!res.ok) {
        setError("Extension not found");
        setLoading(false);
        return;
      }
      const data = await res.json();
      setExtension(data.data || null);
      setLoading(false);
    }
    fetchExtension();
  }, [id]);

  if (!id) {
    return <div className="py-12 text-center text-zinc-500">Invalid extension ID</div>;
  }

  return (
    <div>
      <PageHeader
        title="Edit extension"
        subtitle="Update browser extension policy"
        action={
          <Link href="/dashboard/extensions">
            <Button variant="ghost">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
        }
      />

      <Card>
        {loading ? (
          <div className="py-12 text-center text-zinc-500">Loading...</div>
        ) : error ? (
          <div className="py-12 text-center text-red-600">{error}</div>
        ) : extension ? (
          <ExtensionForm initialData={extension} />
        ) : (
          <div className="py-12 text-center text-zinc-500">Extension not found</div>
        )}
      </Card>
    </div>
  );
}
