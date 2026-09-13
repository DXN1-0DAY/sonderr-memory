import { createServer } from "http";
import { callTool, getTools } from "./server";
import { logger } from "../logger";

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

export function createMCPServer(port = 3099) {
  const server = createServer((req, res) => {
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      });
      res.end();
      return;
    }

    if (req.method !== "POST" || req.url !== "/mcp") {
      res.writeHead(404);
      res.end(JSON.stringify({ error: "not found" }));
      return;
    }

    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const request = JSON.parse(body) as MCPRequest;
        const response = handleRequest(request);
        res.writeHead(200, {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        });
        res.end(JSON.stringify(response));
      } catch (err) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ jsonrpc: "2.0", error: { code: -32700, message: "parse error" } }));
      }
    });
  });

  server.listen(port, () => {
    logger.info("mcp", `sonderr-memory MCP server listening on http://localhost:${port}/mcp`);
  });

  return server;
}

function handleRequest(request: MCPRequest): MCPResponse {
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
