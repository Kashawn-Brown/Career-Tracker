"use client";

import { ApiError } from "@/lib/api/client";
import { applicationsApi } from "@/lib/api/applications";
import { connectionsApi } from "@/lib/api/connections";
import { useConnectionAutocomplete } from "@/hooks/useConnectionAutocomplete";

import { useCallback, useEffect, useMemo,useState } from "react";
import { Link2, Plus,Trash2, UserRound, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";


import type { 
  ApplicationConnection,
  Connection,
  CreateConnectionRequest,
} from "@/types/api";

// Selector for the application details drawer (used to dock dialogs to the left-side available space)
const DRAWER_SELECTOR = '[data-app-drawer="application-details"]';

// Layout tuning (match FitReportDialog / preview behavior)
const DOCK_PADDING_PX = 24;
const DOCK_MAX_WIDTH_PX = 640; // same as previous sm:max-w
const DOCK_MIN_WIDTH_PX = 420; // keep readable even if overlap happens


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
  closeDocPreview
}: {
  applicationId: string;
  open: boolean;
  isEditing: boolean;
  onConnectionsChanged?: (applicationId: string) => void;
  closeDocPreview?: () => void;

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

  const [isNameFocused, setIsNameFocused] = useState(false);

  // ---- Connection Details states ----
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [activeConnection, setActiveConnection] = useState<ApplicationConnection | null>(null);
  const [detailsMode, setDetailsMode] = useState<"view" | "edit">("view");

  const [detailsDockedStyle, setDetailsDockedStyle] =
  useState<React.CSSProperties | undefined>(undefined);


  const [editDraft, setEditDraft] = useState<AddDraft>(emptyDraft());
  const [isEditSaving, setIsEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // attachedIds: the ids of the connections attached to the application.
  const attachedIds = useMemo(() => new Set(connections.map((c) => c.id)), [connections]);

  // suggestions: the suggestions for the connection to be added.
  // isSuggestLoading: whether the suggestions are loading.
  const { items: suggestions, isLoading: isSuggestLoading } =
    useConnectionAutocomplete(addDraft.name, (isAddOpen && !selectedExisting && isNameFocused));

  // showSuggestions: whether to show the suggestions.
  const showSuggestions = isAddOpen && !selectedExisting && isNameFocused && addDraft.name.trim().length >= 2;
  
  // refresh: refreshes the list of connections attached to the application.
  const refresh = useCallback(async () => {
    if (!applicationId) return;
  
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
  }, [applicationId]);
  
  // refresh the connections when the drawer opens or application changes
  useEffect(() => {
    if (!open) return;
    if (!applicationId) return;
  
    refresh();
  }, [open, applicationId, refresh]);

  useEffect(() => {
    // If any connection modal opens, close the document preview in the parent drawer.
    if (isAddOpen || detailsOpen) {
      closeDocPreview?.();
    }
  }, [isAddOpen, detailsOpen, closeDocPreview]);
  

  // starts the add connection dialog.
  function startAdd() {
    closeDocPreview?.();
    // Only one dialog at a time (prevents stacked modals)
    if (detailsOpen) closeConnectionDetails();
    

    setAddError(null);
    setSelectedExisting(null);
    setAddDraft(emptyDraft());
    setIsAddOpen(true);
    // setIsNameFocused(false);
  }

  // closes the add connection dialog.
  function closeAdd() {
    setIsAddOpen(false);
    setAddError(null);
    setSelectedExisting(null);
    setAddDraft(emptyDraft());
    setIsNameFocused(false);
  }

  // applies a suggestion for the connection to be added.
  function applySuggestion(c: Connection) {
    setAddError(null);
    setSelectedExisting(c);
    setAddDraft(toDraft(c)); // fill + lock fields until user confirms
    setIsNameFocused(false);
  }

  // uses a different person for the connection to be added.
  function useDifferentPerson() {
    // Keep the typed name so they can continue quickly.
    const keepName = addDraft.name;
    setSelectedExisting(null);
    setAddError(null);
    setAddDraft({ ...emptyDraft(), name: keepName });
  }

  // onDetach: removes a connection from the application.
  async function onDetach(connectionId: string, name: string) {
    const ok = window.confirm(`Remove "${name}" as a connection on this application?`);
    if (!ok) return

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

  // keep the edit draft in sync with the active connection.
  useEffect(() => {
    if (!detailsOpen || !activeConnection) return;
    setEditDraft(toDraft(activeConnection));
  }, [detailsOpen, activeConnection]);

  useEffect(() => {
    // Use a single docked style for BOTH dialogs (details + add)
    if (!detailsOpen && !isAddOpen) {
      setDetailsDockedStyle(undefined);
      return;
    }
  
    const compute = () => {
      const drawerEl = document.querySelector(DRAWER_SELECTOR) as HTMLElement | null;
      const drawerRect = drawerEl?.getBoundingClientRect() ?? null;
  
      const availableWidth = drawerRect ? drawerRect.left : window.innerWidth;
      const centerX = Math.max(availableWidth / 2, DOCK_PADDING_PX);
  
      const preferredMax = Math.min(
        DOCK_MAX_WIDTH_PX,
        Math.max(availableWidth - DOCK_PADDING_PX * 2, 0)
      );
  
      const maxWidth = Math.max(preferredMax, DOCK_MIN_WIDTH_PX);
  
      setDetailsDockedStyle({
        left: `${centerX}px`,
        maxWidth: `${maxWidth}px`,
      });
    };
  
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, [detailsOpen, isAddOpen]);


  // openConnectionDetails: opens the connection details dialog.
  function openConnectionDetails(conn: ApplicationConnection) {
    closeDocPreview?.(); // close doc preview before opening details
    
    // Only one dialog at a time
    if (isAddOpen) closeAdd();

    setActiveConnection(conn);
    setDetailsMode(isEditing ? "edit" : "view");
    setEditError(null);
    setDetailsOpen(true);
  }
  
  // closeConnectionDetails: closes the connection details dialog.
  function closeConnectionDetails() {
    setDetailsOpen(false);
    setActiveConnection(null);
    setEditError(null);
    setIsEditSaving(false);
  }

  async function handleSaveEdit() {
  if (!activeConnection) return;

  if (!editDraft.name.trim()) {
    setEditError("Name is required.");
    return;
  }

  setIsEditSaving(true);
  setEditError(null);

  try {
    const payload = {
      name: editDraft.name.trim(),
      company: editDraft.company.trim() || undefined,
      title: editDraft.title.trim() || undefined,
      email: editDraft.email.trim() || undefined,
      phone: editDraft.phone.trim() || undefined,
      relationship: editDraft.relationship.trim() || undefined,
      location: editDraft.location.trim() || undefined,
      linkedInUrl: editDraft.linkedInUrl.trim() || undefined,
      notes: editDraft.notes.trim() || undefined,
    };

    const updated = await connectionsApi.updateConnection(activeConnection.id, payload);

    // normalize: some clients return Connection directly, others return { connection: Connection }
    const updatedConn = "connection" in updated ? updated.connection : updated;

    setConnections((prev) =>
      prev.map((c) =>
        c.id === activeConnection.id ? { ...c, ...updatedConn } : c
      )
    );

    closeConnectionDetails();
  } catch (err) {
    setEditError(err instanceof Error ? err.message : "Failed to update connection.");
  } finally {
    setIsEditSaving(false);
  }
}

  

  return (
    <div className="space-y-4">
      {errorMessage ? (
        <div className="relative rounded-md border px-3 py-2 pr-10 text-sm text-destructive">
          {errorMessage}

          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="absolute right-2 top-2 rounded-md px-2 py-1 opacity-70 hover:bg-black/5 hover:opacity-100"
            aria-label="Dismiss message"
            title="Dismiss"
          >
            ×
          </button>
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
              <Button variant="secondary" size="sm" onClick={startAdd} className="hover:bg-muted/60 hover:text-muted-foreground">
                <Plus className="h-4 w-4 mr-1" />
              </Button>
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

              return (
                <div
                  key={c.id}
                  className="px-3 py-2 flex items-center gap-3 hover:bg-muted/40 cursor-pointer hover:font-medium"
                  title={`View connection details`}
                  onClick={() => openConnectionDetails(c)}
                >
                  <UserRound className="h-4 w-4 text-muted-foreground" />

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm">{c.name}</div>

                    {titleLine ? (
                      <div className="text-xs text-muted-foreground truncate">
                        {titleLine}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-1">
                  {c.email ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Send Email"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.location.href = `mailto:${c.email}`;
                        }}
                      >
                        <Mail className="h-4 w-4" />
                      </Button>
                    ) : null}                    
                    
                    {c.linkedInUrl ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Open LinkedIn"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(c.linkedInUrl!, "_blank", "noopener,noreferrer");
                        }}
                      >
                        <Link2 className="h-4 w-4" />
                      </Button>
                    ) : null}

                    {isEditing ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Remove from application"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDetach(c.id, c.name)
                        }}
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

      {/* View/Edit Current Connection Dialog */}
      <Dialog open={detailsOpen} onOpenChange={(open) => !open && closeConnectionDetails()}>
        <DialogContent className="max-h-[80vh] overflow-y-auto" style={detailsDockedStyle}>
          <DialogHeader>
            <DialogTitle>
              {detailsMode === "edit" ? "Edit connection" : "Connection Details"}
            </DialogTitle>

            <DialogDescription>

              {detailsMode === "edit" ? "Edit connection details" : "View connection details"}
            </DialogDescription>
          </DialogHeader>

          {!activeConnection ? null : detailsMode === "view" ? (
            <div className="grid gap-4 mb-4 mt-4">
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label>Name</Label>
                  <Input readOnly value={activeConnection.name} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Company</Label>
                    <Input readOnly value={activeConnection.company ?? ""} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Title</Label>
                    <Input readOnly value={activeConnection.title ?? ""} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Email</Label>
                    <Input readOnly value={activeConnection.email ?? ""} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Phone</Label>
                    <Input readOnly value={activeConnection.phone ?? ""} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Relationship</Label>
                    <Input readOnly value={activeConnection.relationship ?? ""} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Location</Label>
                    <Input readOnly value={activeConnection.location ?? ""} />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>LinkedIn URL</Label>
                  <Input readOnly value={activeConnection.linkedInUrl ?? ""} />
                </div>

                <div className="grid gap-2">
                  <Label>Notes</Label>
                  <Textarea readOnly value={activeConnection.notes ?? ""} />
                </div>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 mb-4 mt-4">
              {/* Edit Connection Form */}
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label className="text-muted-foreground">Name</Label>

                    <Input
                      value={editDraft.name}
                      onChange={(e) => setEditDraft((p) => ({ ...p, name: e.target.value }))}
                    />
                </div>

                {/* The rest of the fields (locked when existing selected) */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label className="text-muted-foreground">Company</Label>
                    <Input
                      value={editDraft.company}
                      onChange={(e) => setEditDraft((p) => ({ ...p, company: e.target.value }))}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label className="text-muted-foreground">Title</Label>
                    <Input
                      value={editDraft.title}
                      onChange={(e) => setEditDraft((p) => ({ ...p, title: e.target.value }))}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label className="text-muted-foreground">Email</Label>
                    <Input
                      value={editDraft.email}
                      onChange={(e) => setEditDraft((p) => ({ ...p, email: e.target.value }))}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label className="text-muted-foreground">Phone</Label>
                    <Input
                      value={editDraft.phone}
                      onChange={(e) => setEditDraft((p) => ({ ...p, phone: e.target.value }))}
                    />
                  </div>
                </div>
                  
                <div className="grid grid-cols-2 gap-4">

                  <div className="grid gap-2">
                    <Label className="text-muted-foreground">Relationship</Label>
                    <Input
                      value={editDraft.relationship}
                      onChange={(e) => setEditDraft((p) => ({ ...p, relationship: e.target.value }))}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label className="text-muted-foreground">Location</Label>
                    <Input
                      value={editDraft.location}
                      onChange={(e) => setEditDraft((p) => ({ ...p, location: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label className="text-muted-foreground">LinkedIn URL</Label>
                  <Input
                    value={editDraft.linkedInUrl}
                    onChange={(e) => setEditDraft((p) => ({ ...p, linkedInUrl: e.target.value }))}
                  />
                </div>

                <div className="grid gap-2">
                  <Label className="text-muted-foreground">Notes</Label>
                  <Textarea
                    value={editDraft.notes}
                    onChange={(e) => setEditDraft((p) => ({ ...p, notes: e.target.value }))}
                  />
                </div>
              </div>
              
            </div>
          )}

          {editError && <p className="text-sm text-destructive">{editError}</p>}

          <DialogFooter>

            {detailsMode === "view" && (
              <>
                <Button variant="outline" onClick={() => setDetailsMode("edit")}>
                  Edit Details
                </Button>
                <Button  onClick={closeConnectionDetails}>
                  Exit
                </Button>
              </>
            )}
            {detailsMode === "edit" && (
              <>
              <Button variant="outline" onClick={() => {setDetailsMode("view")}}>
                Close
              </Button>
              <Button onClick={handleSaveEdit} disabled={isEditSaving}>
                {isEditSaving ? "Saving..." : "Save changes"}
              </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Connection Dialog */}
      <Dialog 
        open={isAddOpen} 
        onOpenChange={(open) => {
          if (open) closeDocPreview?.();
          return open ? setIsAddOpen(true) : closeAdd();
        }}
      >
        <DialogContent className="max-h-[80vh] overflow-y-auto" style={detailsDockedStyle}>
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
                <span className="text-xs text-muted-foreground">{selectedExisting.company ? "• " + selectedExisting.company : ""}</span>
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
                  onFocus={() => setIsNameFocused(true)}
                  onBlur={() => setIsNameFocused(false)}
                  value={addDraft.name}
                  onChange={(e) => setAddDraft((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g., John Doe"
                  disabled={!!selectedExisting}
                />

                {showSuggestions ? (
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
                          onMouseDown={(e) => e.preventDefault()}
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
              <Button type="button" variant="outline" onClick={closeAdd} disabled={isAddSaving}>
                Cancel
              </Button>

              <Button type="button" onClick={confirmAdd} disabled={isAddSaving}>
                {isAddSaving ? "Saving..." : selectedExisting ? "Add this connection" : "Add Connection"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
