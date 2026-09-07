"use client";

import { useState } from "react";

type ProductImageProps = {
  src: string | null;
  alt: string;
  className?: string;
};

export function ProductImage({ src, alt, className = "" }: ProductImageProps) {
  const [failed, setFailed] = useState(false);
  const showPlaceholder = !src || failed;

  if (showPlaceholder) {
    return (
      <div
        className={`flex aspect-square items-center justify-center bg-[var(--skeleton)] text-[var(--text-muted)] ${className}`}
        role="img"
        aria-label={alt || "No product image"}
      >
        <svg
          viewBox="0 0 24 24"
          className="h-8 w-8"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden
        >
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <circle cx="9" cy="10" r="1.5" />
          <path d="M4 16l5-4 4 3 3-2 4 3" />
        </svg>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- OFF hosts vary; plain img avoids remotePatterns complexity
    <img
      src={src}
      alt={alt}
      className={`aspect-square object-contain bg-[color-mix(in_srgb,var(--skeleton)_55%,white)] ${className}`}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
