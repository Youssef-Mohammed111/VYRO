import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[length:var(--radius-md)] text-base font-medium transition-opacity duration-[var(--motion-quick,150ms)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 min-h-12 px-5",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-fg hover:opacity-90",
        secondary: "border border-border bg-elevated text-fg hover:bg-surface",
        ghost: "text-fg hover:bg-elevated",
        danger: "bg-danger text-fg hover:opacity-90",
        link: "text-primary underline-offset-4 hover:underline h-auto min-h-0 px-0",
      },
      size: {
        default: "h-12",
        sm: "h-11 min-h-11 px-4 text-sm",
        lg: "h-14 min-h-14 px-7 text-lg",
        icon: "size-12 p-0",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export function Button({
  className,
  variant,
  size,
  asChild,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
