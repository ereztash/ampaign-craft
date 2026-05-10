import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useTilt } from "@/hooks/useTilt";

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  /** Maximum tilt angle in degrees. Default 3. */
  maxDeg?: number;
  /** Show a subtle cursor-following glow. Default true. */
  glow?: boolean;
}

/**
 * Card with a 3D perspective tilt that follows the cursor.
 * Drop-in replacement for a plain div/card wrapper.
 */
export function TiltCard({ children, className, maxDeg = 3, glow = true }: TiltCardProps) {
  const { ref, rotateX, rotateY, onMouseMove, onMouseLeave } = useTilt(maxDeg);

  return (
    <motion.div
      ref={ref as React.RefObject<HTMLDivElement>}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
      }}
      whileHover={{ y: -3, transition: { type: "spring", stiffness: 300, damping: 20 } }}
      className={cn(
        "relative rounded-xl transition-shadow duration-300 hover:shadow-lg",
        glow && "hover:shadow-primary/10",
        className,
      )}
    >
      {children}
    </motion.div>
  );
}
