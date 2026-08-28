"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function NavigationLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Start as loading on mount — covers initial page load / hard refresh
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(true);

  // Clear the initial-load state once the page is hydrated & ready
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  // Hide on route change complete
  useEffect(() => {
    setLoading(false);
  }, [pathname, searchParams]);

  // Manage visibility with fade-out delay
  useEffect(() => {
    if (loading) {
      setVisible(true);
    } else {
      const timer = setTimeout(() => setVisible(false), 400);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  // Intercept link clicks
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (e.defaultPrevented) return;
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;
      const href = target.getAttribute("href");
      if (!href) return;
      const pathPart = href.split("?")[0].split("#")[0];
      const isApiOrAsset =
        pathPart.startsWith("/api/") ||
        pathPart.startsWith("/images/") ||
        /\.(pdf|png|jpe?g|gif|svg|csv|xlsx?|zip|json)$/i.test(pathPart);
      const isInternal =
        href.startsWith("/") &&
        !href.startsWith("//") &&
        !target.getAttribute("target") &&
        !isApiOrAsset;
      if (isInternal && pathPart !== pathname) {
        setLoading(true);
      }
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [pathname]);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[99999] flex items-center justify-center pointer-events-none transition-opacity duration-500 ${
        loading ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Multi-ring aesthetic spinner — dark red rings */}
      <div className="relative flex items-center justify-center">
        {/* Outermost faint pulse ring */}
        <div
          className="absolute w-44 h-44 rounded-full animate-pulse"
          style={{ border: "1px solid #3B001B22" }}
        />

        {/* Outer ring — slow counter-clockwise */}
        <div
          className="absolute w-28 h-28 rounded-full"
          style={{
            border: "3px solid transparent",
            borderTopColor: "#3B001B",
            borderRightColor: "#3B001B44",
            filter: "drop-shadow(0 0 6px #3B001B88)",
            animation: "spin-reverse 1.4s linear infinite",
          }}
        />

        {/* Mid ring — clockwise */}
        <div
          className="absolute w-20 h-20 rounded-full"
          style={{
            border: "2.5px solid transparent",
            borderTopColor: "#5C0028",
            borderLeftColor: "#5C002855",
            filter: "drop-shadow(0 0 4px #5C002866)",
            animation: "spin 1s linear infinite",
          }}
        />

        {/* Inner ring — counter-clockwise, faster */}
        <div
          className="absolute w-11 h-11 rounded-full"
          style={{
            border: "2px solid transparent",
            borderTopColor: "#3B001BCC",
            filter: "drop-shadow(0 0 3px #3B001B77)",
            animation: "spin-reverse 0.7s linear infinite",
          }}
        />

        {/* Center dot */}
        <div
          className="w-3 h-3 rounded-full bg-[#3B001B]"
          style={{ boxShadow: "0 0 10px 4px #3B001B88" }}
        />
      </div>
    </div>
  );
}
