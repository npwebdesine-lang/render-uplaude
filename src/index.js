/**
 * src/index.js (Stable MCP Server)
 * --------------------------------
 * ניהול נכון של טרנספורט ושמות כלים ברורים.
 */
import express from "express";
import cors from "cors";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";

const app = express();

app.use(cors());
// חובה: JSON Parser כדי לקרוא את הבקשות שמגיעות ל-/messages
app.use(express.json());

app.get("/healthz", (req, res) => res.status(200).send("ok"));

// הגדרת השרת
const mcpServer = new McpServer({
  name: "Weather Service",
  version: "1.0.0",
});

// הגדרת הכלי - שים לב לשם: get_weather (עם קו תחתון, נוח ל-LLM)
mcpServer.tool(
  "get_weather",
  { city: z.string().describe("The city name") },
  async ({ city }) => {
    console.log(`[MCP] Checking weather for ${city}`);
    const conditions = ["Sunny ☀️", "Rainy 🌧️", "Cloudy ☁️", "Stormy ⛈️"];
    const rnd = conditions[Math.floor(Math.random() * conditions.length)];
    const temp = Math.floor(Math.random() * 35);

    return {
      content: [
        { type: "text", text: `Weather in ${city}: ${rnd}, ${temp}°C` },
      ],
    };
  },
);

// ניהול Transports לפי Session ID
// זה מונע התנגשויות בין חיבורים
const transports = new Map();

/**
 * 1. SSE Endpoint
 * הלקוח מתחבר לכאן ומקבל Session ID
 */
app.get("/sse", async (req, res) => {
  console.log("[MCP] New SSE connection incoming...");

  // ה-/messages כאן הוא הנתיב שאליו הלקוח ישלח את ה-POST
  const transport = new SSEServerTransport("/messages", res);

  // ברגע שהחיבור מוכן, שומרים אותו במפה לפי ה-Session ID שה-SDK יצר
  transport.on("message", (msg) => {
    // אופציונלי: לוג הודעות נכנסות
  });

  // ניקוי כשהחיבור נסגר
  res.on("close", () => {
    console.log("[MCP] SSE Connection closed");
    // במערכת אמיתית היינו מנקים את ה-transport מהמפה
  });

  await mcpServer.connect(transport);

  // שמירת הטרנספורט כדי שנוכל להשתמש בו ב-POST
  // הערה: ב-Render עם instance אחד זה יעבוד. ב-Scale צריך Redis.
  // ה-SDK של MCP מנהל את ה-session internally, אבל ב-Express אנחנו צריכים לגשר.
  // למען הפשטות בדמו הזה, נשתמש בטריק:
  // ה-SSEServerTransport לא חושף את ה-sessionId החוצה בקלות בגרסה הזו.
  // לכן נשתמש בגלובלי חכם יותר או נניח שיש session אחד כרגע לכל חיבור SSE פעיל.
  // הפתרון הכי פשוט שעובד ב-SDK הנוכחי ל-Express:
  // כל transport מטפל בעצמו. ה-endpoint של ה-POST צריך לדעת לאיזה transport לגשת.
  // הלקוח שולח ?sessionId=... ב-POST.

  transports.set(transport.sessionId, transport);
});

/**
 * 2. POST Endpoint
 * הלקוח שולח פקודות ביצוע לכאן
 */
app.post("/messages", async (req, res) => {
  const sessionId = req.query.sessionId;
  console.log(`[MCP] POST /messages received. SessionID: ${sessionId}`);

  // אם הלקוח שלח SessionID, ננסה למצוא את הטרנספורט המתאים
  // אם לא (או אם זו הגרסה הפשוטה), ננסה לקחת את האחרון שנוצר (פחות בטוח אבל עובד בדמו)

  // הערה: SSEServerTransport בגרסאות חדשות מנהל את ה-POST בעצמו אם מעבירים לו את ה-req/res?
  // לא, צריך לקרוא ל-handlePostMessage.

  // פתרון חירום לדמו: נרוץ על כל הטרנספורטים הפעילים וננסה לטפל.
  // בשימוש אמיתי ה-SDK אמור לנתב לפי ה-URL.

  // הדרך הכי בטוחה במימוש הפשוט:
  // ה-SDK ב-Client שולח את ה-POST לאותו URL שהגדרנו ב-constructor של ה-Server (/messages).
  // הוא מוסיף לו sessionId ב-Query String.

  let transport;
  if (sessionId) {
    transport = transports.get(sessionId);
  } else {
    // Fallback: קח את הראשון (טוב רק למשתמש יחיד)
    transport = transports.values().next().value;
  }

  if (!transport) {
    console.error("[MCP] No active transport found for this request");
    return res.status(404).send("Session not found");
  }

  await transport.handlePostMessage(req, res);
});

const port = process.env.PORT || 3000;
app.listen(port, "0.0.0.0", () => {
  console.log(`Weather MCP listening on port ${port}`);
});
