import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowRight, Save, Loader2, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Profile = () => {
  const { user, loading: authLoading } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isHe = language === "he";

  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
      const { data } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .single();
      if (data?.display_name) setDisplayName(data.display_name);
      setLoading(false);
    };
    load();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName, updated_at: new Date().toISOString() })
      .eq("id", user.id);
    setSaving(false);

    if (error) {
      toast({ title: isHe ? "שגיאה בשמירה" : "Error saving", variant: "destructive" });
    } else {
      toast({ title: isHe ? "הפרופיל עודכן בהצלחה" : "Profile updated successfully" });
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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
              <Input value={user?.email ?? ""} disabled className="bg-muted" />
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

            <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isHe ? "שמור שינויים" : "Save Changes"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
