import { Sidebar } from "@/components/admin/Sidebar";
import { AuthGate } from "@/components/admin/AuthGate";
import { ConfirmDialogRoot } from "@/components/ui/ConfirmDialog";
import { ToastRoot } from "@/components/ui/Toast";

/* Sidebar-тай бүх admin хуудсуудын дундын layout. AuthGate-аар хамгаалагдсан.
   Confirm dialog + toast root глобал — useConfirm() / toast() hook аль ч хуудаснаас дуудна. */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 overflow-x-hidden">
          <div className="p-6 md:p-8 xl:px-10 2xl:px-12 w-full">{children}</div>
        </main>
      </div>
      <ConfirmDialogRoot />
      <ToastRoot />
    </AuthGate>
  );
}
