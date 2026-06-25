"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button, Card, PageHeader } from "@/components/ui";
import FileUploadForm from "@/components/file-upload-form";

export default function UploadFilePage() {
  return (
    <div>
      <PageHeader
        title="Upload file"
        subtitle="Upload an installer or asset"
        action={
          <Link href="/dashboard/files">
            <Button variant="ghost">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
        }
      />

      <Card>
        <FileUploadForm />
      </Card>
    </div>
  );
}
