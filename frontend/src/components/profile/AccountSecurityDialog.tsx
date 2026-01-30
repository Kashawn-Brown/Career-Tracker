"use client";

import { useState } from "react";
import { Settings } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { usersApi } from "@/lib/api/users";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type View = "home" | "changePassword";

export function AccountSecurityDialog() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("home");

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const busy = isChangingPassword || isDeactivating || isDeleting;

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);

    if (!nextOpen) {
      setView("home");
      setErrorMessage(null);
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    const oldPw = oldPassword.trim();
    const newPw = newPassword.trim();
    const confirmPw = confirmPassword.trim();

    if (!oldPw || !newPw) {
      setErrorMessage("Please enter your current password and a new password.");
      return;
    }

    if (newPw !== confirmPw) {
      setErrorMessage("New passwords do not match.");
      return;
    }

    try {
      setIsChangingPassword(true);
      await usersApi.changePassword({ oldPassword: oldPw, newPassword: newPw });

      // Backend revokes sessions + clears refresh cookie; redirect to login for clean re-auth.
      window.location.assign("/login");
    } catch (err) {
      if (err instanceof ApiError) setErrorMessage(err.message);
      else setErrorMessage("Failed to change password.");
    } finally {
      setIsChangingPassword(false);
    }
  }

  async function handleDeactivate() {
    setErrorMessage(null);

    const ok = window.confirm(
      "Deactivate your account?\n\nYou’ll be signed out. Signing in again will reactivate your account."
    );
    if (!ok) return;

    try {
      setIsDeactivating(true);
      await usersApi.deactivateMe();
      window.location.assign("/login");
    } catch (err) {
      if (err instanceof ApiError) setErrorMessage(err.message);
      else setErrorMessage("Failed to deactivate account.");
    } finally {
      setIsDeactivating(false);
    }
  }

  async function handleForceDelete() {
    setErrorMessage(null);

    const ok = window.confirm(
      "Permanently delete your account?\n\nThis cannot be undone."
    );
    if (!ok) return;

    try {
      setIsDeleting(true);
      await usersApi.deleteMe();
      window.location.assign("/");
    } catch (err) {
      if (err instanceof ApiError) setErrorMessage(err.message);
      else setErrorMessage("Failed to delete account.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="icon" aria-label="Settings" title="Settings">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Account security actions.</DialogDescription>
        </DialogHeader>

        {errorMessage ? (
          <Alert variant="destructive" className="mt-3">
            {errorMessage}
          </Alert>
        ) : null}

        {view === "home" ? (
          <div className="mt-4 space-y-4">
            <div className="space-y-2 mb-8 mt-8">
              <Button
                type="button"
                variant="outline"
                className="w-full justify-center"
                onClick={() => setView("changePassword")}
                disabled={busy}
              >
                Change password
              </Button>
            </div>

            <div className="space-y-2 border-t pt-4">
              <div className="text-sm font-medium"> Account Actions:</div>

              <Button
                type="button"
                variant="outline"
                className="w-full justify-center mb-4 mt-2"
                onClick={handleDeactivate}
                disabled={busy}
              >
                {isDeactivating ? "Deactivating..." : "Deactivate account"}
              </Button>

              <Button
                type="button"
                variant="destructive"
                className="w-full justify-center hover:text-red-900"
                onClick={handleForceDelete}
                disabled={busy}
              >
                {isDeleting ? "Deleting..." : "Delete account"}
              </Button>

              <p className="text-xs text-muted-foreground">
                Deactivating signs you out and blocks access until you sign in again. Deleting is permanent.
              </p>
            </div>
          </div>
        ) : (
          <form className="mt-4 space-y-4" onSubmit={handleChangePassword}>
            <div className="flex items-center justify-between">
              <Button type="button" variant="outline" size="sm" onClick={() => setView("home")} disabled={busy}>
                Back
              </Button>
            </div>

            <div className="space-y-1 mb-8">
              <Label htmlFor="currentPassword">Current password</Label>
              <Input
                id="currentPassword"
                type="password"
                autoComplete="current-password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                disabled={busy}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="newPassword">New password</Label>
              <Input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={busy}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={busy}
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={busy}>
                {isChangingPassword ? "Updating..." : "Update password"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
