"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function NavigationLoading() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(false);
  }, [pathname, searchParams]);

  useEffect(() => {
    let timeoutId: number | undefined;

    function handleClick(event: MouseEvent) {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
        return;
      }

      const target = event.target instanceof Element ? event.target.closest("a[href]") : null;

      if (!(target instanceof HTMLAnchorElement) || target.target === "_blank" || target.hasAttribute("download")) {
        return;
      }

      const href = target.getAttribute("href");

      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
        return;
      }

      const nextUrl = new URL(target.href, window.location.href);

      if (nextUrl.origin !== window.location.origin || nextUrl.href === window.location.href) {
        return;
      }

      setLoading(true);
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => setLoading(false), 8000);
    }

    document.addEventListener("click", handleClick, true);

    return () => {
      document.removeEventListener("click", handleClick, true);
      window.clearTimeout(timeoutId);
    };
  }, []);

  if (!loading) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 top-0 z-50 h-1 overflow-hidden bg-teal-100" role="status" aria-label="Loading page">
      <div className="route-progress-bar h-full w-1/2 bg-teal-600" />
    </div>
  );
}
