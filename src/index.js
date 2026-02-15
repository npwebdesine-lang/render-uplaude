/**
 * MCP Server על Render (HTTP)
 * --------------------------
 * למה צריך את זה?
 * - StdioServerTransport עובד רק כשקליינט מפעיל תוכנה מקומית (CLI).
 * - ב-Render אנחנו צריכים MCP דרך HTTP כדי שכל העולם יוכל לגשת אליו.
 *
 * מה זה Streamable HTTP?
 * - זה תקן של MCP שבו הלקוח שולח JSON-RPC לנתיב /mcp
 * - והשרת מחזיר JSON-RPC תשובה (ולפעמים גם stream events).
 */

import express from "express";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

const app = express();

/**
 * חשוב מאוד:
 * הרבה קליינטים של MCP שולחים content-type שלא תמיד בדיוק "application/json".
 * לכן אנחנו מאפשרים JSON "על כל דבר" כדי שלא יהיה body ריק.
 * זה מונע 500/Parse errors.
 */
app.use(express.json({ type: "*/*" }));

/**
 * Health check
 * Render אוהב שיש endpoint שמחזיר OK כדי לבדוק שהשרת חי.
 */
app.get("/healthz", (req, res) => res.status(200).send("ok"));

/**
 * יוצרים MCP Server ומגדירים כלים (tools).
 */
const server = new McpServer({
  name: "Weather Service",
  description: "A service that provides weather information.",
  version: "1.0.0",
});

/**
 * דוגמה לכלי:
 * - שם: getWeather
 * - פרמטר: city (string)
 * - מחזיר text
 */
server.tool("getWeather", { city: z.string() }, async ({ city }) => {
  return {
    content: [
      {
        type: "text",
        text: `The current weather in ${city} is sunny.`,
      },
    ],
  };
});

/**
 * יוצרים transport שמאפשר MCP דרך HTTP.
 * הלקוח ידבר מול:
 * POST/GET/DELETE https://<your-render-service>.onrender.com/mcp
 */
const transport = new StreamableHTTPServerTransport();

/**
 * הנתיב הכי חשוב:
 * /mcp
 * כאן כל ה-JSON-RPC נכנס.
 */
app.all("/mcp", async (req, res) => {
  try {
    await transport.handleRequest(req, res);
  } catch (e) {
    console.error("MCP handleRequest error:", e);
    res.status(500).json({ error: "MCP handleRequest failed" });
  }
});

/**
 * מחברים server ל-transport.
 * אחרי זה השרת "מוכן" לקבל JSON-RPC על /mcp.
 */
await server.connect(transport);

/**
 * מאזינים על PORT של Render.
 */
const port = process.env.PORT || 3000;
app.listen(port, "0.0.0.0", () => {
  console.log("MCP server listening on", port);
});
