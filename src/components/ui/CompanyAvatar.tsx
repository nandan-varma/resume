import { cn } from "@/lib/cn";
import { avatarFor } from "@/lib/links";

/** A soft coloured tile with the company's initial, so a list is easy to scan. No images are fetched. */
export default function CompanyAvatar({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const { initial, color } = avatarFor(name);
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-lg text-sm font-semibold",
        className,
      )}
      style={{
        background: `var(--tag-${color}-bg)`,
        color: `var(--tag-${color}-fg)`,
      }}
    >
      {initial}
    </span>
  );
}
