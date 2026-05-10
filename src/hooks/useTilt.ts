import { useRef, useCallback } from "react";
import { useMotionValue, useSpring } from "framer-motion";

const SPRING = { stiffness: 400, damping: 30 };

/**
 * Tracks cursor position within an element and returns spring-smoothed
 * rotation values for a 3D tilt effect.
 *
 * @param maxDeg Maximum tilt angle in degrees. Default 4.
 */
export function useTilt(maxDeg = 4) {
  const ref = useRef<HTMLElement>(null);
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const rotateX = useSpring(rawX, SPRING);
  const rotateY = useSpring(rawY, SPRING);

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const nx = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
      const ny = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
      rawY.set(nx * maxDeg);
      rawX.set(-ny * maxDeg);
    },
    [rawX, rawY, maxDeg],
  );

  const onMouseLeave = useCallback(() => {
    rawX.set(0);
    rawY.set(0);
  }, [rawX, rawY]);

  return { ref, rotateX, rotateY, onMouseMove, onMouseLeave };
}
