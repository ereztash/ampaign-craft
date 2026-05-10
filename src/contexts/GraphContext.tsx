import { createContext, useContext } from "react";
import type { UserKnowledgeGraph } from "@/engine/userKnowledgeGraph";

const GraphContext = createContext<UserKnowledgeGraph | null>(null);

export function GraphProvider({
  graph,
  children,
}: {
  graph: UserKnowledgeGraph;
  children: React.ReactNode;
}) {
  return <GraphContext.Provider value={graph}>{children}</GraphContext.Provider>;
}

/**
 * Returns the shared UserKnowledgeGraph from the nearest GraphProvider.
 * Returns null when used outside a provider (standalone pages).
 */
export function useGraph(): UserKnowledgeGraph | null {
  return useContext(GraphContext);
}
