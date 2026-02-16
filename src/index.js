/**
 * src/index.js
 * MCP Server - Weather Service
 * מימוש באמצעות SSE (Server-Sent Events)
 */
import express from "express";
import cors from "cors";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";

const app = express();

// חובה לאפשר CORS כדי שהצ'אטבוט יוכל לגשת לשרת הזה מדומיין אחר
app.use(cors());
app.use(express.json());

// Health check
app.get("/healthz", (req, res) => res.status(200).send("ok"));

// 1. הגדרת שרת ה-MCP והכלים
const mcpServer = new McpServer({
  name: "Weather Service",
  version: "1.0.0",
});

// כלי לדוגמה: מזג אוויר
mcpServer.tool(
  "get_weather",
  { city: z.string().describe("The city to get weather for") },
  async ({ city }) => {
    console.log(`Checking weather for: ${city}`);
    // כאן אפשר לחבר API אמיתי. כרגע זה מדומה.
    const conditions = ["sunny", "rainy", "cloudy", "stormy"];
    const randomCondition =
      conditions[Math.floor(Math.random() * conditions.length)];
    const temp = Math.floor(Math.random() * 30) + 5;

    return {
      content: [
        {
          type: "text",
          text: `Current weather in ${city}: ${randomCondition}, ${temp}°C`,
        },
      ],
    };
  },
);

// 2. ניהול Transports (כל קליינט שמחבר מקבל Transport משלו)
let transport = null;

/**
 * Endpoint 1: SSE Connection (/sse)
 * הלקוח פותח חיבור קבוע לקבלת אירועים
 */
app.get("/sse", async (req, res) => {
  transport = new SSEServerTransport("/messages", res);
  await mcpServer.connectjb(transport); // הערה: בגרסאות SDK חדשות זה connect
  // בגלל שגיאות גרסה נפוצות ב-SDK, נשתמש במימוש הישיר:
  await mcpServer.connect(transport);
});

/**
 * Endpoint 2: Client Messages (/messages)
 * הלקוח שולח בקשות (JSON-RPC) דרך POST
 */
app.post("/messages", async (req, res) => {
  if (transport) {
    await transport.handlePostMessage(req, res);
  } else {
    res.status(400).send("No active transport");
  }
});

const port = process.env.PORT || 3000;
app.listen(port, "0.0.0.0", () => {
  console.log(`Weather MCP running on port ${port}`);
  console.log(`SSE Endpoint: /sse`);
});
