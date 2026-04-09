// ═══════════════════════════════════════════════
// Agent Runner — Orchestrates Blackboard Agents
// Runs agents in dependency order using topological sort.
// Each agent reads from the board, processes, and writes back.
// ═══════════════════════════════════════════════

import { Blackboard, type BlackboardState, type BoardSection } from "./blackboardStore";

export interface AgentDefinition {
  name: string;
  dependencies: string[]; // names of agents that must run before this one
  writes: BoardSection[];  // sections this agent writes to
  run: (board: Blackboard) => void;
}

// ═══════════════════════════════════════════════
// TOPOLOGICAL SORT
// ═══════════════════════════════════════════════

function topologicalSort(agents: AgentDefinition[]): AgentDefinition[] {
  const agentMap = new Map(agents.map((a) => [a.name, a]));
  const visited = new Set<string>();
  const result: AgentDefinition[] = [];

  function visit(name: string, visiting: Set<string>) {
    if (visited.has(name)) return;
    if (visiting.has(name)) {
      throw new Error(`Circular dependency detected: ${name}`);
    }

    const agent = agentMap.get(name);
    if (!agent) return;

    visiting.add(name);
    for (const dep of agent.dependencies) {
      visit(dep, visiting);
    }
    visiting.delete(name);
    visited.add(name);
    result.push(agent);
  }

  for (const agent of agents) {
    visit(agent.name, new Set());
  }

  return result;
}

// ═══════════════════════════════════════════════
// AGENT REGISTRY & RUNNER
// ═══════════════════════════════════════════════

export class AgentRunner {
  private agents: AgentDefinition[] = [];

  /**
   * Register an agent definition.
   */
  register(agent: AgentDefinition): void {
    // Replace if already registered (allows overrides)
    this.agents = this.agents.filter((a) => a.name !== agent.name);
    this.agents.push(agent);
  }

  /**
   * Get the execution order (topologically sorted).
   */
  getExecutionOrder(): string[] {
    return topologicalSort(this.agents).map((a) => a.name);
  }

  /**
   * Run all registered agents in dependency order.
   * Returns the final board state.
   */
  runAll(board: Blackboard): BlackboardState {
    const sorted = topologicalSort(this.agents);

    for (const agent of sorted) {
      try {
        agent.run(board);
        board.markAgentComplete(agent.name);
      } catch (err) {
        board.recordError(agent.name, err instanceof Error ? err.message : String(err));
      }
    }

    return board.getState();
  }

  /**
   * Run a single agent by name (with dependency check).
   */
  runOne(name: string, board: Blackboard): void {
    const agent = this.agents.find((a) => a.name === name);
    if (!agent) throw new Error(`Agent "${name}" not found`);

    // Check dependencies are met
    const completed = board.getState().completedAgents;
    for (const dep of agent.dependencies) {
      if (!completed.includes(dep)) {
        throw new Error(`Agent "${name}" requires "${dep}" to run first`);
      }
    }

    try {
      agent.run(board);
      board.markAgentComplete(name);
    } catch (err) {
      board.recordError(name, err instanceof Error ? err.message : String(err));
      throw err;
    }
  }

  /**
   * Get list of registered agent names.
   */
  getRegisteredAgents(): string[] {
    return this.agents.map((a) => a.name);
  }
}
