"use client";

import { useState } from "react";
import { ApiError, apiFetch } from "@/lib/api/client";
import { routes } from "@/lib/api/routes";
import type { CreateApplicationRequest } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// CreateApplicationForm: MVP form to create a new application (POST /applications).
export function CreateApplicationForm({ onCreated }: { onCreated: () => void }) {

  // Form state
  const [company, setCompany] = useState("");
  const [position, setPosition] = useState("");

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Submitting Form (Add new application record)
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();   // Prevent page refresh
    setErrorMessage(null);

    // Simple validation
    if (!company || !position) {
      setErrorMessage("Company and position are required.");
      return;
    }

    // Build payload
    const payload: CreateApplicationRequest = { company, position };

    try {
      setIsSubmitting(true);

      // Create application for the current user.
      await apiFetch(routes.applications.list(), {
        method: "POST",
        body: payload,
      });

      // Reset form and refresh list.
      setCompany("");
      setPosition("");
      onCreated();

    } catch (err) {
      if (err instanceof ApiError) setErrorMessage(err.message);
      else setErrorMessage("Failed to create application.");
      
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      {errorMessage ? <div className="text-sm text-red-600">{errorMessage}</div> : null}

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="company">Company</Label>
          <Input
            id="company"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Company name"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="position">Position</Label>
          <Input
            id="position"
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            placeholder="Role title"
          />
        </div>
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Adding..." : "Add application"}
      </Button>
    </form>
  );
}
