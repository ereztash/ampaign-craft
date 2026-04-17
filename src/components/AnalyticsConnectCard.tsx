// AnalyticsConnectCard — connect real data sources for the insights loop
// Google Analytics (GA4) + Meta Pixel + Google Ads
// Stores connection config in localStorage; actual OAuth happens via edge functions.

import { useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { tx } from "@/i18n/tx";
import {
  BarChart3,
  TrendingUp,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";

const STORAGE_KEY = "funnelforge-analytics-connections";

interface AnalyticsConnections {
  ga4?: { measurementId: string; connectedAt: string };
  metaPixel?: { pixelId: string; connectedAt: string };
  googleAds?: { customerId: string; connectedAt: string };
}

function load(): AnalyticsConnections {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function save(data: AnalyticsConnections) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

interface ConnectionRowProps {
  connected: boolean;
  label: string;
  icon: React.ReactNode;
  badgeColor: string;
  children: React.ReactNode;
}

function ConnectionRow({ connected, label, icon, badgeColor, children }: ConnectionRowProps) {
  const [open, setOpen] = useState(false);
  const { language } = useLanguage();
  const isHe = language === "he";

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-muted/40 transition-colors"
        onClick={() => setOpen((p) => !p)}
      >
        <div className="flex items-center gap-2.5">
          {icon}
          <span className="text-sm font-medium" dir="auto">{label}</span>
          {connected ? (
            <Badge className={`text-[10px] px-1.5 py-0 h-4 ${badgeColor} text-white`}>
              {tx({ he: "מזהה נשמר", en: "ID saved" }, language)}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 text-muted-foreground">
              {tx({ he: "לא הוזן", en: "Not set" }, language)}
            </Badge>
          )}
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && (
        <div className="border-t bg-muted/20 p-3">
          {children}
        </div>
      )}
    </div>
  );
}

export function AnalyticsConnectCard() {
  const { language } = useLanguage();
  const isHe = language === "he";
  const { toast } = useToast();

  const [connections, setConnections] = useState<AnalyticsConnections>(load);

  // GA4
  const [ga4Id, setGa4Id] = useState(connections.ga4?.measurementId ?? "");
  // Meta Pixel
  const [pixelId, setPixelId] = useState(connections.metaPixel?.pixelId ?? "");
  // Google Ads
  const [adsId, setAdsId] = useState(connections.googleAds?.customerId ?? "");

  const connect = (
    type: "ga4" | "metaPixel" | "googleAds",
    value: string,
    fieldName: string
  ) => {
    if (!value.trim()) {
      toast({ title: tx({ he: "הכנס מזהה תקין", en: "Enter a valid ID" }, language), variant: "destructive" });
      return;
    }
    const now = new Date().toISOString();
    const updated: AnalyticsConnections = { ...connections };
    if (type === "ga4") updated.ga4 = { measurementId: value.trim(), connectedAt: now };
    if (type === "metaPixel") updated.metaPixel = { pixelId: value.trim(), connectedAt: now };
    if (type === "googleAds") updated.googleAds = { customerId: value.trim(), connectedAt: now };
    save(updated);
    setConnections(updated);
    toast({ title: tx({ he: `${fieldName} חובר בהצלחה`, en: `${fieldName} connected successfully` }, language) });
  };

  const disconnect = (type: "ga4" | "metaPixel" | "googleAds") => {
    const updated = { ...connections };
    delete updated[type];
    save(updated);
    setConnections(updated);
    if (type === "ga4") setGa4Id("");
    if (type === "metaPixel") setPixelId("");
    if (type === "googleAds") setAdsId("");
    toast({ title: tx({ he: "הניתוק בוצע", en: "Disconnected" }, language) });
  };

  const connectedCount = Object.keys(connections).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center justify-between" dir="auto">
          <span className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            {tx({ he: "חיבור נתוני ביצועים", en: "Connect Analytics" }, language)}
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-amber-500 text-amber-600">
              Beta
            </Badge>
          </span>
          {connectedCount > 0 && (
            <Badge className="text-[10px] px-1.5 bg-green-500 text-white">
              {connectedCount} {tx({ he: "שמורים", en: "saved" }, language)}
            </Badge>
          )}
        </CardTitle>
        <p className="text-xs text-muted-foreground" dir="auto">
          {isHe
            ? "שמור כאן את המזהים של חשבונות הניתוח שלך. משיכת נתונים חיה תיפתח בשלב הבא."
            : "Save your analytics account IDs here. Live data pulling is coming in the next release."}
        </p>
      </CardHeader>

      <CardContent className="space-y-2 pt-0">
        {/* GA4 */}
        <ConnectionRow
          connected={!!connections.ga4}
          label="Google Analytics 4"
          icon={<TrendingUp className="h-4 w-4 text-orange-500" />}
          badgeColor="bg-orange-500"
        >
          <div className="space-y-2" dir={tx({ he: "rtl", en: "ltr" }, language)}>
            <div className="space-y-1">
              <Label htmlFor="ga4-id" className="text-xs" dir="auto">
                {tx({ he: "Measurement ID (G-XXXXXXXX)", en: "Measurement ID (G-XXXXXXXX)" }, language)}
              </Label>
              <div className="flex gap-2">
                <Input
                  id="ga4-id"
                  dir="ltr"
                  placeholder="G-XXXXXXXXXX"
                  value={ga4Id}
                  onChange={(e) => setGa4Id(e.target.value)}
                  className="text-xs font-mono"
                />
                <Button
                  size="sm"
                  variant={connections.ga4 ? "destructive" : "default"}
                  onClick={() =>
                    connections.ga4 ? disconnect("ga4") : connect("ga4", ga4Id, "Google Analytics")
                  }
                >
                  {connections.ga4 ? (tx({ he: "נתק", en: "Disconnect" }, language)) : (tx({ he: "חבר", en: "Connect" }, language))}
                </Button>
              </div>
            </div>
            {connections.ga4 && (
              <p className="text-[10px] text-green-600 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {isHe
                  ? `מחובר מ-${new Date(connections.ga4.connectedAt).toLocaleDateString("he-IL")}`
                  : `Connected since ${new Date(connections.ga4.connectedAt).toLocaleDateString()}`}
              </p>
            )}
            <a
              href="https://analytics.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-primary hover:underline flex items-center gap-1"
            >
              <ExternalLink className="h-2.5 w-2.5" />
              {tx({ he: "פתח Google Analytics", en: "Open Google Analytics" }, language)}
            </a>
          </div>
        </ConnectionRow>

        {/* Meta Pixel */}
        <ConnectionRow
          connected={!!connections.metaPixel}
          label="Meta Pixel"
          icon={<Circle className="h-4 w-4 text-blue-600 fill-blue-600" />}
          badgeColor="bg-blue-600"
        >
          <div className="space-y-2" dir={tx({ he: "rtl", en: "ltr" }, language)}>
            <div className="space-y-1">
              <Label htmlFor="pixel-id" className="text-xs" dir="auto">
                {tx({ he: "מזהה פיקסל (מספר)", en: "Pixel ID (number)" }, language)}
              </Label>
              <div className="flex gap-2">
                <Input
                  id="pixel-id"
                  dir="ltr"
                  placeholder="1234567890"
                  value={pixelId}
                  onChange={(e) => setPixelId(e.target.value)}
                  className="text-xs font-mono"
                />
                <Button
                  size="sm"
                  variant={connections.metaPixel ? "destructive" : "default"}
                  onClick={() =>
                    connections.metaPixel
                      ? disconnect("metaPixel")
                      : connect("metaPixel", pixelId, "Meta Pixel")
                  }
                >
                  {connections.metaPixel ? (tx({ he: "נתק", en: "Disconnect" }, language)) : (tx({ he: "חבר", en: "Connect" }, language))}
                </Button>
              </div>
            </div>
            {connections.metaPixel && (
              <p className="text-[10px] text-green-600 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {isHe
                  ? `מחובר מ-${new Date(connections.metaPixel.connectedAt).toLocaleDateString("he-IL")}`
                  : `Connected since ${new Date(connections.metaPixel.connectedAt).toLocaleDateString()}`}
              </p>
            )}
            <a
              href="https://business.facebook.com/events_manager"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-primary hover:underline flex items-center gap-1"
            >
              <ExternalLink className="h-2.5 w-2.5" />
              {tx({ he: "פתח Events Manager", en: "Open Events Manager" }, language)}
            </a>
          </div>
        </ConnectionRow>

        {/* Google Ads */}
        <ConnectionRow
          connected={!!connections.googleAds}
          label="Google Ads"
          icon={<BarChart3 className="h-4 w-4 text-green-600" />}
          badgeColor="bg-green-600"
        >
          <div className="space-y-2" dir={tx({ he: "rtl", en: "ltr" }, language)}>
            <div className="space-y-1">
              <Label htmlFor="ads-id" className="text-xs" dir="auto">
                {tx({ he: "Customer ID (XXX-XXX-XXXX)", en: "Customer ID (XXX-XXX-XXXX)" }, language)}
              </Label>
              <div className="flex gap-2">
                <Input
                  id="ads-id"
                  dir="ltr"
                  placeholder="123-456-7890"
                  value={adsId}
                  onChange={(e) => setAdsId(e.target.value)}
                  className="text-xs font-mono"
                />
                <Button
                  size="sm"
                  variant={connections.googleAds ? "destructive" : "default"}
                  onClick={() =>
                    connections.googleAds
                      ? disconnect("googleAds")
                      : connect("googleAds", adsId, "Google Ads")
                  }
                >
                  {connections.googleAds ? (tx({ he: "נתק", en: "Disconnect" }, language)) : (tx({ he: "חבר", en: "Connect" }, language))}
                </Button>
              </div>
            </div>
            {connections.googleAds && (
              <p className="text-[10px] text-green-600 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {isHe
                  ? `מחובר מ-${new Date(connections.googleAds.connectedAt).toLocaleDateString("he-IL")}`
                  : `Connected since ${new Date(connections.googleAds.connectedAt).toLocaleDateString()}`}
              </p>
            )}
          </div>
        </ConnectionRow>

        {connectedCount === 0 && (
          <p className="text-[11px] text-muted-foreground text-center pt-1" dir="auto">
            {isHe
              ? "חיבור נתונים אמיתיים מאפשר ל-FunnelForge ללמוד מה עובד בפועל"
              : "Connecting real data lets FunnelForge learn what actually works"}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
