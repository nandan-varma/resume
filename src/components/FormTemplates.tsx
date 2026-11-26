import type {
  ArrayFieldItemTemplateProps,
  ObjectFieldTemplateProps,
  RJSFSchema,
} from "@rjsf/utils";
import { ChevronRight } from "lucide-react";
import { isValidElement } from "react";

const isWide = (schema: RJSFSchema | undefined, widget: unknown) =>
  widget === "textarea" ||
  schema?.type === "array" ||
  schema?.type === "object";

/** Short fields sit side by side; textareas, lists and groups take a full row. */
export function GridObject({
  properties,
  schema,
  uiSchema,
}: ObjectFieldTemplateProps) {
  const props = (schema.properties ?? {}) as Record<string, RJSFSchema>;
  return (
    <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
      {properties
        .filter((p) => !p.hidden)
        .map((p) => {
          const widget = (uiSchema?.[p.name] as Record<string, unknown>)?.[
            "ui:widget"
          ];
          return (
            <div
              key={p.name}
              className={isWide(props[p.name], widget) ? "sm:col-span-2" : ""}
            >
              {p.content}
            </div>
          );
        })}
    </div>
  );
}

const LABEL_KEYS = [
  "name",
  "company",
  "school",
  "role",
  "group",
  "position",
  "label",
];

const labelOf = (value: unknown): string => {
  if (!value || typeof value !== "object") {
    return "";
  }
  const record = value as Record<string, unknown>;
  for (const key of LABEL_KEYS) {
    const v = record[key];
    if (typeof v === "string" && v.trim()) {
      return v.trim();
    }
  }
  return "";
};

/** Each job, project or school folds into a one-line row; plain text items stay open. */
export function CollapsibleItem(props: ArrayFieldItemTemplateProps) {
  const { children, buttonsProps, hasToolbar, registry, schema, index } = props;
  const Buttons = registry.templates.ArrayFieldItemButtonsTemplate;

  // Plain text rows and tiny groups (like a link: label + URL) stay open inline.
  const small =
    schema.type === "object" &&
    Object.keys(schema.properties ?? {}).length <= 2;
  if (schema.type !== "object" || small) {
    return (
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">{children}</div>
        {hasToolbar && <Buttons {...buttonsProps} />}
      </div>
    );
  }

  const data = isValidElement(children)
    ? (children.props as { formData?: unknown }).formData
    : undefined;
  const label = labelOf(data);
  const secondary =
    data && typeof data === "object"
      ? [
          (data as Record<string, unknown>).position,
          (data as Record<string, unknown>).degree,
          (data as Record<string, unknown>).org,
          (data as Record<string, unknown>).year,
          (data as Record<string, unknown>).tier,
        ].find((v): v is string => typeof v === "string" && v.trim() !== "")
      : undefined;

  return (
    <details className="group rounded-lg border bg-card" open={label === ""}>
      <summary className="row-hover flex items-center gap-2 rounded-lg px-3 py-2 select-none">
        <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
        <span className="min-w-0 flex-1 truncate font-medium">
          {label || `New item ${index + 1}`}
          {secondary && (
            <span className="ml-2 font-normal text-muted-foreground">
              {secondary}
            </span>
          )}
        </span>
        {hasToolbar && (
          <span
            role="toolbar"
            aria-label="Item actions"
            tabIndex={-1}
            onClick={(e) => e.preventDefault()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <Buttons {...buttonsProps} />
          </span>
        )}
      </summary>
      <div className="border-t p-3">{children}</div>
    </details>
  );
}
