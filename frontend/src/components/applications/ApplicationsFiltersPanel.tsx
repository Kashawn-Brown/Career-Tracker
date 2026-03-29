"use client";

import { useId } from "react";
import { Filter, ChevronDown, ChevronUp, X, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  type ApplicationFilters,
  DEFAULT_FIT_RANGE,
  countActiveFilters,
  toggleMultiValue,
  formatSelectedLabels,
} from "@/lib/applications/filters";
import {
  STATUS_OPTIONS,
  JOB_TYPE_OPTIONS,
  WORK_MODE_OPTIONS,
} from "@/lib/applications/presentation";

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
  filters:         ApplicationFilters;
  isOpen:          boolean;
  queryInput:      string; // the live typing value (pre-debounce)
  onQueryChange:   (value: string) => void;
  onFiltersChange: (patch: Partial<ApplicationFilters>) => void;
  onToggleOpen:    (open: boolean) => void;
  onReset:         () => void;
};

// ─── Sub-components ───────────────────────────────────────────────────────────

/**
 * A dropdown trigger that shows selected labels as a summary text.
 * Shows a clear (×) button when any options are selected.
 */
function MultiSelectDropdown<T extends string>({
  label,
  placeholder,
  options,
  selected,
  onToggle,
  onClear,
}: {
  label:       string;
  placeholder: string;
  options:     { value: T; label: string }[];
  selected:    T[];
  onToggle:    (value: T) => void;
  onClear:     () => void;
}) {
  const id = useId();
  const selectedLabels = options
    .filter((o) => selected.includes(o.value))
    .map((o) => o.label);

  const hasSelection = selected.length > 0;

  return (
    <div className="space-y-1.5">
      {/* Label row with optional clear button */}
      <div className="flex items-center justify-between">
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
        </Label>
        {hasSelection && (
          <button
            type="button"
            onClick={onClear}
            className="text-muted-foreground hover:text-destructive transition-colors"
            aria-label={`Clear ${label} filter`}
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Popover trigger — shows summary of selected values */}
      <Popover>
        <PopoverTrigger asChild>
          <div
            id={id}
            role="button"
            tabIndex={0}
            className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs hover:bg-accent/50 transition-colors"
          >
            <span className={hasSelection ? "text-foreground" : "text-muted-foreground"}>
              {hasSelection ? formatSelectedLabels(selectedLabels) : placeholder}
            </span>
            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
          </div>
        </PopoverTrigger>

        {/* Dropdown checkbox list */}
        <PopoverContent className="p-1 w-52">
          {options.map((option) => (
            <div
              key={option.value}
              role="option"
              aria-selected={selected.includes(option.value)}
              className="flex w-full items-center gap-2.5 rounded px-2 py-1.5 text-sm hover:bg-accent transition-colors cursor-pointer"
              onClick={() => onToggle(option.value)}
            >
              <Checkbox
                checked={selected.includes(option.value)}
                // Interaction handled by the parent button — checkbox is display only
                onCheckedChange={() => onToggle(option.value)}
                aria-hidden
                tabIndex={-1}
              />
              <span>{option.label}</span>
            </div>
          ))}
        </PopoverContent>
      </Popover>
    </div>
  );
}

/**
 * A pair of date inputs (From / To) with a shared label and clear button.
 */
function DateRangeInputs({
  label,
  fromValue,
  toValue,
  onFromChange,
  onToChange,
  onClear,
}: {
  label:        string;
  fromValue:    string;
  toValue:      string;
  onFromChange: (v: string) => void;
  onToChange:   (v: string) => void;
  onClear:      () => void;
}) {
  const hasValue = fromValue !== "" || toValue !== "";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{label}</Label>
        {hasValue && (
          <button
            type="button"
            onClick={onClear}
            className="text-muted-foreground hover:text-destructive transition-colors"
            aria-label={`Clear ${label} filter`}
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
      <div className="flex gap-2">
        <div className="flex-1 space-y-1">
          <Label className="text-xs text-muted-foreground">From</Label>
          <Input
            type="date"
            value={fromValue}
            max={toValue || undefined}
            onChange={(e) => onFromChange(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div className="flex-1 space-y-1">
          <Label className="text-xs text-muted-foreground">To</Label>
          <Input
            type="date"
            value={toValue}
            min={fromValue || undefined}
            onChange={(e) => onToChange(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

/**
 * ApplicationsFiltersPanel
 *
 * Collapsible filter panel for the applications page.
 * Extracted from the page so the page stays focused on orchestration.
 *
 * All filter state lives in the parent (applications page) and flows
 * down as props — this component is purely presentational.
 */
export function ApplicationsFiltersPanel({
  filters,
  isOpen,
  queryInput,
  onQueryChange,
  onFiltersChange,
  onToggleOpen,
  onReset,
}: Props) {
  const activeCount = countActiveFilters(filters, queryInput );
  const hasActiveFilters = activeCount > 0;

  return (
    <Collapsible open={isOpen} onOpenChange={onToggleOpen}>
      {/* ── Trigger bar ── */}
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-md border bg-card px-4 py-3 text-sm font-medium hover:bg-muted/40 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <span>Filters</span>
            {hasActiveFilters && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                {activeCount}
              </span>
            )}
          </div>
          {isOpen
            ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
            : <ChevronDown className="h-4 w-4 text-muted-foreground" />
          }
        </button>
      </CollapsibleTrigger>

      {/* ── Filter content ── */}
      <CollapsibleContent>
        <div className="rounded-b-md border border-t-0 bg-card px-4 pb-5 pt-4 space-y-5">

          {/* Clear All */}
          <div className="flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onReset}
              disabled={!hasActiveFilters}
              className="text-destructive hover:text-destructive hover:bg-destructive/10 disabled:opacity-40"
            >
              <X className="h-3 w-3 mr-1" />
              Clear All
            </Button>
          </div>

          {/* ── Row 1: Search + Favorites ── */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">

            {/* Search */}
            <div className="space-y-1.5 lg:col-span-2">
              <Label className="text-sm font-medium">Search</Label>
              <Input
                placeholder="Search by company, position, location or tags..."
                value={queryInput}
                onChange={(e) => onQueryChange(e.target.value)}
              />
            </div>

            {/* Favorites */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Starred Jobs</Label>
              <button
                type="button"
                onClick={() => onFiltersChange({ favoritesOnly: !filters.favoritesOnly })}
                className={[
                  "flex h-9 w-full items-center gap-2 rounded-md border px-3 text-sm transition-colors",
                  filters.favoritesOnly
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-input bg-transparent text-muted-foreground hover:bg-accent/50",
                ].join(" ")}
              >
                <Star className={["h-4 w-4", filters.favoritesOnly ? "fill-primary" : ""].join(" ")} />
                {filters.favoritesOnly ? "Starred only" : "All jobs"}
              </button>
            </div>
          </div>

          {/* ── Row 2: Status / Work Mode / Job Type ── */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <MultiSelectDropdown
              label="Status"
              placeholder="Any status"
              options={STATUS_OPTIONS}
              selected={filters.statuses}
              onToggle={(v) => onFiltersChange({ statuses: toggleMultiValue(filters.statuses, v) })}
              onClear={() => onFiltersChange({ statuses: [] })}
            />
            <MultiSelectDropdown
              label="Work Mode"
              placeholder="Any work mode"
              options={WORK_MODE_OPTIONS.filter((o) => o.value !== "UNKNOWN")}
              selected={filters.workModes}
              onToggle={(v) => onFiltersChange({ workModes: toggleMultiValue(filters.workModes, v) })}
              onClear={() => onFiltersChange({ workModes: [] })}
            />
            <MultiSelectDropdown
              label="Job Type"
              placeholder="Any job type"
              options={JOB_TYPE_OPTIONS.filter((o) => o.value !== "UNKNOWN")}
              selected={filters.jobTypes}
              onToggle={(v) => onFiltersChange({ jobTypes: toggleMultiValue(filters.jobTypes, v) })}
              onClear={() => onFiltersChange({ jobTypes: [] })}
            />
          </div>

          {/* ── Row 3: Fit Score + Date Applied + Last Updated ── */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">

            {/* ── Date Applied ── */}
            <DateRangeInputs
              label="Date Applied"
              fromValue={filters.dateAppliedFrom}
              toValue={filters.dateAppliedTo}
              onFromChange={(v) => onFiltersChange({ dateAppliedFrom: v })}
              onToChange={(v) => onFiltersChange({ dateAppliedTo: v })}
              onClear={() => onFiltersChange({ dateAppliedFrom: "", dateAppliedTo: "" })}
            />

            {/* Fit Score */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Fit Score</Label>
                {(filters.fitRange[0] !== DEFAULT_FIT_RANGE[0] || filters.fitRange[1] !== DEFAULT_FIT_RANGE[1]) && (
                  <button
                    type="button"
                    onClick={() => onFiltersChange({ fitRange: DEFAULT_FIT_RANGE })}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                    aria-label="Clear fit score filter"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
              <div className="pt-1 space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{filters.fitRange[0]}</span>
                  <span>{filters.fitRange[1]}</span>
                </div>
                <Slider
                  min={0}
                  max={100}
                  step={1}
                  value={filters.fitRange}
                  onValueChange={(v) => onFiltersChange({ fitRange: v as [number, number] })}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0</span>
                  <span>100</span>
                </div>
              </div>
            </div>

            {/* Last Updated */}
            <DateRangeInputs
              label="Last Updated"
              fromValue={filters.updatedFrom}
              toValue={filters.updatedTo}
              onFromChange={(v) => onFiltersChange({ updatedFrom: v })}
              onToChange={(v) => onFiltersChange({ updatedTo: v })}
              onClear={() => onFiltersChange({ updatedFrom: "", updatedTo: "" })}
            />
          </div>

        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}