import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { PHASE_PRODUCTION_BUILD } from "next/constants";
import { authOptions } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import Providers from "@/components/Providers";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Skip auth during static generation so the build can prerender dashboard pages.
  if (process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD) {
    return (
      <Providers>
        <div className="flex min-h-screen flex-col">
          <Navbar />
          <main className="flex-1 bg-zinc-50 px-4 py-6 dark:bg-zinc-950 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl">{children}</div>
          </main>
        </div>
      </Providers>
    );
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <Providers>
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1 bg-zinc-50 px-4 py-6 dark:bg-zinc-950 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </Providers>
  );
}
