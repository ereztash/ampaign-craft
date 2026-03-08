

# FunnelForge – Marketing Funnel Planner

## Overview
A bilingual (Hebrew RTL + English LTR) web app that helps business owners and marketers build a customized marketing funnel through a guided multi-step form, powered by a client-side decision tree based on proven marketing frameworks (AIDA, TOFU-MOFU-BOFU).

---

## Pages & Flow

### 1. Landing Page
- Hero section with app name, tagline, and "Build Your Funnel" CTA button
- Brief explanation of what the app does (3 feature cards: Analyze → Plan → Execute)
- Language toggle (🇮🇱 / 🇬🇧) in the header
- Clean, professional design: white background, deep blue accents, green for success indicators

### 2. Multi-Step Form (7 steps)
- One question per step with smooth slide animations between steps
- Progress bar at top showing current step
- Back/Next navigation, ability to skip optional fields
- Steps:
  1. **Business Field** – Select from predefined categories (Fashion, Tech, Food, Services, Education, Health, Real Estate, Tourism, Other)
  2. **Target Audience** – B2C/B2B/Both toggle, age range slider, interest keywords input
  3. **Product/Service** – Short description, average price input, sales model (one-time / subscription / leads)
  4. **Monthly Budget** – Budget range selection (under ₪2K, ₪2K–10K, ₪10K–50K, over ₪50K)
  5. **Main Goal** – Awareness / Leads / Sales / Loyalty
  6. **Existing Channels** – Multi-select checkboxes (Facebook, Instagram, Google, Content, Email, TikTok, LinkedIn, Other)
  7. **Marketing Experience** – Beginner / Intermediate / Advanced

### 3. Processing Screen
- Animated funnel filling up while the decision tree runs
- Brief messages like "Analyzing your market...", "Building your funnel..."

### 4. Results Dashboard
- **Visual Funnel Map** – Horizontal or vertical stepped funnel visualization showing stages (Awareness → Engagement → Leads → Conversion → Retention) with budget percentage per stage
- **Channel Cards** – Cards for each recommended channel with budget allocation, KPIs, and tips
- **Tabs** for detailed views:
  - Strategy overview
  - Budget breakdown (Recharts bar/pie charts)
  - KPIs & metrics
  - Personalized tips
- **Disclaimer** that this is guidance, not professional consultation

### 5. Actions
- **Edit** – Go back and modify any input, see results update
- **Export PDF** – Download the full plan
- **Save** – Store to localStorage for later access
- **Compare** – Save multiple scenarios side by side
- **Share** – Copy link or share summary

---

## Decision Tree Engine
- Client-side JavaScript module with rules stored in a separate JSON config file for easy maintenance
- Based on AIDA and TOFU-MOFU-BOFU frameworks
- Considers all inputs (audience type, budget, goal, experience level) to recommend:
  - Funnel stages and emphasis
  - Channels per stage
  - Budget split percentages
  - Relevant KPIs
  - Tailored tips
- Example rules like: B2C + low price + low budget → social media + viral content; B2B + high price → LinkedIn + professional content + lead pipelines

## Internationalization (i18n)
- Language toggle in header persisted to localStorage
- All UI text stored in translation files (Hebrew + English)
- RTL layout automatically applied when Hebrew is selected
- Form options, results, tips – all bilingual

## Data Persistence
- localStorage for saving plans and language preference
- Structure prepared for easy Supabase integration later (clean data models)

## Design System
- **Colors**: White base, slate gray text, deep blue (#1e3a5f) primary, green (#22c55e) for success/positive metrics
- **Icons**: Lucide icons for funnel stages, channels, and actions
- **Typography**: Inter font (clean, modern, supports Hebrew)
- **Animations**: Smooth step transitions, funnel fill animation on processing screen
- **Fully responsive**: Mobile-first design for on-the-go business owners

