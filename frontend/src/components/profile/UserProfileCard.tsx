"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Props = {
  email: string;

  isEditing: boolean;
  isSaving: boolean;

  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: (e: React.FormEvent) => void;

  name: string;
  setName: (v: string) => void;

  location: string;
  setLocation: (v: string) => void;

  currentCompany: string;
  setCurrentCompany: (v: string) => void;

  currentRole: string;
  setCurrentRole: (v: string) => void;

  skillsText: string;
  setSkillsText: (v: string) => void;

  linkedInUrl: string;
  setLinkedInUrl: (v: string) => void;

  githubUrl: string;
  setGithubUrl: (v: string) => void;

  portfolioUrl: string;
  setPortfolioUrl: (v: string) => void;
};

export function UserProfileCard({
  email,

  isEditing,
  isSaving,

  onStartEdit,
  onCancelEdit,
  onSave,

  name,
  setName,
  location,
  setLocation,
  currentCompany,
  setCurrentCompany,
  currentRole,
  setCurrentRole,
  skillsText,
  setSkillsText,
  linkedInUrl,
  setLinkedInUrl,
  githubUrl,
  setGithubUrl,
  portfolioUrl,
  setPortfolioUrl,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>Signed in as {email}</CardDescription>

        <CardAction>
          {!isEditing ? (
            <Button type="button" variant="outline" size="sm" onClick={onStartEdit}>
              Edit
            </Button>
          ) : null}
        </CardAction>
      </CardHeader>

      <CardContent>
        <form className="space-y-4" onSubmit={onSave}>
          <div className="space-y-1">
            <Label htmlFor="profileName">Name</Label>
            <Input
              id="profileName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              readOnly={!isEditing}
              className="read-only:bg-muted/30 read-only:text-muted-foreground read-only:cursor-default"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="profileLocation">Location</Label>
            <Input
              id="profileLocation"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              readOnly={!isEditing}
              className="read-only:bg-muted/30 read-only:text-muted-foreground read-only:cursor-default"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="profileCompany">Current company</Label>
            <Input
              id="profileCompany"
              value={currentCompany}
              onChange={(e) => setCurrentCompany(e.target.value)}
              readOnly={!isEditing}
              className="read-only:bg-muted/30 read-only:text-muted-foreground read-only:cursor-default"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="profileRole">Current role</Label>
            <Input
              id="profileRole"
              value={currentRole}
              onChange={(e) => setCurrentRole(e.target.value)}
              readOnly={!isEditing}
              className="read-only:bg-muted/30 read-only:text-muted-foreground read-only:cursor-default"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="profileSkills">Skills (comma-separated)</Label>
            <Input
              id="profileSkills"
              value={skillsText}
              onChange={(e) => setSkillsText(e.target.value)}
              readOnly={!isEditing}
              className="read-only:bg-muted/30 read-only:text-muted-foreground read-only:cursor-default"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="profileLinkedIn">LinkedIn URL</Label>
            <Input
              id="profileLinkedIn"
              value={linkedInUrl}
              onChange={(e) => setLinkedInUrl(e.target.value)}
              readOnly={!isEditing}
              className="read-only:bg-muted/30 read-only:text-muted-foreground read-only:cursor-default"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="profileGithub">GitHub URL</Label>
            <Input
              id="profileGithub"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              readOnly={!isEditing}
              className="read-only:bg-muted/30 read-only:text-muted-foreground read-only:cursor-default"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="profilePortfolio">Portfolio URL</Label>
            <Input
              id="profilePortfolio"
              value={portfolioUrl}
              onChange={(e) => setPortfolioUrl(e.target.value)}
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
      </CardContent>
    </Card>
  );
}
