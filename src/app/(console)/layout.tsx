import { AuthGate } from "@/components/layout/auth-gate";
import { SidebarNav } from "@/components/layout/nav";
import { Topbar } from "@/components/layout/topbar";

export default function ConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGate>
      <div className="min-h-screen bg-slate-50">
        <SidebarNav />
        <div className="pl-64">
          <Topbar />
          <main className="mx-auto max-w-[1500px] px-6 py-5">{children}</main>
        </div>
      </div>
    </AuthGate>
  );
}
