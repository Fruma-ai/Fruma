import { type ClassValue, clsx } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

// Register theme spacing and shadow names so `shadow-none` replaces `shadow-retool-sm` instead of both being kept.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      spacing: ["density-xs", "density-sm", "density-md", "density-lg", "density-xl"],
    },
    classGroups: {
      shadow: [{ shadow: ["retool-sm", "retool-md", "retool-lg"] }],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}