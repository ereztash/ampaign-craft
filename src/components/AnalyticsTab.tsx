import MetaConnect from "@/components/MetaConnect";
import MetaMonitor from "@/components/MetaMonitor";
import DataAnalysisTab from "@/components/DataAnalysisTab";
import CampaignCockpit from "@/components/CampaignCockpit";
import { useLanguage } from "@/i18n/LanguageContext";
import { FunnelResult } from "@/types/funnel";
import { MetaAuthState, MetaAdAccount } from "@/types/meta";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

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

const AnalyticsTab = ({ meta, auth, result, isSimplified }: AnalyticsTabProps) => {
  const { t } = useLanguage();

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
    </div>
  );
};

export default AnalyticsTab;
