import express from "express";
import cors from "cors";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";

const app = express();

// מאפשר גישה מכל מקום (פותר בעיות CORS)
app.use(cors());
app.use(express.json());

const mcpServer = new McpServer({
  name: "WeatherService",
  version: "1.0.0",
});

// --- כלי מזג האוויר ---
// מחזיר תמיד תשובה קבועה כדי שנוודא שהחיבור עובד
mcpServer.tool("get_weather", { city: z.string() }, async ({ city }) => {
  console.log(`>>> [MCP] Request received for: ${city}`);
  return {
    content: [
      {
        type: "text",
        text: `SUCCESS_FROM_MCP: מזג האוויר ב${city} הוא שמשי לחלוטין ☀️, 28 מעלות. (הודעה זו מאשרת שהחיבור ל-MCP תקין!)`,
      },
    ],
  };
});

// ניהול טרנספורט גלובלי (פותר בעיות ניתוק ב-Render)
let globalTransport = null;

app.get("/sse", async (req, res) => {
  console.log(">>> [SSE] New connection attempt...");

  // הגדרות למניעת ניתוקים
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  globalTransport = new SSEServerTransport("/messages", res);
  await mcpServer.connect(globalTransport);

  console.log(">>> [SSE] Connection established & kept alive.");
});

app.post("/messages", async (req, res) => {
  if (!globalTransport) {
    console.error("!!! [POST] No active transport to handle message");
    return res.status(503).send("MCP Server is sleeping or disconnected");
  }

  try {
    await globalTransport.handlePostMessage(req, res);
  } catch (err) {
    console.error("!!! [POST] Error:", err);
    res.status(500).json({ error: err.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, "0.0.0.0", () => {
  console.log(`MCP Server is running on port ${port}`);
});
