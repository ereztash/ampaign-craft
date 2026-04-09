// ═══════════════════════════════════════════════
// Integration Engine — Switching Costs Moat
// Manages external platform connections (Slack, WhatsApp)
// for deep workflow embedding.
// ═══════════════════════════════════════════════

// ═══════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════

export type IntegrationPlatform = "slack" | "whatsapp" | "google_analytics" | "facebook_ads" | "mailchimp" | "webhook" | "hubspot";

export type IntegrationStatus = "disconnected" | "pending" | "connected" | "error";

export interface Integration {
  platform: IntegrationPlatform;
  status: IntegrationStatus;
  connectedAt?: string;
  lastSyncAt?: string;
  config: Record<string, unknown>;
  error?: string;
}

export interface IntegrationState {
  integrations: Integration[];
  lastCheckedAt: string;
}

export interface NotificationConfig {
  platform: IntegrationPlatform;
  events: IntegrationEvent[];
  enabled: boolean;
}

export type IntegrationEvent =
  | "plan_generated"
  | "qa_completed"
  | "research_completed"
  | "weekly_pulse";

// ═══════════════════════════════════════════════
// INTEGRATION STATE MANAGEMENT
// ═══════════════════════════════════════════════

export function createEmptyIntegrationState(): IntegrationState {
  return {
    integrations: Object.keys(PLATFORM_CONFIG).map((platform) => ({
      platform: platform as IntegrationPlatform,
      status: "disconnected" as IntegrationStatus,
      config: {},
    })),
    lastCheckedAt: new Date().toISOString(),
  };
}

export function getIntegration(
  state: IntegrationState,
  platform: IntegrationPlatform
): Integration | undefined {
  return state.integrations.find((i) => i.platform === platform);
}

export function isConnected(
  state: IntegrationState,
  platform: IntegrationPlatform
): boolean {
  const integration = getIntegration(state, platform);
  return integration?.status === "connected";
}

export function getConnectedPlatforms(state: IntegrationState): IntegrationPlatform[] {
  return state.integrations
    .filter((i) => i.status === "connected")
    .map((i) => i.platform);
}

