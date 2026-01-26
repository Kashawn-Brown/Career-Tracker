"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { proApi } from "@/lib/api/pro-api";
import { ApiError, getErrorCode } from "@/lib/api/client";
import { useAuth } from "@/hooks/useAuth";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRequested?: () => void;
};

export function RequestProDialog({ open, onOpenChange, onRequested }: Props) {
  const { user } = useAuth();
  const [note, setNote] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Generate the preview text for the Pro request.
  const preview = useMemo(() => {
    const from = user ? `${user.name ?? "User"} (${user.email})` : "—";
    const base = "Hi, I'm requesting Pro access to Career-Tracker for full access to AI tools.";
    const extra = note.trim();
    return extra ? `From: ${from}\n\n${base}\n\nExtra note:\n${extra}` : `From: ${from}\n\n${base}`;
  }, [note, user]);

  // Handle sending the Pro request.
  async function handleSend() {
    setErrorMessage(null);
    setIsSending(true);

    try {
      const noteClean = note.trim();
      await proApi.requestPro({ note: noteClean.length ? noteClean : undefined });
      onRequested?.();
      onOpenChange(false);
      setNote("");
    } catch (err) {
      if (err instanceof ApiError) {
        const code = getErrorCode(err);
        setErrorMessage(code ? `${err.message} (${code})` : err.message);
      } else {
        setErrorMessage("Failed to send request. Please try again.");
      }
    } finally {
      setIsSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Request Pro access</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <div className="text-sm font-medium mb-1">Preview</div>
            <Textarea value={preview} readOnly rows={7} />
          </div>

          <div>
            <div className="text-sm font-medium mb-1">Add a note (optional)</div>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              maxLength={500}
              placeholder="Anything you want the admin to know?"
            />
            <div className="mt-1 text-xs text-muted-foreground">{note.length}/500</div>
          </div>

          {errorMessage ? <div className="text-sm text-red-600">{errorMessage}</div> : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={isSending}>
            {isSending ? "Sending..." : "Send request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
