import { useLanguage } from "@/i18n/LanguageContext";
import { getGlossaryTerm } from "@/lib/glossary";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";

interface GlossaryTooltipProps {
  termKey: string;
}

const GlossaryTooltip = ({ termKey }: GlossaryTooltipProps) => {
  const { language } = useLanguage();
  const term = getGlossaryTerm(termKey);
  if (!term) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className="inline-flex items-center text-muted-foreground/50 hover:text-primary transition-colors ml-0.5">
          <HelpCircle className="h-3 w-3" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <div className="space-y-1">
          <div className="font-semibold text-xs">{term.term[language]}</div>
          <div className="text-xs text-muted-foreground">{term.definition[language]}</div>
          {term.example && (
            <div className="text-xs text-muted-foreground italic">{term.example[language]}</div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
};

export default GlossaryTooltip;
