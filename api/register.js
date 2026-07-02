// api/register.js
// EmailRegisterModalから送られてきたメールアドレスを、
// サーバー側でGoogleフォームへ転送する。
// フォームのURLやentry IDはここにだけ置かれ、ブラウザ側のコードには出てこない。

const GOOGLE_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSdKhnYhpF7ZOeu67rnfe1EQ6gz0RLLY9SFk2Au5nRvniihuOg/formResponse";
const EMAIL_ENTRY_ID = "entry.851667005";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { email } = req.body || {};

  // 簡易バリデーション
  if (!email || typeof email !== "string" || !email.includes("@")) {
    res.status(400).json({ error: "invalid email" });
    return;
  }

  try {
    const formBody = new URLSearchParams();
    formBody.append(EMAIL_ENTRY_ID, email);

    // Googleフォームはリダイレクトを返すが、送信自体は成功しているので
    // レスポンス内容は気にせずステータスだけ見る
    await fetch(GOOGLE_FORM_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formBody.toString(),
    });

    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "registration failed" });
  }
}
