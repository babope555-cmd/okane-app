import React, { useState, useEffect, useRef } from 'react';

// ── カラーパレット（V10完全準拠） ──
const COLORS = {
  midnightBlue: "#0d0b18",
  indigoDeep: "#1a122e",
  softWhite: "#2d2035",
  pearlWhite: "#fcfbfa",
  goldPrimary: "#c49a2a",
  goldLight: "#ffd97a",
  goldGlow: "#f3e198",
  lotusRose: "#c07fb0",
  aquaTeal: "#3ab0c0",
  mutedText: "#8a7a9a",
};

// ── 定数・マスターデータ ──
const CATEGORIES = [
  {
    id: "food", label: "食費・カフェ", icon: "☕", iconBg: "#fff5f0",
    sub: ["外食", "自炊・食材", "カフェ", "ご褒美スイーツ", "その他"]
  },
  {
    id: "self", label: "自己投資・学び", icon: "📚", iconBg: "#f0f8ff",
    sub: ["書籍・Kindle", "セミナー・講座", "資格・勉強", "コーチング", "その他"]
  },
  {
    id: "life", label: "生活・住まい", icon: "🏠", iconBg: "#f5fff0",
    sub: ["家賃・光熱費", "日用品", "インテリア", "家電", "その他"]
  },
  {
    id: "beauty", label: "美容・健康", icon: "💄", iconBg: "#fff0f5",
    sub: ["コスメ", "サプリ・健康", "ジム・運動", "サロン・美容院", "その他"]
  },
  {
    id: "play", label: "趣味・推し活", icon: "🎨", iconBg: "#faf0ff",
    sub: ["ライブ・イベント", "グッズ", "ゲーム・エンタメ", "旅行", "その他"]
  },
  {
    id: "other", label: "その他", icon: "✨", iconBg: "#f8f8f8",
    sub: ["交通費", "交際費・ギフト", "雑費", "その他"]
  }
];

const FEELINGS = [
  { id: "happy", label: "ワクワク・満たされた", icon: "🥰" },
  { id: "calm", label: "安心・ほっとした", icon: "😌" },
  { id: "growth", label: "成長を感じた", icon: "🌱" },
  { id: "doubt", label: "ちょっと罪悪感・モヤモヤ", icon: "😅" },
];

const CIRCULATION_TAGS = [
  { id: "self_invest", label: "未来の自分への投資", icon: "🚀" },
  { id: "gift", label: "大切な人へのプレゼント", icon: "🎁" },
  { id: "time_saving", label: "時間を買う・余裕を作る", icon: "⏱" },
  { id: "experience", label: "一生モノの体験", icon: "🌈" },
];

const LEVEL_STAGES = [
  { lv: 1, label: "小さな芽生えの器", emoji: "🌱", color: "#8a7a9a", needed: 0 },
  { lv: 2, label: "あたたかな泉の器", emoji: "💧", color: "#3ab0c0", needed: 50 },
  { lv: 3, label: "輝く光の器", emoji: "✨", color: "#c07fb0", needed: 120 },
  { lv: 4, label: "豊穣の器", emoji: "🌾", color: "#c49a2a", needed: 220 },
  { lv: 5, label: "無限循環の器", emoji: "🪐", color: "#ffd97a", needed: 350 },
];

const TALENT_TAG_MAP = {
  "未来の自分への投資": { label: "成長・学習" },
  "大切な人へのプレゼント": { label: "貢献・利他" },
  "時間を買う・余裕を作る": { label: "安定・安心" },
  "一生モノの体験": { label: "個性・ワクワク" },
};

const CATCHCOPIES = [
  "あなたの支出は、未来の豊かさを紡ぐ種。今日も素敵なエネルギーが巡っています。",
  "心地よいお金の使い方が、あなたの周りに美しい循環を生み出します。",
  "「価値がある」と感じたものへの投資は、必ずあなた自身を大きく育てます。"
];

const ONBOARDING_QUESTIONS = [
  {
    id: "q1", theme: "エネルギー", color: "#3ab0c0", bg: "linear-gradient(135deg, #eefcff, #e0f8fc)",
    question: "どんなときに一番「自分らしく輝いている」と感じますか？",
    options: [
      { id: "a", label: "新しい知識や世界に触れているとき", emoji: "📚" },
      { id: "b", label: "誰かの力になり、感謝されたとき", emoji: "🤝" },
      { id: "c", label: "自分の世界や作品を表現しているとき", emoji: "🎨" },
      { id: "d", label: "安心できる空間でゆったり過ごすとき", emoji: "☕", freeInput: true },
    ]
  },
  {
    id: "q2", theme: "循環", color: "#c07fb0", bg: "linear-gradient(135deg, #fdf0f8, #f8e4f0)",
    question: "最近「これにお金を使って心から良かった」と思えたものは？",
    options: [
      { id: "a", label: "学びやスキルの習得", emoji: "🚀" },
      { id: "b", label: "人と分かち合った時間やギフト", emoji: "🎁" },
      { id: "c", label: "自分の心身を整える時間・体験", emoji: "🌿" },
      { id: "d", label: "時間を生み出す時短アイテム", emoji: "⏱", freeInput: true },
    ]
  },
  {
    id: "q3", theme: "才能のタネ", color: "#c49a2a", bg: "linear-gradient(135deg, #fffdf0, #fff8e0)",
    question: "周りから「それすごいね！」「得意だよね」と言われることは？",
    options: [
      { id: "a", label: "物事を分かりやすく伝える・教えること", emoji: "💡" },
      { id: "b", label: "人の気持ちに寄り添い聴くこと", emoji: "🌸" },
      { id: "c", label: "アイデアを出したり形にすること", emoji: "🎨" },
      { id: "d", label: "効率よく整理整頓・計画すること", emoji: "📐", freeInput: true },
    ]
  },
  {
    id: "q4", theme: "理想の器", color: "#8b5cf6", bg: "linear-gradient(135deg, #f3eeff, #e8ddff)",
    question: "これからどんな循環を広げていきたいですか？",
    options: [
      { id: "a", label: "豊かさを周りに循環させる存在になりたい", emoji: "🌟" },
      { id: "b", label: "自由な時間と選択肢を増やしていきたい", emoji: "🕊" },
      { id: "c", label: "自分の「好き」を突き詰めたい", emoji: "🔥" },
      { id: "d", label: "大切な人と温かい居場所を作りたい", emoji: "🏡", freeInput: true },
    ]
  },
  {
    id: "q5", theme: "器の形", color: "#3182ce", bg: "linear-gradient(135deg, #ebf8ff, #d4f0ff)",
    question: "あなたの「お金に対する本来のスタンス」はどれに近い？",
    options: [
      { id: "a", label: "愛とエネルギーを循環させるツール", emoji: "💖" },
      { id: "b", label: "自分と大切な人を守るための盾", emoji: "🛡" },
      { id: "c", label: "自分の世界をひろげる翼", emoji: "🕊" },
      { id: "d", label: "未来を創り出す魔法の杖", emoji: "🪄", freeInput: true },
    ]
  }
];

// ── ローカルストレージHelper ──
const loadLS = (key, fallback) => {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : fallback;
  } catch {
    return fallback;
  }
};
const saveLS = (key, val) => {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.error(e);
  }
};

