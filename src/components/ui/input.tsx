import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, onKeyDown, ...props }, ref) => {
    const [pulse, setPulse] = React.useState(false);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Skip modifier-only keys
      if (e.key.length > 1 && !["Backspace", "Delete", "Space"].includes(e.key)) {
        onKeyDown?.(e);
        return;
      }
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 120);
      onKeyDown?.(e);
      return () => clearTimeout(t);
    };

    return (
      <div className="relative w-full">
        <input
          type={type}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base",
            "ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium",
            "placeholder:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            "transition-[box-shadow,border-color] duration-200",
            className,
          )}
          ref={ref}
          onKeyDown={handleKeyDown}
          {...props}
        />
        <AnimatePresence>
          {pulse && (
            <motion.span
              key="pulse"
              className="pointer-events-none absolute inset-0 rounded-md border-2 border-primary/60"
              initial={{ opacity: 0.8, scale: 1 }}
              animate={{ opacity: 0, scale: 1.03 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            />
          )}
        </AnimatePresence>
      </div>
    );
  },
);
Input.displayName = "Input";

export { Input };
