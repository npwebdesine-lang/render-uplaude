import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

// ⚠️ זה ה-transport לענן (Streamable HTTP)
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

const app = express();
app.use(express.json());

const server = new McpServer({
  name: "Weather Service",
  description: "A service that provides weather information.",
  version: "1.0.0",
});

server.tool("getWeather", { city: z.string() }, async ({ city }) => {
  // כאן בעתיד תחליף למזג אוויר אמיתי/API
  return {
    content: [
      { type: "text", text: `The current weather in ${city} is sunny.` },
    ],
  };
});

// Health
app.get("/healthz", (req, res) => res.status(200).send("ok"));

/**
 * MCP Streamable HTTP:
 * לרוב יש:
 *  - POST /mcp (בקשות JSON-RPC)
 *  - GET /mcp (stream של events / server notifications)
 *  - DELETE /mcp (סגירת session)
 *
 * ה-transport מנהל session באמצעות headers (למשל mcp-session-id).
 */
const transport = new StreamableHTTPServerTransport({
  // depends on SDK; sometimes you pass "path" or handlers
});

app.all("/mcp", async (req, res) => {
  await transport.handleRequest(req, res);
});

// מחברים את השרת ל-transport
await server.connect(transport);

const port = process.env.PORT || 3000;
app.listen(port, "0.0.0.0", () => console.log("MCP server listening on", port));
