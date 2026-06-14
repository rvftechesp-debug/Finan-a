import { HTMLAttributes, forwardRef } from "react";

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ");
}

interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  value?: number; // 0 a 100
}

const Progress = forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "relative h-2.5 w-full overflow-hidden rounded-full bg-white/[0.07]",
        className
      )}
      {...props}
    >
      <div
        className="h-full rounded-full bg-orange-500 transition-all duration-500"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  )
);
Progress.displayName = "Progress";

export { Progress };
