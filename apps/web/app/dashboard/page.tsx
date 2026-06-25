import { getServerSession } from "next-auth/next";
import Link from "next/link";
import {
  Box,
  Package,
  Puzzle,
  FileUp,
  PlayCircle,
  Bot,
  ClipboardList,
} from "lucide-react";
import { authOptions } from "@/lib/auth";
import { Card } from "@/components/ui";

const cards = [
  { href: "/dashboard/applications", label: "Applications", icon: Package, desc: "Manage software installers" },
  { href: "/dashboard/extensions", label: "Extensions", icon: Puzzle, desc: "Browser extension policies" },
  { href: "/dashboard/files", label: "Files", icon: FileUp, desc: "Uploaded installers" },
  { href: "/dashboard/startup-actions", label: "Startup", icon: PlayCircle, desc: "First-run actions" },
  { href: "/dashboard/bundles", label: "Bundles", icon: Box, desc: "Multi-select deployment manifests" },
  { href: "/dashboard/ai-agent", label: "AI Agent", icon: Bot, desc: "Query and review with AI" },
  { href: "/dashboard/audit-logs", label: "Audit Logs", icon: ClipboardList, desc: "Track changes" },
];

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">
          Welcome, {session?.user?.name || session?.user?.email || "User"}
        </h1>
        <p className="mt-2 text-zinc-500 dark:text-zinc-400">
          Manage applications, extensions, bundles, and review deployment activity.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.href} href={card.href}>
              <Card className="h-full transition-colors hover:border-foreground">
                <div className="flex items-start gap-4">
                  <div className="rounded-lg bg-zinc-100 p-3 dark:bg-zinc-900">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">{card.label}</h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">{card.desc}</p>
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
