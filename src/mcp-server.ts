#!/usr/bin/env bun
import { createMCPServer } from "./mcp/http-server";

export { createMCPServer };

const port = Number(process.env.SONDERR_MEMORY_MCP_PORT) || 3099;
createMCPServer(port);
