import express from "express";
import cors from "cors";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";

const app = express();

app.use(cors());
app.use(express.json());

const mcpServer = new McpServer({
  name: "WeatherService",
  version: "1.0.0",
});

// --- כאן השינוי: תשובה קבועה ---
mcpServer.tool("get_weather", { city: z.string() }, async ({ city }) => {
  console.log(
    `>>> [MCP] Request received for: ${city}. Returning FIXED sunny response.`,
  );

  // לא משנה מה העיר - תמיד שמשי!
  return {
    content: [
      {
        type: "text",
        // הוספתי "(בדיקת חיבור)" כדי שתהיה בטוח שזה הגיע מכאן
        text: `מזג האוויר ב${city}: שמשי לחלוטין ☀️, 25 מעלות (בדיקת חיבור תקינה ✅)`,
      },
    ],
  };
});

// ניהול חיבורים יציב (כמו בתיקון הקודם)
let globalTransport = null;

app.get("/sse", async (req, res) => {
  console.log(">>> [SSE] Client connected");
  globalTransport = new SSEServerTransport("/messages", res);
  await mcpServer.connect(globalTransport);
});

app.post("/messages", async (req, res) => {
  if (!globalTransport) {
    console.log("!!! [POST] No active transport");
    return res.status(503).send("Client not connected yet");
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
  console.log(`MCP Server running on port ${port}`);
});
