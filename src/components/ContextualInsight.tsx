import { useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Bot, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface ContextualInsightProps {
  title: { he: string; en: string };
  content: { he: string; en: string };
  variant?: "info" | "suggestion" | "warning";
  className?: string;
}

const VARIANT_STYLES = {
  info: "bg-primary/5 border-primary/20 text-primary",
  suggestion: "bg-accent/5 border-accent/20 text-accent",
  warning: "bg-amber-500/5 border-amber-500/20 text-amber-500",
};

const ContextualInsight = ({ title, content, variant = "info", className }: ContextualInsightProps) => {
  const { language } = useLanguage();
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all hover:shadow-sm cursor-pointer",
            VARIANT_STYLES[variant],
            className
          )}
        >
          <Bot className="h-3 w-3" />
          <span dir="auto">{title[language]}</span>
          <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className={cn("mt-2 p-3 rounded-lg border text-xs", VARIANT_STYLES[variant])}
            >
              <p dir="auto" className="text-foreground">{content[language]}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default ContextualInsight;
