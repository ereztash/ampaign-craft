
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Save, Loader2, User, Shield, Crown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  createEmptyIntegrationState,
  getConnectedPlatforms,
  isConnected,
  type IntegrationState,
} from "@/engine/integrationEngine";

const PageComponent = () => {
  const { user, loading: authLoading, tier, setTier, isLocalAuth } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isHe = language === "he";

  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [integrationState] = useState<IntegrationState>(() => createEmptyIntegrationState());

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
        const { supabase } = await import("@/integrations/supabase/client");
        const { data } = await (supabase as any)
          .from("profiles")
          .select("display_name")
          .eq("id", user.id)
          .single();
        if ((data as any)?.display_name) setDisplayName((data as any).display_name);
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
      const raw = localStorage.getItem("funnelforge-users");
      if (raw) {
        const users = JSON.parse(raw);
        const updated = users.map((u: { id: string }) =>
          u.id === user.id ? { ...u, displayName } : u
        );
        localStorage.setItem("funnelforge-users", JSON.stringify(updated));
      }
      setSaving(false);
      toast({ title: isHe ? "הפרופיל עודכן בהצלחה" : "Profile updated successfully" });
      return;
    }

    // Supabase save
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { error } = await (supabase as any)
        .from("profiles")
        .update({ display_name: displayName, updated_at: new Date().toISOString() })
        .eq("id", user.id);
      setSaving(false);

      if (error) {
        toast({ title: isHe ? "שגיאה בשמירה" : "Error saving", variant: "destructive" });
      } else {
        toast({ title: isHe ? "הפרופיל עודכן בהצלחה" : "Profile updated successfully" });
      }
    } catch {
      setSaving(false);
      toast({ title: isHe ? "שגיאה בחיבור" : "Connection error", variant: "destructive" });
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
    <div className="min-h-screen bg-background" dir={isHe ? "rtl" : "ltr"}>
      <div className="container mx-auto max-w-lg px-4 py-20">
        <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="mb-6 gap-2">
          <ArrowRight className={`h-4 w-4 ${isHe ? "" : "rotate-180"}`} />
          {isHe ? "חזרה לדף הראשי" : "Back to home"}
        </Button>

        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <User className="h-8 w-8 text-primary" />
            </div>
            <CardTitle>{isHe ? "הפרופיל שלי" : "My Profile"}</CardTitle>
            <CardDescription>{isHe ? "ערוך את הפרטים האישיים שלך" : "Edit your personal details"}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Email (read-only) */}
            <div className="space-y-2">
              <Label>{isHe ? "אימייל" : "Email"}</Label>
              <Input value={user?.email ?? ""} disabled className="bg-muted" dir="ltr" />
            </div>

            {/* Display name */}
            <div className="space-y-2">
              <Label htmlFor="displayName">{isHe ? "שם תצוגה" : "Display Name"}</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={isHe ? "הכנס שם תצוגה" : "Enter display name"}
              />
            </div>

            {/* Integrations summary */}
            <div className="space-y-2">
              <Label>{isHe ? "אינטגרציות" : "Integrations"}</Label>
              <p className="text-xs text-muted-foreground" dir="auto">
                {getConnectedPlatforms(integrationState).length} {isHe ? "מחוברות" : "connected"}
                {isConnected(integrationState, "slack") && " · Slack"}
                {isConnected(integrationState, "whatsapp") && " · WhatsApp"}
              </p>
            </div>

            {/* Tier */}
            <div className="space-y-2">
              <Label>{isHe ? "מנוי" : "Subscription Tier"}</Label>
              <div className="flex items-center gap-2">
                <Badge className={`${tierColors[tier]} text-white`}>
                  {tier === "pro" ? <Shield className="h-3 w-3 me-1" /> : tier === "business" ? <Crown className="h-3 w-3 me-1" /> : null}
                  {tierLabels[tier]}
                </Badge>
                {import.meta.env.DEV && isLocalAuth && tier === "free" && (
                  <Button variant="outline" size="sm" onClick={() => setTier("pro")} className="text-xs">
                    {isHe ? "שדרג ל-Pro (dev)" : "Upgrade to Pro (dev)"}
                  </Button>
                )}
                {import.meta.env.DEV && isLocalAuth && tier === "pro" && (
                  <Button variant="outline" size="sm" onClick={() => setTier("business")} className="text-xs">
                    {isHe ? "שדרג ל-Business (dev)" : "Upgrade to Business (dev)"}
                  </Button>
                )}
              </div>
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isHe ? "שמור שינויים" : "Save Changes"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default PageComponent;
