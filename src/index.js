import express from "express";
import { z } from "zod";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

const app = express();

// חשוב: לקבל JSON גם אם ה-client שולח content-type שונה
app.use(express.json({ type: "*/*" }));

// ✅ MCP server
const server = new McpServer({
  name: "Weather Service",
  description: "A service that provides weather information.",
  version: "1.0.0",
});

// ✅ Tool
server.tool("getWeather", { city: z.string() }, async ({ city }) => {
  return {
    content: [
      { type: "text", text: `The current weather in ${city} is sunny.` },
    ],
  };
});

// ✅ Health
app.get("/healthz", (req, res) => res.status(200).send("ok"));

// ✅ Streamable HTTP transport
const transport = new StreamableHTTPServerTransport();

// נקודת הכניסה של MCP (MUST be /mcp)
app.all("/mcp", async (req, res) => {
  await transport.handleRequest(req, res);
});

// חשוב: לחבר את השרת ל-transport
await server.connect(transport);

// Render נותן PORT דרך env
const port = process.env.PORT || 3000;
app.listen(port, "0.0.0.0", () => {
  console.log("MCP server listening on", port);
});
