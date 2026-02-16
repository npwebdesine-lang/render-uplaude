import express from "express";
import cors from "cors";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/healthz", (req, res) => res.status(200).send("ok"));

const mcpServer = new McpServer({
  name: "Weather Service",
  version: "1.0.0",
});

// הגדרת הכלי
mcpServer.tool("get_weather", { city: z.string() }, async ({ city }) => {
  console.log(`[MCP] Calculating weather for: ${city}`);
  const conditions = ["Sunny ☀️", "Rainy 🌧️", "Cloudy ☁️"];
  const rnd = conditions[Math.floor(Math.random() * conditions.length)];
  const temp = Math.floor(Math.random() * 30) + 10;
  return {
    content: [{ type: "text", text: `Weather in ${city}: ${rnd}, ${temp}°C` }],
  };
});

// ניהול SSE - שיטה פשוטה ויציבה ל-Render
let transport = null;

app.get("/sse", async (req, res) => {
  console.log("[MCP] New connection established");
  transport = new SSEServerTransport("/messages", res);
  await mcpServer.connect(transport);
});

app.post("/messages", async (req, res) => {
  if (transport) {
    await transport.handlePostMessage(req, res);
  } else {
    res.status(503).send("No active transport");
  }
});

const port = process.env.PORT || 3000;
app.listen(port, "0.0.0.0", () => {
  console.log(`MCP Server running on port ${port}`);
});
