import { Loader2 } from "lucide-react";

const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center space-y-4">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl funnel-gradient mx-auto">
        <span className="text-2xl font-bold text-accent-foreground">F</span>
      </div>
      <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
    </div>
  </div>
);

export default LoadingFallback;
