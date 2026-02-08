export function loadMcpServersFromEnv() {
  // דוגמה ל-ENV:
  // MCP_SERVERS='[{"id":"weather","name":"Weather","url":"https://.../mcp"}]'
  const raw = process.env.MCP_SERVERS || "[]";
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}
