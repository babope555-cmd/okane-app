// api/claude.js
// フロントエンドからのAI判定リクエストを受け取り、
// サーバー側（Vercel）に保存したAPIキーを使ってAnthropic APIへ中継する。
// これにより、APIキーがブラウザ側に漏れることはなくなる。

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // キー未設定時（チャージ前など）は500を返す。
    // フロント側は既存のtry/catchでフォールバックへ静かに切り替わる。
    res.status(500).json({ error: "ANTHROPIC_API_KEY is not configured" });
    return;
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    // Anthropic側が返したステータス（残高不足=402や429等）をそのまま中継。
    // フロント側のtry/catchが「resp.json()は取れるがcontentが無い」パターンも
    // 想定して安全にフォールバックする設計なので、ここでは詳細を隠さず返す。
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: "Proxy request failed" });
  }
}
