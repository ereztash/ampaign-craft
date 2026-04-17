# FunnelForge MCP Server — Claude Desktop Integration

FunnelForge exposes its plans, blackboard, and copy generation as a
[Model Context Protocol](https://modelcontextprotocol.io/) server. Once
connected, your Claude Desktop (or any MCP client like Cursor) can read
your marketing data and trigger actions directly — no copy-paste.

---

## What you can do

Once connected, ask your Claude Desktop things like:

- *"Show me all my marketing plans and pick the one with the highest health score."*
- *"Generate 3 ad-copy variants for my SaaS product matching my Strategist archetype."*
- *"What's on my blackboard for plan X? Any unresolved QA issues?"*
- *"Based on my last plan, what's the next highest-leverage action?"*

Claude will use the 9 exposed tools autonomously to fulfill the request.

---

## Exposed tools (9)

| Tool | Purpose | Auth required |
|---|---|---|
| `list_plans` | All saved marketing plans (id, name, date) | JWT |
| `get_plan(plan_id)` | Full plan result (formData + funnelResult) | JWT |
| `get_profile()` | Your profile (display_name, visit_count) | JWT |
| `get_blackboard(plan_id)` | Shared-context entries (agent writes) | JWT |
| `ask_coach(message, plan_id?)` | AI Coach with business context | JWT |
| `generate_copy(type, business_context, tone?, lang?)` | Copy generation (ad/email/social/landing/whatsapp) | JWT |
| `get_agent_tasks(limit?, status?)` | Recent agent runs + token spend | JWT |
| `get_health_score(plan_id)` | Plan health score breakdown | JWT |
| `ping` | Liveness check | — |

---

## Setup (3 minutes)

### 1. Get your Supabase user JWT

Open FunnelForge → DevTools → Console:

```js
const { data } = await window.__supabase.auth.getSession();
console.log(data.session.access_token);
```

Copy the token (valid for ~1 hour — refresh before each Claude Desktop session, or use a service-role key for long-lived access).

### 2. Configure Claude Desktop

Edit your Claude Desktop config:

| OS | Path |
|---|---|
| macOS | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Windows | `%APPDATA%\Claude\claude_desktop_config.json` |
| Linux | `~/.config/Claude/claude_desktop_config.json` |

Copy the template from `mcp-manifest.json.example` in the repo root and replace:

- `<YOUR-SUPABASE-PROJECT>` — e.g. `abcdefgh` (the subdomain of your Supabase URL)
- `<YOUR-SUPABASE-USER-JWT>` — the token you copied in step 1

```json
{
  "mcpServers": {
    "funnelforge": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-fetch",
        "https://abcdefgh.supabase.co/functions/v1/mcp-server"
      ],
      "env": {
        "AUTHORIZATION": "Bearer eyJhbGc..."
      }
    }
  }
}
```

### 3. Restart Claude Desktop

Quit and relaunch. In a new conversation you should see a 🔨 tools icon —
click it to confirm `funnelforge` is listed with 9 tools.

### 4. Try it

```
User: Show me my most recent marketing plan
Claude: [calls list_plans] [calls get_plan(...)] Here's your plan "SaaS B2B Q2"...
```

---

## Security notes

- **JWT only** — the MCP endpoint rejects requests without a valid Supabase JWT.
- **User-scoped** — all tools are gated to the authenticated user's own data (`user_id = auth.uid()`).
- **Rate limited** — 20 requests/min per user (enforced in `_shared/rateLimit.ts`).
- **Anthropic API key is NOT exposed** — `ask_coach` and `generate_copy` proxy through the server-side key.
- **CORS lockdown** — the function's origin allowlist includes your FunnelForge domain and `localhost`; Claude Desktop connects via `fetch` without browser CORS.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| "401 Unauthorized" | JWT expired | Generate a fresh token in DevTools |
| "No tools available" | Wrong URL in config | Verify `<project>.supabase.co/functions/v1/mcp-server` is reachable with curl |
| "ANTHROPIC_API_KEY not configured" | Edge function missing secret | `supabase secrets set ANTHROPIC_API_KEY=...` |
| Claude Desktop not detecting server | Config JSON malformed | `jq . claude_desktop_config.json` to validate |

---

## Roadmap

- [ ] Service-role token flow (long-lived access without refresh)
- [ ] OAuth device flow for user-friendly setup (no DevTools copy-paste)
- [ ] Additional tools: `update_plan`, `trigger_agent`, `export_pdf`
- [ ] Stdio transport (currently HTTP only)
