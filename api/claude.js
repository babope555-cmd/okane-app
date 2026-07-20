// ============================================================
// api/claude.js — 「お金の器」AI判定用APIプロキシ（強化版）
//
// フロントエンドとの契約（変更なし）:
//   POST /api/claude
//   body: { model, max_tokens, system, messages }
//   返却: Anthropic APIのレスポンスをそのまま転送
//   エラー時: { error: { type, message } } ＋ 4xx/5xx
//   → フロント側は !resp.ok || !data.content で
//     既存フォールバックが発動する（修正不要）
// ============================================================

// ── 設定（数値はここだけ触ればOK）─────────────────────────
const ALLOWED_MODELS = new Set([
  "claude-sonnet-4-6",          // 本番判定用
  "claude-haiku-4-5-20251001",  // コスト削減に切り替えたくなった時用
]);
const MAX_TOKENS_CAP = 1000;    // クライアントが何を指定してもこれ以上は出さない
const MAX_BODY_BYTES = 20000;   // リクエスト本文の上限（約20KB）
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1分あたり
const RATE_LIMIT_MAX = 10;              // 同一IPから10回まで
const UPSTREAM_TIMEOUT_MS = 45 * 1000;  // Anthropic応答待ちの上限

// 許可するアクセス元（本番ドメイン＋ローカル開発）
const ALLOWED_ORIGINS = [
  "https://okane-app-two.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000",
];

// ── レート制限（メモリ内・ベストエフォート）──────────────
// 注意: サーバーレスはインスタンスごとにメモリが分かれるため
// 厳密ではない。小規模フェーズの「暴走防止」としては十分。
// 本格運用時は Upstash Redis 等に置き換える（Phase 2）。
const hits = new Map(); // ip -> timestamp[]

function isRateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS
  );
  if (recent.length >= RATE_LIMIT_MAX) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 500) hits.clear(); // メモリ肥大防止の簡易ガード
  return false;
}

// ── エラー応答ヘルパー ──────────────────────────────────
function sendError(res, status, type, message) {
  return res.status(status).json({ error: { type, message } });
}

// ── 本体 ─────────────────────────────────────────────────
export default async function handler(req, res) {
  // 1) POST以外は拒否
  if (req.method !== "POST") {
    return sendError(res, 405, "method_not_allowed", "POSTのみ受け付けます");
  }

  // 2) アクセス元チェック（他サイトからの流用防止）
  const origin = req.headers.origin || req.headers.referer || "";
  const originOk = ALLOWED_ORIGINS.some((o) => origin.startsWith(o));
  if (origin && !originOk) {
    return sendError(res, 403, "forbidden_origin", "許可されていないアクセス元です");
  }

  // 3) APIキー確認（Vercel環境変数）
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("[claude-proxy] ANTHROPIC_API_KEY が未設定");
    return sendError(res, 500, "server_misconfigured", "サーバー設定エラー");
  }

  // 4) レート制限
  const ip =
    (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
    req.socket?.remoteAddress ||
    "unknown";
  if (isRateLimited(ip)) {
    return sendError(res, 429, "rate_limited", "リクエストが多すぎます。少し待ってから再度お試しください");
  }

  // 5) 入力の検証とサイズ制限
  const body = req.body;
  if (!body || typeof body !== "object") {
    return sendError(res, 400, "invalid_request", "リクエスト本文が不正です");
  }
  if (JSON.stringify(body).length > MAX_BODY_BYTES) {
    return sendError(res, 413, "payload_too_large", "リクエストが大きすぎます");
  }
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return sendError(res, 400, "invalid_request", "messagesが必要です");
  }

  // 6) コスト管理: モデル・トークン数をサーバー側で強制
  const model = ALLOWED_MODELS.has(body.model)
    ? body.model
    : "claude-sonnet-4-6";
  const maxTokens = Math.min(
    Number(body.max_tokens) || MAX_TOKENS_CAP,
    MAX_TOKENS_CAP
  );

  const payload = {
    model,
    max_tokens: maxTokens,
    messages: body.messages,
    ...(body.system ? { system: body.system } : {}),
  };

  // 7) Anthropic APIへ転送（タイムアウト＋1回だけ自動リトライ）
  const callAnthropic = async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
    try {
      return await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  };

  try {
    let upstream = await callAnthropic();

    // 429（レート超過）/ 529（過負荷）は1.5秒待って1回だけ再試行
    if (upstream.status === 429 || upstream.status === 529) {
      await new Promise((r) => setTimeout(r, 1500));
      upstream = await callAnthropic();
    }

    const data = await upstream.json();

    if (!upstream.ok) {
      // Anthropic側のエラーはログに残しつつ、簡潔に返す
      console.error("[claude-proxy] upstream error", upstream.status, data?.error?.type);
      return sendError(
        res,
        upstream.status,
        data?.error?.type || "upstream_error",
        "AI判定サービスが一時的に利用できません"
      );
    }

    return res.status(200).json(data);
  } catch (err) {
    const isTimeout = err?.name === "AbortError";
    console.error("[claude-proxy] fetch failed:", err?.message);
    return sendError(
      res,
      isTimeout ? 504 : 502,
      isTimeout ? "upstream_timeout" : "upstream_unreachable",
      "AI判定サービスに接続できませんでした"
    );
  }
}
