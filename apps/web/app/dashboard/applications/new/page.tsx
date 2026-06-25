"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button, Card, PageHeader } from "@/components/ui";
import ApplicationForm from "@/components/application-form";

interface UploadedFile {
  id: string;
  originalName: string;
  size: number;
}

export default function NewApplicationPage() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFiles() {
      const res = await fetch("/api/files");
      const data = res.ok ? await res.json() : [];
      setFiles(Array.isArray(data) ? data : []);
      setLoading(false);
    }
    fetchFiles();
  }, []);

  return (
    <div>
      <PageHeader
        title="New application"
        subtitle="Create a software installer entry"
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
        ) : (
          <ApplicationForm files={files} />
        )}
      </Card>
    </div>
  );
}
