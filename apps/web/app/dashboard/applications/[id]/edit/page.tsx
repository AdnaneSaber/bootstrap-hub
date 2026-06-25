"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Application, UploadedFile } from "@prisma/client";
import { Button, Card, PageHeader } from "@/components/ui";
import ApplicationForm from "@/components/application-form";

export default function EditApplicationPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === "string" ? params.id : "";

  const [application, setApplication] = useState<Application | null>(null);
  const [files, setFiles] = useState<Pick<UploadedFile, "id" | "originalName" | "size">[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    async function fetchData() {
      const [appRes, filesRes] = await Promise.all([
        fetch(`/api/applications/${id}`),
        fetch("/api/files"),
      ]);
      if (!appRes.ok) {
        setError("Application not found");
        setLoading(false);
        return;
      }
      const appData = await appRes.json();
      const filesData = filesRes.ok ? await filesRes.json() : [];
      setApplication(appData.data || null);
      setFiles(Array.isArray(filesData) ? filesData : []);
      setLoading(false);
    }
    fetchData();
  }, [id]);

  if (!id) {
    return <div className="py-12 text-center text-zinc-500">Invalid application ID</div>;
  }

  return (
    <div>
      <PageHeader
        title="Edit application"
        subtitle="Update installer details and detection rules"
        action={
          <Link href="/dashboard/applications">
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
        ) : application ? (
          <ApplicationForm initialData={application} files={files} />
        ) : (
          <div className="py-12 text-center text-zinc-500">Application not found</div>
        )}
      </Card>
    </div>
  );
}
