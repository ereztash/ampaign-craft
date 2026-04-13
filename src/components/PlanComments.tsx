import { useState, useMemo } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Send } from "lucide-react";

const COMMENTS_KEY = "funnelforge-plan-comments";

export interface PlanComment {
  id: string;
  planId: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: string;
}

function loadComments(planId: string): PlanComment[] {
  try {
    const raw = localStorage.getItem(COMMENTS_KEY);
    const all: PlanComment[] = raw ? JSON.parse(raw) : [];
    return all.filter((c) => c.planId === planId);
  } catch {
    return [];
  }
}

function saveComment(comment: PlanComment): void {
  try {
    const raw = localStorage.getItem(COMMENTS_KEY);
    const all: PlanComment[] = raw ? JSON.parse(raw) : [];
    all.push(comment);
    // Cap at 500 total comments
    const trimmed = all.slice(-500);
    localStorage.setItem(COMMENTS_KEY, JSON.stringify(trimmed));
  } catch { /* storage full — silently fail */ }
}

interface PlanCommentsProps {
  planId: string;
}

const PlanComments = ({ planId }: PlanCommentsProps) => {
  const { language } = useLanguage();
  const isHe = language === "he";
  const { user } = useAuth();
  const [input, setInput] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const comments = useMemo(() => loadComments(planId), [planId, refreshKey]);

  const handleSubmit = () => {
    if (!input.trim() || !user) return;

    const comment: PlanComment = {
      id: `cmt_${Date.now()}`,
      planId,
      userId: user.id,
      userName: user.displayName || user.email,
      content: input.trim(),
      createdAt: new Date().toISOString(),
    };

    saveComment(comment);
    setInput("");
    setRefreshKey((k) => k + 1);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2" dir="auto">
          <MessageSquare className="h-4 w-4" />
          {isHe ? "הערות" : "Comments"} ({comments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {comments.length === 0 && (
          <p className="text-xs text-muted-foreground" dir="auto">
            {isHe ? "אין הערות עדיין" : "No comments yet"}
          </p>
        )}

        {comments.map((c) => (
          <div key={c.id} className="rounded-lg border p-3 text-sm space-y-1">
            <div className="flex justify-between items-center">
              <span className="font-medium text-xs">{c.userName}</span>
              <span className="text-xs text-muted-foreground">
                {new Date(c.createdAt).toLocaleDateString()}
              </span>
            </div>
            <p className="text-sm" dir="auto">{c.content}</p>
          </div>
        ))}

        {user && (
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder={isHe ? "כתוב הערה..." : "Write a comment..."}
              className="flex-1 rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              dir="auto"
            />
            <Button size="sm" onClick={handleSubmit} disabled={!input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PlanComments;
