import { cn } from "@/lib/utils";

interface LogoIconProps {
  className?: string;
  size?: number;
}

/** The standalone J mark — use where only the icon is needed (favicon fallback, small contexts) */
export function LogoIcon({ className, size = 28 }: LogoIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      {/* Background — dark in light mode, slightly lifted in dark mode */}
      <rect
        width="100"
        height="100"
        rx="22"
        fill="#0A0A0A"
        className="dark:fill-[#1F1F1F]"
      />
      {/* Subtle border for dark-mode visibility */}
      <rect
        width="100"
        height="100"
        rx="22"
        fill="none"
        stroke="white"
        strokeWidth="1.5"
        strokeOpacity="0.12"
      />
      {/* Top bar of J */}
      <line
        x1="33"
        y1="22"
        x2="67"
        y2="22"
        stroke="white"
        strokeWidth="12"
        strokeLinecap="round"
      />
      {/* Stem + hook of J */}
      <path
        d="M 67 22 L 67 65 Q 67 80 53 80 Q 39 80 37 70"
        stroke="white"
        strokeWidth="12"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

interface LogoProps {
  className?: string;
  iconSize?: number;
}

/** Full wordmark — icon + "JobMatch" text */
export function Logo({ className, iconSize = 28 }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoIcon size={iconSize} />
      <span
        className="font-semibold text-foreground tracking-tight"
        style={{ fontSize: iconSize * 0.64 }}
      >
        JobMatch
      </span>
    </span>
  );
}
