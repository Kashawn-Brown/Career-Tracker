"use client";

import { ApiError } from "@/lib/api/client";
import { applicationsApi } from "@/lib/api/applications";
import { connectionsApi } from "@/lib/api/connections";
import { useConnectionAutocomplete } from "@/hooks/useConnectionAutocomplete";

import { useEffect, useMemo,useState } from "react";
import { Link2, Plus,Trash2, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";


import type { 
  ApplicationConnection,
  Connection,
  CreateConnectionRequest,
} from "@/types/api";

// AddDraft: a draft of a connection to be added to an application.
type AddDraft = {
  name: string;
  company: string;
  title: string;
  email: string;
  linkedInUrl: string;
  phone: string;
  relationship: string;
  location: string;
  notes: string;
  status: "" | "true" | "false"; // "" = unset
};

// emptyDraft: returns an empty draft of a connection to be added to an application.
function emptyDraft(): AddDraft {
  return {
    name: "",
    company: "",
    title: "",
    email: "",
    linkedInUrl: "",
    phone: "",
    relationship: "",
    location: "",
    notes: "",
    status: "",
  };
}

// toDraft: converts a Connection to an AddDraft.
function toDraft(c: Connection): AddDraft {
  return {
    name: c.name ?? "",
    company: c.company ?? "",
    title: c.title ?? "",
    email: c.email ?? "",
    linkedInUrl: c.linkedInUrl ?? "",
    phone: c.phone ?? "",
    relationship: c.relationship ?? "",
    location: c.location ?? "",
    notes: c.notes ?? "",
    status: c.status === null ? "" : c.status ? "true" : "false",
  };
}

/**
 * Build CreateConnectionRequest without sending nulls (backend schema uses Optional(String), not nullable).
 * Omit empty fields to keep thepayload clean.
 */
function toCreateRequest(d: AddDraft): CreateConnectionRequest {
  const payload: CreateConnectionRequest = { name: d.name.trim() };

  const company = d.company.trim();
  if (company) payload.company = company;

  const title = d.title.trim();
  if (title) payload.title = title;

  const email = d.email.trim();
  if (email) payload.email = email;

  const linkedInUrl = d.linkedInUrl.trim();
  if (linkedInUrl) payload.linkedInUrl = linkedInUrl;

  const phone = d.phone.trim();
  if (phone) payload.phone = phone;

  const relationship = d.relationship.trim();
  if (relationship) payload.relationship = relationship;

  const location = d.location.trim();
  if (location) payload.location = location;

  const notes = d.notes.trim();
  if (notes) payload.notes = notes;

  if (d.status === "true") payload.status = true;
  if (d.status === "false") payload.status = false;

  return payload;
}


// ApplicationConnectionsSection: a section for displaying and managing the connections attached to an application.

export function ApplicationConnectionsSection({
  applicationId,
  open,
  isEditing,
  onConnectionsChanged,
}: {
  applicationId: string;
  open: boolean;
  isEditing: boolean;
  onConnectionsChanged?: (applicationId: string) => void;
}) {
  // State for the connections attached to the application.
  const [connections, setConnections] = useState<ApplicationConnection[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ---- Add Connection states ----
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addDraft, setAddDraft] = useState<AddDraft>(emptyDraft());
  const [selectedExisting, setSelectedExisting] = useState<Connection | null>(null);

  const [isAddSaving, setIsAddSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // attachedIds: the ids of the connections attached to the application.
  const attachedIds = useMemo(() => new Set(connections.map((c) => c.id)), [connections]);

  // suggestions: the suggestions for the connection to be added.
  // isSuggestLoading: whether the suggestions are loading.
  const { items: suggestions, isLoading: isSuggestLoading } =
    useConnectionAutocomplete(addDraft.name, (isAddOpen && !selectedExisting));
  
  // starts the add connection dialog.
  function startAdd() {
    setAddError(null);
    setSelectedExisting(null);
    setAddDraft(emptyDraft());
    setIsAddOpen(true);
  }

  // closes the add connection dialog.
  function closeAdd() {
    setIsAddOpen(false);
    setAddError(null);
    setSelectedExisting(null);
    setAddDraft(emptyDraft());
  }

  // applies a suggestion for the connection to be added.
  function applySuggestion(c: Connection) {
    setAddError(null);
    setSelectedExisting(c);
    setAddDraft(toDraft(c)); // fill + lock fields until user confirms
  }

  // uses a different person for the connection to be added.
  function useDifferentPerson() {
    // Keep the typed name so they can continue quickly.
    const keepName = addDraft.name;
    setSelectedExisting(null);
    setAddError(null);
    setAddDraft({ ...emptyDraft(), name: keepName });
  }

  // Fetch attached connections whenever the drawer opens or application changes
  useEffect(() => {
    if (!open) return;
    if (!applicationId) return;

    refresh();
  }, [open, applicationId]);

  // refresh: refreshes the list of connections attached to the application.
  async function refresh() {
    setIsLoading(true);
    try {
      setErrorMessage(null);
      const res = await applicationsApi.listApplicationConnections(applicationId);
      setConnections(res.connections ?? []);
    } catch (err) {
      setConnections([]);
      if (err instanceof ApiError) setErrorMessage(err.message);
      else setErrorMessage("Failed to load connections.");
    } finally {
      setIsLoading(false);
    }
  }

  // onDetach: removes a connection from the application.
  async function onDetach(connectionId: string, name: string) {
    const ok = window.confirm(`Remove "${name}" as a connection on this application?`);
    if (!ok) return;

    try {
      setErrorMessage(null);
      await applicationsApi.removeConnectionFromApplication(applicationId, connectionId);
      await refresh();
      onConnectionsChanged?.(applicationId);
    } catch (err) {
      if (err instanceof ApiError) setErrorMessage(err.message);
      else setErrorMessage("Failed to remove connection.");
    }
  }

  // confirmAdd: confirms the addition of a connection to the application.
  async function confirmAdd() {
    if (!applicationId) return;

    // Required field
    if (!addDraft.name.trim()) {
      setAddError("Name is required.");
      return;
    }

    setIsAddSaving(true);
    setAddError(null);

    try {
      // Existing selected -> confirm attach
      if (selectedExisting) {
        await applicationsApi.attachConnectionToApplication(applicationId, selectedExisting.id);
      } 
      else {
        // New -> create then attach
        const payload = toCreateRequest(addDraft);
        const created = await connectionsApi.createConnection(payload);
        await applicationsApi.attachConnectionToApplication(applicationId, created.connection.id);
      }

      await refresh();
      onConnectionsChanged?.(applicationId);
      closeAdd();
    } catch (err) {
      if (err instanceof ApiError) setAddError(err.message);
      else setAddError("Failed to add connection.");
    } finally {
      setIsAddSaving(false);
    }
  }



  return (
    <div className="space-y-4">
      {errorMessage ? (
        <div className="rounded-md border px-3 py-2 text-sm text-destructive">
          {errorMessage}
        </div>
      ) : null}

      <div className="rounded-md border">
        
        {/* Connections list */}
        <div className="px-3 py-2 border-b flex items-center justify-between">
          <div className="text-sm font-medium">People</div>

          <div className="flex items-center gap-2">
            <div className="text-xs text-muted-foreground">
              {isLoading ? "Loading..." : `${connections.length} connection(s)`}
            </div>

            {isEditing ? (
              <Button variant="secondary" size="sm" onClick={startAdd}>
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            ) : null}
          </div>
        </div>

        {connections.length === 0 && !isLoading ? (
          <div className="p-3 text-sm text-muted-foreground">
            No connections attached to this application yet.
          </div>
        ) : (
          <div className="divide-y">
            {connections.map((c) => {

              const titleLine = [c.title, c.company].filter(Boolean).join(" • ");
              const metaLine = [c.relationship, c.location].filter(Boolean).join(" • ");

              return (
                <div
                  key={c.id}
                  className="px-3 py-2 flex items-center gap-3 hover:bg-muted/40"
                >
                  <UserRound className="h-4 w-4 text-muted-foreground" />

                  <div className="min-w-0 flex-1">
                    <div 
                    className="text-sm truncate cursor-pointer"
                    onClick={() => {
                      if(c.linkedInUrl) {
                        window.open(c.linkedInUrl, "_blank", "noopener,noreferrer");
                      }
                      else if(c.email) {
                        window.open(`mailto:${c.email}`, "_blank", "noopener,noreferrer");
                      }
                    }}
                    >
                      {c.name}
                    </div>

                    {titleLine ? (
                      <div className="text-xs text-muted-foreground truncate">
                        {titleLine}
                      </div>
                    ) : null}

                    {metaLine ? (
                      <div className="text-xs text-muted-foreground truncate">
                        {metaLine}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-1">
                    {c.linkedInUrl ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Open LinkedIn"
                        onClick={() => window.open(c.linkedInUrl!, "_blank", "noopener,noreferrer")}
                      >
                        <Link2 className="h-4 w-4" />
                      </Button>
                    ) : null}

                    {isEditing ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Remove from application"
                        onClick={() => onDetach(c.id, c.name)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Connection Dialog */}
      <Dialog open={isAddOpen} onOpenChange={(open) => (open ? setIsAddOpen(true) : closeAdd())}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Add connection</DialogTitle>
            {/* <DialogDescription>
              Start typing a name. If it matches an existing person, you can select it and confirm adding.
            </DialogDescription> */}
          </DialogHeader>

          {addError ? (
            <div className="rounded-md border px-3 py-2 text-sm text-destructive">
              {addError}
            </div>
          ) : null}

          {/* Existing selection banner */}
          {selectedExisting ? (
            <div className="rounded-md border px-3 py-2 text-sm flex items-center justify-between mb-4 mt-4">
              <div>
                Add existing: <span className="font-medium">{selectedExisting.name}</span>
                <span className="text-xs text-muted-foreground"> • {selectedExisting.company ?? ""}</span>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={useDifferentPerson}>
                Not this person?
              </Button>
            </div>
          ) : null}

          {/* Add Connection Form */}
          <div className="space-y-4">
            
            {/* Name + suggestions */}
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Name</div>

              <div className="relative">
                <Input
                  value={addDraft.name}
                  onChange={(e) => setAddDraft((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g., John Doe"
                  disabled={!!selectedExisting}
                />

                {!selectedExisting && addDraft.name.trim().length >= 2 ? (
                  <div className="absolute z-50 mt-1 w-full rounded-md border bg-background shadow">
                    {isSuggestLoading ? (
                      <div className="px-3 py-2 text-xs text-muted-foreground">Searching…</div>
                    ) : null}

                    {!isSuggestLoading && suggestions.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-muted-foreground">No matches</div>
                    ) : null}

                    {suggestions.map((c) => {
                      const alreadyAdded = attachedIds.has(c.id);
                      const subtitle = [c.title, c.company].filter(Boolean).join(" • ");

                      return (
                        <button
                          key={c.id}
                          type="button"
                          disabled={alreadyAdded}
                          onClick={() => applySuggestion(c)}
                          className={`flex w-full flex-col gap-0.5 px-3 py-2 text-left hover:bg-muted ${
                            alreadyAdded ? "opacity-50 cursor-not-allowed" : ""
                          }`}
                          title={alreadyAdded ? "Already attached to this application" : "Use this connection"}
                        >
                          <div className="text-sm font-medium flex items-center justify-between">
                            <span>{c.name}</span>
                            {alreadyAdded ? (
                              <span className="text-xs text-muted-foreground">Already added</span>
                            ) : null}
                          </div>
                          {subtitle ? (
                            <div className="text-xs text-muted-foreground">{subtitle}</div>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </div>

            {/* The rest of the fields (locked when existing selected) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Company</div>
                <Input
                  value={addDraft.company}
                  onChange={(e) => setAddDraft((p) => ({ ...p, company: e.target.value }))}
                  placeholder=""
                  disabled={!!selectedExisting}
                />
              </div>

              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Title</div>
                <Input
                  value={addDraft.title}
                  onChange={(e) => setAddDraft((p) => ({ ...p, title: e.target.value }))}
                  placeholder=""
                  disabled={!!selectedExisting}
                />
              </div>

              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Email</div>
                <Input
                  value={addDraft.email}
                  onChange={(e) => setAddDraft((p) => ({ ...p, email: e.target.value }))}
                  placeholder=""
                  disabled={!!selectedExisting}
                />
              </div>

              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Phone</div>
                <Input
                  value={addDraft.phone}
                  onChange={(e) => setAddDraft((p) => ({ ...p, phone: e.target.value }))}
                  placeholder=""
                  disabled={!!selectedExisting}
                />
              </div>

              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Relationship</div>
                <Input
                  value={addDraft.relationship}
                  onChange={(e) => setAddDraft((p) => ({ ...p, relationship: e.target.value }))}
                  placeholder=""
                  disabled={!!selectedExisting}
                />
              </div>

              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Location</div>
                <Input
                  value={addDraft.location}
                  onChange={(e) => setAddDraft((p) => ({ ...p, location: e.target.value }))}
                  placeholder=""
                  disabled={!!selectedExisting}
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <div className="text-sm text-muted-foreground">LinkedIn URL</div>
                <Input
                  value={addDraft.linkedInUrl}
                  onChange={(e) => setAddDraft((p) => ({ ...p, linkedInUrl: e.target.value }))}
                  placeholder=""
                  disabled={!!selectedExisting}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Notes</div>
              <Textarea
                value={addDraft.notes}
                onChange={(e) => setAddDraft((p) => ({ ...p, notes: e.target.value }))}
                placeholder=""
                disabled={!!selectedExisting}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={closeAdd} disabled={isAddSaving}>
                Cancel
              </Button>

              <Button type="button" onClick={confirmAdd} disabled={isAddSaving}>
                {isAddSaving ? "Saving..." : selectedExisting ? "Add this connection" : "Create & add"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
