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

// הגדרת הכלי - שים לב: אנחנו מדמים מזג אוויר כדי לוודא שזה עובד
mcpServer.tool("get_weather", { city: z.string() }, async ({ city }) => {
  console.log(`[MCP Tool Executing] City: ${city}`);
  const conditions = ["Sunny ☀️", "Rainy 🌧️", "Cloudy ☁️"];
  const rnd = conditions[Math.floor(Math.random() * conditions.length)];
  const temp = Math.floor(Math.random() * 30) + 10;
  return {
    content: [{ type: "text", text: `Weather in ${city}: ${rnd}, ${temp}°C` }],
  };
});

// --- שינוי קריטי: משתנה גלובלי יחיד לטרנספורט ---
// זה מבטיח שגם אם ה-SessionID מתבלבל בדרך, השרת ידע לענות.
let globalTransport = null;

app.get("/sse", async (req, res) => {
  console.log(">>> New SSE Connection");

  // יצירת טרנספורט חדש
  globalTransport = new SSEServerTransport("/messages", res);

  // חיבור ל-MCP
  await mcpServer.connect(globalTransport);

  console.log(">>> SSE Connected and ready");
});

app.post("/messages", async (req, res) => {
  console.log(">>> POST /messages received");

  if (!globalTransport) {
    console.error("!!! No active transport found");
    return res.status(503).send("No active connection");
  }

  // אנחנו מתעלמים מה-SessionID בבקשה ומשתמשים בחיבור הפעיל האחרון
  // זה "התיקון" לבעיות ב-Render
  try {
    await globalTransport.handlePostMessage(req, res);
  } catch (err) {
    console.error("Error handling POST:", err);
    res.status(500).json({ error: err.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, "0.0.0.0", () => {
  console.log(`MCP Server running on port ${port}`);
});
