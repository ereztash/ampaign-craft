import MetaConnect from "@/components/MetaConnect";
import MetaMonitor from "@/components/MetaMonitor";
import DataAnalysisTab from "@/components/DataAnalysisTab";
import { useLanguage } from "@/i18n/LanguageContext";
import { FunnelResult } from "@/types/funnel";
import { MetaAuthState, MetaAdAccount } from "@/types/meta";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface AnalyticsTabProps {
  auth: MetaAuthState | null;
  metaLoading: boolean;
  metaError: string | null;
  accounts: MetaAdAccount[];
  selectedAccountId: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
  onSelectAccount: (id: string, name: string) => void;
  result: FunnelResult;
  isSimplified: boolean;
}

const AnalyticsTab = ({
  auth,
  metaLoading,
  metaError,
  accounts,
  selectedAccountId,
  onConnect,
  onDisconnect,
  onSelectAccount,
  result,
  isSimplified,
}: AnalyticsTabProps) => {
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
              <MetaConnect
                connected={!!auth}
                loading={metaLoading}
                error={metaError}
                accounts={accounts}
                selectedAccountId={selectedAccountId}
                onConnect={onConnect}
                onDisconnect={onDisconnect}
                onSelectAccount={onSelectAccount}
              />
              <p className="mt-4 text-center text-xs text-muted-foreground">{t("unlockFullView")}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <MetaConnect
              connected={!!auth}
              loading={metaLoading}
              error={metaError}
              accounts={accounts}
              selectedAccountId={selectedAccountId}
              onConnect={onConnect}
              onDisconnect={onDisconnect}
              onSelectAccount={onSelectAccount}
            />
            {auth && selectedAccountId && (
              <MetaMonitor
                result={result}
                accountId={selectedAccountId}
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
    </div>
  );
};

export default AnalyticsTab;
