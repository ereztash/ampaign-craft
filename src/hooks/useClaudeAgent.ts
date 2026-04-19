import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AgentMessage {
  role: "user" | "assistant";
  content: string;
  toolsUsed?: string[];
}

interface AgentResponse {
  response: string;
  tools_used: string[];
  iterations: number;
}

// Subset of the message shape the Edge Function expects for history
type HistoryParam = { role: "user" | "assistant"; content: string };

export function useClaudeAgent() {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (userMessage: string, planId?: string): Promise<AgentMessage | null> => {
      if (!userMessage.trim()) return null;

      const userEntry: AgentMessage = { role: "user", content: userMessage };
      setMessages((prev) => [...prev, userEntry]);
      setIsLoading(true);
      setError(null);

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          throw new Error("Not authenticated");
        }

        // Send only user/assistant text turns as history (exclude tool internals)
        const history: HistoryParam[] = messages
          .filter((m) => m.role === "user" || m.role === "assistant")
          .map((m) => ({ role: m.role, content: m.content }));

        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
        const resp = await fetch(`${supabaseUrl}/functions/v1/claude-agent`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ message: userMessage, plan_id: planId, history }),
        });

        if (!resp.ok) {
          const errData = await resp.json().catch(() => ({}));
          throw new Error((errData as { error?: string }).error || `HTTP ${resp.status}`);
        }

        const data: AgentResponse = await resp.json();
        const assistantEntry: AgentMessage = {
          role: "assistant",
          content: data.response,
          toolsUsed: data.tools_used,
        };

        setMessages((prev) => [...prev, assistantEntry]);
        return assistantEntry;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        setError(msg);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [messages]
  );

  const clearHistory = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return { messages, sendMessage, isLoading, error, clearHistory };
}
