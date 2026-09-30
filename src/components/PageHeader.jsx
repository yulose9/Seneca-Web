import React from "react";
import clsx from "clsx";
import { formatTodayLabel } from "../utils/timeUtils";

/**
 * The one page header every tab uses, so the large title sits at the same
 * height on every screen:
 *
 *   Wednesday, Sep 30                    [action]   ← eyebrow row, always reserved
 *   Title                          [trailing …]     ← large title + icon buttons
 *   Subtitle                                        ← optional
 *
 * `action` is a text button (Edit/Done); `trailing` holds round icon buttons.
 */
export default function PageHeader({ title, subtitle, action, trailing, className }) {
  return (
    <header className={clsx("pt-14 px-5 pb-4 bg-canvas", className)}>
      <div className="flex items-center justify-between h-[22px] mb-1">
        <p className="ios-nav-date">{formatTodayLabel()}</p>
        {action}
      </div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="ios-large-title min-w-0 truncate">{title}</h1>
        {trailing && <div className="flex items-center gap-2 shrink-0">{trailing}</div>}
      </div>
      {subtitle && <p className="text-subhead text-ink-2 mt-1">{subtitle}</p>}
    </header>
  );
}
