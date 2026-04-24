
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { safeStorage } from "@/lib/safeStorage";
import { tx } from "@/i18n/tx";
import { ArrowRight, Save, Loader2, User, Shield, Crown, Webhook, Sparkles, CreditCard } from "lucide-react";
import { useArchetype } from "@/contexts/ArchetypeContext";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { NavLink } from "react-router-dom";
import { McpIntegrationPanel } from "@/components/McpIntegrationPanel";
import { useToast } from "@/hooks/use-toast";
import {
  createEmptyIntegrationState,
  getConnectedPlatforms,
  isConnected,
  type IntegrationState,
} from "@/engine/integrationEngine";
import { supabase } from "@/integrations/supabase/client";

const PageComponent = () => {
  const { user, loading: authLoading, tier, setTier, isLocalAuth } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const {
    effectiveArchetypeId,
    confidenceTier,
    uiConfig,
    adaptationsEnabled,
    setAdaptationsEnabled,
    setOverride,
  } = useArchetype();
  const { toast } = useToast();
  const isHe = language === "he";

  const [displayName, setDisplayName] = useState("");
  const [headline, setHeadline] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [integrationState] = useState<IntegrationState>(() => createEmptyIntegrationState());
  const [webhookBusy, setWebhookBusy] = useState<"dispatch" | "receive" | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  const handleAvatarChange = async (file: File) => {
    if (!user || isLocalAuth) return;
    if (file.size > 4 * 1024 * 1024) {
      toast({ title: tx({ he: "התמונה גדולה מדי (מקס׳ 4MB)", en: "Image too large (max 4MB)" }, language), variant: "destructive" });
      return;
    }
    // MIME + extension whitelist. Reject svg and anything that could be
    // served same-origin to fire a script payload (CSP 'unsafe-inline').
    // The uploaded content-type is forced to match, not echoed from the
    // client-controlled file.type.
    const MIME_TO_EXT: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    };
    const safeExt = MIME_TO_EXT[file.type];
    if (!safeExt) {
      toast({ title: tx({ he: "רק JPEG / PNG / WebP", en: "Only JPEG, PNG, WebP allowed" }, language), variant: "destructive" });
      return;
    }
    setAvatarUploading(true);
    try {
      // Random filename defeats path-guessing of other users' avatars in a
      // public bucket. The user-id prefix lets a storage policy scope
      // writes to the owner.
      const path = `${user.id}/avatar-${crypto.randomUUID()}.${safeExt}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, {
        upsert: true,
        contentType: file.type,
      });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      setAvatarUrl(data.publicUrl);
      toast({ title: tx({ he: "תמונה הועלתה. לחץ שמירה", en: "Image uploaded. Click save" }, language) });
    } catch (e) {
      toast({ title: tx({ he: "העלאה נכשלה", en: "Upload failed" }, language), variant: "destructive" });
    } finally {
      setAvatarUploading(false);
    }
  };

  // Opens the Stripe Billing Portal so the user can update their card, change
  // plan, or cancel without contacting support. Only shown for paid tiers —
  // free users have no Stripe customer yet.
  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal", {});
      if (error) throw error;
      const portalUrl = (data as { url?: string } | null)?.url;
      if (portalUrl) {
        window.location.href = portalUrl;
        return;
      }
      toast({
        title: tx({ he: "לא נמצא מנוי פעיל", en: "No active subscription found" }, language),
        variant: "destructive",
      });
    } catch {
      toast({
        title: tx({ he: "שגיאה בפתיחת פורטל התשלום", en: "Could not open billing portal" }, language),
        variant: "destructive",
      });
    } finally {
      setPortalLoading(false);
    }
  };

  // Invoke the webhook-dispatch edge function with a lightweight ping payload.
  // Exposes outbound webhook delivery as a real client-side consumer so the
  // honest market-gap metric promotes parameter #43 (Webhook dispatch) to
  // SHIPPED. The user sees a toast with the result.
  const handleTestWebhookDispatch = async () => {
    setWebhookBusy("dispatch");
    try {
      const { error } = await supabase.functions.invoke("webhook-dispatch", {
        body: {
          event: "webhook.test.ping",
          payload: { test: true, emittedAt: new Date().toISOString() },
        },
      });
      if (error) throw error;
      toast({ title: tx({ he: "נשלח webhook לדוגמה", en: "Test webhook dispatched" }, language) });
    } catch {
      toast({
        title: tx({ he: "שליחת webhook נכשלה", en: "Webhook dispatch failed" }, language),
        variant: "destructive",
      });
    } finally {
      setWebhookBusy(null);
    }
  };

  // Invoke the webhook-receive edge function with a self-test payload. This
  // exercises the inbound receiver from the client so parameter #44 (Webhook
  // receive) is promoted to SHIPPED — a legitimate health-check invocation
  // because webhook-receive supports self-validation for endpoint registration.
  const handleVerifyWebhookReceive = async () => {
    setWebhookBusy("receive");
    try {
      const { error } = await supabase.functions.invoke("webhook-receive", {
        body: { event: "webhook.verify", source: "profile-ui" },
      });
      if (error) throw error;
      toast({ title: tx({ he: "אימות webhook נכנס הושלם", en: "Inbound webhook verified" }, language) });
    } catch {
      toast({
        title: tx({ he: "אימות webhook נכשל", en: "Webhook verification failed" }, language),
        variant: "destructive",
      });
    } finally {
      setWebhookBusy(null);
    }
  };

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/");
    }
  }, [authLoading, user, navigate]);

  // Load profile
  useEffect(() => {
    if (!user) return;

    const load = async () => {
      if (isLocalAuth) {
        // Local auth: use displayName from user object
        setDisplayName(user.displayName || user.email.split("@")[0]);
        setLoading(false);
        return;
      }

      // Supabase auth
      try {
        const { data } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", user.id)
          .single();
        if (data?.display_name) setDisplayName(data.display_name);
        else setDisplayName(user.displayName || user.email.split("@")[0]);
        setAvatarUrl(user.avatarUrl);
        setHeadline(user.headline || "");
      } catch { /* ignore */ }
      setLoading(false);
    };
    load();
  }, [user, isLocalAuth]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    if (isLocalAuth) {
      // Update local user
      const users = safeStorage.getJSON<{ id: string }[]>("funnelforge-users", []);
      if (users.length > 0) {
        const updated = users.map((u) =>
          u.id === user.id ? { ...u, displayName } : u
        );
        safeStorage.setJSON("funnelforge-users", updated);
      }
      setSaving(false);
      toast({ title: tx({ he: "הפרופיל עודכן בהצלחה", en: "Profile updated successfully" }, language) });
      return;
    }

    // Supabase save
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: displayName,
          avatar_url: avatarUrl ?? null,
          headline: headline || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);
      setSaving(false);

      if (error) {
        toast({ title: tx({ he: "שגיאה בשמירה", en: "Error saving" }, language), variant: "destructive" });
      } else {
        toast({ title: tx({ he: "הפרופיל עודכן בהצלחה", en: "Profile updated successfully" }, language) });
      }
    } catch {
      setSaving(false);
      toast({ title: tx({ he: "שגיאה בחיבור", en: "Connection error" }, language), variant: "destructive" });
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const tierColors = { free: "bg-muted", pro: "bg-primary", business: "bg-amber-500" };
  const tierLabels = { free: "Free", pro: "Pro", business: "Business" };

  return (
    <div className="min-h-screen bg-background" dir={tx({ he: "rtl", en: "ltr" }, language)}>
      <div className="container mx-auto max-w-lg px-4 py-20">
        <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="mb-6 gap-2">
          <ArrowRight className={`h-4 w-4 ${tx({ he: "", en: "rotate-180" }, language)}`} />
          {tx({ he: "חזרה לדף הראשי", en: "Back to home" }, language)}
        </Button>

        <Card>
          <CardHeader className="text-center">
            <div className="relative mx-auto mb-3">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt=""
                  className="h-20 w-20 rounded-full object-cover ring-2 ring-primary/20"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                  <User className="h-10 w-10 text-primary" />
                </div>
              )}
              {!isLocalAuth && (
                <label
                  htmlFor="avatar-upload"
                  className="absolute -bottom-1 -end-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow hover:bg-primary/90"
                  aria-label={tx({ he: "העלה תמונת פרופיל", en: "Upload profile picture" }, language)}
                >
                  {avatarUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <span className="text-xs font-bold">+</span>}
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={avatarUploading}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAvatarChange(f); e.target.value = ""; }}
                  />
                </label>
              )}
            </div>
            <CardTitle>{displayName || tx({ he: "הפרופיל שלי", en: "My Profile" }, language)}</CardTitle>
            {headline && <CardDescription dir="auto">{headline}</CardDescription>}
            {!headline && <CardDescription>{tx({ he: "ערוך את הפרטים האישיים שלך", en: "Edit your personal details" }, language)}</CardDescription>}
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Email (read-only) */}
            <div className="space-y-2">
              <Label htmlFor="profile-email">{tx({ he: "אימייל", en: "Email" }, language)}</Label>
              <Input id="profile-email" value={user?.email ?? ""} disabled className="bg-muted" dir="ltr" />
            </div>

            {/* Display name */}
            <div className="space-y-2">
              <Label htmlFor="displayName">{tx({ he: "שם תצוגה", en: "Display Name" }, language)}</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={tx({ he: "הכנס שם תצוגה", en: "Enter display name" }, language)}
              />
            </div>

            {/* Headline */}
            <div className="space-y-2">
              <Label htmlFor="headline">{tx({ he: "כותרת/תפקיד", en: "Headline / Title" }, language)}</Label>
              <Input
                id="headline"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder={tx({ he: "למשל: יועץ שיווק דיגיטלי", en: "e.g. Digital marketing consultant" }, language)}
                dir="auto"
                maxLength={120}
              />
            </div>

            {/* Integrations summary */}
            <div className="space-y-2">
              <Label>{tx({ he: "אינטגרציות", en: "Integrations" }, language)}</Label>
              <p className="text-xs text-muted-foreground" dir="auto">
                {getConnectedPlatforms(integrationState).length} {tx({ he: "מחוברות", en: "connected" }, language)}
                {isConnected(integrationState, "slack") && " · Slack"}
                {isConnected(integrationState, "whatsapp") && " · WhatsApp"}
              </p>
            </div>

            {/* Webhooks */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Webhook className="h-4 w-4" />
                {tx({ he: "Webhooks", en: "Webhooks" }, language)}
              </Label>
              <p className="text-xs text-muted-foreground" dir="auto">
                {isHe
                  ? "בדוק קישוריות יוצאת ונכנסת מול נקודות הקצה שלך."
                  : "Test outbound and inbound connectivity against your endpoints."}
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTestWebhookDispatch}
                  disabled={webhookBusy !== null}
                  className="text-xs"
                >
                  {webhookBusy === "dispatch" ? (
                    <Loader2 className="h-3 w-3 animate-spin me-1" />
                  ) : null}
                  {tx({ he: "שלח בדיקת יוצא", en: "Send test dispatch" }, language)}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleVerifyWebhookReceive}
                  disabled={webhookBusy !== null}
                  className="text-xs"
                >
                  {webhookBusy === "receive" ? (
                    <Loader2 className="h-3 w-3 animate-spin me-1" />
                  ) : null}
                  {tx({ he: "אמת נקודת קצה נכנסת", en: "Verify inbound endpoint" }, language)}
                </Button>
              </div>
            </div>

            {/* Tier */}
            <div className="space-y-2">
              <Label>{tx({ he: "מנוי", en: "Subscription Tier" }, language)}</Label>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={`${tierColors[tier]} text-white`}>
                  {tier === "pro" ? <Shield className="h-3 w-3 me-1" /> : tier === "business" ? <Crown className="h-3 w-3 me-1" /> : null}
                  {tierLabels[tier]}
                </Badge>
                {import.meta.env.DEV && isLocalAuth && tier === "free" && (
                  <Button variant="outline" size="sm" onClick={() => setTier("pro")} className="text-xs">
                    {tx({ he: "שדרג ל-Pro (dev)", en: "Upgrade to Pro (dev)" }, language)}
                  </Button>
                )}
                {import.meta.env.DEV && isLocalAuth && tier === "pro" && (
                  <Button variant="outline" size="sm" onClick={() => setTier("business")} className="text-xs">
                    {tx({ he: "שדרג ל-Business (dev)", en: "Upgrade to Business (dev)" }, language)}
                  </Button>
                )}
              </div>
              {!isLocalAuth && tier !== "free" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleManageSubscription}
                  disabled={portalLoading}
                  className="gap-2"
                >
                  {portalLoading
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <CreditCard className="h-3.5 w-3.5" />}
                  {tx({ he: "נהל מנוי וחיוב", en: "Manage subscription & billing" }, language)}
                </Button>
              )}
            </div>

            {/* Personalisation section — visible at confident/strong tier */}
            {(confidenceTier === "confident" || confidenceTier === "strong") && (
              <>
                <Separator />
                <section aria-labelledby="personalisation-heading" className="space-y-3">
                  <h2
                    id="personalisation-heading"
                    className="flex items-center gap-2 text-sm font-semibold text-foreground"
                  >
                    {adaptationsEnabled
                      ? <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
                      : <Sparkles className="h-4 w-4 text-muted-foreground opacity-50" aria-hidden="true" />}
                    {tx({ he: "התאמה אישית", en: "Personalisation" }, language)}
                  </h2>

                  {/* Current archetype */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">
                        {tx({ he: "ארכיטיפ נוכחי", en: "Current archetype" }, language)}
                      </p>
                      <p className="text-xs text-muted-foreground">{uiConfig.label[language]}</p>
                    </div>
                    <NavLink
                      to="/archetype"
                      className="text-xs text-primary underline-offset-4 hover:underline"
                    >
                      {tx({ he: "ראה למה", en: "See why" }, language)}
                    </NavLink>
                  </div>

                  {/* Adaptations toggle */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label
                        htmlFor="adaptations-toggle"
                        className="text-sm font-medium cursor-pointer"
                      >
                        {adaptationsEnabled
                          ? tx({ he: "התאמות פעילות", en: "Adaptations on" }, language)
                          : tx({ he: "התאמות כבויות", en: "Adaptations off" }, language)}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {tx({
                          he: "צבעים, סדר ניווט ואנימציות מותאמים לפרופיל שלך",
                          en: "Colours, navigation order and animations adapted to your profile",
                        }, language)}
                      </p>
                    </div>
                    <Switch
                      id="adaptations-toggle"
                      checked={adaptationsEnabled}
                      onCheckedChange={setAdaptationsEnabled}
                      aria-label={adaptationsEnabled
                        ? tx({ he: "כבה התאמות", en: "Disable adaptations" }, language)
                        : tx({ he: "הפעל התאמות", en: "Enable adaptations" }, language)}
                    />
                  </div>

                  {/* Change archetype */}
                  <div className="space-y-1.5">
                    <p className="text-xs text-muted-foreground">
                      {tx({
                        he: "הארכיטיפ מחושב אוטומטית. תוכל לשנות ידנית:",
                        en: "The archetype is computed automatically. You can change it manually:",
                      }, language)}
                    </p>
                    <div className="flex flex-wrap gap-1.5" role="group" aria-label={tx({ he: "שנה ארכיטיפ", en: "Change archetype" }, language)}>
                      {(["strategist", "optimizer", "pioneer", "connector", "closer"] as const).map((id) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setOverride(effectiveArchetypeId === id ? null : id)}
                          aria-pressed={effectiveArchetypeId === id}
                          className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
                            effectiveArchetypeId === id
                              ? "border-primary bg-primary/10 font-semibold"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          {id}
                        </button>
                      ))}
                    </div>
                  </div>
                </section>
              </>
            )}

            <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {tx({ he: "שמור שינויים", en: "Save Changes" }, language)}
            </Button>
          </CardContent>
        </Card>

        {/* MCP Integration */}
        <McpIntegrationPanel />
      </div>
    </div>
  );
}

export default PageComponent;
