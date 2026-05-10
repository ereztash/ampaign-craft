import { useRef, useCallback } from "react";
import { useMotionValue, useSpring } from "framer-motion";

const SPRING = { stiffness: 300, damping: 20 };

/**
 * Attaches a magnetic pull effect to an element.
 * The element drifts toward the cursor while hovered and springs back on leave.
 *
 * @param strength 0-1, fraction of cursor offset to apply. Default 0.3.
 */
export function useMagnetic(strength = 0.3) {
  const ref = useRef<HTMLElement>(null);
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const x = useSpring(rawX, SPRING);
  const y = useSpring(rawY, SPRING);

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      rawX.set((e.clientX - (rect.left + rect.width / 2)) * strength);
      rawY.set((e.clientY - (rect.top + rect.height / 2)) * strength);
    },
    [rawX, rawY, strength],
  );

  const onMouseLeave = useCallback(() => {
    rawX.set(0);
    rawY.set(0);
  }, [rawX, rawY]);

  return { ref, x, y, onMouseMove, onMouseLeave };
}
