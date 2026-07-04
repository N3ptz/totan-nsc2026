"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentPropsWithoutRef } from "react";

type Props = ComponentPropsWithoutRef<typeof Link> & {
  back?: boolean;
};

/**
 * Drop-in replacement for Next.js <Link> that wraps navigation in
 * document.startViewTransition so pages slide in/out.
 *
 * - forward (default): new page slides in from the right
 * - back={true}:       new page slides in from the left
 *
 * Uses typed transitions (Chrome 125+) with a silent fallback to the
 * basic cross-fade for older browsers that support startViewTransition
 * but not types, and plain router.push for browsers with no VT support.
 */
export function TransitionLink({ href, onClick, back = false, ...props }: Props) {
  const router = useRouter();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented) return;
    if (!("startViewTransition" in document)) return; // plain navigation fallback

    e.preventDefault();
    const url  = href.toString();
    const type = back ? "nav-back" : "nav-forward";

    try {
      // Typed API — Chrome 125+
      (document as unknown as {
        startViewTransition: (opts: { update: () => void; types: string[] }) => void;
      }).startViewTransition({ update: () => router.push(url), types: [type] });
    } catch {
      // Basic API — Chrome 111–124
      (document as unknown as { startViewTransition: (fn: () => void) => void })
        .startViewTransition(() => router.push(url));
    }
  };

  return <Link href={href} onClick={handleClick} {...props} />;
}
