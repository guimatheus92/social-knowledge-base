import { cn } from "@/lib/utils";

/**
 * The theme's signature divider: a hairline painted with the brand spectrum
 * (coral → magenta → violet) that dissolves at both ends. More present than a
 * neutral border, still restrained. See DESIGN.md ("Media Cinematic").
 */
export function BrandRule({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "h-px w-full bg-gradient-to-r from-coral via-magenta to-violet opacity-70",
        "[mask-image:linear-gradient(to_right,transparent,#000_18%,#000_82%,transparent)]",
        className,
      )}
    />
  );
}
