"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ChevronDownIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { BOUNDLESS_DEPARTMENTS } from "@/lib/teamProfiles";

/**
 * Reusable Admin Extended Profile Editor for BOTH Council Members (`council`)
 * and Department Heads (`dept_head`).
 * Intentionally excludes `departmentTeam` — HOD team management remains exclusive
 * to the Manage Team modal on `/admin/team`.
 */
export default function TeamMemberProfileFields({
  profile,
  onChange,
}: {
  profile: Record<string, any> | null | undefined;
  onChange: (next: Record<string, any>) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const safeProfile = profile || {};
  const socialLinks = safeProfile.socialLinks || {};
  const departmentSections = Array.isArray(safeProfile.departmentSections)
    ? safeProfile.departmentSections
    : [];
  const extracurricularActivities = Array.isArray(safeProfile.extracurricularActivities)
    ? safeProfile.extracurricularActivities
    : [];

  const updateField = (key: string, value: any) => {
    onChange({ ...safeProfile, [key]: value });
  };

  const updateSocial = (key: string, value: string) => {
    onChange({
      ...safeProfile,
      socialLinks: { ...socialLinks, [key]: value },
    });
  };

  const addDepartmentSection = () => {
    const used = new Set(departmentSections.map((s: any) => s.departmentKey));
    const nextDept =
      BOUNDLESS_DEPARTMENTS.find((d) => !used.has(d.key)) || BOUNDLESS_DEPARTMENTS[0];
    onChange({
      ...safeProfile,
      departmentSections: [
        ...departmentSections,
        {
          departmentKey: nextDept.key,
          departmentLabel: nextDept.label,
          items: [{ key: `item-${Date.now()}`, label: "", value: "", displayAs: "narrative" }],
          media: [],
        },
      ],
    });
  };

  const updateDepartmentSection = (idx: number, updater: (sec: any) => any) => {
    const next = departmentSections.map((sec: any, i: number) => (i === idx ? updater(sec) : sec));
    onChange({ ...safeProfile, departmentSections: next });
  };

  const removeDepartmentSection = (idx: number) => {
    onChange({
      ...safeProfile,
      departmentSections: departmentSections.filter((_: any, i: number) => i !== idx),
    });
  };

  const addExtracurricular = () => {
    onChange({
      ...safeProfile,
      extracurricularActivities: [
        ...extracurricularActivities,
        {
          id: `ext-${Date.now()}`,
          title: "",
          category: "",
          year: "",
          description: "",
          link: "",
        },
      ],
    });
  };

  const updateExtracurricular = (idx: number, key: string, value: string) => {
    const next = extracurricularActivities.map((act: any, i: number) =>
      i === idx ? { ...act, [key]: value } : act
    );
    onChange({ ...safeProfile, extracurricularActivities: next });
  };

  const removeExtracurricular = (idx: number) => {
    onChange({
      ...safeProfile,
      extracurricularActivities: extracurricularActivities.filter((_: any, i: number) => i !== idx),
    });
  };

  return (
    <div className="rounded-xl border border-border bg-muted/20 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-muted/40 transition-colors"
      >
        <div>
          <div className="text-sm font-bold text-foreground">
            Extended Individual Profile Details (Optional)
          </div>
          <div className="text-xs text-muted-foreground">
            Journey, yearbook quote, social links, department contributions &amp; Beyond IITM BS
          </div>
        </div>
        <ChevronDownIcon
          className={`size-4 text-muted-foreground transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </button>

      {expanded && (
        <div className="p-4 pt-2 border-t border-border space-y-6">
          {/* 1. Core Journey & Yearbook */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="prof-joinedTerm">Joining Term &amp; Year</Label>
              <Input
                id="prof-joinedTerm"
                placeholder="e.g. Sept 2025"
                value={safeProfile.joinedTerm || ""}
                onChange={(e) => updateField("joinedTerm", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prof-currentPosition">Display Position</Label>
              <Input
                id="prof-currentPosition"
                placeholder="e.g. Secretary, Deputy Secretary, HOD"
                value={safeProfile.currentPosition || ""}
                onChange={(e) => updateField("currentPosition", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="prof-firstRole">First Role &amp; Department</Label>
            <Input
              id="prof-firstRole"
              placeholder="e.g. Trip Coordinator in Trip Coordination"
              value={safeProfile.firstRoleAndDept || ""}
              onChange={(e) => updateField("firstRoleAndDept", e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="prof-growth">Personal Growth Since Joining Boundless</Label>
            <textarea
              id="prof-growth"
              rows={3}
              value={safeProfile.personalGrowth || ""}
              onChange={(e) => updateField("personalGrowth", e.target.value)}
              placeholder="Member's personal reflection..."
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="prof-quote">Boundless Yearbook Quote</Label>
            <textarea
              id="prof-quote"
              rows={2}
              value={safeProfile.yearbookQuote || ""}
              onChange={(e) => updateField("yearbookQuote", e.target.value)}
              placeholder="Personal statement shown beside portrait in the profile hero..."
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          {/* 2. Social Links */}
          <div className="space-y-3 pt-2 border-t border-border">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Social Links (Only filled URLs appear as icons)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                placeholder="Instagram URL (https://...)"
                value={socialLinks.instagram || ""}
                onChange={(e) => updateSocial("instagram", e.target.value)}
              />
              <Input
                placeholder="LinkedIn URL (https://...)"
                value={socialLinks.linkedin || ""}
                onChange={(e) => updateSocial("linkedin", e.target.value)}
              />
              <Input
                placeholder="GitHub URL (https://...)"
                value={socialLinks.github || ""}
                onChange={(e) => updateSocial("github", e.target.value)}
              />
              <Input
                placeholder="X / Twitter URL (https://...)"
                value={socialLinks.twitter || ""}
                onChange={(e) => updateSocial("twitter", e.target.value)}
              />
              <Input
                placeholder="YouTube URL (https://...)"
                value={socialLinks.youtube || ""}
                onChange={(e) => updateSocial("youtube", e.target.value)}
              />
              <Input
                placeholder="Portfolio / Website URL (https://...)"
                value={socialLinks.portfolio || ""}
                onChange={(e) => updateSocial("portfolio", e.target.value)}
              />
            </div>
          </div>

          {/* 3. Department Contributions */}
          <div className="space-y-3 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Department Contributions ({departmentSections.length})
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addDepartmentSection}>
                <PlusIcon className="size-3.5 mr-1" />
                Add Department
              </Button>
            </div>

            {departmentSections.map((sec, sIdx) => (
              <div
                key={`${sec.departmentKey}-${sIdx}`}
                className="p-3 rounded-lg border border-border bg-background space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <select
                    value={sec.departmentKey}
                    onChange={(e) => {
                      const dept = BOUNDLESS_DEPARTMENTS.find((d) => d.key === e.target.value);
                      updateDepartmentSection(sIdx, (cur) => ({
                        ...cur,
                        departmentKey: e.target.value,
                        departmentLabel: dept?.label || e.target.value,
                      }));
                    }}
                    className="h-9 rounded-md border border-input bg-background px-2.5 text-sm font-semibold"
                  >
                    {BOUNDLESS_DEPARTMENTS.map((d) => (
                      <option key={d.key} value={d.key}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeDepartmentSection(sIdx)}
                    className="text-rose-600 hover:text-rose-700"
                  >
                    <Trash2Icon className="size-4" />
                  </Button>
                </div>

                {(sec.items || []).map((item: any, iIdx: number) => (
                  <div key={item.key || iIdx} className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                    <Input
                      className="sm:col-span-4"
                      placeholder="Label (e.g. Proudest Project)"
                      value={item.label || ""}
                      onChange={(e) =>
                        updateDepartmentSection(sIdx, (cur) => ({
                          ...cur,
                          items: cur.items.map((it: any, k: number) =>
                            k === iIdx ? { ...it, label: e.target.value } : it
                          ),
                        }))
                      }
                    />
                    <Input
                      className="sm:col-span-5"
                      placeholder="Member's contribution..."
                      value={item.value || ""}
                      onChange={(e) =>
                        updateDepartmentSection(sIdx, (cur) => ({
                          ...cur,
                          items: cur.items.map((it: any, k: number) =>
                            k === iIdx ? { ...it, value: e.target.value } : it
                          ),
                        }))
                      }
                    />
                    <div className="sm:col-span-3 flex gap-1">
                      <select
                        value={item.displayAs || "narrative"}
                        onChange={(e) =>
                          updateDepartmentSection(sIdx, (cur) => ({
                            ...cur,
                            items: cur.items.map((it: any, k: number) =>
                              k === iIdx ? { ...it, displayAs: e.target.value } : it
                            ),
                          }))
                        }
                        className="flex-1 h-10 rounded-md border border-input bg-background px-2 text-xs"
                      >
                        <option value="narrative">Narrative</option>
                        <option value="highlight">Highlight</option>
                        <option value="stat">Stat</option>
                        <option value="tags">Tags</option>
                      </select>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          updateDepartmentSection(sIdx, (cur) => ({
                            ...cur,
                            items: cur.items.filter((_: any, k: number) => k !== iIdx),
                          }))
                        }
                      >
                        <Trash2Icon className="size-3.5 text-rose-500" />
                      </Button>
                    </div>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    updateDepartmentSection(sIdx, (cur) => ({
                      ...cur,
                      items: [
                        ...(cur.items || []),
                        {
                          key: `item-${Date.now()}-${(cur.items || []).length}`,
                          label: "",
                          value: "",
                          displayAs: "narrative",
                        },
                      ],
                    }))
                  }
                >
                  <PlusIcon className="size-3.5 mr-1" />
                  Add Contribution Entry
                </Button>
              </div>
            ))}
          </div>

          {/* 4. Beyond IITM BS (Extracurricular Activities) */}
          <div className="space-y-3 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Beyond IITM BS ({extracurricularActivities.length})
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addExtracurricular}>
                <PlusIcon className="size-3.5 mr-1" />
                Add Activity
              </Button>
            </div>

            {extracurricularActivities.map((act, idx) => (
              <div
                key={act.id || idx}
                className="p-3 rounded-lg border border-border bg-background space-y-2.5"
              >
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Activity Title"
                    value={act.title || ""}
                    onChange={(e) => updateExtracurricular(idx, "title", e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeExtracurricular(idx)}
                  >
                    <Trash2Icon className="size-4 text-rose-500" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Input
                    placeholder="Category (e.g. Sports, Club)"
                    value={act.category || ""}
                    onChange={(e) => updateExtracurricular(idx, "category", e.target.value)}
                  />
                  <Input
                    placeholder="Year (e.g. 2025)"
                    value={act.year || ""}
                    onChange={(e) => updateExtracurricular(idx, "year", e.target.value)}
                  />
                  <Input
                    placeholder="Optional Link (https://...)"
                    value={act.link || ""}
                    onChange={(e) => updateExtracurricular(idx, "link", e.target.value)}
                  />
                </div>
                <textarea
                  rows={2}
                  placeholder="Description..."
                  value={act.description || ""}
                  onChange={(e) => updateExtracurricular(idx, "description", e.target.value)}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
