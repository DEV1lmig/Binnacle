"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar";
import { Badge } from "@/app/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Shield, ShieldCheck, User, ArrowLeft, Loader2 } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import { AdminGuard } from "../components/AdminGuard";

type Role = "user" | "moderator" | "admin";

const ROLE_COLORS: Record<Role, string> = {
  admin: "bg-red-500/20 text-red-400 border-red-500/30",
  moderator: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  user: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

const ROLE_ICONS: Record<Role, React.ReactNode> = {
  admin: <ShieldCheck className="w-3 h-3" />,
  moderator: <Shield className="w-3 h-3" />,
  user: <User className="w-3 h-3" />,
};

export default function UsersAdminPage() {
  const router = useRouter();
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  
  const users = useQuery(api.admin.listUsersWithRoles, { 
    limit: 25,
    roleFilter: roleFilter === "all" ? undefined : roleFilter,
  });
  const stats = useQuery(api.admin.getDashboardStats);
  const currentUserRole = useQuery(api.admin.getCurrentUserRole);
  const setUserRole = useMutation(api.admin.setUserRole);

  const handleRoleChange = async (userId: Id<"users">, newRole: string) => {
    if (!currentUserRole?.isAdmin) return;
    
    setUpdatingUserId(userId);
    try {
      const result = await setUserRole({ userId, role: newRole });
      if (result.success) {
        // Role updated successfully
      }
    } catch (error) {
      console.error("Failed to update role:", error);
      alert(error instanceof Error ? error.message : "Failed to update role");
    } finally {
      setUpdatingUserId(null);
    }
  };

  return (
    <AdminGuard requireAdmin={true}>
      <div className="min-h-screen bg-[var(--bkl-color-bg-primary)] p-4 md:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Button
              variant="ghost"
              onClick={() => router.push("/admin")}
              className="mb-2 -ml-2 text-[var(--bkl-color-text-secondary)] hover:text-[var(--bkl-color-text-primary)]"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Admin
            </Button>
            <h1 className="text-2xl font-bold text-[var(--bkl-color-text-primary)]">
              User Management
            </h1>
            <p className="text-[var(--bkl-color-text-secondary)]">
              Manage user roles and permissions
            </p>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-[var(--bkl-color-bg-secondary)] border-[var(--bkl-color-border)]">
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-[var(--bkl-color-text-primary)]">
                  {stats.users.total}
                </div>
                <p className="text-sm text-[var(--bkl-color-text-secondary)]">Total Users</p>
              </CardContent>
            </Card>
            <Card className="bg-[var(--bkl-color-bg-secondary)] border-[var(--bkl-color-border)]">
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-red-400">
                  {stats.users.admins}
                </div>
                <p className="text-sm text-[var(--bkl-color-text-secondary)]">Admins</p>
              </CardContent>
            </Card>
            <Card className="bg-[var(--bkl-color-bg-secondary)] border-[var(--bkl-color-border)]">
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-yellow-400">
                  {stats.users.moderators}
                </div>
                <p className="text-sm text-[var(--bkl-color-text-secondary)]">Moderators</p>
              </CardContent>
            </Card>
            <Card className="bg-[var(--bkl-color-bg-secondary)] border-[var(--bkl-color-border)]">
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-blue-400">
                  {stats.users.users}
                </div>
                <p className="text-sm text-[var(--bkl-color-text-secondary)]">Users</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Users List */}
        <Card className="bg-[var(--bkl-color-bg-secondary)] border-[var(--bkl-color-border)]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-[var(--bkl-color-text-primary)]">Users</CardTitle>
                <CardDescription>Click on a role to change it</CardDescription>
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-40 bg-[var(--bkl-color-bg-tertiary)] border-[var(--bkl-color-border)]">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admins</SelectItem>
                  <SelectItem value="moderator">Moderators</SelectItem>
                  <SelectItem value="user">Users</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {users === undefined ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-[var(--bkl-color-accent-primary)]" />
              </div>
            ) : users.length === 0 ? (
              <p className="text-center py-8 text-[var(--bkl-color-text-secondary)]">
                No users found
              </p>
            ) : (
              <div className="space-y-2">
                {users.map((user) => {
                  const isCurrentUser = currentUserRole?.userId === user._id;
                  const isUpdating = updatingUserId === user._id;
                  
                  return (
                    <div
                      key={user._id}
                      className="flex items-center justify-between p-3 rounded-lg bg-[var(--bkl-color-bg-tertiary)] border border-[var(--bkl-color-border)]"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={user.avatarUrl} alt={user.name} />
                          <AvatarFallback className="bg-[var(--bkl-color-accent-primary)] text-white">
                            {user.name?.charAt(0).toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-[var(--bkl-color-text-primary)]">
                              {user.name}
                            </span>
                            {isCurrentUser && (
                              <Badge variant="outline" className="text-xs">
                                You
                              </Badge>
                            )}
                          </div>
                          <span className="text-sm text-[var(--bkl-color-text-secondary)]">
                            @{user.username}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {isUpdating ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Select
                            value={user.role}
                            onValueChange={(value) => handleRoleChange(user._id, value)}
                            disabled={isCurrentUser || !currentUserRole?.isAdmin}
                          >
                            <SelectTrigger 
                              className={`w-32 border ${ROLE_COLORS[user.role as Role]} ${isCurrentUser ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              <div className="flex items-center gap-2">
                                {ROLE_ICONS[user.role as Role]}
                                <SelectValue />
                              </div>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">
                                <div className="flex items-center gap-2">
                                  <User className="w-3 h-3" />
                                  User
                                </div>
                              </SelectItem>
                              <SelectItem value="moderator">
                                <div className="flex items-center gap-2">
                                  <Shield className="w-3 h-3" />
                                  Moderator
                                </div>
                              </SelectItem>
                              <SelectItem value="admin">
                                <div className="flex items-center gap-2">
                                  <ShieldCheck className="w-3 h-3" />
                                  Admin
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Back Button */}
        <Button
          variant="outline"
          onClick={() => router.push("/admin")}
          className="w-full border-[var(--bkl-color-border)]"
        >
          Back to Admin Panel
        </Button>
        </div>
      </div>
    </AdminGuard>
  );
}
