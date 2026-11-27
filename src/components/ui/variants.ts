import { cva } from "class-variance-authority";

/** Shared by the React `Button` and by plain Astro links styled as buttons. */
export const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-sm font-medium transition-[color,background-color,transform,box-shadow] duration-150 active:scale-[0.97] outline-none select-none focus-visible:ring-[3px] focus-visible:ring-primary/30 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90",
        outline:
          "border border-input bg-background text-foreground hover:bg-accent",
        secondary: "bg-secondary text-secondary-foreground hover:bg-accent",
        ghost: "text-muted-foreground hover:bg-accent hover:text-foreground",
        destructive: "text-destructive hover:bg-destructive/10",
      },
      size: {
        default: "h-9 px-3",
        sm: "h-8 px-2.5",
        lg: "h-10 px-4 text-[0.9375rem]",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

const tagColors = [
  "gray",
  "brown",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "pink",
  "red",
] as const;
export type TagColor = (typeof tagColors)[number];
