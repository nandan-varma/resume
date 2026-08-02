"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function Key({ children }: { children: string }) {
  return (
    <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground">
      {children}
    </kbd>
  );
}

function Row({ combo, label }: { combo: string[]; label: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="flex shrink-0 items-center gap-1">
        {combo.map((k) => (
          <Key key={k}>{k}</Key>
        ))}
      </span>
    </div>
  );
}

const groups: { rows: { combo: string[]; label: string }[]; title: string }[] =
  [
    {
      title: "Global",
      rows: [
        { combo: ["Alt", "←/→"], label: "Switch between tabs" },
        { combo: ["?"], label: "Show this help" },
      ],
    },
    {
      title: "Jobs",
      rows: [
        { combo: ["c"], label: "Add new application" },
        { combo: ["Esc"], label: "Clear status filter" },
      ],
    },
    {
      title: "Forms",
      rows: [{ combo: ["⌘", "Enter"], label: "Submit (any textarea)" }],
    },
    {
      title: "Editor",
      rows: [
        { combo: ["⌘", "S"], label: "Save resume" },
        { combo: ["⌘", "Z"], label: "Undo last AI edit" },
        { combo: ["⌘", "Y"], label: "Redo" },
        { combo: ["Enter"], label: "Send chat message" },
      ],
    },
  ];

interface ShortcutsDialogProps {
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

export function ShortcutsDialog({ open, onOpenChange }: ShortcutsDialogProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
        </DialogHeader>
        <div className="divide-y divide-border">
          {groups.map((group) => (
            <div className="py-2 first:pt-0 last:pb-0" key={group.title}>
              <p className="mb-1 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                {group.title}
              </p>
              {group.rows.map((row) => (
                <Row combo={row.combo} key={row.label} label={row.label} />
              ))}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
