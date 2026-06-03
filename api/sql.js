export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const TURSO_URL = process.env.TURSO_URL;
  const TURSO_TOKEN = process.env.TURSO_TOKEN;
  if (!TURSO_URL || !TURSO_TOKEN) return res.status(500).json({ error: 'DB not configured' });
  try {
    const { sql, params = [] } = req.body;
    const stmt = { type: "execute", stmt: { sql, args: params.map(p => {
      if (p === null) return { type: "null", value: null };
      if (typeof p === "number") return { type: "integer", value: String(p) };
      return { type: "text", value: String(p) };
    }) } };
    const response = await fetch(TURSO_URL + "/v2/pipeline", {
      method: "POST",
      headers: { "Authorization": "Bearer " + TURSO_TOKEN, "Content-Type": "application/json" },
      body: JSON.stringify({ requests: [stmt, { type: "close" }] })
    });
    const data = await response.json();
    if (data.results && data.results[0]) {
      const result = data.results[0];
      if (result.type === "error") return res.status(400).json({ error: result.error?.message || "SQL error" });
      const resp = result.response?.result;
      if (!resp) return res.json({ rows: [], columns: [] });
      const cols = resp.cols?.map(c => c.name) || [];
      const rows = (resp.rows || []).map(row => {
        const obj = {};
        row.forEach((cell, i) => { obj[cols[i]] = cell?.value ?? null; });
        return obj;
      });
      return res.json({ rows, columns: cols, rowsAffected: resp.affected_row_count || 0 });
    }
    return res.json({ rows: [], columns: [] });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
