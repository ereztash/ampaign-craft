import { useMemo } from "react";
import MetaConnect from "@/components/MetaConnect";
import MetaMonitor from "@/components/MetaMonitor";
import DataAnalysisTab from "@/components/DataAnalysisTab";
import CampaignCockpit from "@/components/CampaignCockpit";
import CompetitiveIntelligenceDashboard from "@/components/CompetitiveIntelligenceDashboard";
import IntelligenceSynthesisDashboard from "@/components/IntelligenceSynthesisDashboard";
import { useLanguage } from "@/i18n/LanguageContext";
import { FunnelResult } from "@/types/funnel";
import { MetaAuthState, MetaAdAccount } from "@/types/meta";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { analyzeBrandVector } from "@/engine/brandVectorEngine";
import { inferDISCProfile } from "@/engine/discProfileEngine";
import { calculateEPS } from "@/engine/emotionalPerformanceEngine";
import { generateCrossDomainInsights, type Industry } from "@/engine/crossDomainBenchmarkEngine";
import { assignToCohort } from "@/engine/behavioralCohortEngine";

export interface MetaConnectionProps {
  connected: boolean;
  loading: boolean;
  error: string | null;
  accounts: MetaAdAccount[];
  selectedAccountId: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
  onSelectAccount: (id: string, name: string) => void;
}

interface AnalyticsTabProps {
  meta: MetaConnectionProps;
  auth: MetaAuthState | null;
  result: FunnelResult;
  isSimplified: boolean;
}

const INDUSTRY_MAP: Record<string, Industry> = {
  fashion: "fashion",
  tech: "tech",
  food: "food",
  services: "services",
  education: "education",
  health: "health",
  realEstate: "realEstate",
  tourism: "services",
  personalBrand: "services",
  other: "services",
};

const AnalyticsTab = ({ meta, auth, result, isSimplified }: AnalyticsTabProps) => {
  const { t } = useLanguage();

  const discProfile = useMemo(
    () => inferDISCProfile(result.formData),
    [result.formData],
  );

  const brandVector = useMemo(
    () => analyzeBrandVector(result),
    [result],
  );

  const eps = useMemo(
    () => calculateEPS(undefined, brandVector, discProfile, undefined),
    [brandVector, discProfile],
  );

  const resolvedIndustry: Industry = useMemo(
    () => INDUSTRY_MAP[result.formData.businessField || "other"] || "services",
    [result.formData.businessField],
  );

  const crossDomain = useMemo(
    () => generateCrossDomainInsights(resolvedIndustry),
    [resolvedIndustry],
  );

  const cohortAssignment = useMemo(
    () => assignToCohort(result.formData, discProfile),
    [result.formData, discProfile],
  );

  return (
    <div className="space-y-6">
      {/* Section 1: Performance Monitoring */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          {t("analyticsMonitorSection")}
        </h3>
        {isSimplified ? (
          <Card>
            <CardHeader>
              <CardTitle>{t("beginnerMonitorTitle")}</CardTitle>
              <p className="text-sm text-muted-foreground">{t("beginnerMonitorSubtitle")}</p>
            </CardHeader>
            <CardContent>
              <MetaConnect {...meta} />
              <p className="mt-4 text-center text-xs text-muted-foreground">{t("unlockFullView")}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <MetaConnect {...meta} />
            {auth && meta.selectedAccountId && (
              <MetaMonitor
                result={result}
                accountId={meta.selectedAccountId}
                accessToken={auth.accessToken}
              />
            )}
          </div>
        )}
      </div>

      <Separator />

      {/* Section 2: Data Import & Analysis */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          {t("analyticsDataSection")}
        </h3>
        <DataAnalysisTab />
      </div>

      <Separator />

      {/* Section 3: Campaign Cockpit */}
      <div>
        <CampaignCockpit />
      </div>

      {!isSimplified && (
        <>
          <Separator />

          {/* Section 4: Behavioral Intelligence Synthesis */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              {t("analyticsIntelligenceSection") || "Behavioral Intelligence"}
            </h3>
            <IntelligenceSynthesisDashboard
              eps={eps}
              crossDomain={crossDomain}
              cohort={cohortAssignment}
            />
          </div>

          <Separator />

          {/* Section 5: Competitive Intelligence */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              {t("analyticsCompetitiveSection") || "Competitive Intelligence"}
            </h3>
            <CompetitiveIntelligenceDashboard industry={resolvedIndustry} />
          </div>
        </>
      )}
    </div>
  );
};

export default AnalyticsTab;
