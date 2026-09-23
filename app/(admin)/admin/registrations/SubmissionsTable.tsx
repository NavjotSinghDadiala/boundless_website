"use client";

import React from "react";
import { ExternalLinkIcon } from "lucide-react";
import { Registration } from "./page";

type Props = {
  submissions: Registration[];
};

/**
 * Detects whether a string is a web URL, Google Drive link, Google Docs link,
 * or cloud storage link.
 */
function isUrlOrDriveLink(val: unknown): boolean {
  if (typeof val !== "string") return false;
  const trimmed = val.trim();
  if (!trimmed) return false;
  return (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("drive.google.com") ||
    trimmed.startsWith("docs.google.com") ||
    trimmed.includes("drive.google.com") ||
    trimmed.includes("docs.google.com") ||
    trimmed.includes("res.cloudinary.com") ||
    trimmed.includes("storage.googleapis.com")
  );
}

/**
 * Normalizes a URL ensuring it has an http:// or https:// protocol.
 */
function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

/**
 * Renders a clean, branded "View" button for links instead of exposing raw URLs.
 */
function ViewButton({ url, label = "View" }: { url: string; label?: string }) {
  const href = normalizeUrl(url);
  const isDrive = href.includes("drive.google.com") || href.includes("docs.google.com");

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-[#3B001B]/5 hover:bg-[#3B001B] text-[#3B001B] hover:text-white border border-[#3B001B]/15 hover:border-[#3B001B] transition-all shadow-xs cursor-pointer select-none group"
      title={isDrive ? `Open Google Drive link in new tab` : `Open link in new tab`}
      onClick={(e) => e.stopPropagation()}
    >
      <span>{label}</span>
      <ExternalLinkIcon className="size-3 opacity-70 group-hover:opacity-100 transition-opacity" />
    </a>
  );
}

/**
 * Formats cell content: if it is or contains Drive/web links, renders "View" button(s).
 * Otherwise renders the text or an empty placeholder.
 */
function renderCellContent(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return <span className="text-stone-300">—</span>;
  }

  const str = String(value).trim();

  // If it's a URL or Drive link
  if (isUrlOrDriveLink(str)) {
    // If it contains multiple URLs separated by commas, spaces, or newlines
    const tokens = str.split(/[\s,\n]+/).filter(Boolean);
    const linkTokens = tokens.filter(isUrlOrDriveLink);

    if (linkTokens.length > 1) {
      return (
        <div className="flex flex-wrap items-center gap-1.5">
          {linkTokens.map((link, i) => (
            <ViewButton key={i} url={link} label={`View ${i + 1}`} />
          ))}
        </div>
      );
    }

    return <ViewButton url={str} label="View" />;
  }

  // Regular text
  return (
    <span className="text-stone-800" title={str}>
      {str}
    </span>
  );
}

export default function SubmissionsTable({ submissions }: Props) {
  // Collect all unique formData keys across all submissions, excluding internal system fields
  const internalKeys = new Set(["Custom Reply", "User Reply"]);
  const formDataKeys = Array.from(
    new Set(submissions.flatMap((s) => Object.keys(s.formData || {})))
  ).filter((k) => !internalKeys.has(k));

  const columns = ["#", "Email", "UID", "Submitted At", ...formDataKeys];

  if (submissions.length === 0) {
    return (
      <div className="w-full rounded-xl border border-stone-200/80 bg-white p-8 text-center text-stone-500 text-sm shadow-sm">
        No registration submissions found in this category.
      </div>
    );
  }

  return (
    <div className="w-full rounded-xl border border-stone-200/80 bg-white shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs sm:text-sm text-stone-700">
          <thead className="border-b border-stone-200/80 bg-stone-50/70 text-[11px] font-semibold uppercase tracking-wider text-stone-500">
            <tr>
              {columns.map((col, i) => (
                <th
                  key={col}
                  className={`px-4 py-3.5 whitespace-nowrap font-semibold text-stone-600 ${
                    i === 0 ? "sticky left-0 z-20 bg-stone-50" : ""
                  }`}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-stone-100 bg-white">
            {submissions.map((row, idx) => (
              <tr
                key={row.id}
                className="hover:bg-stone-50/80 transition-colors"
              >
                {/* Row number — sticky left */}
                <td className="px-4 py-3 sticky left-0 bg-white hover:bg-stone-50 font-medium text-stone-500 z-10 whitespace-nowrap">
                  {idx + 1}
                </td>

                {/* Email */}
                <td className="px-4 py-3 font-mono text-xs text-[#3B001B] font-medium whitespace-nowrap">
                  {row.email}
                </td>

                {/* UID */}
                <td className="px-4 py-3 font-mono text-xs text-stone-400 whitespace-nowrap">
                  {row.uid}
                </td>

                {/* Submitted At */}
                <td className="px-4 py-3 text-stone-500 whitespace-nowrap">
                  {formatDate(row.submittedAt)}
                </td>

                {/* Dynamic formData columns */}
                {formDataKeys.map((key) => {
                  const val = row.formData?.[key];
                  const hasLink = isUrlOrDriveLink(val);

                  return (
                    <td
                      key={key}
                      className={`px-4 py-3 whitespace-nowrap text-stone-800 ${
                        hasLink ? "" : "max-w-[240px] truncate"
                      }`}
                    >
                      {renderCellContent(val)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatDate(value: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}