"use client";

import type { WorkMode } from "@/types/api";
import { workModeLabel } from "@/lib/applications/presentation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";

type Props = {
  // dialog + edit mode
  isDialogOpen: boolean;
  onDialogOpenChange: (nextOpen: boolean) => void;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  isSaving: boolean;
  onSave: (e: React.FormEvent) => void;

  // fields
  titlesText: string;
  setTitlesText: (v: string) => void;
  locationsText: string;
  setLocationsText: (v: string) => void;
  keywordsText: string;
  setKeywordsText: (v: string) => void;
  summary: string;
  setSummary: (v: string) => void;
  workMode: WorkMode;
  setWorkMode: (v: WorkMode) => void;
};

export function JobSearchPreferencesCard({
  isDialogOpen,
  onDialogOpenChange,
  isEditing,
  onStartEdit,
  onCancelEdit,
  isSaving,
  onSave,

  titlesText,
  setTitlesText,
  locationsText,
  setLocationsText,
  keywordsText,
  setKeywordsText,
  summary,
  setSummary,
  workMode,
  setWorkMode,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Job Search Preferences</CardTitle>
        <CardDescription>
          Used later for AI tailoring (titles, locations, keywords, preferred arrangement).
        </CardDescription>

        <CardAction>
          <Dialog open={isDialogOpen} onOpenChange={onDialogOpenChange}>
            <DialogTrigger asChild>
              <Button type="button" variant="outline" size="sm">
                View / Edit
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-2xl">
              {/* pr-10 reserves space so the Radix close (X) never overlaps the Edit button */}
              <div className="flex items-start justify-between gap-4 pr-10">
                <DialogHeader>
                  <DialogTitle>Job Search Preferences</DialogTitle>
                  <DialogDescription>
                    View first. Click Edit to make changes, then Save to persist.
                  </DialogDescription>
                </DialogHeader>

                {!isEditing ? (
                  <Button type="button" variant="outline" size="sm" onClick={onStartEdit}>
                    Edit
                  </Button>
                ) : null}
              </div>

              <form className="mt-4 space-y-4" onSubmit={onSave}>
                <div className="space-y-1">
                  <Label htmlFor="jobSearchTitlesText">Target titles (comma-separated)</Label>
                  <Input
                    id="jobSearchTitlesText"
                    value={titlesText}
                    onChange={(e) => setTitlesText(e.target.value)}
                    placeholder="e.g., Backend Engineer, SRE, DevOps, ..."
                    readOnly={!isEditing}
                    className="read-only:bg-muted/30 read-only:text-muted-foreground read-only:cursor-default"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="jobSearchLocationsText">Preferred locations (comma-separated)</Label>
                  <Input
                    id="jobSearchLocationsText"
                    value={locationsText}
                    onChange={(e) => setLocationsText(e.target.value)}
                    placeholder="e.g., Toronto, USA, Ottawa, ..."
                    readOnly={!isEditing}
                    className="read-only:bg-muted/30 read-only:text-muted-foreground read-only:cursor-default"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="jobSearchWorkMode">Preferred work arrangement</Label>
                  <Select
                    id="jobSearchWorkMode"
                    value={workMode}
                    onChange={(e) => setWorkMode(e.target.value as WorkMode)}
                    disabled={!isEditing}
                  >
                    <option value="UNKNOWN">Any</option>
                    <option value="REMOTE">Remote</option>
                    <option value="HYBRID">Hybrid</option>
                    <option value="ONSITE">On-site</option>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="jobSearchKeywordsText">Keywords (comma-separated)</Label>
                  <Input
                    id="jobSearchKeywordsText"
                    value={keywordsText}
                    onChange={(e) => setKeywordsText(e.target.value)}
                    placeholder="e.g., AWS, Kubernetes, Terraform, Java, ..."
                    readOnly={!isEditing}
                    className="read-only:bg-muted/30 read-only:text-muted-foreground read-only:cursor-default"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="jobSearchSummary">Short summary</Label>
                  <Textarea
                    id="jobSearchSummary"
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    placeholder="A few lines about what you’re targeting and what you’re strong at..."
                    readOnly={!isEditing}
                    className="read-only:bg-muted/30 read-only:text-muted-foreground read-only:cursor-default"
                  />
                </div>

                {isEditing ? (
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={onCancelEdit} disabled={isSaving}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSaving}>
                      {isSaving ? "Saving..." : "Save"}
                    </Button>
                  </div>
                ) : null}
              </form>
            </DialogContent>
          </Dialog>
        </CardAction>
      </CardHeader>

      {/* Compact summary (keeps page from being a long stack of forms) */}
      <CardContent className="space-y-2 text-sm">
        <div className="grid gap-1">
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Work arrangement</span>
            <span className="truncate font-medium">
              {workMode === "UNKNOWN" ? "Any" : workModeLabel(workMode)}
            </span>
          </div>

          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Titles</span>
            <span className="truncate font-medium" title={titlesText}>
              {titlesText.trim() ? titlesText : "—"}
            </span>
          </div>

          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Locations</span>
            <span className="truncate font-medium" title={locationsText}>
              {locationsText.trim() ? locationsText : "—"}
            </span>
          </div>

          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Keywords</span>
            <span className="truncate font-medium" title={keywordsText}>
              {keywordsText.trim() ? keywordsText : "—"}
            </span>
          </div>
        </div>

        <div className="text-muted-foreground">
          {summary.trim() ? summary : "No summary set yet."}
        </div>
      </CardContent>
    </Card>
  );
}
