let _mcpUrl: string | null = null;

function getMcpUrl(): string {
  if (!_mcpUrl) {
    throw new Error("Token UTMify não configurado. Acesse Configurações e salve seu token.");
  }
  return _mcpUrl;
}

export function setMcpToken(token: string): void {
  _mcpUrl = `https://mcp.utmify.com.br/mcp/?token=${token}&resources=gs,gm,gu,gwe,ga,gp,gwa,gr,gtf,gpc,gcs`;
}

// UTMify MCP uses the MCP 2024-11-05 protocol over plain HTTP (not SSE).
// Required: Accept: application/json, text/event-stream (even though response is plain JSON).

interface McpJsonRpcResponse<T = unknown> {
  jsonrpc: string;
  id: number | string | null;
  result?: T;
  error?: { code: number; message: string; data?: unknown };
}

interface McpTool {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

interface McpCallResult {
  content?: Array<{ type: string; text?: string }>;
  isError?: boolean;
}

let _sessionId: string | null = null;
let _tools: McpTool[] = [];
let _initialized = false;

async function rpc<T = unknown>(
  method: string,
  params?: Record<string, unknown>,
  id?: number
): Promise<McpJsonRpcResponse<T>> {
  const body: Record<string, unknown> = { jsonrpc: "2.0", method };
  if (id !== undefined) body.id = id;
  if (params !== undefined) body.params = params;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
  };
  if (_sessionId) headers["mcp-session-id"] = _sessionId;

  const res = await fetch(getMcpUrl(), {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const sid = res.headers.get("mcp-session-id");
  if (sid) _sessionId = sid;

  const text = await res.text();
  if (!text || text.trim() === "") {
    return { jsonrpc: "2.0", id: id ?? null };
  }

  return JSON.parse(text) as McpJsonRpcResponse<T>;
}

export async function initMcp(): Promise<void> {
  if (_initialized) return;

  const initResp = await rpc<{ protocolVersion: string }>(
    "initialize",
    {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "painel-financeiro", version: "1.0.0" },
    },
    1
  );

  if (initResp.error) {
    throw new Error(`MCP init failed: ${initResp.error.message}`);
  }

  await rpc("notifications/initialized").catch(() => null);

  const toolsResp = await rpc<{ tools: McpTool[] }>("tools/list", {}, 2);
  if (toolsResp.error) {
    throw new Error(`MCP tools/list failed: ${toolsResp.error.message}`);
  }
  _tools = toolsResp.result?.tools ?? [];
  _initialized = true;
}

export function getTools(): McpTool[] {
  return _tools;
}

export async function callTool(
  name: string,
  args: Record<string, unknown> = {}
): Promise<unknown> {
  const resp = await rpc<McpCallResult>(
    "tools/call",
    { name, arguments: args },
    Math.floor(Math.random() * 9000) + 1000
  );

  if (resp.error) {
    throw new Error(`MCP tool "${name}" error: ${resp.error.message}`);
  }
  if (resp.result?.isError) {
    const txt = resp.result.content?.find((c) => c.type === "text")?.text ?? "Tool error";
    throw new Error(`MCP tool "${name}" returned error: ${txt}`);
  }

  const textContent = resp.result?.content?.find((c) => c.type === "text")?.text;
  if (!textContent) return null;

  try {
    return JSON.parse(textContent);
  } catch {
    return textContent;
  }
}

export function resetMcp(): void {
  _sessionId = null;
  _tools = [];
  _initialized = false;
}
