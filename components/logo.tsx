import { cn } from "@/lib/utils";

interface LogoIconProps {
  className?: string;
  size?: number;
}

/** The standalone J mark — use where only the icon is needed (favicon fallback, small contexts) */
export function LogoIcon({ className, size = 28 }: LogoIconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      height={size}
      viewBox="0 0 100 100"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background — dark in light mode, slightly lifted in dark mode */}
      <rect
        className="dark:fill-[#1F1F1F]"
        fill="#0A0A0A"
        height="100"
        rx="22"
        width="100"
      />
      {/* Subtle border for dark-mode visibility */}
      <rect
        fill="none"
        height="100"
        rx="22"
        stroke="white"
        strokeOpacity="0.12"
        strokeWidth="1.5"
        width="100"
      />
      {/* Top bar of J */}
      <line
        stroke="white"
        strokeLinecap="round"
        strokeWidth="12"
        x1="33"
        x2="67"
        y1="22"
        y2="22"
      />
      {/* Stem + hook of J */}
      <path
        d="M 67 22 L 67 65 Q 67 80 53 80 Q 39 80 37 70"
        fill="none"
        stroke="white"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="12"
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
