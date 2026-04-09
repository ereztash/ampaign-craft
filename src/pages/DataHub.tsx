import { useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import DataSourceCard, { DataSourceInfo } from "@/components/DataSourceCard";
import DataImportModal from "@/components/DataImportModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import {
  Database, FileSpreadsheet, Facebook, BarChart3,
  MessageCircle, Mail, UserCircle, Plus, Sparkles,
} from "lucide-react";

const DataHub = () => {
  const { language } = useLanguage();
  const isHe = language === "he";
  const { profile } = useUserProfile();
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();
  const [importOpen, setImportOpen] = useState(false);

  const mp = reducedMotion ? {} : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4 } };

  // Determine status of each data source
  const hasBizProfile = !!profile.lastFormData;
  const hasDiff = typeof window !== "undefined" && !!localStorage.getItem("funnelforge-differentiation-result");
  const hasImported = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("funnelforge-imported-data") || "[]").length > 0;
    } catch { return false; }
  }, []);
  const hasStylome = typeof window !== "undefined" && !!localStorage.getItem("funnelforge-stylome-voice");

  const dataSources: DataSourceInfo[] = useMemo(() => [
    {
      id: "business-profile",
      name: { he: "פרופיל עסקי", en: "Business Profile" },
      description: {
        he: "תחום, קהל יעד, תקציב, מטרות — הבסיס לכל האסטרטגיות",
        en: "Field, audience, budget, goals — the foundation for all strategies",
      },
      icon: UserCircle,
      category: { he: "נתוני עסק", en: "Business Data" },
      status: hasBizProfile ? "connected" : "disconnected",
      recordCount: hasBizProfile ? 1 : undefined,
      lastSync: hasBizProfile ? new Date().toLocaleDateString(isHe ? "he-IL" : "en-US") : undefined,
      feeds: hasBizProfile ? [
        { he: "משפך שיווקי", en: "Marketing Funnel" },
        { he: "סקריפטי מכירה", en: "Sales Scripts" },
        { he: "תמחור", en: "Pricing" },
      ] : [],
      onConnect: () => navigate("/wizard"),
    },
    {
      id: "differentiation",
      name: { he: "בידול עסקי", en: "Business Differentiation" },
      description: {
        he: "מבחן סתירה, שכבה נסתרת, מיפוי מתחרים — מזין את כל הקופי והסקריפטים",
        en: "Contradiction test, hidden layer, competitor mapping — feeds all copy and scripts",
      },
      icon: Sparkles,
      category: { he: "אינטליגנציה", en: "Intelligence" },
      status: hasDiff ? "connected" : "disconnected",
      feeds: hasDiff ? [
        { he: "Hooks מותאמים", en: "Custom Hooks" },
        { he: "סקריפטי מכירה", en: "Sales Scripts" },
        { he: "Brand DNA", en: "Brand DNA" },
      ] : [],
      onConnect: () => navigate("/differentiate"),
    },
    {
      id: "csv-import",
      name: { he: "ייבוא נתונים", en: "Data Import" },
      description: {
        he: "CSV / Excel — נתוני קמפיינים, מכירות, לידים",
        en: "CSV / Excel — campaign data, sales, leads",
      },
      icon: FileSpreadsheet,
      category: { he: "ייבוא ידני", en: "Manual Import" },
      status: hasImported ? "connected" : "disconnected",
      feeds: hasImported ? [
        { he: "אנליטיקס", en: "Analytics" },
        { he: "בנצ'מרק", en: "Benchmarks" },
      ] : [],
      onConnect: () => setImportOpen(true),
    },
    {
      id: "meta-ads",
      name: { he: "Meta Ads", en: "Meta Ads" },
      description: {
        he: "Facebook & Instagram — נתוני קמפיינים, KPIs, ביצועים",
        en: "Facebook & Instagram — campaign data, KPIs, performance",
      },
      icon: Facebook,
      category: { he: "פרסום", en: "Advertising" },
      status: "disconnected",
      feeds: [],
      onConnect: () => navigate("/strategy"),
    },
    {
      id: "google-analytics",
      name: { he: "Google Analytics", en: "Google Analytics" },
      description: {
        he: "נתוני תנועה, המרות, התנהגות משתמשים",
        en: "Traffic data, conversions, user behavior",
      },
      icon: BarChart3,
      category: { he: "אנליטיקס", en: "Analytics" },
      status: "disconnected",
      feeds: [],
    },
    {
      id: "whatsapp",
      name: { he: "WhatsApp Business", en: "WhatsApp Business" },
      description: {
        he: "שלח עדכוני קמפיין ותבניות מסרים ישירות",
        en: "Send campaign updates and message templates directly",
      },
      icon: MessageCircle,
      category: { he: "תקשורת", en: "Messaging" },
      status: "disconnected",
      feeds: [],
    },
    {
      id: "mailchimp",
      name: { he: "Mailchimp", en: "Mailchimp" },
      description: {
        he: "סנכרן קהלים ותוכן אימייל",
        en: "Sync audiences and email content",
      },
      icon: Mail,
      category: { he: "אימייל", en: "Email" },
      status: "disconnected",
      feeds: [],
    },
    {
      id: "stylome",
      name: { he: "טביעת סגנון", en: "Writing Style" },
      description: {
        he: "טביעת אצבע סגנונית — ה-AI כותב בקול שלך",
        en: "Style fingerprint — AI writes in your voice",
      },
      icon: UserCircle,
      category: { he: "אינטליגנציה", en: "Intelligence" },
      status: hasStylome ? "connected" : "disconnected",
      feeds: hasStylome ? [
        { he: "קופי AI", en: "AI Copy" },
        { he: "תבניות WhatsApp", en: "WhatsApp Templates" },
      ] : [],
      onConnect: () => navigate("/strategy"),
    },
  ], [hasBizProfile, hasDiff, hasImported, hasStylome, isHe, navigate]);

  const connectedCount = dataSources.filter((s) => s.status === "connected").length;

  const handleImport = useCallback((dataset: any) => {
    try {
      const existing = JSON.parse(localStorage.getItem("funnelforge-imported-data") || "[]");
      existing.push(dataset);
      localStorage.setItem("funnelforge-imported-data", JSON.stringify(existing));
    } catch { /* ignore */ }
    setImportOpen(false);
  }, []);

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl space-y-6">
      {/* Header */}
      <motion.div {...mp}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground" dir="auto">
              {isHe ? "מקורות מידע" : "Data Sources"}
            </h1>
            <p className="text-sm text-muted-foreground" dir="auto">
              {isHe
                ? "ככל שתחבר יותר מידע, המערכת תהפוך חכמה יותר"
                : "The more data you connect, the smarter the system becomes"}
            </p>
          </div>
          <Badge variant="outline" className="text-sm">
            {connectedCount}/{dataSources.length} {isHe ? "מחוברים" : "connected"}
          </Badge>
        </div>
      </motion.div>

      {/* Power meter */}
      <motion.div {...(reducedMotion ? {} : { ...mp, transition: { duration: 0.4, delay: 0.1 } })}>
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <Database className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">
                {isHe ? "עוצמת המערכת" : "System Power"}
              </span>
              <span className="text-sm font-bold text-primary ms-auto">
                {Math.round((connectedCount / dataSources.length) * 100)}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${(connectedCount / dataSources.length) * 100}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2" dir="auto">
              {isHe
                ? `חבר ${dataSources.length - connectedCount} מקורות נוספים לאסטרטגיות מדויקות יותר`
                : `Connect ${dataSources.length - connectedCount} more sources for more precise strategies`}
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Data source grid */}
      <motion.div {...(reducedMotion ? {} : { ...mp, transition: { duration: 0.4, delay: 0.15 } })}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {dataSources.map((source) => (
            <DataSourceCard key={source.id} source={source} />
          ))}
        </div>
      </motion.div>

      <DataImportModal
        open={importOpen}
        onOpenChange={setImportOpen}
        onImport={handleImport}
      />
    </div>
  );
};

export default DataHub;
