"use client";

import { AdminGuard } from "./components/AdminGuard";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminGuard requireAdmin={false} requireModerator={true}>
      {children}
    </AdminGuard>
  );
}