// ── モック用AI解析 ──
const mockAIAnalyze = (cat, feeling, tags, extra) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        aiPct: 85,
        feelingText: `「${cat}」への投資を通じて、${feeling.label}という心地よい循環が生まれています。`,
        ai: `この支出はあなたの『${tags[0] || "心を満たす豊かな習慣"}』にしっかり繋がっていますね！`,
        energyGain: 15,
        valueTags: tags.length > 0 ? tags : ["自分を満たす時間"]
      });
    }, 1200);
  });
};

// ── エフェクト・コンポーネント群（V10完全再現） ──
function Sparkles({ color = COLORS.goldLight, count = 10 }) {
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            width: Math.random() * 4 + 2,
            height: Math.random() * 4 + 2,
            backgroundColor: color,
            borderRadius: "50%",
            opacity: Math.random() * 0.7 + 0.3,
            animation: `sparkleFloat ${Math.random() * 3 + 2}s infinite ease-in-out`,
            animationDelay: `${Math.random() * 2}s`,
          }}
        />
      ))}
    </div>
  );
}

function VesselDisplay({ level, energy, maxEnergy, curLevel, nextLevel }) {
  const pct = maxEnergy ? Math.min(100, Math.round((energy / maxEnergy) * 100)) : 100;
  return (
    <div style={{ position: "relative", width: 140, height: 140, margin: "0 auto" }}>
      <svg width="140" height="140" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="42" fill="none" stroke="#e8e0d5" strokeWidth="6" />
        <circle
          cx="50" cy="50" r="42" fill="none" stroke={curLevel?.color || COLORS.goldPrimary}
          strokeWidth="6" strokeDasharray="263.89"
          strokeDashoffset={263.89 - (263.89 * pct) / 100}
          strokeLinecap="round" style={{ transition: "stroke-dashoffset 1s ease", transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}
        />
      </svg>
      <div style={{
        position: "absolute", inset: 0, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
      }}>
        <span style={{ fontSize: 42, animation: "waveFloat 3s ease-in-out infinite" }}>
          {curLevel?.emoji || "🌱"}
        </span>
      </div>
    </div>
  );
}

function SplashScreen({ onDone }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 2000);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: `linear-gradient(180deg, ${COLORS.midnightBlue} 0%, ${COLORS.indigoDeep} 100%)`,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      color: "white", animation: "fadeInOut 2.2s ease-in-out forwards",
    }}>
      <div style={{ fontSize: 60, marginBottom: 16 }}>✨</div>
      <div style={{
        fontSize: 22, fontWeight: 800, letterSpacing: 2,
        background: `linear-gradient(135deg, ${COLORS.goldLight}, ${COLORS.lotusRose})`,
        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
      }}>
        お金の器
      </div>
      <div style={{ fontSize: 12, color: COLORS.mutedText, marginTop: 8 }}>
        豊かさが巡るエネルギー循環アプリ
      </div>
    </div>
  );
}

function VideoPlayer({ src, onEnded }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 950, background: "black",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <video
        src={src} autoPlay playsInline onEnded={onEnded}
        style={{ width: "100%", maxHeight: "100%", objectFit: "contain" }}
      />
      <button
        onClick={onEnded}
        style={{
          position: "absolute", top: 20, right: 20, background: "rgba(255,255,255,0.2)",
          color: "white", border: "none", borderRadius: 999, padding: "8px 16px", cursor: "pointer",
        }}
      >
        スキップ ✕
      </button>
    </div>
  );
}

function LevelUpModal({ fromLevel, toLevel, skipFlash, onClose }) {
  const target = LEVEL_STAGES.find(s => s.lv === toLevel) || LEVEL_STAGES[0];
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 900, background: "rgba(13, 11, 24, 0.85)",
      backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div style={{
        background: "white", borderRadius: 28, padding: "32px 24px", maxWidth: 360, width: "100%",
        textAlign: "center", position: "relative", overflow: "hidden", animation: "bounceIn 0.5s ease-out",
      }}>
        <Sparkles count={20} color={target.color} />
        <div style={{ fontSize: 12, color: COLORS.goldPrimary, fontWeight: 800, letterSpacing: 2, marginBottom: 8 }}>
          LEVEL UP!
        </div>
        <div style={{ fontSize: 60, margin: "16px 0" }}>{target.emoji}</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: COLORS.softWhite, marginBottom: 8 }}>
          Lv.{toLevel} {target.label}
        </div>
        <div style={{ fontSize: 13, color: COLORS.mutedText, lineHeight: 1.6, marginBottom: 24 }}>
          あなたのエネルギーの器がひと回り大きくなりました！豊かな循環が広がっています。
        </div>
        <button
          onClick={onClose}
          style={{
            width: "100%", padding: "14px", borderRadius: 999, border: "none",
            background: `linear-gradient(135deg, ${COLORS.goldPrimary}, ${COLORS.goldGlow})`,
            color: "#1a0a00", fontWeight: 800, fontSize: 15, cursor: "pointer",
          }}
        >
          受け取る ✨
        </button>
      </div>
    </div>
  );
}

function TalentMatchModal({ onClose, topValues, topTalents, aiPct, topCats, userProfile, pieceCounts }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 850, background: "rgba(13, 11, 24, 0.9)",
      backdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      overflowY: "auto",
    }}>
      <div style={{
        background: "white", borderRadius: 28, padding: 24, maxWidth: 380, width: "100%",
        maxHeight: "85vh", overflowY: "auto", position: "relative",
      }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 36 }}>🧩</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: COLORS.softWhite }}>
            あなたの才能パズル診断
          </div>
          <div style={{ fontSize: 12, color: COLORS.mutedText, marginTop: 4 }}>
            これまでの支出・価値観データから導かれた才能領域
          </div>
        </div>

        <div style={{ background: "#faf8f5", borderRadius: 16, padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.goldPrimary, marginBottom: 8 }}>
            ✦ 発現している上位の才能ピース
          </div>
          {pieceCounts && pieceCounts.length > 0 ? (
            pieceCounts.slice(0, 3).map(([label, count], i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, margin: "6px 0" }}>
                <span>{label}</span>
                <span style={{ fontWeight: 700, color: COLORS.softWhite }}>{count} ピース</span>
              </div>
            ))
          ) : (
            <div style={{ fontSize: 12, color: COLORS.mutedText }}>データを蓄積中です</div>
          )}
        </div>

        <button
          onClick={onClose}
          style={{
            width: "100%", padding: "12px", borderRadius: 999, border: "none",
            background: COLORS.goldPrimary, color: "white", fontWeight: 700, cursor: "pointer",
          }}
        >
          閉じる
        </button>
      </div>
    </div>
  );
}

function AIResultCard({ result, onClose, onCloseToHome }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 700, background: "rgba(0,0,0,0.6)",
      backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div style={{
        background: "white", borderRadius: 24, padding: 24, maxWidth: 360, width: "100%",
        animation: "slideUpIn 0.3s ease-out",
      }}>
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <span style={{ fontSize: 40 }}>✨</span>
          <div style={{ fontSize: 16, fontWeight: 800, color: COLORS.softWhite, marginTop: 8 }}>
            循環解析レポート
          </div>
          <div style={{ fontSize: 12, color: COLORS.goldPrimary, fontWeight: 700, marginTop: 4 }}>
            +{result.energyGain} pt 獲得！
          </div>
        </div>

        <div style={{ fontSize: 13, color: COLORS.softWhite, lineHeight: 1.6, background: "#faf8f5", padding: 14, borderRadius: 12, marginBottom: 20 }}>
          {result.ai}
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onCloseToHome}
            style={{
              flex: 1, padding: "12px", borderRadius: 999, border: "none",
              background: COLORS.goldPrimary, color: "white", fontWeight: 700, cursor: "pointer",
            }}
          >
            ホームへ戻る
          </button>
        </div>
      </div>
    </div>
  );
}

