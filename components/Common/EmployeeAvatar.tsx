"use client";
import React, { useEffect, useState } from "react";

const initialsOf = (name?: string) =>
  (name || "")
    .split(" ")
    .map(w => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

/**
 * Memoji avatar from tapback.co (https://github.com/wimell/tapback-memojis).
 * Same seed → same avatar; different seeds → different (random-looking) avatars.
 * Seed is sanitised to alphanumerics so emails/addresses are URL-safe.
 */
export const memojiUrl = (seed: string | number | null | undefined) => {
  const clean = String(seed ?? "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || "settlbox";
  return `https://www.tapback.co/api/avatar/${clean}.webp`;
};

interface EmployeeAvatarProps {
  /** Stable, unique value (email / wallet / name) so each person keeps the same avatar. */
  seed: string | number | null | undefined;
  name?: string;
  /** Explicit image source (uploaded photo or a chosen avatar URL). Overrides the seed memoji. */
  src?: string | null;
  /** Size + shape utilities, e.g. "w-8 h-8". */
  className?: string;
  /** Initials text size used by the fallback. */
  textClassName?: string;
}

export const EmployeeAvatar = ({
  seed,
  name,
  src,
  className = "w-8 h-8",
  textClassName = "text-xs",
}: EmployeeAvatarProps) => {
  const [failed, setFailed] = useState(false);
  const initials = initialsOf(name) || "?";

  // Reset the error state whenever the image source changes.
  useEffect(() => setFailed(false), [src, seed]);

  const resolved =
    src && src.trim()
      ? src
      : seed !== null && seed !== undefined && seed !== ""
        ? memojiUrl(seed)
        : null;

  if (failed || !resolved) {
    return (
      <div
        className={`flex flex-shrink-0 items-center justify-center rounded-full bg-primary-blue/10 font-bold text-primary-blue ${textClassName} ${className}`}
      >
        {initials}
      </div>
    );
  }

  return (
    <img
      src={resolved}
      alt={name || "avatar"}
      onError={() => setFailed(true)}
      loading="lazy"
      className={`flex-shrink-0 rounded-full bg-app-background object-cover ${className}`}
    />
  );
};

export default EmployeeAvatar;
