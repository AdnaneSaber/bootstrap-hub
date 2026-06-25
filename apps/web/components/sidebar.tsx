"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Role } from "@prisma/client";
import {
  LayoutDashboard,
  Box,
  Puzzle,
  Package,
  PlayCircle,
  ClipboardList,
  Users,
  LogOut,
  Shield,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: Role[];
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/applications", label: "Applications", icon: Box },
  { href: "/dashboard/extensions", label: "Extensions", icon: Puzzle },
  { href: "/dashboard/bundles", label: "Bundles", icon: Package },
  { href: "/dashboard/startup-actions", label: "Startup Actions", icon: PlayCircle },
  { href: "/dashboard/audit-logs", label: "Audit Logs", icon: ClipboardList },
  { href: "/dashboard/users", label: "Users", icon: Users, roles: [Role.ADMIN] },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user?.role ?? Role.VIEWER;

  const visibleItems = navItems.filter(
    (item) => !item.roles || item.roles.includes(role)
  );

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-zinc-200 bg-white">
      <div className="flex items-center gap-2 border-b border-zinc-200 px-6 py-4">
        <Shield className="h-6 w-6 text-zinc-900" />
        <span className="text-lg font-semibold text-zinc-900">Bootstrap Hub</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "bg-zinc-900 text-white"
                      : "text-zinc-700 hover:bg-zinc-100"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-zinc-200 p-4">
        <div className="mb-3 px-3">
          <p className="truncate text-sm font-medium text-zinc-900">
            {session?.user?.name || session?.user?.email}
          </p>
          <p className="text-xs text-zinc-500">{role}</p>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
