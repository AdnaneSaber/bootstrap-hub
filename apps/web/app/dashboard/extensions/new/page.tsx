"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button, Card, PageHeader } from "@/components/ui";
import ExtensionForm from "@/components/extension-form";

export default function NewExtensionPage() {
  return (
    <div>
      <PageHeader
        title="New extension"
        subtitle="Create a browser extension policy"
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
        <ExtensionForm />
      </Card>
    </div>
  );
}
