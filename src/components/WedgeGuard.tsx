// ═══════════════════════════════════════════════════════════════════════════
// WedgeGuard — Route gate for module visibility
//
// Wraps a module route. If the module is enabled in the active wedge mode,
// renders the children. Otherwise renders LockedModuleScreen, which logs
// the visit as a phantom-interest signal.
// ═══════════════════════════════════════════════════════════════════════════

import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { isModuleEnabled, type WedgeModule } from "@/lib/wedgeMode";
import { trackModuleView } from "@/lib/wedgeTelemetry";
import LockedModuleScreen from "@/components/LockedModuleScreen";

interface Props {
  module: WedgeModule;
  children: React.ReactNode;
}

const WedgeGuard = ({ module, children }: Props) => {
  const { user } = useAuth();
  const enabled = isModuleEnabled(module);

  useEffect(() => {
    if (enabled) {
      trackModuleView(module, { userId: user?.id });
    }
  }, [enabled, module, user?.id]);

  if (!enabled) return <LockedModuleScreen module={module} />;
  return <>{children}</>;
};

export default WedgeGuard;
