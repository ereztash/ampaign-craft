// SilentBoundary — renders null when its child throws.
// Used to isolate experimental UI mounts (Wedges 1-7) so a single
// component failure cannot bring down the host page.

import { Component, ErrorInfo, ReactNode } from "react";
import { logger } from "@/lib/logger";

interface Props {
  children: ReactNode;
  /** Optional tag for log clarity. */
  tag?: string;
}

interface State {
  hasError: boolean;
}

export class SilentBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logger.error(`SilentBoundary[${this.props.tag ?? "unknown"}]`, error);
    if (info.componentStack) {
      logger.warn(`SilentBoundary[${this.props.tag ?? "unknown"}].stack`, info.componentStack);
    }
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}
