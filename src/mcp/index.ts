import { callTool, getTools } from "./server";

export type MCPRequest = {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
};

export type MCPResponse = {
  jsonrpc: "2.0";
  id: string | number;
  result?: unknown;
  error?: { code: number; message: string };
};

const tools = getTools();

export function handleMCPRequest(request: MCPRequest): MCPResponse {
  if (request.jsonrpc !== "2.0") {
    return { jsonrpc: "2.0", id: request.id, error: { code: -32600, message: "invalid request" } };
  }

  switch (request.method) {
    case "initialize": {
      return {
        jsonrpc: "2.0",
        id: request.id,
        result: {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: { name: "sonderr-memory", version: "0.0.05" },
        },
      };
    }
    case "tools/list": {
      return {
        jsonrpc: "2.0",
        id: request.id,
        result: { tools: tools.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })) },
      };
    }
    case "tools/call": {
      const { name, arguments: args } = request.params || {};
      if (!name || typeof name !== "string") {
        return { jsonrpc: "2.0", id: request.id, error: { code: -32602, message: "missing tool name" } };
      }
      const result = callTool(name, (args as Record<string, unknown>) || {});
      return { jsonrpc: "2.0", id: request.id, result };
    }
    default:
      return { jsonrpc: "2.0", id: request.id, error: { code: -32601, message: "method not found" } };
  }
}