function EmotionSliderEnhanced({ value, onChange }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: COLORS.mutedText, marginBottom: 8 }}>
        <span>もやもや</span>
        <span style={{ fontWeight: 700, color: COLORS.goldPrimary }}>満足度: {value}%</span>
        <span>最高！</span>
      </div>
      <input
        type="range" min="0" max="100" value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: COLORS.goldPrimary }}
      />
    </div>
  );
}

function OtherSubInput({ value, onChange, onSubmit }) {
  return (
    <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
      <input
        type="text" value={value} placeholder="具体的な用途を入力..."
        onChange={(e) => onChange(e.target.value)}
        style={{
          flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid #ccc",
          fontSize: 12, outline: "none",
        }}
      />
      <button
        onClick={() => onSubmit(value)}
        style={{
          padding: "8px 16px", borderRadius: 8, border: "none",
          background: COLORS.goldPrimary, color: "white", fontWeight: 700, fontSize: 12, cursor: "pointer",
        }}
      >
        決定
      </button>
    </div>
  );
}

// ── メインAppコンポーネント ──
export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [tab, setTab] = useState("home"); // home | history | mypage

  // ユーザー状態
  const [energy, setEnergy] = useState(() => loadLS("user_energy", 0));
  const [history, setHistory] = useState(() => loadLS("user_history", []));
  const [hasPlayedUtuwa, setHasPlayedUtuwa] = useState(() => loadLS("played_utuwa", false));

  // オンボーディング
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(() => loadLS("onboarding_done", false));
  const [obStepGlobal, setObStepGlobal] = useState(0);
  const [obAnswersGlobal, setObAnswersGlobal] = useState(() => loadLS("onboarding_answers", {}));

  // モーダル・トースト
  const [levelUpInfo, setLevelUpInfo] = useState(null); // { from, to, skipFlash }
  const [showTalentMatch, setShowTalentMatch] = useState(false);
  const [partnerResult, setPartnerResult] = useState(null);
  const [comfortToast, setComfortToast] = useState(false);
  const [comfortAlreadyToast, setComfortAlreadyToast] = useState(false);
  const [lastComfortDate, setLastComfortDate] = useState(() => loadLS("last_comfort_date", ""));
  const [pieceToast, setPieceToast] = useState([]);
  const [recentlyGrownPieces, setRecentlyGrownPieces] = useState([]);

  // 入力フロー（RECORD）
  const [showInput, setShowInput] = useState(false);
  const [inputStep, setInputStep] = useState("sub"); // sub | feeling | time | tags | loading | result
  const [selCat, setSelCat] = useState(null);
  const [selSubCat, setSelSubCat] = useState(null);
  const [otherSubText, setOtherSubText] = useState("");
  const [sliderVal, setSliderVal] = useState(80);
  const [selFeeling, setSelFeeling] = useState(null);
  const [selTimeInvest, setSelTimeInvest] = useState([]);
  const [selTags, setSelTags] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);

  // 履歴ビュー
  const [calendarView, setCalendarView] = useState(true);
  const [calendarMonth, setCalendarMonth] = useState({ y: new Date().getFullYear(), m: new Date().getMonth() });
  const [calendarSelected, setCalendarSelected] = useState(null);

  // キャンバス参照
  const globalCanvasRef = useRef(null);

  // レベル計算
  const getCurrentLevel = (pts) => {
    let lvl = LEVEL_STAGES[0];
    for (let s of LEVEL_STAGES) {
      if (pts >= s.needed) lvl = s;
    }
    return lvl;
  };
  const curLevel = getCurrentLevel(energy);
  const level = curLevel.lv;
  const nextLevel = LEVEL_STAGES.find(s => s.lv === level + 1);
  const progressPct = nextLevel
    ? Math.min(100, Math.round(((energy - curLevel.needed) / (nextLevel.needed - curLevel.needed)) * 100))
    : 100;

  // エネルギー加算処理
  const applyEnergyGain = (pts) => {
    const prevLv = getCurrentLevel(energy).lv;
    const newPts = energy + pts;
    setEnergy(newPts);
    saveLS("user_energy", newPts);

    const newLv = getCurrentLevel(newPts).lv;
    if (newLv > prevLv) {
      if (newLv === 5 && !hasPlayedUtuwa) {
        // Lv5 初回到達時は動画再生フラグを待つ
      } else {
        setLevelUpInfo({ from: prevLv, to: newLv });
      }
    }
    return pts;
  };

  // 入力リセット
  const resetInput = () => {
    setInputStep("sub");
    setSelCat(null);
    setSelSubCat(null);
    setOtherSubText("");
    setSliderVal(80);
    setSelFeeling(null);
    setSelTimeInvest([]);
    setSelTags([]);
    setAiResult(null);
  };

  const toggleTag = (id) => {
    setSelTags(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // グローバルクリック（スパークエフェクト）
  const handleGlobalClick = (e) => {
    // 軽いタップエフェクトなどを必要に応じて実装可能な領域
  };

  // ── AI解析実行 ──
  const runAI = async () => {
    setInputStep("loading");
    setAiLoading(true);

    const sub = selSubCat === "その他" ? (otherSubText || "その他") : selSubCat;
    const catLabel = selCat ? `${selCat.label}（${sub}）` : "未設定";

    try {
      const res = await mockAIAnalyze(catLabel, selFeeling || { label: "普通" }, selTags, selTimeInvest);
      
      const newEntry = {
        id: Date.now(),
        date: new Date().toLocaleDateString("ja-JP"),
        recordedAt: new Date().toISOString(),
        cat: catLabel,
        feeling: selFeeling?.label || "普通",
        energy: res.energyGain,
        ai: res.ai,
        valueTags: res.valueTags,
        aiPct: res.aiPct,
      };

      const updatedHistory = [newEntry, ...history];
      setHistory(updatedHistory);
      saveLS("user_history", updatedHistory);

      applyEnergyGain(res.energyGain);

      // 才能ピース更新トースト
      const grown = [];
      res.valueTags.forEach(vt => {
        const domain = TALENT_TAG_MAP[vt]?.label;
        if (domain && !grown.includes(domain)) grown.push(domain);
      });
      if (grown.length > 0) {
        setPieceToast(grown);
        setRecentlyGrownPieces(grown);
        setTimeout(() => setPieceToast([]), 4000);
      }

      setAiResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setAiLoading(false);
      setInputStep("result");
    }
  };

  // ── ユーザープロファイル集計 ──
  const getUserProfileData = () => {
    const catCounts = {};
    history.forEach(h => {
      if (h.cat) catCounts[h.cat] = (catCounts[h.cat] || 0) + 1;
    });
    const sortedCats = Object.entries(catCounts).sort((a, b) => b[1] - a[1]);

    const valueTagCounts = {};
    history.forEach(h => {
      (h.valueTags || []).forEach(vt => {
        valueTagCounts[vt] = (valueTagCounts[vt] || 0) + 1;
      });
    });
    const sortedValueTags = Object.entries(valueTagCounts).sort((a, b) => b[1] - a[1]);
    const topValues = sortedValueTags.slice(0, 5).map(([tag]) => tag);

    const pieceCountsByDomain = {};
    sortedValueTags.forEach(([vt, cnt]) => {
      const domain = TALENT_TAG_MAP[vt]?.label || "その他";
      pieceCountsByDomain[domain] = (pieceCountsByDomain[domain] || 0) + cnt;
    });
    const sortedPieceCounts = Object.entries(pieceCountsByDomain).sort((a, b) => b[1] - a[1]);

    let totalAi = 0;
    let aiCount = 0;
    history.forEach(h => {
      if (typeof h.aiPct === "number") {
        totalAi += h.aiPct;
        aiCount++;
      }
    });
    const avgAiPct = aiCount > 0 ? Math.round(totalAi / aiCount) : 75;

    const onboardingAnswers = loadLS("onboarding_answers", {});

    return {
      topCats: sortedCats,
      topValues,
      pieceCounts: sortedPieceCounts,
      avgAiPct,
      onboardingAnswers,
    };
  };

  // ── 1日のふりかえり ──
  const handleComfortCheck = () => {
    const todayStr = new Date().toLocaleDateString("ja-JP");
    if (lastComfortDate === todayStr) {
      setComfortAlreadyToast(true);
      setTimeout(() => setComfortAlreadyToast(false), 3000);
      return;
    }
    applyEnergyGain(10);
    setLastComfortDate(todayStr);
    saveLS("last_comfort_date", todayStr);
    setComfortToast(true);
    setTimeout(() => setComfortToast(false), 3500);
  };

  return (
    <div
      onClick={handleGlobalClick}
      style={{
        minHeight: "100vh",
        background: `linear-gradient(180deg, ${COLORS.midnightBlue} 0%, ${COLORS.indigoDeep} 100%)`,
        color: COLORS.pearlWhite,
        fontFamily: "'Helvetica Neue', Arial, 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', sans-serif",
        position: "relative",
        paddingBottom: 80,
      }}
    >
      <canvas
        ref={globalCanvasRef}
        width={typeof window !== "undefined" ? window.innerWidth : 400}
        height={typeof window !== "undefined" ? window.innerHeight : 800}
        style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9999 }}
      />

      {/* ── スプラッシュ ── */}
      {showSplash && <SplashScreen onDone={() => setShowSplash(false)} />}

      {/* ── 動画演出（Lv5到達時） ── */}
      {!showSplash && level >= 5 && !hasPlayedUtuwa && (
        <VideoPlayer
          src="/utuwa.mp4"
          onEnded={() => {
            setHasPlayedUtuwa(true);
            saveLS("played_utuwa", true);
            setLevelUpInfo({ from: 4, to: 5, skipFlash: true });
          }}
        />
      )}

      {/* ── レベルアップモーダル ── */}
      {levelUpInfo && (
        <LevelUpModal
          fromLevel={levelUpInfo.from}
          toLevel={levelUpInfo.to}
          skipFlash={levelUpInfo.skipFlash}
          onClose={() => {
            const isLv5 = levelUpInfo.to === 5;
            setLevelUpInfo(null);
            if (isLv5) setShowTalentMatch(true);
          }}
        />
      )}

      {/* ── 才能パズル画面 ── */}
      {showTalentMatch && (() => {
        const prof = getUserProfileData();
        return (
          <TalentMatchModal
            onClose={() => setShowTalentMatch(false)}
            topValues={prof.topValues}
            topTalents={prof.pieceCounts.slice(0, 2).map(([lbl]) => lbl)}
            aiPct={prof.avgAiPct}
            topCats={prof.topCats}
            userProfile={prof.onboardingAnswers}
            pieceCounts={prof.pieceCounts}
          />
        );
      })()}

      {/* ── トースト群 ── */}
      {comfortToast && (
        <div style={{
          position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
          zIndex: 900, background: "linear-gradient(135deg, #3ab0c0, #2a9aaa)",
          color: "white", padding: "12px 24px", borderRadius: 999,
          boxShadow: "0 8px 32px rgba(42,154,170,0.4)", fontWeight: 700, fontSize: 14,
          animation: "slideDownIn 0.4s ease-out",
        }}>
          <span>🦋 1日のふりかえり完了！ +10pt</span>
        </div>
      )}

      {comfortAlreadyToast && (
        <div style={{
          position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
          zIndex: 900, background: "linear-gradient(135deg, #a88bfa, #8b5cf6)",
          color: "white", padding: "12px 24px", borderRadius: 999,
          boxShadow: "0 8px 32px rgba(139,92,246,0.3)", fontWeight: 700, fontSize: 13,
          animation: "slideDownIn 0.4s ease-out",
        }}>
          <span>✨ 今日のふりかえりは実施済みです。また明日記録しましょう！</span>
        </div>
      )}

      {pieceToast.length > 0 && (
        <div style={{
          position: "fixed", top: 68, left: "50%", transform: "translateX(-50%)",
          zIndex: 890, background: "linear-gradient(135deg, #8b5cf6, #c07fb0)",
          color: "white", padding: "10px 20px", borderRadius: 999,
          boxShadow: "0 8px 24px rgba(139,92,246,0.3)", fontWeight: 700, fontSize: 13,
          animation: "slideDownIn 0.3s ease-out",
        }}>
          <span>🧩 『{pieceToast.join("』『")}』のピースが育ちました！</span>
        </div>
      )}

      {/* ── ヘッダー ── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 80,
        background: "rgba(255,255,255,0.85)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(196,154,42,0.15)",
        padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>🏺</span>
          <span style={{
            fontSize: 18, fontWeight: 800,
            background: `linear-gradient(135deg, ${COLORS.goldPrimary}, ${COLORS.lotusRose})`,
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: 0.5,
          }}>お金の器</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            background: "linear-gradient(135deg, #fffdf0, #fff8e0)",
            border: `1px solid ${COLORS.goldLight}55`, borderRadius: 999,
            padding: "4px 12px", display: "flex", alignItems: "center", gap: 6,
          }}>
            <span style={{ fontSize: 12 }}>{curLevel.emoji}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: COLORS.goldPrimary }}>Lv.{level}</span>
            <span style={{ fontSize: 11, color: COLORS.mutedText }}>({energy}pt)</span>
          </div>
        </div>
      </header>

      {/* ── オンボーディング ── */}
      {(showOnboarding || !onboardingDone) && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 600,
          background: ONBOARDING_QUESTIONS[obStepGlobal]?.bg || "linear-gradient(135deg, #f5f0ff, #ede8ff)",
          overflowY: "auto", padding: "24px 20px 40px", display: "flex", flexDirection: "column",
        }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 24, maxWidth: 400, margin: "0 auto 24px", width: "100%" }}>
            {ONBOARDING_QUESTIONS.map((_, idx) => (
              <div key={idx} style={{
                flex: 1, height: 4, borderRadius: 2,
                background: idx <= obStepGlobal ? ONBOARDING_QUESTIONS[obStepGlobal].color : "rgba(0,0,0,0.1)",
                transition: "background 0.3s ease",
              }} />
            ))}
          </div>

          <div style={{ maxWidth: 400, margin: "0 auto", width: "100%", flex: 1, display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 12, color: ONBOARDING_QUESTIONS[obStepGlobal].color, fontWeight: 700, letterSpacing: 2, marginBottom: 6 }}>
              QUESTION {obStepGlobal + 1} / {ONBOARDING_QUESTIONS.length} ・ {ONBOARDING_QUESTIONS[obStepGlobal].theme}
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#2d2035", lineHeight: 1.5, marginBottom: 20 }}>
              {ONBOARDING_QUESTIONS[obStepGlobal].question}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
              {ONBOARDING_QUESTIONS[obStepGlobal].options.map(opt => {
                const qId = ONBOARDING_QUESTIONS[obStepGlobal].id;
                const isSel = obAnswersGlobal[qId] === opt.id;
                return (
                  <div
                    key={opt.id}
                    onClick={() => setObAnswersGlobal(a => ({ ...a, [qId]: opt.id }))}
                    style={{
                      background: isSel ? "white" : "rgba(255,255,255,0.7)",
                      border: `2px solid ${isSel ? ONBOARDING_QUESTIONS[obStepGlobal].color : "transparent"}`,
                      borderRadius: 14, padding: "12px 16px", cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 12, transition: "all 0.2s",
                    }}
                  >
                    <span style={{ fontSize: 22 }}>{opt.emoji}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#2d2035" }}>{opt.label}</span>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: "auto", display: "flex", gap: 12 }}>
              {obStepGlobal > 0 && (
                <button
                  onClick={() => setObStepGlobal(s => s - 1)}
                  style={{
                    padding: "12px 20px", borderRadius: 999, border: "none",
                    background: "rgba(0,0,0,0.06)", color: "#5a4a6a", fontWeight: 700,
                    fontSize: 14, cursor: "pointer",
                  }}
                >戻る</button>
              )}
              <button
                disabled={!obAnswersGlobal[ONBOARDING_QUESTIONS[obStepGlobal].id]}
                onClick={() => {
                  if (obStepGlobal < ONBOARDING_QUESTIONS.length - 1) {
                    setObStepGlobal(s => s + 1);
                  } else {
                    saveLS("onboarding_answers", obAnswersGlobal);
                    saveLS("onboarding_done", true);
                    setOnboardingDone(true);
                    setShowOnboarding(false);
                  }
                }}
                style={{
                  flex: 1, padding: "14px", borderRadius: 999, border: "none",
                  background: obAnswersGlobal[ONBOARDING_QUESTIONS[obStepGlobal].id]
                    ? ONBOARDING_QUESTIONS[obStepGlobal].color
                    : "#ccc",
                  color: "white", fontWeight: 700, fontSize: 15, cursor: "pointer",
                }}
              >
                {obStepGlobal < ONBOARDING_QUESTIONS.length - 1 ? "次へ進む ✦" : "器をひらく ✨"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── メインコンテンツ ── */}
      <main style={{ maxWidth: 440, margin: "0 auto", padding: "16px 16px 0" }}>

        {/* ════ TAB: HOME ════ */}
        {tab === "home" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* ① メインビジュアル */}
            <div style={{
              background: "linear-gradient(145deg, #ffffff 0%, #fbf9f5 100%)",
              border: `1px solid ${COLORS.goldLight}44`, borderRadius: 24, padding: "20px 20px 16px",
              textAlign: "center", position: "relative", overflow: "hidden",
              boxShadow: "0 8px 32px rgba(196,154,42,0.08)",
            }}>
              <Sparkles color={curLevel.color} count={15} />
              <div style={{ fontSize: 11, color: COLORS.mutedText, letterSpacing: 2, marginBottom: 4 }}>
                YOUR VESSEL OF ENERGY
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: COLORS.softWhite, marginBottom: 12 }}>
                {curLevel.emoji} {curLevel.label}
              </div>

              <VesselDisplay
                curLevel={curLevel}
                energy={energy}
                level={level}
                maxEnergy={nextLevel?.needed}
                nextLevel={nextLevel}
              />

              <div style={{ marginTop: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: COLORS.mutedText, marginBottom: 4 }}>
                  <span>累積エネルギー: {energy} pt</span>
                  <span>{nextLevel ? `次: Lv.${nextLevel.lv} (${nextLevel.needed}pt)` : "MAX LEVEL"}</span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: "#e8e0d5", overflow: "hidden" }}>
                  <div style={{
                    height: "100%", width: `${progressPct}%`,
                    background: `linear-gradient(90deg, ${COLORS.aquaTeal}, ${COLORS.goldLight})`,
                    borderRadius: 3, transition: "width 0.8s ease",
                  }} />
                </div>
              </div>
            </div>

            {/* ② キャッチコピー */}
            <div style={{
              background: "linear-gradient(135deg, #fffdf8, #fff9f0)",
              border: "1px solid #f0e6d2", borderRadius: 16, padding: "12px 16px",
              textAlign: "center", fontSize: 13, fontWeight: 600, color: COLORS.goldPrimary,
            }}>
              ✨ {CATCHCOPIES[Math.floor(Math.sin(energy + 1) * 1000) % CATCHCOPIES.length || 0]}
            </div>

            {/* ③ 1日のふりかえり */}
            <div
              onClick={handleComfortCheck}
              style={{
                background: lastComfortDate === new Date().toLocaleDateString("ja-JP")
                  ? "linear-gradient(135deg, #e0e8f0, #d8e0e8)"
                  : "linear-gradient(135deg, #2a9aaa, #3ab0c0)",
                borderRadius: 18, padding: "14px 18px", color: "white",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                cursor: lastComfortDate === new Date().toLocaleDateString("ja-JP") ? "default" : "pointer",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 26 }}>🦋</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800 }}>1日のふりかえり</div>
                  <div style={{ fontSize: 11, opacity: 0.9 }}>
                    {lastComfortDate === new Date().toLocaleDateString("ja-JP")
                      ? "本日のふりかえり完了（+10pt 獲得済み）"
                      : "今日、少し安全圏を超えられた？ (+10pt)"}
                  </div>
                </div>
              </div>
              <span style={{ fontSize: 18, fontWeight: 700 }}>
                {lastComfortDate === new Date().toLocaleDateString("ja-JP") ? "✓" : "✦"}
              </span>
            </div>

            {/* ④ メイン記録ボタン */}
            <button
              onClick={() => {
                resetInput();
                setShowInput(true);
              }}
              style={{
                width: "100%", padding: "16px", borderRadius: 20, border: "none",
                background: `linear-gradient(135deg, ${COLORS.goldPrimary}, ${COLORS.goldGlow})`,
                color: "#1a0a00", fontWeight: 800, fontSize: 16, cursor: "pointer",
                boxShadow: "0 8px 28px rgba(196,154,42,0.35)", letterSpacing: 1,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              <span>✨</span> 支出を循環エネルギーに変える
            </button>

            {/* ⑤ 才能ピース領域 */}
            <div style={{ background: "white", border: "1px solid #efe8dc", borderRadius: 20, padding: 18 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: COLORS.softWhite, display: "flex", alignItems: "center", gap: 6 }}>
                  <span>🧩</span> あなたの才能ピース
                </div>
                <div style={{ fontSize: 11, color: COLORS.mutedText }}>支出から自動収集</div>
              </div>

              {(() => {
                const DOMAINS = [
                  { label: "成長・学習", bar: "#3b82f6" },
                  { label: "創造・表現", bar: "#ec4899" },
                  { label: "つながり", bar: "#a855f7" },
                  { label: "安定・安心", bar: "#22c55e" },
                  { label: "貢献・利他", bar: "#f97316" },
                  { label: "個性・ワクワク", bar: "#eab308" },
                ];
                const domainCounts = {};
                DOMAINS.forEach(d => { domainCounts[d.label] = 0; });
                history.forEach(h => {
                  (h.valueTags || []).forEach(vt => {
                    const mapped = TALENT_TAG_MAP[vt]?.label;
                    if (mapped && domainCounts[mapped] !== undefined) {
                      domainCounts[mapped] += 1;
                    }
                  });
                });
                const maxCount = Math.max(...Object.values(domainCounts), 1);

                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {DOMAINS.map(d => {
                      const count = domainCounts[d.label] || 0;
                      return (
                        <div key={d.label}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                            <span style={{ fontWeight: 600, color: "#3a2a1a" }}>{d.label}</span>
                            <span style={{ color: COLORS.mutedText, fontWeight: 700 }}>{count} ピース</span>
                          </div>
                          <div style={{ height: 6, borderRadius: 3, background: "#f0ece4", overflow: "hidden" }}>
                            <div style={{
                              height: "100%", width: `${Math.min((count / maxCount) * 100, 100)}%`,
                              background: d.bar, borderRadius: 3, transition: "width 0.6s ease",
                            }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {level >= 5 && (
                <button
                  onClick={() => setShowTalentMatch(true)}
                  style={{
                    marginTop: 16, width: "100%", padding: "10px", borderRadius: 12,
                    background: "linear-gradient(135deg, #1a0a3a, #2a1a4a)",
                    border: "1px solid #ffd97a66", color: "#ffd97a", fontWeight: 700,
                    fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  }}
                >
                  <span>🧩</span> 才能パズル・診断を起動する
                </button>
              )}
            </div>

            {/* ⑥ 直近の記録 */}
            <div style={{ background: "white", border: "1px solid #efe8dc", borderRadius: 20, padding: 18 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: COLORS.softWhite }}>
                  直近のエネルギー循環
                </div>
                <button
                  onClick={() => setTab("history")}
                  style={{ background: "none", border: "none", color: COLORS.goldPrimary, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                >
                  すべて見る ›
                </button>
              </div>

              {history.length === 0 ? (
                <div style={{ textAlign: "center", padding: "24px 0", color: COLORS.mutedText, fontSize: 13 }}>
                  まだ記録がありません。<br />「支出を循環エネルギーに変える」から<br />1つ目の記録をつけてみましょう ✨
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {history.slice(0, 3).map(item => (
                    <div key={item.id} style={{
                      background: "#faf8f5", borderRadius: 12, padding: "10px 14px",
                      border: "1px solid #f0e8dc",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: COLORS.softWhite }}>{item.cat}</span>
                        <span style={{ fontSize: 11, color: COLORS.mutedText }}>{item.date}</span>
                      </div>
                      <div style={{ fontSize: 12, color: COLORS.lotusRose, fontWeight: 600, marginBottom: 4 }}>
                        {item.feeling} (+{item.energy}pt)
                      </div>
                      {item.ai && (
                        <div style={{ fontSize: 11, color: COLORS.mutedText, lineHeight: 1.5, borderLeft: `2px solid ${COLORS.goldLight}`, paddingLeft: 8 }}>
                          {item.ai}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* ════ TAB: HISTORY ════ */}
        {tab === "history" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: COLORS.softWhite }}>
                循環の記録
              </div>
              <div style={{ display: "flex", gap: 4, background: "#e8e0d5", padding: 3, borderRadius: 999 }}>
                <button
                  onClick={() => setCalendarView(true)}
                  style={{
                    padding: "4px 12px", borderRadius: 999, border: "none",
                    background: calendarView ? "white" : "transparent",
                    color: calendarView ? COLORS.softWhite : COLORS.mutedText,
                    fontWeight: 700, fontSize: 11, cursor: "pointer",
                  }}
                >カレンダー</button>
                <button
                  onClick={() => setCalendarView(false)}
                  style={{
                    padding: "4px 12px", borderRadius: 999, border: "none",
                    background: !calendarView ? "white" : "transparent",
                    color: !calendarView ? COLORS.softWhite : COLORS.mutedText,
                    fontWeight: 700, fontSize: 11, cursor: "pointer",
                  }}
                >リスト</button>
              </div>
            </div>

            {/* カレンダー表示 */}
            {calendarView && (() => {
              const { y, m } = calendarMonth;
              const firstDay = new Date(y, m, 1).getDay();
              const daysInMonth = new Date(y, m + 1, 0).getDate();

              const monthHistoryMap = {};
              history.forEach(item => {
                const itemDate = item.recordedAt ? new Date(item.recordedAt) : null;
                if (itemDate && itemDate.getFullYear() === y && itemDate.getMonth() === m) {
                  const d = itemDate.getDate();
                  if (!monthHistoryMap[d]) monthHistoryMap[d] = [];
                  monthHistoryMap[d].push(item);
                }
              });

              return (
                <div style={{ background: "white", border: "1px solid #efe8dc", borderRadius: 20, padding: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <button
                      onClick={() => setCalendarMonth(cm => ({ ...cm, m: cm.m === 0 ? 11 : cm.m - 1, y: cm.m === 0 ? cm.y - 1 : cm.y }))}
                      style={{ background: "none", border: "none", fontSize: 16, cursor: "pointer", color: COLORS.softWhite }}
                    >‹</button>
                    <div style={{ fontSize: 14, fontWeight: 800, color: COLORS.softWhite }}>
                      {y}年 {m + 1}月
                    </div>
                    <button
                      onClick={() => setCalendarMonth(cm => ({ ...cm, m: cm.m === 11 ? 0 : cm.m + 1, y: cm.m === 11 ? cm.y + 1 : cm.y }))}
                      style={{ background: "none", border: "none", fontSize: 16, cursor: "pointer", color: COLORS.softWhite }}
                    >›</button>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, textAlign: "center", fontSize: 11, color: COLORS.mutedText, marginBottom: 6 }}>
                    {["日", "月", "火", "水", "木", "金", "土"].map((d, i) => (
                      <div key={d} style={{ color: i === 0 ? "#e53e3e" : i === 6 ? "#3182ce" : COLORS.mutedText }}>{d}</div>
                    ))}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
                    {Array.from({ length: firstDay }).map((_, i) => (
                      <div key={`empty_${i}`} style={{ height: 42 }} />
                    ))}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                      const d = i + 1;
                      const items = monthHistoryMap[d] || [];
                      const hasItems = items.length > 0;
                      return (
                        <div
                          key={d}
                          onClick={() => {
                            if (hasItems) setCalendarSelected({ dateStr: `${m + 1}/${d}`, items });
                          }}
                          style={{
                            height: 42, borderRadius: 8, padding: 2,
                            background: hasItems ? "linear-gradient(135deg, #fffdf0, #fff8e0)" : "#faf8f5",
                            border: `1px solid ${hasItems ? COLORS.goldLight + "55" : "#f0e8dc"}`,
                            cursor: hasItems ? "pointer" : "default",
                            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between",
                          }}
                        >
                          <span style={{ fontSize: 10, fontWeight: hasItems ? 800 : 400, color: COLORS.softWhite }}>{d}</span>
                          {hasItems && (
                            <div style={{ display: "flex", gap: 2, marginBottom: 2 }}>
                              {items.slice(0, 3).map((_, idx) => (
                                <div key={idx} style={{ width: 4, height: 4, borderRadius: "50%", background: COLORS.goldPrimary }} />
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {calendarSelected && (
              <div style={{
                position: "fixed", inset: 0, zIndex: 400, background: "rgba(0,0,0,0.5)",
                display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
              }} onClick={() => setCalendarSelected(null)}>
                <div onClick={e => e.stopPropagation()} style={{
                  background: "white", borderRadius: 20, padding: 20, maxWidth: 360, width: "100%",
                  maxHeight: "80vh", overflowY: "auto",
                }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: COLORS.softWhite, marginBottom: 12 }}>
                    {calendarSelected.dateStr} の循環記録
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {calendarSelected.items.map(item => (
                      <div key={item.id} style={{ background: "#faf8f5", borderRadius: 12, padding: 12, border: "1px solid #f0e8dc" }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.softWhite, marginBottom: 2 }}>{item.cat}</div>
                        <div style={{ fontSize: 11, color: COLORS.lotusRose, fontWeight: 600, marginBottom: 4 }}>{item.feeling}</div>
                        {item.ai && <div style={{ fontSize: 11, color: COLORS.mutedText, lineHeight: 1.5 }}>{item.ai}</div>}
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => setCalendarSelected(null)}
                    style={{ marginTop: 16, width: "100%", padding: 10, borderRadius: 12, background: "#f0ece4", border: "none", color: COLORS.softWhite, fontWeight: 700, cursor: "pointer" }}
                  >閉じる</button>
                </div>
              </div>
            )}

            {!calendarView && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {history.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 0", color: COLORS.mutedText, fontSize: 13 }}>
                    まだ記録がありません。
                  </div>
                ) : (
                  history.map(item => (
                    <div key={item.id} style={{
                      background: "white", borderRadius: 16, padding: 16,
                      border: "1px solid #efe8dc", boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <span style={{ fontSize: 14, fontWeight: 800, color: COLORS.softWhite }}>{item.cat}</span>
                        <span style={{ fontSize: 11, color: COLORS.mutedText }}>{item.date}</span>
                      </div>
                      <div style={{ fontSize: 12, color: COLORS.lotusRose, fontWeight: 700, marginBottom: 6 }}>
                        {item.feeling} (+{item.energy}pt)
                      </div>
                      {item.ai && (
                        <div style={{
                          fontSize: 12, color: COLORS.softWhite, lineHeight: 1.6,
                          background: "#faf8f5", borderRadius: 10, padding: "8px 12px",
                          borderLeft: `3px solid ${COLORS.goldPrimary}`,
                        }}>
                          {item.ai}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* ════ TAB: MYPAGE ════ */}
        {tab === "mypage" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: COLORS.softWhite }}>
              マイページ
            </div>

            <div style={{ background: "white", border: "1px solid #efe8dc", borderRadius: 20, padding: 18 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: COLORS.softWhite, marginBottom: 12 }}>
                あなたの器ステータス
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={{ background: "#faf8f5", padding: 12, borderRadius: 12, textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: COLORS.mutedText }}>現在のレベル</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: COLORS.goldPrimary, marginTop: 2 }}>
                    Lv.{level} {curLevel.emoji}
                  </div>
                </div>
                <div style={{ background: "#faf8f5", padding: 12, borderRadius: 12, textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: COLORS.mutedText }}>累積エネルギー</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: COLORS.aquaTeal, marginTop: 2 }}>
                    {energy} pt
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setObStepGlobal(0);
                setShowOnboarding(true);
              }}
              style={{
                width: "100%", padding: 12, borderRadius: 14,
                background: "#f0ece4", border: "none", color: COLORS.softWhite,
                fontWeight: 700, fontSize: 13, cursor: "pointer",
              }}
            >
              📝 「5つの問い」を再回答する
            </button>
          </div>
        )}

      </main>

      {/* ── 記録入力モーダル ── */}
      {showInput && (
        <div
          onClick={() => { setShowInput(false); resetInput(); }}
          style={{
            position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.6)",
            display: "flex", alignItems: "flex-end", justifyContent: "center",
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "white", width: "100%", maxWidth: 440,
              borderTopLeftRadius: 28, borderTopRightRadius: 28,
              padding: "24px 20px 32px", maxHeight: "90vh", overflowY: "auto",
              animation: "slideUpIn 0.3s ease-out",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: COLORS.softWhite }}>
                {inputStep === "sub" && "① 支出のカテゴリを選択"}
                {inputStep === "feeling" && "② その時どんな気持ちだった？"}
                {inputStep === "time" && "③ 時間投資（複数選択可）"}
                {inputStep === "tags" && "④ 循環タグの選択"}
                {inputStep === "loading" && "分析中..."}
              </div>
              <button
                onClick={() => { setShowInput(false); resetInput(); }}
                style={{ background: "none", border: "none", fontSize: 20, color: COLORS.mutedText, cursor: "pointer" }}
              >×</button>
            </div>

            {inputStep === "sub" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {!selCat ? (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {CATEGORIES.map(cat => (
                      <div
                        key={cat.id}
                        onClick={() => setSelCat(cat)}
                        style={{
                          background: cat.iconBg, borderRadius: 16, padding: "14px 12px",
                          cursor: "pointer", display: "flex", alignItems: "center", gap: 10,
                          border: "1px solid rgba(0,0,0,0.05)",
                        }}
                      >
                        <span style={{ fontSize: 24 }}>{cat.icon}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.softWhite }}>{cat.label}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                      <button
                        onClick={() => setSelCat(null)}
                        style={{ background: "none", border: "none", color: COLORS.goldPrimary, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                      >‹ 戻る</button>
                      <span style={{ fontSize: 14, fontWeight: 800 }}>{selCat.icon} {selCat.label}</span>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {selCat.sub.map(sub => (
                        <div key={sub}>
                          <div
                            onClick={() => {
                              setSelSubCat(sub);
                              if (sub !== "その他") setInputStep("feeling");
                            }}
                            style={{
                              background: selSubCat === sub ? "#f0e6ff" : "#faf8f5",
                              border: `1.5px solid ${selSubCat === sub ? "#9b72cf" : "#f0e8dc"}`,
                              borderRadius: 12, padding: "12px 16px", fontSize: 13, fontWeight: 600,
                              cursor: "pointer", color: COLORS.softWhite,
                            }}
                          >
                            {sub}
                          </div>
                          {sub === "その他" && selSubCat === "その他" && (
                            <OtherSubInput
                              value={otherSubText}
                              onChange={(v) => setOtherSubText(v)}
                              onSubmit={(v) => {
                                setOtherSubText(v);
                                setInputStep("feeling");
                              }}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {inputStep === "feeling" && (
              <div>
                <div style={{ marginBottom: 20 }}>
                  <EmotionSliderEnhanced value={sliderVal} onChange={(v) => setSliderVal(v)} />
                </div>

                <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.softWhite, marginBottom: 10 }}>
                  主な感情を選択
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20 }}>
                  {FEELINGS.map(f => (
                    <div
                      key={f.id}
                      onClick={() => setSelFeeling(f)}
                      style={{
                        background: selFeeling?.id === f.id ? "linear-gradient(135deg, #fffdf0, #fff8e0)" : "#faf8f5",
                        border: `1.5px solid ${selFeeling?.id === f.id ? COLORS.goldPrimary : "#f0e8dc"}`,
                        borderRadius: 12, padding: "10px 12px", cursor: "pointer",
                        display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600,
                      }}
                    >
                      <span>{f.icon}</span>
                      <span>{f.label}</span>
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={() => setInputStep("sub")}
                    style={{ padding: "12px 20px", borderRadius: 999, border: "none", background: "#f0ece4", color: COLORS.softWhite, fontWeight: 700, cursor: "pointer" }}
                  >戻る</button>
                  <button
                    disabled={!selFeeling}
                    onClick={() => setInputStep("time")}
                    style={{
                      flex: 1, padding: "12px", borderRadius: 999, border: "none",
                      background: selFeeling ? COLORS.goldPrimary : "#ccc",
                      color: "white", fontWeight: 700, fontSize: 14, cursor: "pointer",
                    }}
                  >次へ ✦</button>
                </div>
              </div>
            )}

            {inputStep === "time" && (
              <div>
                <div style={{ fontSize: 12, color: COLORS.mutedText, marginBottom: 12, lineHeight: 1.5 }}>
                  時間を生み出す・短縮するための支出でしたか？（複数選択可、該当がなければそのまま次へ）
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                  {[
                    "タクシー移動", "時短家電", "出前・ネットスーパー",
                    "プロへ外注・クラウドソーシング", "AIツールの有料プラン",
                    "有料特急・グリーン車", "気分転換にビジネスホテル一泊"
                  ].map(item => {
                    const isSel = selTimeInvest.includes(item);
                    return (
                      <div
                        key={item}
                        onClick={() => {
                          setSelTimeInvest(prev =>
                            prev.includes(item) ? prev.filter(x => x !== item) : [...prev, item]
                          );
                        }}
                        style={{
                          background: isSel ? "#e0f4f8" : "#faf8f5",
                          border: `1.5px solid ${isSel ? COLORS.aquaTeal : "#f0e8dc"}`,
                          borderRadius: 12, padding: "10px 14px", cursor: "pointer",
                          fontSize: 13, fontWeight: 600, color: COLORS.softWhite,
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                        }}
                      >
                        <span>⏱ {item}</span>
                        <span>{isSel ? "✓" : "+"}</span>
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={() => setInputStep("feeling")}
                    style={{ padding: "12px 20px", borderRadius: 999, border: "none", background: "#f0ece4", color: COLORS.softWhite, fontWeight: 700, cursor: "pointer" }}
                  >戻る</button>
                  <button
                    onClick={() => setInputStep("tags")}
                    style={{
                      flex: 1, padding: "12px", borderRadius: 999, border: "none",
                      background: COLORS.goldPrimary, color: "white", fontWeight: 700,
                      fontSize: 14, cursor: "pointer",
                    }}
                  >次へ ✦</button>
                </div>
              </div>
            )}

            {inputStep === "tags" && (
              <div>
                <div style={{ fontSize: 12, color: COLORS.mutedText, marginBottom: 12 }}>
                  当てはまるものがあれば選択してください
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
                  {CIRCULATION_TAGS.map(t => {
                    const isSel = selTags.includes(t.id);
                    return (
                      <div
                        key={t.id}
                        onClick={() => toggleTag(t.id)}
                        style={{
                          background: isSel ? "linear-gradient(135deg, #e0f4f8, #d8f0f5)" : "#faf8f5",
                          border: `1.5px solid ${isSel ? COLORS.aquaTeal : "#f0e8dc"}`,
                          borderRadius: 999, padding: "6px 14px", cursor: "pointer",
                          fontSize: 12, fontWeight: 600, color: isSel ? COLORS.aquaTeal : COLORS.softWhite,
                          display: "flex", alignItems: "center", gap: 6,
                        }}
                      >
                        <span>{t.icon}</span>
                        <span>{t.label}</span>
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={() => setInputStep("time")}
                    style={{ padding: "12px 20px", borderRadius: 999, border: "none", background: "#f0ece4", color: COLORS.softWhite, fontWeight: 700, cursor: "pointer" }}
                  >戻る</button>
                  <button
                    onClick={runAI}
                    style={{
                      flex: 1, padding: "14px", borderRadius: 999, border: "none",
                      background: `linear-gradient(135deg, ${COLORS.goldPrimary}, ${COLORS.goldGlow})`,
                      color: "#1a0a00", fontWeight: 800, fontSize: 15, cursor: "pointer",
                      boxShadow: "0 6px 20px rgba(196,154,42,0.3)",
                    }}
                  >
                    循環エネルギーを解析 ✨
                  </button>
                </div>
              </div>
            )}

            {inputStep === "loading" && (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <div style={{ fontSize: 36, marginBottom: 12, animation: "bounceIn 1s infinite" }}>✦</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.softWhite, marginBottom: 6 }}>
                  あなたの支出の循環エネルギーを解析中...
                </div>
                <div style={{ fontSize: 12, color: COLORS.mutedText }}>
                  才能のピースを紡ぎ出しています
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ── AI解析結果 ── */}
      {inputStep === "result" && aiResult && (
        <AIResultCard
          result={aiResult}
          onClose={() => {
            setAiResult(null);
            setShowInput(false);
            resetInput();
          }}
          onCloseToHome={() => {
            setAiResult(null);
            setShowInput(false);
            resetInput();
            setTab("home");
          }}
        />
      )}

      {/* ── ナビゲーション ── */}
      <nav style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 90,
        background: "rgba(255,255,255,0.9)", backdropFilter: "blur(12px)",
        borderTop: "1px solid rgba(196,154,42,0.15)",
        display: "flex", justifyContent: "space-around", padding: "8px 0 16px",
      }}>
        {[
          { id: "home", label: "ホーム", icon: "🏠" },
          { id: "history", label: "循環の記録", icon: "📖" },
          { id: "mypage", label: "マイページ", icon: "🧩" },
        ].map(n => {
          const isActive = tab === n.id;
          return (
            <button
              key={n.id}
              onClick={() => setTab(n.id)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                color: isActive ? COLORS.goldPrimary : COLORS.mutedText,
              }}
            >
              <span style={{ fontSize: 20 }}>{n.icon}</span>
              <span style={{ fontSize: 10, fontWeight: isActive ? 800 : 500 }}>{n.label}</span>
            </button>
          );
        })}
      </nav>

      {/* アニメーションCSS */}
      <style>{`
        @keyframes waveFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        @keyframes sparkleFloat {
          0% { opacity: 0; transform: translateY(0) scale(0.6); }
          50% { opacity: 1; transform: translateY(-10px) scale(1.1); }
          100% { opacity: 0; transform: translateY(-20px) scale(0.6); }
        }
        @keyframes slideUpIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideDownIn {
          from { opacity: 0; transform: translate(-50%, -20px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        @keyframes bounceIn {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.08); opacity: 1; }
          75% { transform: scale(0.95); }
          100% { transform: scale(1); }
        }
        @keyframes fadeInOut {
          0% { opacity: 0; }
          30% { opacity: 1; }
          70% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}