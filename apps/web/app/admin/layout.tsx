"use client";

import { AdminGuard } from "./components/AdminGuard";
import { usePathname } from "next/navigation";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  if (pathname === "/admin/sign-in") {
    return children;
  }

  return (
    <AdminGuard requireAdmin={true}>
      {children}
    </AdminGuard>
  );
}
