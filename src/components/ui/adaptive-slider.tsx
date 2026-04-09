import { useLanguage } from "@/i18n/LanguageContext";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

interface AdaptiveSliderProps {
  value: number;
  onChange: (value: number) => void;
  label: { he: string; en: string };
  labelLeft: { he: string; en: string };
  labelRight: { he: string; en: string };
  className?: string;
}

const AdaptiveSlider = ({ value, onChange, label, labelLeft, labelRight, className }: AdaptiveSliderProps) => {
  const { language, isRTL } = useLanguage();
  
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{label[language]}</span>
        <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
          {value}%
        </span>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        max={100}
        step={1}
        dir={isRTL ? "rtl" : "ltr"}
        className="w-full"
      />
      <div className={cn("flex justify-between text-xs text-muted-foreground", isRTL && "flex-row-reverse")}>
        <span>{labelLeft[language]}</span>
        <span>{labelRight[language]}</span>
      </div>
    </div>
  );
};

export { AdaptiveSlider };
