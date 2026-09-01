import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-[5px] text-[13px] font-medium tracking-[-0.015em] transition-[color,background-color,border-color,opacity] duration-150 disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
  {
    variants: {
      variant: {
        default: "bg-foreground text-background hover:opacity-90",
        outline:
          "border border-line bg-transparent text-foreground hover:border-foreground",
        ghost: "text-mute hover:text-foreground",
        ink: "bg-foreground text-background hover:opacity-90",
        ok: "bg-ok/10 text-ok hover:bg-ok/16",
        weld: "bg-weld text-[#1A1400] hover:brightness-105",
      },
      size: {
        default: "h-8 px-3.5",
        sm: "h-7 px-2.5 text-[12px]",
        lg: "h-9 px-4",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
