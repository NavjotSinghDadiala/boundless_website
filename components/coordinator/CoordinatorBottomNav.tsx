"use client";

import { InfoIcon, MessageSquareWarningIcon, UsersIcon } from "lucide-react";
import type { CoordinatorTab } from "./types";

interface CoordinatorBottomNavProps {
  activeTab: CoordinatorTab;
  onTabChange: (tab: CoordinatorTab) => void;
  studentsCount: number;
  concernsCount: number;
  hidden?: boolean;
}

export function CoordinatorBottomNav({
  activeTab,
  onTabChange,
  studentsCount,
  concernsCount,
  hidden = false,
}: CoordinatorBottomNavProps) {
  if (hidden) return null;

  const items: Array<{
    id: CoordinatorTab;
    label: string;
    icon: typeof InfoIcon;
    badge?: number;
  }> = [
    { id: "overview", label: "Overview", icon: InfoIcon },
    { id: "students", label: "Students", icon: UsersIcon, badge: studentsCount },
    { id: "concerns", label: "Concerns", icon: MessageSquareWarningIcon, badge: concernsCount },
  ];

  return (
    <nav
      aria-label="Coordinator sections"
      className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-md border-t border-[#E2D9CE] shadow-[0_-4px_20px_rgba(91,19,19,0.06)] pb-[env(safe-area-inset-bottom)]"
    >
      <div className="grid grid-cols-3 h-16">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              aria-current={isActive ? "page" : undefined}
              className={`relative flex flex-col items-center justify-center gap-1 min-h-[48px] transition-colors ${
                isActive ? "text-[#5B1313]" : "text-stone-500 active:text-stone-800"
              }`}
            >
              {isActive && (
                <span className="absolute top-0 inset-x-5 h-[3px] rounded-b-full bg-[#5B1313]" />
              )}
              <div className="relative flex items-center justify-center">
                <Icon
                  className={`w-5 h-5 ${
                    isActive ? "stroke-[2.4]" : "stroke-[1.9]"
                  }`}
                />
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`absolute -top-1.5 -right-3.5 min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold flex items-center justify-center ${
                      isActive
                        ? "bg-[#5B1313] text-white"
                        : item.id === "concerns"
                        ? "bg-amber-100 text-amber-900"
                        : "bg-stone-200 text-stone-700"
                    }`}
                  >
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </div>
              <span
                className={`text-xs leading-none ${
                  isActive ? "font-bold" : "font-medium"
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
