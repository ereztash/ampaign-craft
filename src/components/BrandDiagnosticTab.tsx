import { useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { DiagnosticQuestion, BrandDiagnosticResult, ExecutionTemplate, PersonalBrandData } from "@/types/funnel";
import { getDiagnosticTierColor } from "@/lib/colorSemantics";
import { motion, AnimatePresence } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { ChevronLeft, ChevronRight, Target, TrendingUp, Shield, Sparkles } from "lucide-react";

const diagnosticQuestions: DiagnosticQuestion[] = [
  // Section A: Positioning Clarity
  { id: "a1", section: "positioning", question: { he: "האם אתה יכול לתאר את הנישה שלך במשפט אחד?", en: "Can you describe your niche in one sentence?" }, type: "slider" },
  { id: "a2", section: "positioning", question: { he: "האם יש לך UVP (הצעת ערך ייחודית) ברורה שמבדילה אותך מהמתחרים?", en: "Do you have a clear UVP that differentiates you from competitors?" }, type: "slider" },
  { id: "a3", section: "positioning", question: { he: "האם קהל היעד שלך מזהה אותך עם תחום מומחיות ספציפי?", en: "Does your target audience associate you with a specific area of expertise?" }, type: "slider" },
  { id: "a4", section: "positioning", question: { he: "האם ה'משולש הזהב' שלך (מומחיות × עניין × ביקוש) מאוזן?", en: "Is your 'Golden Triangle' (expertise × interest × demand) balanced?" }, type: "slider" },
  // Section B: Competitive Landscape
  { id: "b1", section: "competitive", question: { he: "האם אתה פועל באוקיינוס כחול (שוק ייחודי) או אדום (שוק רווי)?", en: "Are you operating in a Blue Ocean (unique market) or Red Ocean (saturated)?" }, type: "slider" },
  { id: "b2", section: "competitive", question: { he: "האם יש לך אסטרטגיית ERRC (Eliminate, Reduce, Raise, Create) ברורה?", en: "Do you have a clear ERRC (Eliminate, Reduce, Raise, Create) strategy?" }, type: "slider" },
  { id: "b3", section: "competitive", question: { he: "האם אתה יכול לזהות את ה'נבל' (בעיה מרכזית) שאתה פותר עבור הלקוחות?", en: "Can you identify the 'Villain' (core problem) you solve for clients?" }, type: "slider" },
  // Section C: Signal Strength
  { id: "c1", section: "signals", question: { he: "האם יש לך 'סיגנלים יקרים' (Costly Signals) שמוכיחים את הערך שלך?", en: "Do you have 'Costly Signals' that prove your value?" }, type: "slider" },
  { id: "c2", section: "signals", question: { he: "כמה Case Studies או סיפורי הצלחה מתועדים יש לך?", en: "How many documented Case Studies or success stories do you have?" }, type: "slider" },
  { id: "c3", section: "signals", question: { he: "האם יש לך נוכחות Thought Leadership פעילה (פרסומים, הרצאות, פודקאסטים)?", en: "Do you have active Thought Leadership presence (publications, talks, podcasts)?" }, type: "slider" },
  { id: "c4", section: "signals", question: { he: "האם קיבלת המלצות או אישורים מאנשי מפתח בתעשייה?", en: "Have you received endorsements from industry key players?" }, type: "slider" },
  // Section D: Authenticity & Network
  { id: "d1", section: "authenticity", question: { he: "האם ה'אני האותנטי' שלך תואם את ה'אני המקצועי' שאתה מציג?", en: "Does your 'authentic self' match the 'professional self' you present?" }, type: "slider" },
  { id: "d2", section: "authenticity", question: { he: "האם יש לך קהילה פעילה של עוקבים/לקוחות שמגיבים לתוכן שלך?", en: "Do you have an active community of followers/clients engaging with your content?" }, type: "slider" },
  { id: "d3", section: "authenticity", question: { he: "האם הלקוחות שלך ממליצים עליך באופן אורגני?", en: "Do your clients recommend you organically?" }, type: "slider" },
  { id: "d4", section: "authenticity", question: { he: "האם יש לך 'אפקט רשת' – ככל שיש לך יותר לקוחות, כך קל יותר למשוך חדשים?", en: "Do you have a 'Network Effect' – the more clients you have, the easier it is to attract new ones?" }, type: "slider" },
  { id: "d5", section: "authenticity", question: { he: "האם אתה משתף פגיעויות וכישלונות לצד הצלחות?", en: "Do you share vulnerabilities and failures alongside successes?" }, type: "slider" },
];

const executionTemplates: ExecutionTemplate[] = [
  {
    id: "blue-ocean",
    name: { he: "מחולל אוקיינוס כחול", en: "Blue Ocean Generator" },
    description: { he: "מצא את המרחב הייחודי שלך בשוק רווי באמצעות מטריצת ERRC", en: "Find your unique market space using the ERRC Matrix" },
    steps: [
      { he: "מפה את כל המתחרים וה-Value Propositions שלהם", en: "Map all competitors and their Value Propositions" },
      { he: "הפעל מטריצת ERRC: מה לבטל, להפחית, להעלות וליצור", en: "Run ERRC Matrix: what to Eliminate, Reduce, Raise, Create" },
      { he: "הגדר את ה-Niche Sentence שלך: אני עוזר ל-[X] להשיג [Y] באמצעות [Z]", en: "Define your Niche Sentence: I help [X] achieve [Y] through [Z]" },
      { he: "בדוק אם יש ביקוש (Google Trends, LinkedIn Search)", en: "Validate demand (Google Trends, LinkedIn Search)" },
    ],
    timeline: { he: "1-2 שבועות", en: "1-2 weeks" },
    priority: "high",
  },
  {
    id: "signal-priority",
    name: { he: "ממפה עדיפות סיגנלים", en: "Signal Priority Mapper" },
    description: { he: "בנה היררכיית סיגנלים יקרים שמוכיחים את הערך שלך", en: "Build a hierarchy of costly signals that prove your value" },
    steps: [
      { he: "זהה את ה-3 סיגנלים החשובים ביותר בתעשייה שלך", en: "Identify the 3 most important signals in your industry" },
      { he: "צור Case Study מתועד עם מספרים ספציפיים", en: "Create a documented Case Study with specific numbers" },
      { he: "פרסם תוכן Thought Leadership (מאמר/פודקאסט/הרצאה)", en: "Publish Thought Leadership content (article/podcast/talk)" },
      { he: "אסוף המלצות מלקוחות קיימים בפורמט וידאו", en: "Collect testimonials from existing clients in video format" },
    ],
    timeline: { he: "2-4 שבועות", en: "2-4 weeks" },
    priority: "high",
  },
  {
    id: "halo-amplifier",
    name: { he: "מגבר אפקט הילה", en: "Halo Amplifier" },
    description: { he: "הגבר את אפקט ההילה שלך דרך ארכיטקטורת תוכן אסטרטגית", en: "Amplify your Halo Effect through strategic content architecture" },
    steps: [
      { he: "זהה את ה-Mega Trait (תכונה מרכזית) שממנה נגזרות שאר התכונות", en: "Identify your Mega Trait from which other qualities derive" },
      { he: "צור סדרת תוכן שמדגימה את ה-Mega Trait ב-3 הקשרים שונים", en: "Create a content series demonstrating the Mega Trait in 3 different contexts" },
      { he: "בנה 'Transfer Bridges' – איך המומחיות בתחום אחד מוכיחה יכולת בתחומים אחרים", en: "Build 'Transfer Bridges' – how expertise in one area proves capability in others" },
      { he: "השתמש ב-Social Proof מסוגים שונים (מספרים, סיפורים, אנשי מפתח)", en: "Use diverse Social Proof types (numbers, stories, key people)" },
    ],
    timeline: { he: "3-6 שבועות", en: "3-6 weeks" },
    priority: "medium",
  },
  {
    id: "loss-aversion",
    name: { he: "מסגור מחדש של שנאת הפסד", en: "Loss Aversion Reframing" },
    description: { he: "מסגר מחדש את הערך שלך דרך עדשת ההפסד – מה הלקוח מפסיד בלעדיך", en: "Reframe your value through the loss lens – what the client loses without you" },
    steps: [
      { he: "חשב את 'עלות האי-פעולה' – כמה עולה ללקוח לא להשתמש בך", en: "Calculate the 'cost of inaction' – how much it costs NOT to use you" },
      { he: "צור תוכן 'לפני/אחרי' עם מספרים ספציפיים", en: "Create 'before/after' content with specific numbers" },
      { he: "בנה כלי אבחון שחושף את הפער (דיסוננס קוגניטיבי)", en: "Build a diagnostic tool that exposes the gap (cognitive dissonance)" },
      { he: "שלב Tripwire Offer שמאפשר לחוות את הערך בסיכון נמוך", en: "Integrate a Tripwire Offer allowing value experience at low risk" },
    ],
    timeline: { he: "1-3 שבועות", en: "1-3 weeks" },
    priority: "medium",
  },
  {
    id: "social-proof-bootstrap",
    name: { he: "מאתחל הוכחה חברתית", en: "Social Proof Bootstrapper" },
    description: { he: "בנה הוכחה חברתית מאפס – אסטרטגיות למי שמתחיל", en: "Build social proof from zero – strategies for those starting out" },
    steps: [
      { he: "הצע 3-5 פרויקטים Pro Bono אסטרטגיים (לא חינם – מותנים בתיעוד)", en: "Offer 3-5 strategic Pro Bono projects (not free – conditional on documentation)" },
      { he: "צור תוכן 'Building in Public' – שתף את התהליך, לא רק תוצאות", en: "Create 'Building in Public' content – share the process, not just results" },
      { he: "בנה שותפויות אסטרטגיות עם בעלי קהלים קיימים", en: "Build strategic partnerships with existing audience owners" },
      { he: "אסוף ותעד כל אינטראקציה חיובית כ-Social Proof Artifact", en: "Collect and document every positive interaction as a Social Proof Artifact" },
    ],
    timeline: { he: "4-8 שבועות", en: "4-8 weeks" },
    priority: "high",
  },
  {
    id: "conformity-breakout",
    name: { he: "פריצת קונפורמיות", en: "Conformity Breakout" },
    description: { he: "צא מהקונצנזוס של התעשייה ומצב את עצמך כחלופה", en: "Break from industry consensus and position yourself as the alternative" },
    steps: [
      { he: "זהה 3 'אמיתות מקובלות' בתעשייה שאתה חולק עליהן (בכנות)", en: "Identify 3 'accepted truths' in your industry you genuinely disagree with" },
      { he: "פרסם 'Contrarian Take' מבוסס על ניסיון אמיתי", en: "Publish a 'Contrarian Take' based on real experience" },
      { he: "צור framework או methodology ייחודי עם שם ממותג", en: "Create a unique framework or methodology with a branded name" },
      { he: "הצג את ה-Anti-Portfolio – פרויקטים שסירבת להם ולמה", en: "Present your Anti-Portfolio – projects you declined and why" },
    ],
    timeline: { he: "2-4 שבועות", en: "2-4 weeks" },
    priority: "medium",
  },
  {
    id: "network-stickiness",
    name: { he: "בונה דביקות רשת", en: "Network Stickiness Builder" },
    description: { he: "בנה אפקט רשת שמגביר את הערך שלך ככל שהקהילה גדלה", en: "Build network effects that increase your value as the community grows" },
    steps: [
      { he: "הקם פלטפורמת קהילה (Slack/Discord/Circle) עם ערך ברור", en: "Create a community platform (Slack/Discord/Circle) with clear value" },
      { he: "בנה תוכנית 'Alumni Network' ללקוחות קודמים", en: "Build an 'Alumni Network' program for past clients" },
      { he: "צור אירועים חודשיים שמחברים בין חברי הקהילה", en: "Create monthly events connecting community members" },
      { he: "הפעל מנגנון Referral עם תמריצים דו-כיווניים", en: "Activate a Referral mechanism with bilateral incentives" },
    ],
    timeline: { he: "4-8 שבועות", en: "4-8 weeks" },
    priority: "medium",
  },
  {
    id: "authenticity-positioning",
    name: { he: "מיצוב אותנטיות", en: "Authenticity Positioning" },
    description: { he: "כייל את רמת האותנטיות שלך – שיתוף פגיעויות אסטרטגי שבונה אמון", en: "Calibrate your authenticity level – strategic vulnerability sharing that builds trust" },
    steps: [
      { he: "הגדר את ה-'No-Go Zone' – מה אתה לא משתף (גבולות בריאים)", en: "Define your 'No-Go Zone' – what you don't share (healthy boundaries)" },
      { he: "צור רשימת 'כישלונות מכוננים' שמוכנים לשיתוף", en: "Create a list of 'formative failures' you're ready to share" },
      { he: "בנה נרטיב 'Hero's Journey' אישי: מצב התחלתי → משבר → תובנה → טרנספורמציה", en: "Build a personal 'Hero's Journey' narrative: starting point → crisis → insight → transformation" },
      { he: "שלב 'Weaponized Vulnerability' – פגיעות שמסתיימת בתובנה פרקטית", en: "Integrate 'Weaponized Vulnerability' – vulnerability ending with a practical insight" },
    ],
    timeline: { he: "1-2 שבועות", en: "1-2 weeks" },
    priority: "low",
  },
];

function calculateDiagnosticResult(answers: Record<string, number>): BrandDiagnosticResult {
  const sectionMap: Record<string, { name: { he: string; en: string }; questions: string[] }> = {
    positioning: { name: { he: "בהירות מיצוב", en: "Positioning Clarity" }, questions: ["a1", "a2", "a3", "a4"] },
    competitive: { name: { he: "נוף תחרותי", en: "Competitive Landscape" }, questions: ["b1", "b2", "b3"] },
    signals: { name: { he: "עוצמת סיגנלים", en: "Signal Strength" }, questions: ["c1", "c2", "c3", "c4"] },
    authenticity: { name: { he: "אותנטיות ורשת", en: "Authenticity & Network" }, questions: ["d1", "d2", "d3", "d4", "d5"] },
  };

  const sections = Object.entries(sectionMap).map(([key, sec]) => {
    const total = sec.questions.reduce((sum, q) => sum + (answers[q] || 5), 0);
    const max = sec.questions.length * 10;
    return { name: sec.name, score: total, maxScore: max };
  });

  const totalScore = sections.reduce((s, sec) => s + sec.score, 0);
  const maxTotal = sections.reduce((s, sec) => s + sec.maxScore, 0);
  const normalized = (totalScore / maxTotal) * 10;

  let tier: BrandDiagnosticResult["tier"];
  let recommendedTemplates: ExecutionTemplate[];

  if (normalized >= 7.5) {
    tier = "strong";
    recommendedTemplates = executionTemplates.filter((t) => ["signal-priority", "halo-amplifier", "network-stickiness"].includes(t.id));
  } else if (normalized >= 5) {
    tier = "gaps";
    recommendedTemplates = executionTemplates.filter((t) => ["blue-ocean", "loss-aversion", "signal-priority", "halo-amplifier"].includes(t.id));
  } else if (normalized >= 3) {
    tier = "pivot";
    recommendedTemplates = executionTemplates.filter((t) => ["blue-ocean", "network-stickiness", "social-proof-bootstrap"].includes(t.id));
  } else {
    tier = "restart";
    recommendedTemplates = executionTemplates.filter((t) => ["conformity-breakout", "social-proof-bootstrap", "authenticity-positioning", "blue-ocean"].includes(t.id));
  }

  return { totalScore: Math.round(normalized * 10) / 10, tier, sections, recommendedTemplates };
}

interface BrandDiagnosticTabProps {
  personalBrand?: PersonalBrandData;
}

const BrandDiagnosticTab = ({ personalBrand }: BrandDiagnosticTabProps) => {
  const { t, language, isRTL } = useLanguage();
  const reducedMotion = useReducedMotion();
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [currentSection, setCurrentSection] = useState(0);
  const [result, setResult] = useState<BrandDiagnosticResult | null>(null);

  const sectionNames = [
    { key: "positioning", label: { he: "בהירות מיצוב", en: "Positioning Clarity" }, icon: <Target className="h-5 w-5" /> },
    { key: "competitive", label: { he: "נוף תחרותי", en: "Competitive Landscape" }, icon: <TrendingUp className="h-5 w-5" /> },
    { key: "signals", label: { he: "עוצמת סיגנלים", en: "Signal Strength" }, icon: <Shield className="h-5 w-5" /> },
    { key: "authenticity", label: { he: "אותנטיות ורשת", en: "Authenticity & Network" }, icon: <Sparkles className="h-5 w-5" /> },
  ];

  const sectionQuestions = diagnosticQuestions.filter(
    (q) => q.section === sectionNames[currentSection]?.key
  );

  const answeredCount = Object.keys(answers).length;
  const progress = (answeredCount / diagnosticQuestions.length) * 100;

  const handleCalculate = () => {
    setResult(calculateDiagnosticResult(answers));
  };

  const getTierColorClasses = (tier: string) => {
    const colors = getDiagnosticTierColor(tier as "strong" | "gaps" | "pivot" | "restart");
    return `${colors.bg} ${colors.text} ${colors.border}`;
  };

  const tierLabels: Record<string, { he: string; en: string }> = {
    strong: { he: "מיצוב חזק 💪", en: "Strong Positioning 💪" },
    gaps: { he: "יש פערים לטיפול 🔧", en: "Gaps to Address 🔧" },
    pivot: { he: "צריך פיבוט 🔄", en: "Pivot Needed 🔄" },
    restart: { he: "זמן לאיפוס 🎯", en: "Time for Reset 🎯" },
  };

  if (result) {
    return (
      <div className="space-y-6">
        {/* Score Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{language === "he" ? "ציון בריאות מיצוב" : "Positioning Health Score"}</span>
              <Badge className={`text-base px-4 py-1 ${getTierColorClasses(result.tier)}`}>
                {tierLabels[result.tier][language]}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-6 text-center">
              <div className="text-6xl font-bold text-primary">{result.totalScore}</div>
              <div className="text-sm text-muted-foreground">{language === "he" ? "מתוך 10" : "out of 10"}</div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {result.sections.map((sec, i) => (
                <div key={i} className="rounded-xl border p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground">{sec.name[language]}</span>
                    <span className="text-sm font-bold text-primary">{Math.round((sec.score / sec.maxScore) * 100)}%</span>
                  </div>
                  <Progress value={(sec.score / sec.maxScore) * 100} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Personal Brand Tips (from engine) */}
        {personalBrand && (
          <Card>
            <CardHeader>
              <CardTitle>{language === "he" ? "המלצות מיצוב מותאמות" : "Tailored Positioning Tips"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {personalBrand.positioningTips.map((tip, i) => (
                <div key={i} className="rounded-xl bg-muted/50 p-4 text-foreground">{tip[language]}</div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Signal Priority */}
        {personalBrand && personalBrand.signalPriority.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{language === "he" ? "עדיפות סיגנלים לתחום שלך" : "Signal Priority for Your Field"}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {personalBrand.signalPriority.map((sig, i) => (
                  <div key={i} className="rounded-xl border p-4">
                    <div className="mb-1 font-semibold text-foreground">{sig.name[language]}</div>
                    <p className="text-sm text-muted-foreground">{sig.description[language]}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recommended Execution Templates */}
        <Card>
          <CardHeader>
            <CardTitle>{language === "he" ? "תבניות ביצוע מומלצות" : "Recommended Execution Templates"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {result.recommendedTemplates.map((tmpl) => (
              <div key={tmpl.id} className="rounded-xl border p-5">
                <div className="mb-2 flex items-center gap-3">
                  <span className="text-lg font-bold text-foreground">{tmpl.name[language]}</span>
                  <Badge variant={tmpl.priority === "high" ? "default" : "secondary"}>
                    {tmpl.priority === "high" ? (language === "he" ? "עדיפות גבוהה" : "High Priority") : tmpl.priority === "medium" ? (language === "he" ? "עדיפות בינונית" : "Medium") : (language === "he" ? "עדיפות נמוכה" : "Low")}
                  </Badge>
                  <Badge variant="outline">{tmpl.timeline[language]}</Badge>
                </div>
                <p className="mb-3 text-sm text-muted-foreground">{tmpl.description[language]}</p>
                <ol className={`space-y-2 ${isRTL ? "pe-4" : "ps-4"}`}>
                  {tmpl.steps.map((step, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-foreground">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{j + 1}</span>
                      <span>{step[language]}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Authenticity Guidance */}
        {personalBrand && personalBrand.authenticityGuidance.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{language === "he" ? "כיול אותנטיות" : "Authenticity Calibration"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {personalBrand.authenticityGuidance.map((tip, i) => (
                <div key={i} className="rounded-xl bg-primary/5 p-4 text-foreground">{tip[language]}</div>
              ))}
            </CardContent>
          </Card>
        )}

        <Button variant="outline" onClick={() => setResult(null)} className="w-full">
          {language === "he" ? "בצע אבחון מחדש" : "Retake Assessment"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{language === "he" ? "אבחון Brand DNA" : "Brand DNA Assessment"}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {language === "he"
              ? "ענה על 16 שאלות כדי לקבל ציון בריאות מיצוב + תבניות ביצוע מותאמות"
              : "Answer 16 questions to get a Positioning Health Score + tailored execution templates"}
          </p>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>{answeredCount}/{diagnosticQuestions.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="mb-6 h-2" />

          {/* Section Tabs */}
          <div className="mb-6 flex flex-wrap gap-2">
            {sectionNames.map((sec, i) => (
              <button
                key={sec.key}
                onClick={() => setCurrentSection(i)}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                  currentSection === i
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {sec.icon}
                {sec.label[language]}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentSection}
              initial={reducedMotion ? false : { opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reducedMotion ? undefined : { opacity: 0, x: -20 }}
              transition={reducedMotion ? { duration: 0 } : { duration: 0.2 }}
              className="space-y-6"
            >
              {sectionQuestions.map((q) => (
                <div key={q.id} className="rounded-xl border p-4">
                  <label className="mb-3 block text-sm font-medium text-foreground">
                    {q.question[language]}
                  </label>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-muted-foreground">1</span>
                    <Slider
                      min={1}
                      max={10}
                      step={1}
                      value={[answers[q.id] || 5]}
                      onValueChange={([v]) => setAnswers((prev) => ({ ...prev, [q.id]: v }))}
                      className="flex-1"
                    />
                    <span className="text-xs text-muted-foreground">10</span>
                    <span className="w-8 text-center text-lg font-bold text-primary">{answers[q.id] || 5}</span>
                  </div>
                </div>
              ))}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="mt-6 flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => setCurrentSection((s) => Math.max(0, s - 1))}
              disabled={currentSection === 0}
              className="gap-2"
            >
              {isRTL ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              {language === "he" ? "הקודם" : "Previous"}
            </Button>

            {currentSection < sectionNames.length - 1 ? (
              <Button onClick={() => setCurrentSection((s) => s + 1)} className="gap-2">
                {language === "he" ? "הבא" : "Next"}
                {isRTL ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            ) : (
              <Button onClick={handleCalculate} className="gap-2 bg-primary text-primary-foreground border-0">
                <Sparkles className="h-4 w-4" />
                {language === "he" ? "חשב ציון" : "Calculate Score"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BrandDiagnosticTab;
