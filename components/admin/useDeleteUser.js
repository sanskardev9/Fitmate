"use client";

import { useState } from "react";
import { useConfirm } from "@/components/common/ConfirmDialog";
import { useAuth } from "@/components/auth/AuthProvider";
import { useAdminData, adminApi } from "./AdminShell";
import { userName } from "./ui";

// Confirm, delete, and drop the user from the dashboard's list. Used on the list and the user page.
export function useDeleteUser() {
  const confirm = useConfirm();
  const { user: me } = useAuth();
  const { setUsers } = useAdminData();
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  async function remove(u) {
    setError("");
    const ok = await confirm({
      title: `Delete ${userName(u)}?`,
      message: `This permanently deletes ${u.email} and everything they saved: profile, plans, workouts, meals, streak, feedback and notification devices. It can't be undone.`,
      confirmLabel: "Delete user",
      tone: "danger",
    });
    if (!ok) return false;
    setBusyId(u.user_id);
    try {
      await adminApi(`/api/admin/users/${u.user_id}`, { method: "DELETE" });
      setUsers((all) => all.filter((x) => x.user_id !== u.user_id));
      return true;
    } catch (e) {
      setError(`${userName(u)}: ${e.message}`);
      return false;
    } finally {
      setBusyId(null);
    }
  }
  return { remove, busyId, error, canDelete: (u) => u.user_id !== me?.id };
}
