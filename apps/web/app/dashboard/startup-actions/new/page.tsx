"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button, Card, PageHeader } from "@/components/ui";
import StartupActionForm from "@/components/startup-action-form";

export default function NewStartupActionPage() {
  return (
    <div>
      <PageHeader
        title="New startup action"
        subtitle="Define a first-run action"
        action={
          <Link href="/dashboard/startup-actions">
            <Button variant="ghost">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
        }
      />

      <Card>
        <StartupActionForm />
      </Card>
    </div>
  );
}
