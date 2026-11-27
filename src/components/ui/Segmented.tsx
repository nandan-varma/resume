import { cn } from "@/lib/cn";

type Option<T extends string> = {
  value: T;
  label: string;
  hint?: string;
};

/** A small set of mutually exclusive choices that apply the moment you pick one. */
export default function Segmented<T extends string>({
  legend,
  name,
  value,
  options,
  onChange,
  columns,
}: {
  legend: string;
  name: string;
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
  columns?: number;
}) {
  return (
    <fieldset
      className="m-0 grid min-w-0 gap-1 rounded-lg border-0 bg-muted p-1"
      style={{
        gridTemplateColumns: `repeat(${columns ?? options.length}, minmax(0, 1fr))`,
      }}
    >
      <legend className="sr-only">{legend}</legend>
      {options.map((o) => (
        <label
          key={o.value}
          title={o.hint}
          className={cn(
            "cursor-pointer rounded-md px-2 py-1.5 text-center text-sm font-medium transition-all duration-200 has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-primary/30",
            value === o.value
              ? "bg-card shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <input
            type="radio"
            name={name}
            value={o.value}
            checked={value === o.value}
            onChange={() => onChange(o.value)}
            className="sr-only"
          />
          {o.label}
          {o.hint && (
            <span className="block text-xs font-normal text-muted-foreground">
              {o.hint}
            </span>
          )}
        </label>
      ))}
    </fieldset>
  );
}
