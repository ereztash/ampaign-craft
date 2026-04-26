// ═══════════════════════════════════════════════
// Design Philosophy -- /design-philosophy (public)
//
// Public-facing articulation of FunnelForge's color system and
// brand-asset moat. Behavioral citations, competitor comparison,
// and the case for locked identity.
// ═══════════════════════════════════════════════

import { Link } from "react-router-dom";

const COMPETITOR_PALETTES = [
  { name: "HubSpot",    color: "#9B59B6", label: "Purple",      note: "Enterprise generic" },
  { name: "Salesforce", color: "#4A90D9", label: "Light Blue",  note: "CRM commodity" },
  { name: "Mailchimp",  color: "#FFE01B", label: "Yellow",      note: "E-commerce focused" },
  { name: "FunnelForge",color: "#1B3E6B", label: "Deep Navy",   note: "Israeli SMB trust" },
];

export default function DesignPhilosophy() {
  return (
    <>
      <meta name="description" content="Why FunnelForge's deep navy and growth green aren't design choices -- they're competitive infrastructure built to compound." />
      <meta property="og:title" content="Why Our Blue -- FunnelForge Design Philosophy" />
      <meta property="og:description" content="Color as a competitive moat: behavioral science, Israeli market conventions, and data-driven palette refinement." />
      <meta property="og:type" content="website" />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="Why Our Blue -- FunnelForge Design Philosophy" />
      <meta name="twitter:description" content="Color as a competitive moat: behavioral science, Israeli market conventions, and data-driven palette refinement." />

      <div className="min-h-screen bg-background text-foreground">
        {/* Header */}
        <header className="border-b border-border">
          <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg funnel-gradient">
                <span className="text-white font-bold text-sm">F</span>
              </div>
              <span className="font-semibold text-foreground">FunnelForge</span>
            </Link>
            <nav className="flex gap-4 text-sm text-muted-foreground">
              <Link to="/" className="hover:text-foreground transition-colors">Back to app</Link>
            </nav>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-6 py-16 space-y-20">

          {/* Hero */}
          <section className="space-y-6">
            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full">
              <div className="h-2 w-2 rounded-full bg-primary" />
              Design philosophy
            </div>
            <h1 className="text-4xl font-bold leading-tight">
              Why our blue is a business decision,<br />not a design choice.
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              FunnelForge's deep navy and growth green are not aesthetic preferences.
              They are behavioral infrastructure -- locked by design, measured by data,
              and grounded in how the Israeli SMB market processes trust.
            </p>
          </section>

          {/* Color as Information */}
          <section className="space-y-6">
            <h2 className="text-2xl font-semibold">Color as information, not decoration</h2>
            <p className="text-muted-foreground">
              Edward Tufte's principle: every element in a visualization must earn its place
              by carrying information. We apply this to every pixel: if removing a color doesn't
              impair understanding, the color is noise. Only 8 sanctioned placements in
              FunnelForge carry the brand gradient -- every other colored element signals
              a specific semantic role.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { token: "--primary", label: "Trust", desc: "Deep navy. System 1 trust in <90ms (Kahneman 2011).", hsl: "hsl(216 68% 26%)" },
                { token: "--accent", label: "Growth", desc: "Growth green. Permission to act (Fogg BM).", hsl: "hsl(152 58% 40%)" },
                { token: "--cor-warning", label: "Loss signal", desc: "Amber. Approach motivation, no freeze response.", hsl: "hsl(38 92% 48%)" },
                { token: "--destructive", label: "Stop", desc: "Vivid red. Amygdala alert in <60ms (Elliot 2015).", hsl: "hsl(4 78% 54%)" },
              ].map((c) => (
                <div key={c.token} className="rounded-lg border border-border overflow-hidden">
                  <div className="h-16" style={{ background: c.hsl }} />
                  <div className="p-3">
                    <p className="font-medium text-sm">{c.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">{c.desc}</p>
                    <code className="text-xs text-muted-foreground">{c.token}</code>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Competitor comparison */}
          <section className="space-y-6">
            <h2 className="text-2xl font-semibold">The positioning map</h2>
            <p className="text-muted-foreground">
              Staying in navy+green is a strategic choice. It forces every major alternative
              (HubSpot, Salesforce, Mailchimp) to either abandon their global identity or
              concede the Israeli B2B niche. Counter-positioning (Helmer 2016) at the pixel level.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {COMPETITOR_PALETTES.map((p) => (
                <div
                  key={p.name}
                  className={`rounded-lg border p-4 space-y-2 ${p.name === "FunnelForge" ? "border-primary bg-primary/5" : "border-border"}`}
                >
                  <div className="h-8 w-8 rounded" style={{ background: p.color }} />
                  <p className="font-medium text-sm">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.label}</p>
                  <p className="text-xs text-muted-foreground italic">{p.note}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Israeli market */}
          <section className="space-y-6">
            <h2 className="text-2xl font-semibold">Built for the Israeli market</h2>
            <p className="text-muted-foreground">
              Color semantics vary by culture. In the Israeli SMB market:
            </p>
            <div className="space-y-3">
              {[
                { color: "hsl(216 68% 26%)", label: "Navy blue = institutional trust", note: "Bank Hapoalim, El Al, government services. Our primary is this blue by deliberate alignment." },
                { color: "hsl(152 58% 40%)", label: "Green = secular financial growth", note: "Not religious; specifically the color of financial progress and business vitality in Israeli context." },
                { color: "hsl(4 78% 48%)",   label: "Red = discount signal", note: "Shufersal, HaShuk -- reserved ONLY for commercial promotions, never for system errors." },
                { color: "hsl(210 12% 96%)", label: "White/grey = clean government authority", note: "Legal, tax, and compliance screens use this palette. Signals official, authoritative content." },
              ].map((item) => (
                <div key={item.label} className="flex items-start gap-4 p-4 rounded-lg bg-muted/40">
                  <div className="h-6 w-6 rounded shrink-0 mt-0.5 border border-border" style={{ background: item.color }} />
                  <div>
                    <p className="font-medium text-sm">{item.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.note}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              The Hebrew calendar also matters: during Yom Kippur week, celebratory color signals
              are automatically muted. On Independence Day, the palette warms slightly.
              No international SaaS platform adjusts at this level of cultural granularity.
            </p>
          </section>

          {/* Data-driven palette */}
          <section className="space-y-6">
            <h2 className="text-2xl font-semibold">The palette learns</h2>
            <p className="text-muted-foreground">
              Every recommendation shown in FunnelForge is measured against its palette variant.
              We track which shade of green -- slightly lighter, slightly darker, slightly warmer --
              converts better for each archetype (Pioneer, Closer, Optimizer, Strategist, Connector).
            </p>
            <p className="text-muted-foreground">
              After 200+ exposures per variant, we run a significance test. When a variant beats
              the default by ≥5 percentage points at p&lt;0.05, it becomes the new default for
              that archetype. Over 18 months, this builds an empirical lookup table no
              aesthetic-only competitor can reproduce.
            </p>
            <div className="rounded-lg border border-border bg-muted/20 p-6">
              <p className="text-sm font-medium mb-2">The compounding advantage</p>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>Month 3: First variant promoted. Conversion delta documented.</p>
                <p>Month 6: Each archetype has a measured palette. Unaided brand recall test.</p>
                <p>Month 18: Complete (archetype × stage) matrix. Empirical IP that can't be shortcut.</p>
              </div>
            </div>
          </section>

          {/* Accessibility */}
          <section className="space-y-6">
            <h2 className="text-2xl font-semibold">Every variant passes every gate</h2>
            <p className="text-muted-foreground">
              Palette variants are generated -- not hand-picked -- and must pass three independent
              validation checks before they can be shown to any user:
            </p>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                { label: "WCAG 2.1 AA", desc: "4.5:1 contrast ratio (legal floor). Cannot be overridden.", icon: "⚖️" },
                { label: "APCA Lc ≥60", desc: "Accessible Perceptual Contrast Algorithm. Accounts for font weight and spatial context.", icon: "👁️" },
                { label: "CB-safe", desc: "Protanopia, deuteranopia, and tritanopia simulation. Δ-Lightness ≥0.5 or Δ-Hue ≥30°.", icon: "🎨" },
              ].map((g) => (
                <div key={g.label} className="rounded-lg border border-border p-4 space-y-2">
                  <span className="text-2xl">{g.icon}</span>
                  <p className="font-medium text-sm">{g.label}</p>
                  <p className="text-xs text-muted-foreground">{g.desc}</p>
                </div>
              ))}
            </div>
          </section>

        </main>

        {/* Footer */}
        <footer className="border-t border-border mt-20">
          <div className="max-w-4xl mx-auto px-6 py-8 flex items-center justify-between text-sm text-muted-foreground">
            <Link to="/" className="hover:text-foreground transition-colors">FunnelForge</Link>
            <div className="flex gap-6">
              <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
              <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
              <Link to="/contact" className="hover:text-foreground transition-colors">Contact</Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
