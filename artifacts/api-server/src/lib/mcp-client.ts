const MCP_URL = "https://mcp.utmify.com.br/mcp/?token=KRgMLjM0vnaJgytQQPTvOIUt0Q1m53xZ&resources=gs,gm,gu,gwe,ga,gp,gwa,gr,gtf,gpc,gcs";

interface McpTool {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

interface McpCallResult {
  content?: Array<{ type: string; text?: string }>;
  isError?: boolean;
}

interface McpJsonRpcResponse<T = unknown> {
  jsonrpc: string;
  id: number | string;
  result?: T;
  error?: { code: number; message: string; data?: unknown };
}

let sessionId: string | null = null;
let availableTools: McpTool[] = [];
let toolsInitialized = false;

async function mcpPost<T = unknown>(body: Record<string, unknown>): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
  };
  if (sessionId) {
    headers["mcp-session-id"] = sessionId;
  }

  const res = await fetch(MCP_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const newSession = res.headers.get("mcp-session-id");
  if (newSession) {
    sessionId = newSession;
  }

  const text = await res.text();

  // Handle SSE-style response (data: {...})
  if (text.startsWith("data:")) {
    const lines = text.split("\n");
    for (const line of lines) {
      if (line.startsWith("data:")) {
        const json = line.slice(5).trim();
        if (json && json !== "[DONE]") {
          return JSON.parse(json) as T;
        }
      }
    }
    throw new Error("No data in SSE response");
  }

  return JSON.parse(text) as T;
}

export async function initializeMcp(): Promise<void> {
  if (toolsInitialized) return;

  const initResp = await mcpPost<McpJsonRpcResponse<{ sessionId?: string; protocolVersion?: string }>>({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "painel-financeiro", version: "1.0.0" },
    },
  });

  if (initResp.result?.sessionId) {
    sessionId = initResp.result.sessionId;
  }

  // Send initialized notification
  await mcpPost({
    jsonrpc: "2.0",
    method: "notifications/initialized",
  }).catch(() => null);

  // List tools
  const toolsResp = await mcpPost<McpJsonRpcResponse<{ tools: McpTool[] }>>({
    jsonrpc: "2.0",
    id: 2,
    method: "tools/list",
  });

  availableTools = toolsResp.result?.tools ?? [];
  toolsInitialized = true;
}

export async function callMcpTool(name: string, args: Record<string, unknown> = {}): Promise<unknown> {
  const resp = await mcpPost<McpJsonRpcResponse<McpCallResult>>({
    jsonrpc: "2.0",
    id: Math.random(),
    method: "tools/call",
    params: { name, arguments: args },
  });

  if (resp.error) {
    throw new Error(`MCP tool error: ${resp.error.message}`);
  }

  const content = resp.result?.content ?? [];
  const textContent = content.find((c) => c.type === "text")?.text;
  if (textContent) {
    try {
      return JSON.parse(textContent);
    } catch {
      return textContent;
    }
  }
  return resp.result;
}

export async function getAvailableTools(): Promise<McpTool[]> {
  await initializeMcp();
  return availableTools;
}

export function hasToolInitialized(): boolean {
  return toolsInitialized;
}

export function resetSession(): void {
  sessionId = null;
  toolsInitialized = false;
  availableTools = [];
}