export function updateIntegrationStatus(
  state: IntegrationState,
  platform: IntegrationPlatform,
  status: IntegrationStatus,
  error?: string
): IntegrationState {
  return {
    ...state,
    integrations: state.integrations.map((i) =>
      i.platform === platform
        ? {
            ...i,
            status,
            error,
            connectedAt: status === "connected" ? new Date().toISOString() : i.connectedAt,
            lastSyncAt: status === "connected" ? new Date().toISOString() : i.lastSyncAt,
          }
        : i
    ),
    lastCheckedAt: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════
// PLATFORM CONFIGURATION
// ═══════════════════════════════════════════════

export const PLATFORM_CONFIG: Record<
  IntegrationPlatform,
  {
    name: { he: string; en: string };
    description: { he: string; en: string };
    icon: string;
    availableEvents: IntegrationEvent[];
    requiresOAuth: boolean;
  }
> = {
  slack: {
    name: { he: "סלאק", en: "Slack" },
    description: {
      he: "קבל התראות על תוכניות חדשות ותוצאות QA ישירות בסלאק",
      en: "Get notifications about new plans and QA results directly in Slack",
    },
    icon: "slack",
    availableEvents: ["plan_generated", "qa_completed", "research_completed", "weekly_pulse"],
    requiresOAuth: true,
  },
  whatsapp: {
    name: { he: "ווצאפ עסקי", en: "WhatsApp Business" },
    description: {
      he: "שלח עדכוני קמפיין וסיכומים דרך ווצאפ",
      en: "Send campaign updates and summaries via WhatsApp",
    },
    icon: "message-circle",
    availableEvents: ["plan_generated", "weekly_pulse"],
    requiresOAuth: false,
  },
  google_analytics: {
    name: { he: "גוגל אנליטיקס", en: "Google Analytics" },
    description: {
      he: "ייבא נתוני ביצועים לשיפור תחזיות",
      en: "Import performance data to improve predictions",
    },
    icon: "bar-chart",
    availableEvents: [],
    requiresOAuth: true,
  },
  facebook_ads: {
    name: { he: "פייסבוק Ads", en: "Facebook Ads" },
    description: {
      he: "סנכרן קמפיינים ונתוני ביצועים",
      en: "Sync campaigns and performance data",
    },
    icon: "facebook",
    availableEvents: [],
    requiresOAuth: true,
  },
  mailchimp: {
    name: { he: "מיילצ'ימפ", en: "Mailchimp" },
    description: {
      he: "סנכרן קהלים ותוכן אימייל",
      en: "Sync audiences and email content",
    },
    icon: "mail",
    availableEvents: ["plan_generated"],
    requiresOAuth: true,
  },
  webhook: {
    name: { he: "Webhook / Zapier", en: "Webhook / Zapier" },
    description: {
      he: "שלח ארועים לכל שירות חיצוני דרך webhook — תואם Zapier, Make, n8n",
      en: "Send events to any external service via webhook — compatible with Zapier, Make, n8n",
    },
    icon: "link",
    availableEvents: ["plan_generated", "qa_completed", "research_completed", "weekly_pulse"],
    requiresOAuth: false,
  },
  hubspot: {
    name: { he: "HubSpot CRM", en: "HubSpot CRM" },
    description: {
      he: "סנכרן אנשי קשר ועסקאות ל-CRM",
      en: "Sync contacts and deals to CRM",
    },
    icon: "database",
    availableEvents: ["plan_generated", "qa_completed"],
    requiresOAuth: true,
  },
};

// ═══════════════════════════════════════════════
// NOTIFICATION FORMATTING
// ═══════════════════════════════════════════════

/**
 * Format a plan-generated notification for a given platform.
 */
export function formatPlanNotification(
  platform: IntegrationPlatform,
  planName: string,
  score?: number
): { text: string; metadata: Record<string, unknown> } {
  const scoreText = score !== undefined ? ` (QA: ${score}/100)` : "";

  switch (platform) {
    case "slack":
      return {
        text: `תוכנית שיווק חדשה נוצרה: *${planName}*${scoreText}`,
        metadata: { type: "mrkdwn" },
      };
    case "whatsapp":
      return {
        text: `תוכנית שיווק חדשה נוצרה: ${planName}${scoreText}`,
        metadata: { template: "plan_notification" },
      };
    case "webhook":
      return {
        text: `New marketing plan: ${planName}${scoreText}`,
        metadata: formatWebhookPayload("plan_generated", { planName, score }),
      };
    default:
      return {
        text: `New marketing plan: ${planName}${scoreText}`,
        metadata: {},
      };
  }
}

// ═══════════════════════════════════════════════
// WEBHOOK PAYLOAD FORMATTING
// ═══════════════════════════════════════════════

export interface WebhookPayload {
  event: IntegrationEvent;
  timestamp: string;
  data: Record<string, unknown>;
  source: "campaign-craft";
  version: "1.0";
}

/**
 * Format a generic webhook payload for outbound dispatch.
 * Compatible with Zapier, Make (Integromat), n8n, and custom receivers.
 */
export function formatWebhookPayload(
  event: IntegrationEvent,
  data: Record<string, unknown>
): WebhookPayload {
  return {
    event,
    timestamp: new Date().toISOString(),
    data,
    source: "campaign-craft",
    version: "1.0",
  };
}

/**
 * Build webhook payloads for all supported event types.
 */
export function buildEventPayload(
  event: IntegrationEvent,
  context: {
    planName?: string;
    score?: number;
    industry?: string;
    userId?: string;
    summary?: string;
  }
): WebhookPayload {
  switch (event) {
    case "plan_generated":
      return formatWebhookPayload(event, {
        plan_name: context.planName,
        industry: context.industry,
        user_id: context.userId,
      });
    case "qa_completed":
      return formatWebhookPayload(event, {
        plan_name: context.planName,
        score: context.score,
        user_id: context.userId,
      });
    case "research_completed":
      return formatWebhookPayload(event, {
        summary: context.summary,
        user_id: context.userId,
      });
    case "weekly_pulse":
      return formatWebhookPayload(event, {
        summary: context.summary,
        user_id: context.userId,
      });
    default:
      return formatWebhookPayload(event, context);
  }
}
