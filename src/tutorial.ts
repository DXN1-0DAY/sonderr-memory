export type TutorialStep = {
  title: string;
  body: string;
  command?: string;
  hint?: string;
};

export type Tutorial = {
  id: string;
  name: string;
  description: string;
  steps: TutorialStep[];
};

export const tutorials: Tutorial[] = [
  {
    id: "mcp-setup",
    name: "MCP Server Setup",
    description: "Learn how to set up the sonderr-memory MCP server for your AI coding agent.",
    steps: [
      {
        title: "Start the MCP server",
        body: "The MCP server exposes memory tools over HTTP. Start it with:",
        command: "sonderr-memory mcp",
        hint: "This starts the server on http://localhost:3099/mcp",
      },
      {
        title: "Configure your agent",
        body: "Add the MCP server to your agent configuration. Example for Claude Desktop:",
        command: `cat << 'EOF'
# Claude Desktop config (~/.config/claude/claude_desktop_config.json)
{
  "mcpServers": {
    "sonderr-memory": {
      "url": "http://localhost:3099/mcp",
      "transport": "http"
    }
  }
}
EOF`,
        hint: "Restart Claude Desktop after saving.",
      },
      {
        title: "Test the connection",
        body: "Verify the server is running and tools are available.",
        command: "curl -X POST http://localhost:3099/mcp -H 'Content-Type: application/json' -d '{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/list\"}'",
        hint: "You should see a list of sonderr_memory_* tools.",
      },
      {
        title: "Save your first memory",
        body: "Use the MCP tool to save a memory from your agent.",
        command: `curl -X POST http://localhost:3099/mcp -H 'Content-Type: application/json' -d '{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "sonderr_memory_save",
    "arguments": {
      "content": "Built the MCP server on port 3099",
      "project": "sonderr-memory",
      "topics": ["mcp", "context"]
    }
  }
}'`,
        hint: "This saves a memory entry and returns its ID and path.",
      },
      {
        title: "Query context for your task",
        body: "Before starting a task, query the context manager for relevant memories.",
        command: `curl -X POST http://localhost:3099/mcp -H 'Content-Type: application/json' -d '{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "sonderr_memory_context",
    "arguments": {
      "query": "mcp server setup",
      "max_tokens": 1000
    }
  }
}'`,
        hint: "The context manager returns ranked, token-budgeted memories.",
      },
    ],
  },
  {
    id: "cli-usage",
    name: "CLI Usage",
    description: "Learn the command-line interface for managing memories.",
    steps: [
      {
        title: "Save a memory",
        body: "Use the remember command to save a memory from the terminal.",
        command: "sonderr-memory remember 'Built the MCP server on port 3099' --project sonderr-memory --topics mcp,context",
      },
      {
        title: "Search memories",
        body: "Search your memory store by keyword.",
        command: "sonderr-memory search 'mcp server'",
      },
      {
        title: "List recent memories",
        body: "View recent entries in chronological order.",
        command: "sonderr-memory timeline",
      },
      {
        title: "Get statistics",
        body: "See how many memories you have and how they are distributed.",
        command: "sonderr-memory stats",
      },
      {
        title: "Export context for an agent",
        body: "Get a context window snippet for a specific task.",
        command: "sonderr-memory context 'mcp setup'",
      },
    ],
  },
  {
    id: "tui-walkthrough",
    name: "TUI Walkthrough",
    description: "Learn the terminal UI for visual memory management.",
    steps: [
      {
        title: "Launch the TUI",
        body: "Start the terminal UI.",
        command: "sonderr-memory",
      },
      {
        title: "Create a memory",
        body: "Press Ctrl+N to open the new memory form. Fill in the fields and save.",
        command: "",
        hint: "Fields: category, project, topics, title, content",
      },
      {
        title: "Navigate and search",
        body: "Use Up/Down to navigate. Press Ctrl+S to search.",
        command: "",
        hint: "Enter opens an entry. Tab switches panels.",
      },
      {
        title: "Edit labels",
        body: "Select an entry and press Ctrl+L to edit project, topics, and tags.",
        command: "",
      },
      {
        title: "Context preview",
        body: "Press Ctrl+X to see what the agent would receive for the selected entry.",
        command: "",
        hint: "This shows the bounded context export.",
      },
    ],
  },
];

export function getTutorial(id: string): Tutorial | undefined {
  return tutorials.find((t) => t.id === id);
}

export function getAllTutorials(): Tutorial[] {
  return tutorials;
}
