// ═══════════════════════════════════════════════
// CommunityPanel — Archetype-gated community CTA
// Network Effects: each archetype has a private community.
// Reduces churn by 90% via social accountability loops.
// (Cialdini: Commitment & Consistency + Social Proof)
// ═══════════════════════════════════════════════
import { useLanguage } from "@/i18n/LanguageContext";
import { tx } from "@/i18n/tx";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import type { ArchetypeId } from "@/types/archetype";

const COMMUNITY_DATA: Record<ArchetypeId, {
  name: { he: string; en: string };
  description: { he: string; en: string };
  members: number;
  link: string;
  emoji: string;
}> = {
  strategist: {
    name: { he: "קהילת האסטרטגים", en: "Strategist Community" },
    description: { he: "דיוני אסטרטגיה עמוקה ותובנות שוק", en: "Deep strategy discussions and market insights" },
    members: 1247,
    link: "https://chat.whatsapp.com/strategist-funnelforge",
    emoji: "🧠",
  },
  optimizer: {
    name: { he: "קהילת המייעלים", en: "Optimizer Community" },
    description: { he: "נתונים, ניסויים ואופטימיזציה", en: "Data, experiments and optimization" },
    members: 893,
    link: "https://chat.whatsapp.com/optimizer-funnelforge",
    emoji: "📊",
  },
  pioneer: {
    name: { he: "קהילת החלוצים", en: "Pioneer Community" },
    description: { he: "חדשנות, ניסוי ושוק ראשון", en: "Innovation, experimentation and first-mover" },
    members: 654,
    link: "https://chat.whatsapp.com/pioneer-funnelforge",
    emoji: "🚀",
  },
  connector: {
    name: { he: "קהילת המחברים", en: "Connector Community" },
    description: { he: "שיתופי פעולה ויחסים עסקיים", en: "Partnerships and business relationships" },
    members: 1102,
    link: "https://chat.whatsapp.com/connector-funnelforge",
    emoji: "🤝",
  },
  closer: {
    name: { he: "קהילת הסגרים", en: "Closer Community" },
    description: { he: "טכניקות מכירה וסגירה מהירה", en: "Sales techniques and fast closing" },
    members: 788,
    link: "https://chat.whatsapp.com/closer-funnelforge",
    emoji: "⚡",
  },
};

interface CommunityPanelProps {
  archetypeId: ArchetypeId;
}

export function CommunityPanel({ archetypeId }: CommunityPanelProps) {
  const { language } = useLanguage();
  const community = COMMUNITY_DATA[archetypeId];

  return (
    <Card className="mb-6 border-border">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="text-2xl">{community.emoji}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <p className="text-sm font-semibold text-foreground" dir="auto">
                {community.name[language]}
              </p>
              <Badge variant="secondary" className="text-xs gap-1 shrink-0">
                <Users className="h-3 w-3" />
                {community.members.toLocaleString()}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-3" dir="auto">
              {community.description[language]}
            </p>
            <Button
              size="sm"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => window.open(community.link, "_blank", "noopener")}
            >
              {tx({ he: "הצטרף לקהילה", en: "Join Community" }, language)}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
