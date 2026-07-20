// @ts-nocheck
import React, { useState, useEffect, useRef, useCallback } from "react";

const FIVE5_IMG = "/images/five5.png";
const FIVE5B_IMG = "/images/five5b.png";

// ─── localStorage 永続化ヘルパー ──────────────────────────────
function loadLS(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v !== null ? JSON.parse(v) : fallback;
  } catch { return fallback; }
}
function saveLS(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

// ─── インメモリ StorageService（Artifact用）──────────────────
const memoryStore = {
  user: null,
  history: null,
  stats: null,
};

const StorageService = {
  saveUser(data)    { memoryStore.user = data; },
  loadUser()        { return memoryStore.user; },
  saveHistory(h)    { memoryStore.history = h; },
  loadHistory()     { return memoryStore.history; },
  saveStats(s)      { memoryStore.stats = s; },
  loadStats()       { return memoryStore.stats; },
  clearAll()        { memoryStore.user = null; memoryStore.history = null; memoryStore.stats = null; },

  updateStats(existingStats, newEntry) {
    const stats = existingStats || { tagStats: {}, categoryStats: {}, valueTagStats: {}, totalRecords: 0, totalEnergy: 0 };
    (newEntry.tags || []).forEach(tagId => {
      if (!stats.tagStats[tagId]) stats.tagStats[tagId] = { count: 0, totalEnergy: 0, lastUsed: null };
      stats.tagStats[tagId].count += 1;
      stats.tagStats[tagId].totalEnergy += newEntry.energy || 0;
      stats.tagStats[tagId].lastUsed = newEntry.date;
    });
    if (!stats.valueTagStats) stats.valueTagStats = {};
    (newEntry.valueTags || []).forEach(vtag => {
      stats.valueTagStats[vtag] = (stats.valueTagStats[vtag] || 0) + 1;
    });
    const catKey = newEntry.cat || "unknown";
    if (!stats.categoryStats[catKey]) stats.categoryStats[catKey] = { count: 0, totalEnergy: 0 };
    stats.categoryStats[catKey].count += 1;
    stats.categoryStats[catKey].totalEnergy += newEntry.energy || 0;
    stats.totalRecords += 1;
    stats.totalEnergy += newEntry.energy || 0;
    return stats;
  },
};

// ─── キャッチコピー集 ──────────────────────────────────────────
// ─── 5つの問い QUESTIONS ──────────────────────────────────────
const ONBOARDING_QUESTIONS = [
  {
    id: "q1", theme: "過去の未練",
    question: "過去、お金を理由にあきらめたことは？",
    color: "#8a7ca8", bg: "linear-gradient(135deg, #f5f0ff, #ede8ff)",
    options: [
      { id: "travel",    label: "世界を見る",                    sub: "旅行・留学・異文化交流",        emoji: "✈️" },
      { id: "learn",     label: "スクール・講座など有料学び体験", sub: "有料には抵抗があった",           emoji: "📚" },
      { id: "challenge", label: "挑戦・起業・副業",              sub: "自分には無理だと感じた",         emoji: "🚀" },
      { id: "create",    label: "表現・創作活動",                sub: "絵・音楽・執筆",                 emoji: "🎨" },
      { id: "fashion",   label: "欲しかった服",                  sub: "安くなるまで待とう",             emoji: "👗" },
      { id: "wander",    label: "目的のない旅",                  sub: "特別な理由がないともったいない", emoji: "🗺️" },
      { id: "life",      label: "理想の暮らし",                  sub: "引っ越し・部屋づくり",           emoji: "🏠" },
      { id: "other",     label: "その他",                        sub: "自由に入力する",                 emoji: "✏️", freeInput: true },
    ],
  },
  {
    id: "q2", theme: "現在の情熱",
    question: "なんとなく興味あること、気になることは？",
    color: "#c07fb0", bg: "linear-gradient(135deg, #fff0f8, #ffe8f4)",
    options: [
      { id: "people",  label: "オンラインサロン・推し活",   emoji: "💝" },
      { id: "biz",     label: "起業・副業・お金",   emoji: "💰" },
      { id: "create",  label: "AI・創作・SNS発信",          emoji: "✨" },
      { id: "health",  label: "健康・化粧品・マッサージ",   emoji: "🌿" },
      { id: "spirit",  label: "哲学・スピリチュアル",       emoji: "🔮" },
      { id: "talent",  label: "自分の才能を知りたい",       emoji: "🧩" },
      { id: "hobby",   label: "ゲーム・漫画・エンタメ",     emoji: "🎮" },
      { id: "other",   label: "その他", sub: "自由に入力する", emoji: "✏️", freeInput: true },
    ],
  },
  {
    id: "q3", theme: "未来の挑戦",
    question: "少し怖いけど、挑戦してみたいことは？",
    color: "#4db8c8", bg: "linear-gradient(135deg, #f0f8ff, #e8f4ff)",
    options: [
      { id: "publish",  label: "SNS・note・youtubeを発信する",          emoji: "🎤" },
      { id: "jump",     label: "転職する・副業をはじめる",               emoji: "🦋" },
      { id: "invest",   label: "有料コンテンツを購入し学ぶ",             emoji: "📖" },
      { id: "support",  label: "クラウドファンディングを主催し応援する", emoji: "💛" },
      { id: "event",    label: "有料本気イベントを主催する",             emoji: "🎪" },
      { id: "stock",    label: "投資を始める",                           emoji: "📈" },
      { id: "app",      label: "アプリ・作品を世に出す",                 emoji: "🚀" },
      { id: "other",    label: "その他", sub: "自由に入力する", emoji: "✏️", freeInput: true },
    ],
  },
  {
    id: "q4", theme: "価値観の棚卸し",
    question: "今までお金を使って一番よかったことは？",
    color: "#d4a843", bg: "linear-gradient(135deg, #fffbf0, #fff4e0)",
    options: [
      { id: "self",    label: "自分への投資",           sub: "学び・体験・挑戦",               emoji: "🌱" },
      { id: "gift",    label: "クラウドファンディング・寄付",                                    emoji: "🎁" },
      { id: "env",     label: "理想の暮らしへの奮発",   sub: "家賃・家具・ガジェット",         emoji: "🏠" },
      { id: "memory",  label: "旅行",                   sub: "海外・聖地巡礼・温泉 etc.",      emoji: "📸" },
      { id: "salon",   label: "オンラインサロン",        sub: "ここだけの話が聞けた",           emoji: "💬" },
      { id: "art",     label: "アート・宝石・装飾品",   sub: "豊かな気分を味わった",           emoji: "💎" },
      { id: "time",    label: "時間",                   sub: "プロに任せて自由な時間を増やせた", emoji: "⏳" },
      { id: "other",   label: "その他", sub: "自由に入力する", emoji: "✏️", freeInput: true },
    ],
  },
  {
    id: "q5", theme: "究極の選択",
    question: "今日中に使いきらないと消える\n300万円、何に使う？\n（形あるものは消える。貯蓄も消える）",
    color: "#c49a2a", bg: "linear-gradient(135deg, #fffdf0, #fff8e0)",
    options: [
      { id: "adventure", label: "ファーストクラスで移動→超高級ホテル",   emoji: "🌍" },
      { id: "learn",     label: "超一流に起業コンサルティング依頼",       emoji: "🎓" },
      { id: "give",      label: "推しに投げ銭",                           emoji: "💌" },
      { id: "env",       label: "ドームを貸し切りにして遊ぶ",             emoji: "✨" },
      { id: "social",    label: "全部寄付して徳を積む",                   emoji: "🌸" },
      { id: "food",      label: "世界最高峰の食体験",                     emoji: "🍽️" },
      { id: "heli",      label: "ヘリをチャーターして夜景クルーズ",       emoji: "🚁" },
      { id: "other",     label: "その他", sub: "自由に入力する", emoji: "✏️", freeInput: true },
    ],
  },
];

const CATCHCOPIES = [
  "節約より、循環。",
  "お金は、流れでできている。",
  "豊かさは流れを止めない人のもとに集まる。",
  "使うことを怖がるたび、エネルギーの流れは小さくなる。",
  "心地よく使ったお金は、あなたのコンフォートゾーンを広げる。",
  "記録するのは残高ではなく、あなたのエネルギー循環。",
  "逆説的に、使うほど、人は豊かさを受け取れるようになる。",
  "使う。育つ。",
  "節約ではなく、循環へ。",
  "あなたの器は、もっと大きくなれる。",
  "支出を、才能に変える。",
  "逆説的に、豊かさは使うことで育つ。",
  "お金の流れは、人生の流れ。",
  "お金は、ただの数字ではない。あなたの選択であり、感情であり、エネルギーだ。",
  "豊かさは縮こまった人には流れ込まない。",
  "使う。循環する。広がる。",
  "お金は、エネルギー。",
  "流れを、止めない。",
  "循環するほど、器は広がる。",
  "使う。巡る。育つ。",
  "豊かさは、循環から始まる。",
  "支出を、エネルギーに変える。",
  "あなたのお金は、流れているか。",
  "エネルギーは、動かした人に流れ込む。",
  "逆説的に、流した人ほど豊かになる。",
  "流れが見えると、人生は変わる。",
  "見るのは残高ではない。流れだ。",
  "お金の循環を、デザインする。",
  "支出を、器を育てる行為へ変える。",
  "あなたの当たり前は、誰かにとっての才能かもしれない。",
  "普通が、誰かの助けになる。",
  "得意は、無意識の中にある。",
  "あなたにとって簡単なことほど、価値になる。",
  "才能は、特別な人のものじゃない。",
  "小さな得意が、世界を動かす。",
  "器は、循環で育つ。",
  "流れのいい人生へ。",
  "お金を、巡らせる。",
  "循環する人は、拡張する。",
  "支出は、未来へのエネルギー。",
];

const COLORS = {
  deepNight: "#ffffff",
  midnightBlue: "#f8f6f1",
  indigoDeep: "#f0ede6",
  goldPrimary: "#c49a2a",
  goldLight: "#d4a843",
  goldGlow: "#e8b84b",
  lotusRose: "#b06a9a",
  lotusLight: "#c07fb0",
  aquaTeal: "#2a9aaa",
  aquaLight: "#3ab0c0",
  pearlWhite: "#4a3f2f",
  softWhite: "#2a2010",
  mutedText: "#8a7a6a",
  circleBlue: "#e0d8cc",
};

const LEVELS = [
  { lv: 1, label: "小さな器", needed: 0, color: "#6a7ca8", emoji: "🫙" },
  { lv: 2, label: "育ち始めた器", needed: 150, color: "#4db8c8", emoji: "🪴" },
  { lv: 3, label: "広がる器", needed: 400, color: "#d4a843", emoji: "✨" },
  { lv: 4, label: "豊かな器", needed: 900, color: "#c07fb0", emoji: "🌸" },
  { lv: 5, label: "循環する器", needed: 2000, color: "#ffd97a", emoji: "🌟" },
];

const CATEGORIES = [
  { id: "jiko", label: "自己投資", icon: "📚", iconBg: "#e8e0f8", sub: ["本・電子書籍・音声アプリ", "講座・セミナー・ワークショップ", "資格・副業・スキル習得", "オンラインサロン新規登録", "挑戦への投資", "株・投資信託", "カウンセリング・コーチング", "その他"] },
  { id: "health", label: "健康・美容", icon: "🌿", iconBg: "#e0f4e8", sub: ["医療・治療・整体", "スキンケア・サプリ", "ジム・フィットネス", "サウナ", "アロマ・お香・ディフューザー", "マットレス・枕", "ヘアサロン", "その他"] },
  { id: "taiken", label: "体験・思い出", icon: "🎈", iconBg: "#fff0e0", sub: ["旅行・聖地巡礼", "イベント参加", "ライブ・観劇", "体験ワークショップ", "アウトドア", "美術館・博物館", "映画", "その他"] },
  { id: "hito", label: "人とのつながり", icon: "💝", iconBg: "#ffe8f0", sub: ["プレゼント", "クラウドファンディング", "家族や友人との外食", "お祝・お礼", "季節イベント（花見・紅葉・初詣など）", "交流会", "お土産", "その他"] },
  { id: "kurashi", label: "暮らしを整える", icon: "🏠", iconBg: "#ffe8d8", sub: ["調理家電・包丁・フライパン", "デスク周り・収納用品", "インテリア・観葉植物", "ロボット掃除機", "家具", "食器・保存容器", "引っ越し・リフォーム", "その他"] },
  { id: "tanoshimi", label: "楽しみ・ごほうび", icon: "🎁", iconBg: "#fff0cc", sub: ["推し活", "リラクゼーション", "グルメ・スイーツ", "ファッション・コスメ・アクセサリー", "エンタメ・ゲーム・漫画", "入浴剤", "文房具", "その他"] },
  { id: "shakai", label: "社会貢献・応援", icon: "🌍", iconBg: "#e0f0ff", sub: ["クラウドファンディング", "寄付", "災害支援", "祭り・町おこし", "クリエイター支援・投げ銭", "子ども食堂", "動物支援", "その他"] },
  { id: "hitsuyou", label: "必要な支出", icon: "¥", iconBg: "#e8e8e8", sub: ["光熱費・通信費", "食費", "日用品", "交通費", "税金", "家賃・住居費", "保険・医療・薬", "その他"] },
];

// ── 30個の価値タグ体系（PDFより）────────────────────────────────
// 成長: 学習・知識・成長・挑戦・探究・スキル・専門性
// 創造: 創造・発想・表現・企画・開発
// つながり: 共感・協力・仲間・出会い・感謝・信頼
// 安定: 健康・安心・整理・継続・自己管理・快適
// 貢献: 応援・貢献・育成・支援・社会性・利他
// 個性: 自由・好奇心・ワクワク・冒険・癒し

const VALUE_TAG_MAP = {
  // 自己投資
  "本・電子書籍・音声アプリ":    ["学習", "知識", "探究"],
  "講座・セミナー・ワークショップ": ["学習", "スキル", "成長"],
  "資格・副業・スキル習得":        ["スキル", "専門性", "挑戦"],
  "オンラインサロン新規登録":      ["出会い", "仲間", "成長"],
  "挑戦への投資":                  ["挑戦", "成長", "冒険"],
  "株・投資信託":                  ["知識", "自己管理", "継続"],
  "カウンセリング・コーチング":    ["成長", "探究", "自己管理"],
  // 健康・美容
  "医療・治療・整体":           ["健康", "安心", "継続"],
  "スキンケア・サプリ":         ["健康", "自己管理", "快適"],
  "ジム・フィットネス":         ["健康", "継続", "自己管理"],
  "サウナ":                     ["癒し", "健康", "安心"],
  "アロマ・お香・ディフューザー": ["癒し", "快適", "安心"],
  "マットレス・枕":             ["健康", "快適", "継続"],
  "ヘアサロン":                 ["表現", "快適", "癒し"],
  "ヨガ":                 ["健康", "癒し", "自己管理"],
  "整体":                 ["健康", "癒し", "安心"],
  "人間ドック":           ["健康", "安心", "自己管理"],
  "歯科検診":             ["健康", "継続", "安心"],
  "美容院":               ["表現", "快適", "癒し"],
  "化粧品":               ["表現", "快適", "自由"],
  "マッサージ":           ["癒し", "健康", "安心"],
  // 体験・思い出
  "旅行・聖地巡礼":     ["冒険", "好奇心", "自由"],
  "イベント参加":       ["ワクワク", "共感", "出会い"],
  "ライブ・観劇":       ["ワクワク", "感謝", "共感"],
  "体験ワークショップ": ["探究", "創造", "好奇心"],
  "アウトドア":         ["冒険", "自由", "健康"],
  "美術館・博物館":     ["発想", "好奇心", "表現"],
  "映画":               ["発想", "ワクワク", "感謝"],
  "旅行":                 ["冒険", "好奇心", "自由"],
  "温泉":                 ["癒し", "健康", "自由"],
  "美術館":               ["発想", "好奇心", "表現"],
  "コンサート":           ["ワクワク", "感謝", "共感"],
  "ワークショップ":       ["探究", "創造", "出会い"],
  "テーマパーク":         ["ワクワク", "冒険", "自由"],
  "キャンプ":             ["冒険", "自由", "協力"],
  "観劇":                 ["発想", "感謝", "表現"],
  // 人とのつながり
  "プレゼント":                         ["感謝", "共感", "育成"],
  "人とのつながり_クラウドファンディング": ["応援", "共感", "育成"],
  "家族や友人との外食":                 ["仲間", "出会い", "感謝"],
  "お祝・お礼":                         ["感謝", "共感", "信頼"],
  "季節イベント（花見・紅葉・初詣など）": ["仲間", "感謝", "ワクワク"],
  "交流会":                             ["出会い", "協力", "仲間"],
  "お土産":                             ["感謝", "共感", "仲間"],
  "家族との食事":         ["仲間", "感謝", "安心"],
  "友人との食事":         ["仲間", "出会い", "信頼"],
  "デート":               ["共感", "感謝", "自由"],
  "お祝い":               ["感謝", "育成", "共感"],
  "コミュニティ会費":     ["仲間", "協力", "信頼"],
  "帰省費用":             ["感謝", "仲間", "安心"],
  // 暮らしを整える
  "調理家電・包丁・フライパン": ["快適", "健康", "継続"],
  "デスク周り・収納用品":       ["整理", "快適", "自己管理"],
  "インテリア・観葉植物":       ["快適", "表現", "安心"],
  "ロボット掃除機":             ["整理", "快適", "継続"],
  "家具":                       ["快適", "整理", "安心"],
  "食器・保存容器":             ["快適", "健康", "継続"],
  "引っ越し・リフォーム":       ["安心", "自由", "快適"],
  "ベッド":               ["健康", "快適", "安心"],
  "デスク":               ["整理", "快適", "自己管理"],
  "椅子":                 ["快適", "健康", "継続"],
  "家電":                 ["快適", "継続", "整理"],
  "収納用品":             ["整理", "快適", "安心"],
  "防災用品":             ["安心", "継続", "自己管理"],
  "掃除用品":             ["整理", "快適", "継続"],
  "照明":                 ["快適", "表現", "安心"],
  // 楽しみ・ごほうび
  "推し活":               ["ワクワク", "応援", "共感"],
  "リラクゼーション":     ["癒し", "健康", "安心"],
  "グルメ・スイーツ":     ["ワクワク", "癒し", "感謝"],
  "ファッション・コスメ・アクセサリー": ["表現", "自由", "ワクワク"],
  "エンタメ・ゲーム・漫画":     ["ワクワク", "好奇心", "癒し"],
  "入浴剤":               ["癒し", "快適", "安心"],
  "文房具":               ["創造", "ワクワク", "自己管理"],
  "スイーツ":             ["癒し", "ワクワク", "感謝"],
  "カフェ":               ["癒し", "発想", "自由"],
  "映画":                 ["発想", "ワクワク", "感謝"],
  "ゲーム":               ["ワクワク", "好奇心", "癒し"],
  "推し活":               ["ワクワク", "応援", "共感"],
  "趣味用品":             ["ワクワク", "表現", "好奇心"],
  "お酒":                 ["仲間", "癒し", "自由"],
  "外食":                 ["ワクワク", "感謝", "癒し"],
  // 社会貢献・応援
  "社会貢献・応援_クラウドファンディング": ["応援", "共感", "貢献"],
  "寄付":                       ["貢献", "利他", "社会性"],
  "災害支援":                   ["利他", "貢献", "社会性"],
  "祭り・町おこし":             ["貢献", "仲間", "社会性"],
  "クリエイター支援・投げ銭":   ["応援", "共感", "育成"],
  "子ども食堂":                 ["利他", "貢献", "育成"],
  "動物支援":                   ["利他", "貢献", "共感"],
  "神社への奉納":         ["感謝", "貢献", "安心"],
  "保護猫支援":           ["利他", "貢献", "共感"],
  "被災地支援":           ["利他", "貢献", "社会性"],
  "NPO支援":              ["社会性", "貢献", "育成"],
  // 必要な支出
  "光熱費・通信費":   ["安心", "継続", "自己管理"],
  "食費":             ["健康", "継続", "安心"],
  "日用品":           ["快適", "継続", "安心"],
  "交通費":           ["継続", "安心", "自由"],
  "税金":             ["社会性", "貢献", "継続"],
  "家賃・住居費":     ["安心", "継続", "自己管理"],
  "保険・医療・薬":   ["健康", "安心", "継続"],
  "家賃":                 ["安心", "継続", "自己管理"],
  "食費":                 ["健康", "継続", "安心"],
  "光熱費":               ["安心", "継続", "自己管理"],
  "通信費":               ["継続", "安心", "協力"],
  "保険":                 ["安心", "継続", "自己管理"],
  "医療費":               ["健康", "安心", "継続"],
  "税金":                 ["社会性", "貢献", "継続"],
  "交通費":               ["継続", "安心", "自由"],
  // 時間投資
  "タクシー":                       ["自己管理", "継続", "快適"],
  "時短家電":                       ["整理", "自己管理", "継続"],
  "出前・ネットスーパー":            ["快適", "継続", "安心"],
  "プロへ外注・クラウドソーシング":  ["挑戦", "成長", "協力"],
  "AIツールの有料プラン":            ["挑戦", "成長", "スキル"],
  "有料特急・グリーン車":            ["快適", "継続", "安心"],
  "気分転換にビジネスホテル一泊":    ["癒し", "自己管理", "安心"],
};

// 「その他」などマッピングが見つからない場合の、大カテゴリ単位フォールバック
const CATEGORY_FALLBACK_TAGS = {
  "自己投資": ["挑戦", "成長"],
  "健康・美容": ["癒し", "自己管理"],
  "体験・思い出": ["挑戦", "感動"],
  "人とのつながり": ["感謝", "つながり"],
  "暮らしを整える": ["快適", "安心"],
  "楽しみ・ごほうび": ["癒し", "自分らしさ"],
  "社会貢献・応援": ["感謝", "協力"],
  "必要な支出": ["安心", "継続"],
};

function getValueTags(catLabel, subCatLabel) {
  const compositeKey = `${catLabel}_${subCatLabel}`;
  const simpleKey = subCatLabel || catLabel;
  const found = VALUE_TAG_MAP[compositeKey] || VALUE_TAG_MAP[simpleKey];
  if (found) return found;
  return CATEGORY_FALLBACK_TAGS[catLabel] || [];
}

// ── 才能ピース（パズル）の領域別カラーマップ ───────────────────
// ホーム画面の「あなたの才能ピース」やトースト表示など、
// 価値タグ→才能領域の色付けで共通利用する
const TALENT_TAG_MAP = {
  // 成長系
  "学習":   { label: "成長・学習",   color: "#dbeafe", bar: "#3b82f6" },
  "知識":   { label: "成長・学習",   color: "#dbeafe", bar: "#3b82f6" },
  "成長":   { label: "成長・学習",   color: "#dbeafe", bar: "#3b82f6" },
  "挑戦":   { label: "成長・学習",   color: "#dbeafe", bar: "#3b82f6" },
  "探究":   { label: "成長・学習",   color: "#dbeafe", bar: "#3b82f6" },
  "スキル": { label: "成長・学習",   color: "#dbeafe", bar: "#3b82f6" },
  "専門性": { label: "成長・学習",   color: "#dbeafe", bar: "#3b82f6" },
  // 創造系
  "創造":   { label: "創造・表現",   color: "#fce7f3", bar: "#ec4899" },
  "発想":   { label: "創造・表現",   color: "#fce7f3", bar: "#ec4899" },
  "表現":   { label: "創造・表現",   color: "#fce7f3", bar: "#ec4899" },
  "企画":   { label: "創造・表現",   color: "#fce7f3", bar: "#ec4899" },
  "開発":   { label: "創造・表現",   color: "#fce7f3", bar: "#ec4899" },
  // つながり系
  "共感":   { label: "つながり",     color: "#fdf4ff", bar: "#a855f7" },
  "協力":   { label: "つながり",     color: "#fdf4ff", bar: "#a855f7" },
  "仲間":   { label: "つながり",     color: "#fdf4ff", bar: "#a855f7" },
  "出会い": { label: "つながり",     color: "#fdf4ff", bar: "#a855f7" },
  "感謝":   { label: "つながり",     color: "#fdf4ff", bar: "#a855f7" },
  "信頼":   { label: "つながり",     color: "#fdf4ff", bar: "#a855f7" },
  // 安定系
  "健康":   { label: "安定・安心",   color: "#dcfce7", bar: "#22c55e" },
  "安心":   { label: "安定・安心",   color: "#dcfce7", bar: "#22c55e" },
  "整理":   { label: "安定・安心",   color: "#dcfce7", bar: "#22c55e" },
  "継続":   { label: "安定・安心",   color: "#dcfce7", bar: "#22c55e" },
  "自己管理":{ label: "安定・安心",  color: "#dcfce7", bar: "#22c55e" },
  "快適":   { label: "安定・安心",   color: "#dcfce7", bar: "#22c55e" },
  // 貢献系
  "応援":   { label: "貢献・利他",   color: "#fff7ed", bar: "#f97316" },
  "貢献":   { label: "貢献・利他",   color: "#fff7ed", bar: "#f97316" },
  "育成":   { label: "貢献・利他",   color: "#fff7ed", bar: "#f97316" },
  "支援":   { label: "貢献・利他",   color: "#fff7ed", bar: "#f97316" },
  "社会性": { label: "貢献・利他",   color: "#fff7ed", bar: "#f97316" },
  "利他":   { label: "貢献・利他",   color: "#fff7ed", bar: "#f97316" },
  // 個性系
  "自由":   { label: "個性・ワクワク", color: "#fefce8", bar: "#eab308" },
  "好奇心": { label: "個性・ワクワク", color: "#fefce8", bar: "#eab308" },
  "ワクワク":{ label: "個性・ワクワク", color: "#fefce8", bar: "#eab308" },
  "冒険":   { label: "個性・ワクワク", color: "#fefce8", bar: "#eab308" },
  "癒し":   { label: "個性・ワクワク", color: "#fefce8", bar: "#eab308" },
};

function getTalentColor(tag) {
  return TALENT_TAG_MAP[tag]?.bar || "#c49a2a";
}

const FEELINGS = [
  { id: "waku", label: "ワクワクした", icon: "✨", energy: true },
  { id: "shiawase", label: "満たされた・幸せ", icon: "💛", energy: true },
  { id: "relax", label: "リラックス・癒し", icon: "🍃", energy: false },
  { id: "anshin", label: "安心した・助かった", icon: "🤍", energy: false },
  { id: "tassei", label: "達成感があった", icon: "🎯", energy: false },
  { id: "monya", label: "もったいない", icon: "😞", energy: false },
  { id: "neutral", label: "とくになし", icon: "💭", energy: false },
];

// 合わせ技パターンテーブル（仕様書：_AI自動判定_の仕組み改 STEP⑤より）
const COMBO_PATTERNS = [
  { tags: ["kanjou", "mirai"],    name: "覚醒イベント発動" },
  { tags: ["kanjou", "hajimete"], name: "感動探検家" },
  { tags: ["kanjou", "comfort"],  name: "勇気の一歩" },
  { tags: ["kanjou", "jibun"],    name: "心の充電" },
  { tags: ["kanjou", "dareka"],   name: "幸せの共鳴" },
  { tags: ["kanjou", "ai"],       name: "魂の選択" },
  { tags: ["mirai", "hajimete"],  name: "可能性解放" },
  { tags: ["mirai", "comfort"],   name: "成長加速" },
  { tags: ["mirai", "jibun"],     name: "運命分岐" },
  { tags: ["mirai", "dareka"],    name: "希望の循環" },
  { tags: ["mirai", "ai"],        name: "新ルート発見" },
  { tags: ["hajimete", "comfort"],name: "世界が広がった日" },
  { tags: ["hajimete", "jibun"],  name: "自分開花" },
  { tags: ["hajimete", "dareka"], name: "喜びの発見" },
  { tags: ["hajimete", "ai"],     name: "人生アップデート" },
  { tags: ["comfort", "jibun"],   name: "隠しステージ発見" },
  { tags: ["comfort", "dareka"],  name: "優しき挑戦者" },
  { tags: ["comfort", "ai"],      name: "可能性ジャンプ" },
  { tags: ["jibun", "dareka"],    name: "愛の循環" },
  { tags: ["jibun", "ai"],        name: "自分軸覚醒" },
  { tags: ["dareka", "ai"],       name: "幸せの連鎖" },
];

// 合わせ技名を取得（最初にマッチしたパターンを返す）
const getComboName = (tags) => {
  if (!tags || tags.length < 2) return null;
  const matched = COMBO_PATTERNS.find(p => p.tags.every(t => tags.includes(t)));
  return matched ? matched.name : null;
};

const CIRCULATION_TAGS = [
  { id: "kanjou", label: "感情が震えた", icon: "💫" },
  { id: "mirai", label: "未来の可能性が広がった", icon: "🚀" },
  { id: "hajimete", label: "初めての体験ができた", icon: "🌅" },
  { id: "comfort", label: "少し挑戦できた", icon: "🦋" },
  { id: "jibun", label: "自分を大切にした", icon: "🌸" },
  { id: "dareka", label: "誰かを喜ばせた", icon: "💝" },
  { id: "ai", label: "心から選べた", icon: "❤️" },
];

const RECENT_HISTORY = [
  { date: "6/6", cat: "自己投資", feeling: "ワクワクした", tags: ["mirai", "kanjou", "hajimete"], energy: 5, ai: "新しい扉が開く予感。この学びはあなたの流れを変えそう。", aiPct: 80 },
  { date: "6/5", cat: "人とのつながり", feeling: "満たされた", tags: ["dareka", "ai", "kanjou"], energy: 5, ai: "贈る側も豊かになる。愛の循環が広がっています。", aiPct: 90 },
  { date: "6/4", cat: "体験・思い出", feeling: "リラックス", tags: ["jibun"], energy: 3, ai: "自分を休ませる時間は、次の流れを生む準備時間。", aiPct: 70 },
];

// ─── Sparkles ────────────────────────────────────────────────
function Sparkles({ count = 30, color = "#ffd97a" }) {
  const items = useRef(
    Array.from({ length: count }, (_, i) => ({
      id: i, x: Math.random() * 100, y: Math.random() * 100,
      size: 2 + Math.random() * 4, delay: Math.random() * 3,
      dur: 1.5 + Math.random() * 2, type: Math.random() > 0.5 ? "★" : "✦",
    }))
  ).current;
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
      {items.map(s => (
        <div key={s.id} style={{
          position: "absolute", left: `${s.x}%`, top: `${s.y}%`,
          fontSize: s.size * 3, color, opacity: 0,
          animation: `sparkleFloat ${s.dur}s ${s.delay}s ease-in-out infinite`,
        }}>{s.type}</div>
      ))}
    </div>
  );
}

// ─── Splash Screen（Artifact用：ビデオなし・シンプル版）───────
// ── 動画プレイヤー共通コンポーネント ──────────────────────────
function VideoPlayer({ src, onEnded, style, aspectRatio = "16 / 9" }) {
  const [loading, setLoading] = useState(true);
  return (
    <div onClick={onEnded} style={{ position: "fixed", inset: 0, zIndex: 9999, background: "#000", display: "flex", alignItems: "center", justifyContent: "center", ...style }}>
      {loading && (
        <div style={{
          position: "absolute", inset: 0, display: "flex",
          alignItems: "center", justifyContent: "center", color: "white", fontSize: 14,
        }}>読み込み中...</div>
      )}
      <video
        src={src}
        autoPlay
        playsInline
        muted
        onCanPlayThrough={() => setLoading(false)}
        onEnded={onEnded}
        style={{
          width: "92%", maxWidth: 420,
          aspectRatio,
          objectFit: "cover",
          borderRadius: 16,
          boxShadow: "0 0 40px rgba(255,255,255,0.15)",
        }}
      />
      <div style={{
        position: "absolute", bottom: 24, right: 20,
        color: "rgba(255,255,255,0.6)", fontSize: 12, pointerEvents: "none",
      }}>タップでスキップ</div>
    </div>
  );
}

function SplashScreen({ onDone }) {
  const [fading, setFading] = useState(false);
  const finish = useCallback(() => { setFading(true); setTimeout(onDone, 700); }, [onDone]);

  useEffect(() => {
    const t = setTimeout(finish, 2500);
    return () => clearTimeout(t);
  }, [finish]);

  return (
    <div onClick={finish} style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "linear-gradient(145deg, #f8f6f1, #f0ede6)",
      display: "flex", alignItems: "center", justifyContent: "center",
      opacity: fading ? 0 : 1, transition: "opacity 0.7s ease", cursor: "pointer",
    }}>
      <Sparkles count={40} color="#c49a2a" />
      <Sparkles count={20} color="#c07fb0" />
      <div style={{ textAlign: "center", zIndex: 1, padding: "0 24px", width: "100%", paddingTop: 40, paddingBottom: "env(safe-area-inset-bottom, 24px)" }}>
        <div style={{
          fontSize: "clamp(28px, 9vw, 34px)", fontWeight: 800, letterSpacing: 0.5, whiteSpace: "nowrap", lineHeight: 1.3, paddingTop: 4,
          background: "linear-gradient(135deg, #c49a2a, #d4a843, #b06a9a)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 12,
        }}>お金の器</div>
        <div style={{ fontSize: 13, color: "#8a7a6a", letterSpacing: 1, marginBottom: 40 }}>
          タップしてはじめる
        </div>
        <div style={{ fontSize: 28, animation: "pulseGlow 2s ease-in-out infinite" }}>✦</div>
        <div style={{ fontSize: 10, color: "#aaa", marginTop: 24, marginBottom: 16 }}>（しばらく待つと自動で進みます）</div>
      </div>
    </div>
  );
}

// ─── Level Up Modal ────────────────────────────────────────────
function LevelUpModal({ fromLevel, toLevel, onClose, skipFlash }) {
  const isLv5 = toLevel === 5;
  const [phase, setPhase] = useState(isLv5 ? (skipFlash ? "lv5text" : "flash") : "celebrate");
  useEffect(() => {
    if (!isLv5 || skipFlash) return;
    const t = setTimeout(() => setPhase("lv5text"), 1500);
    return () => clearTimeout(t);
  }, [isLv5, skipFlash]);

  const LEVEL_INFO = {
    2: { emoji: "🪴", color: "#4db8c8", label: "育ち始めた器" },
    3: { emoji: "✨", color: "#d4a843", label: "広がる器" },
    4: { emoji: "🌸", color: "#c07fb0", label: "豊かな器" },
    5: { emoji: "🌟", color: "#ffd97a", label: "循環する器" },
  };
  const info = LEVEL_INFO[toLevel] || { emoji: "✦", color: "#c49a2a", label: "" };

  if (phase === "flash") {
    return <div style={{ position: "fixed", inset: 0, zIndex: 500, background: "white", animation: "fadeInOut 1.5s ease forwards" }} />;
  }
  if (phase === "lv5text") {
    return (
      <div style={{
        position: "fixed", inset: 0, zIndex: 500,
        background: "radial-gradient(ellipse at center, #fffdf0 0%, #f5e6b0 60%, #e8c870 100%)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32,
      }}>
        <Sparkles count={60} color="#c49a2a" />
        <Sparkles count={30} color="#c07fb0" />
        <div style={{ fontSize: 48, marginBottom: 16, animation: "bounceIn 0.6s both" }}>🌟</div>
        <div style={{ fontSize: 20, fontWeight: 900, color: "#7a5500", textAlign: "center", lineHeight: 1.8, marginBottom: 32, animation: "slideUpIn 0.8s 0.2s both" }}>
          <span style={{ fontSize: 24 }}>レベル 5 に到達しました。</span><br />
          お金の器（コンフォートゾーン）が<br />一回り大きくなりました。<br />
          <span style={{ color: "#c49a2a" }}>おめでとうございます。</span>
        </div>
        <button onClick={onClose} style={{
          padding: "14px 36px", borderRadius: 999, fontSize: 15, fontWeight: 700,
          background: "linear-gradient(135deg, #c49a2a, #ffd97a)",
          border: "none", color: "#3a2800", cursor: "pointer",
          animation: "slideUpIn 0.8s 0.5s both", boxShadow: "0 8px 32px #c49a2a55",
        }}>✦ つづける</button>
      </div>
    );
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 500,
      background: `radial-gradient(ellipse at 50% 35%, ${info.color}1a 0%, transparent 60%), #fdf8f5`,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32,
      overflowY: "auto",
    }}>
      <Sparkles count={40} color={info.color} />
      <Sparkles count={20} color="#c49a2a" />
      <div style={{ marginBottom: 20, animation: "vesselGrowCenter 0.8s 0.2s both" }}>
        <svg width="150" height="150" viewBox="0 0 160 160">
          <path d="M52 55 Q40 70 36 95 Q34 120 80 130 Q126 120 124 95 Q120 70 108 55 Z"
            fill={`${info.color}12`} stroke={info.color} strokeWidth="2" strokeOpacity="0.6" />
          <ellipse cx="80" cy="56" rx="28" ry="6" fill="none" stroke={info.color} strokeWidth="2" strokeOpacity="0.6" />
        </svg>
      </div>
      <div style={{ fontSize: 12, color: "#9a8a8a", letterSpacing: 3, marginBottom: 14, animation: "slideUpIn 0.6s 0.3s both" }}>LEVEL UP</div>
      <div style={{ fontSize: 32, fontWeight: 800, marginBottom: 10, display: "flex", alignItems: "center", gap: 10, animation: "slideUpIn 0.6s 0.4s both" }}>
        <span style={{ fontSize: 28 }}>{info.emoji}</span>
        <span style={{
          background: `linear-gradient(135deg, ${info.color}, #c49a2a)`,
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>Level.{toLevel}</span>
      </div>
      <div style={{ fontSize: 17, fontWeight: 700, color: "#3a2f2f", marginBottom: 32, animation: "slideUpIn 0.6s 0.5s both" }}>{info.label}</div>
      <button onClick={onClose} style={{
        padding: "14px 42px", borderRadius: 999, fontSize: 15, fontWeight: 700,
        background: `linear-gradient(135deg, ${info.color}, #c49a2a)`,
        border: "none", color: "white", cursor: "pointer",
        boxShadow: `0 8px 32px ${info.color}55`,
        animation: "slideUpIn 0.6s 0.6s both",
      }}>✦ 器を受け取る</button>
    </div>
  );
}

// ─── Talent Match Modal ────────────────────────────────────────
function TalentMatchModal({ onClose, insightMessage, topValues, topTalents, aiPct, topCats, userProfile, pieceCounts }) {
  const [phase, setPhase] = React.useState("loading"); // loading | reveal
  const [talents, setTalents] = React.useState([]);
  const [revealIdx, setRevealIdx] = React.useState(-1);
  const [error, setError] = React.useState(false);
  const [savedAt, setSavedAt] = React.useState(""); // 保存済み結果の診断日
  const [tenshoku, setTenshoku] = React.useState(null); // 3つの才能が指す方向（天職ヒント）
  const [showPuzzleVideo, setShowPuzzleVideo] = React.useState(false); // puzzle.mp4用（将来実装）

  // AI診断を実行（初回・再診断ボタンの両方から呼ばれる）
  const runDiagnosis = async () => {
    setPhase("loading");
    setError(false);
    setRevealIdx(-1);
    setSavedAt("");
    try {
        const topValuesStr = (topValues || []).join("・") || "まだ蓄積なし";
        const topTalentsStr = (topTalents || []).join("・") || "まだ蓄積なし";
        const topCatsStr = (topCats || []).map(([c, n]) => `${c}(${n}回)`).join("・") || "まだ蓄積なし";
        const pieceCountsStr = (pieceCounts || []).map(([label, n]) => `${label} ${n}個`).join("・") || "まだ蓄積なし";
        const aiPctStr = aiPct != null ? String(aiPct) : "不明";
        const userProfileStr = userProfile
          ? Object.entries(userProfile).map(([k, v]) => `${k}:${v}`).join(" / ")
          : "未回答";

        const resp = await fetch("/api/claude", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-License-Key": loadLS("license_key", "") },
          body: JSON.stringify({
            model: "claude-sonnet-4-6",
            max_tokens: 1500,
            system: `あなたは才能発掘の専門家です。
ユーザーが積み重ねてきた支出の記録から、
その人だけの才能と価値を深く読み解いてください。

伝えたい核心はひとつ：
「本人が"普通"だと思ってやっていることは、実は誰かが必要としている"価値"である」こと。

出力は必ずJSONのみ（マークダウン・コードブロック不要）:
{
  "talents": [
    { "title": "才能の名前（10字以内）", "futsuu": "本人が普通にやっていること。必ずピース数や回数など入力データの数字を1つ引用して書く（40字以内）", "kachi": "その『普通』を必要としている人を具体的に挙げ、どう役立つかを書く（60字以内）", "emoji": "絵文字1つ" },
    { "title": "才能の名前（10字以内）", "futsuu": "同上（40字以内）", "kachi": "同上（60字以内）", "emoji": "絵文字1つ" },
    { "title": "才能の名前（10字以内）", "futsuu": "同上（40字以内）", "kachi": "同上（60字以内）", "emoji": "絵文字1つ" }
  ],
  "complementary_needs": [
    { "title": "補完才能の名前（10字以内）", "description": "その人と組むとどう循環が加速するか（50字以内）", "emoji": "絵文字1つ" },
    { "title": "補完才能の名前（10字以内）", "description": "その人と組むとどう循環が加速するか（50字以内）", "emoji": "絵文字1つ" }
  ],
  "tenshoku": {
    "houkou": "3つの才能をつなぐと見えてくる仕事の方向性。「この3つをつなぐと見えてくるのは——」に続く形で書く（60字以内）",
    "shigoto": [
      { "name": "具体的な職業・活動名（14字以内）", "riyuu": "その人のどの才能が活きるか（22字以内）" },
      { "name": "具体的な職業・活動名（14字以内）", "riyuu": "その人のどの才能が活きるか（22字以内）" },
      { "name": "具体的な職業・活動名（14字以内）", "riyuu": "その人のどの才能が活きるか（22字以内）" }
    ]
  }
}

talentsのルール：
・futsuuは「あなたは〜」で始め、本人の実際の行動を事実として書く。必ず【蓄積ピース数】等の数字を根拠に使う
・kachiは「〜な人」と宛先を明確にする（例：一歩踏み出せない人、続けるのが苦手な人）。抽象的な「多くの人」「誰か」は禁止
・titleは詩的すぎない、ひと目で意味がわかる名前にする
・弱点・否定・断定は禁止。可能性・ギフトとして表現する
・3つとも異なるピース領域・異なる角度から才能を描く
・complementary_needsは「弱点」ではなく「あなたと組むと循環が加速する、あなたを補完する才能」として2つ書く

tenshokuのルール：
・houkouは3つの才能すべてを1本の線でつなぐ。断定せず「方向」として示す
・shigotoは3つとも実在する具体的な職業・活動名にする（抽象的な「人を支える仕事」等は禁止）
・国家資格や長期の専門教育が必須の職業（医師・弁護士等）は挙げない
・3つのうち最低1つは、会社員への転職ではなく、副業や個人で今日から小さく始められる活動にする（例：発信、ワークショップ主催、オンラインコミュニティ運営）
・riyuuはtalentsで挙げた才能の言葉を引用してつなげる`,
            messages: [{
              role: "user",
              content: `【蓄積された価値タグ】${topValuesStr}
【上位才能領域】${topTalentsStr}
【蓄積ピース数】${pieceCountsStr}
【愛の支出率】${aiPctStr}%
【よく使うカテゴリ】${topCatsStr}
【5つの問いの回答】${userProfileStr}

この人が「普通」だと思ってやっていることが、
誰かにとっての「価値」であることを、
データを根拠に具体的に3つ教えてください。`,
            }],
          }),
        });
        const data = await resp.json();
        if (!resp.ok || !data.content) throw new Error("AI判定APIが利用できません");
        const text = data.content?.find(c => c.type === "text")?.text || "{}";
        const clean = text.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(clean);
        setTalents(parsed.talents || []);
        setTenshoku(parsed.tenshoku || null);
        setPhase("reveal");
        // 1枚ずつ順番にリビール（最後に天職カード）
        parsed.talents.forEach((_, i) => {
          setTimeout(() => setRevealIdx(i), i * 800 + 300);
        });
        if (parsed.tenshoku) {
          setTimeout(() => setRevealIdx(parsed.talents.length), parsed.talents.length * 800 + 700);
        }
        // 補完ピース図鑑用に保存（Lv5以降、マイページからいつでも見返せるように）
        if (parsed.talents?.length || parsed.complementary_needs?.length) {
          const nowIso = new Date().toISOString();
          saveLS("talentPuzzleResult", {
            talents: parsed.talents || [],
            complementaryNeeds: parsed.complementary_needs || [],
            tenshoku: parsed.tenshoku || null,
            savedAt: nowIso,
          });
          setSavedAt(nowIso);
        }
      } catch (e) {
        setError(true);
        setPhase("reveal");
      }
  };

  React.useEffect(() => {
    // 保存済みの診断結果があればそれを表示（API呼び出しなし）
    const saved = loadLS("talentPuzzleResult", null);
    if (saved?.talents?.length) {
      setTalents(saved.talents);
      setTenshoku(saved.tenshoku || null);
      setSavedAt(saved.savedAt || "");
      setPhase("reveal");
      saved.talents.forEach((_, i) => {
        setTimeout(() => setRevealIdx(i), i * 800 + 300);
      });
      if (saved.tenshoku) {
        setTimeout(() => setRevealIdx(saved.talents.length), saved.talents.length * 800 + 700);
      }
    } else {
      // 初回のみAI診断を実行
      runDiagnosis();
    }
  }, []);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 500,
      background: "radial-gradient(ellipse at center, #1a0a3a 0%, #0a0520 100%)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32,
      overflowY: "auto",
    }}>
      {/* puzzle.mp4: 将来「才能マッチング通知」演出用（現在は非表示） */}
      {showPuzzleVideo && (
        <div style={{ position: "fixed", inset: 0, zIndex: 600 }}>
          <VideoPlayer src="/puzzle.mp4" onEnded={() => setShowPuzzleVideo(false)} />
        </div>
      )}
      <Sparkles count={80} color="#ffd97a" />
      <Sparkles count={40} color="#c07fb0" />
      <div style={{ fontSize: 52, marginBottom: 16, animation: "bounceIn 0.6s both", zIndex: 1 }}>🧩</div>
      <div style={{ fontSize: 22, fontWeight: 900, color: "#ffd97a", textAlign: "center", lineHeight: 1.7, marginBottom: 8, animation: "slideUpIn 0.8s 0.2s both", letterSpacing: 1, zIndex: 1 }}>
        あなたの持つ価値を
      </div>
      <div style={{
        fontSize: 22, fontWeight: 900,
        background: "linear-gradient(135deg, #ffd97a, #c07fb0, #4db8c8)",
        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        textAlign: "center", lineHeight: 1.7, marginBottom: 24,
        animation: "slideUpIn 0.8s 0.35s both", letterSpacing: 1, zIndex: 1,
      }}>必要とする人がいます</div>

      {/* 上位才能領域タグ */}
      {topTalents && topTalents.length > 0 && (
        <div style={{
          zIndex: 1, marginBottom: 20, display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center",
          animation: "slideUpIn 0.8s 0.5s both",
        }}>
          {topTalents.map(t => (
            <div key={t} style={{
              background: "rgba(255,217,122,0.15)", border: "1px solid #ffd97a88",
              borderRadius: 999, padding: "4px 14px", fontSize: 13, color: "#ffd97a", fontWeight: 700,
            }}>🧩 {t}</div>
          ))}
        </div>
      )}

      {/* ローディング */}
      {phase === "loading" && (
        <div style={{ zIndex: 1, textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 13, color: "#c07fb0", animation: "pulseGlow 1.5s ease-in-out infinite" }}>
            ✦ 才能パズルを解析中... ✦
          </div>
        </div>
      )}

      {/* 才能3枚リビール */}
      {phase === "reveal" && !error && talents.length > 0 && (
        <div style={{ zIndex: 1, width: "100%", maxWidth: 320, marginBottom: 24, display: "flex", flexDirection: "column", gap: 12 }}>
          {talents.map((t, i) => (
            <div key={i} style={{
              background: revealIdx >= i ? "rgba(255,217,122,0.10)" : "rgba(255,255,255,0.03)",
              border: `1px solid ${revealIdx >= i ? "#ffd97a66" : "#ffffff11"}`,
              borderRadius: 16, padding: "16px 20px",
              opacity: revealIdx >= i ? 1 : 0,
              transform: revealIdx >= i ? "translateY(0)" : "translateY(12px)",
              transition: "all 0.6s cubic-bezier(0.16,1,0.3,1)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 28 }}>{t.emoji}</span>
                <span style={{ fontSize: 15, fontWeight: 900, color: "#ffd97a" }}>{t.title}</span>
              </div>
              {t.futsuu || t.kachi ? (
                <>
                  {/* ① あなたが"普通"だと思っていること（データ根拠） */}
                  <div style={{ fontSize: 10, color: "#c07fb0", fontWeight: 700, letterSpacing: 1, marginBottom: 3 }}>あなたが"普通"だと思っていること</div>
                  <div style={{ fontSize: 13, color: "#f0e8ff", lineHeight: 1.8, marginBottom: 8 }}>{t.futsuu}</div>
                  {/* ② つなぎ */}
                  <div style={{ fontSize: 11, color: "#ffd97a", fontWeight: 700, textAlign: "center", marginBottom: 8, letterSpacing: 1 }}>
                    ▼ それは、誰にでもできることではありません
                  </div>
                  {/* ③ あなたの"価値"を必要としている人 */}
                  <div style={{ fontSize: 10, color: "#4db8c8", fontWeight: 700, letterSpacing: 1, marginBottom: 3 }}>あなたの"価値"を必要としている人</div>
                  <div style={{ fontSize: 13, color: "#f0e8ff", lineHeight: 1.8 }}>{t.kachi}</div>
                </>
              ) : (
                <div style={{ fontSize: 13, color: "#f0e8ff", lineHeight: 1.8 }}>{t.description}</div>
              )}
            </div>
          ))}

          {/* 🌟 3つの才能が指す方向（天職ヒント） */}
          {tenshoku && (
            <div style={{
              background: revealIdx >= talents.length ? "linear-gradient(135deg, rgba(255,217,122,0.18), rgba(192,127,176,0.14))" : "rgba(255,255,255,0.03)",
              border: `1.5px solid ${revealIdx >= talents.length ? "#ffd97a" : "#ffffff11"}`,
              borderRadius: 16, padding: "18px 20px",
              opacity: revealIdx >= talents.length ? 1 : 0,
              transform: revealIdx >= talents.length ? "translateY(0)" : "translateY(12px)",
              transition: "all 0.8s cubic-bezier(0.16,1,0.3,1)",
              boxShadow: revealIdx >= talents.length ? "0 4px 30px rgba(255,217,122,0.25)" : "none",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 28 }}>🌟</span>
                <span style={{ fontSize: 15, fontWeight: 900, color: "#ffd97a" }}>3つの才能が指す方向</span>
              </div>
              <div style={{ fontSize: 13, color: "#f0e8ff", lineHeight: 1.9, marginBottom: 6 }}>
                この3つをつなぐと見えてくるのは——{tenshoku.houkou}
              </div>
              <div style={{ fontSize: 12, color: "#ffd97a", lineHeight: 1.8, marginBottom: 12 }}>
                あなたの天職のヒントは、ここにあります。
              </div>
              {Array.isArray(tenshoku.shigoto) && tenshoku.shigoto.length > 0 && (
                <>
                  <div style={{ fontSize: 10, color: "#c07fb0", fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>たとえば、こんな仕事</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {tenshoku.shigoto.map((s, j) => (
                      <div key={j} style={{
                        background: "rgba(255,255,255,0.06)", borderRadius: 10, padding: "8px 12px",
                      }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#f0e8ff" }}>{s.name}</div>
                        {s.riyuu && <div style={{ fontSize: 11, color: "#b8a8c8", marginTop: 2 }}>{s.riyuu}</div>}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* エラー時フォールバック */}
      {phase === "reveal" && error && (
        <div style={{
          zIndex: 1, marginBottom: 24,
          background: "rgba(192,127,176,0.15)", border: "1px solid #c07fb088",
          borderRadius: 16, padding: "16px 20px", maxWidth: 320, textAlign: "center",
        }}>
          <div style={{ fontSize: 13, color: "#f0e8ff", lineHeight: 1.8 }}>
            {insightMessage || "あなたの支出の記録から、ユニークな才能のかたちが見えてきています。"}
          </div>
        </div>
      )}

      {/* insight_message */}
      {insightMessage && phase === "reveal" && (
        <div style={{
          zIndex: 1, marginBottom: 28,
          background: "rgba(192,127,176,0.15)", border: "1px solid #c07fb088",
          borderRadius: 16, padding: "16px 20px", maxWidth: 320,
        }}>
          <div style={{ fontSize: 11, color: "#c07fb0", letterSpacing: 1, marginBottom: 6, textAlign: "center" }}>
            ✦ あなたの中の未発見ピース ✦
          </div>
          <div style={{ fontSize: 14, color: "#f0e8ff", lineHeight: 1.8, textAlign: "center" }}>
            {insightMessage}
          </div>
        </div>
      )}

      <button onClick={onClose} style={{
        padding: "14px 40px", borderRadius: 999, fontSize: 15, fontWeight: 700,
        background: "linear-gradient(135deg, #c49a2a, #ffd97a)",
        border: "none", color: "#1a0a1a", cursor: "pointer",
        animation: "slideUpIn 0.8s 0.8s both",
        boxShadow: "0 8px 40px #ffd97a55", zIndex: 1, position: "relative",
      }}>✦ 閉じる</button>

      {/* 再診断ボタン（保存済み結果の表示中のみ） */}
      {phase === "reveal" && !error && savedAt && (
        <div style={{ zIndex: 1, marginTop: 16, textAlign: "center", animation: "slideUpIn 0.8s 1.0s both" }}>
          <div style={{ fontSize: 10, color: "#8a7a9a", marginBottom: 6 }}>
            {(() => { try { const d = new Date(savedAt); return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日の診断結果`; } catch { return "保存済みの診断結果"; } })()}
          </div>
          <button onClick={runDiagnosis} style={{
            fontSize: 11, color: "#c07fb0", background: "none",
            border: "1px solid #c07fb055", borderRadius: 999, padding: "8px 18px",
            cursor: "pointer",
          }}>🧩 ピースが増えたので、才能を診断し直す</button>
        </div>
      )}
    </div>
  );
}

// ─── Enhanced Emotion Slider ────────────────────────────────
function EmotionSliderEnhanced({ value, onChange }) {
  const [localVal, setLocalVal] = React.useState(value);

  const getColor = (v) => {
    if (v < 15) return "#94a3b8";
    if (v < 30) return "#a78bfa";
    if (v < 50) return "#f472b6";
    if (v < 70) return "#ec4899";
    if (v < 85) return "#db2777";
    return "#be185d";
  };
  const getLabel = (v) => {
    if (v < 15) return "モヤモヤした・後悔した";
    if (v < 30) return "どちらともいえない";
    if (v < 50) return "まあまあ満たされた";
    if (v < 70) return "満たされた・幸せだった";
    if (v < 85) return "ワクワクした・楽しかった";
    return "最高にワクワク！";
  };

  const col = getColor(localVal);
  const liquidY = 100 - localVal;

  const handleChange = (e) => {
    const v = parseInt(e.target.value);
    setLocalVal(v);
    onChange(v);
  };

  return (
    <div
      onClick={e => e.stopPropagation()}
      onMouseDown={e => e.stopPropagation()}
      onTouchStart={e => e.stopPropagation()}
      style={{ padding: "0 4px", textAlign: "center" }}
    >
      {/* ── グローバルCSS: thumbスタイルをcolに連動 ── */}
      <style>{`
        .emo-range {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 16px;
          border-radius: 999px;
          outline: none;
          cursor: pointer;
          touch-action: pan-x;
        }
        .emo-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: white;
          border: 3px solid ${col};
          box-shadow: 0 2px 10px rgba(0,0,0,0.15);
          cursor: grab;
        }
        .emo-range:active::-webkit-slider-thumb {
          cursor: grabbing;
          transform: scale(1.1);
        }
        .emo-range::-moz-range-thumb {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: white;
          border: 3px solid ${col};
          cursor: grab;
        }
      `}</style>

      <div style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        background: "linear-gradient(135deg, #fdf2f8, #fce7f3)",
        border: "1px solid #f9a8d4", borderRadius: 999, padding: "6px 18px",
        fontSize: 13, fontWeight: 600, color: "#9d174d", marginBottom: 4,
      }}>スライドバー or 顔をクリックして今の気持ちを教えてください</div>
      <div style={{ fontSize: 12, color: "#333", marginBottom: 32, lineHeight: 1.7 }}>あなたの支出の循環エネルギーを読み解きます。<br/>「循環チェック」をクリックしてください。</div>

      {/* ハート液体メーター */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 4 }}>
        <div style={{ position: "relative" }}>
          {localVal >= 60 && [
            { top:"-8px", left:"10px" }, { top:"-12px", right:"15px" },
            { bottom:"20px", left:"-5px" }, { bottom:"10px", right:"-5px" },
          ].map((pos, i) => (
            <div key={i} style={{
              position:"absolute", ...pos, fontSize:12, color:col,
              animation:`sparkleFloat 1.8s ${i*0.4}s ease-in-out infinite`,
            }}>✦</div>
          ))}
          <svg width="155" height="155" viewBox="0 0 100 100"
            style={{ filter:`drop-shadow(0 6px 20px ${col}99)`, overflow:"visible" }}>
            <defs>
              <clipPath id="heartClip">
                <path d="M50 85 C50 85 10 58 10 32 C10 18 20 8 33 8 C40 8 46 12 50 18 C54 12 60 8 67 8 C80 8 90 18 90 32 C90 58 50 85 50 85Z" />
              </clipPath>
              <linearGradient id="liquidGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={col} stopOpacity="0.65" />
                <stop offset="100%" stopColor={col} stopOpacity="1" />
              </linearGradient>
              <radialGradient id="heartShine" cx="32%" cy="25%" r="40%">
                <stop offset="0%" stopColor="white" stopOpacity="0.6" />
                <stop offset="100%" stopColor="white" stopOpacity="0" />
              </radialGradient>
            </defs>
            <path d="M50 85 C50 85 10 58 10 32 C10 18 20 8 33 8 C40 8 46 12 50 18 C54 12 60 8 67 8 C80 8 90 18 90 32 C90 58 50 85 50 85Z"
              fill="#fce7f3" stroke="#f9a8d4" strokeWidth="1.5" />
            <g clipPath="url(#heartClip)">
              <rect x="0" y={liquidY} width="100" height="100" fill="url(#liquidGrad)" />
              <path d={`M0 ${liquidY} Q25 ${liquidY-5} 50 ${liquidY} Q75 ${liquidY+5} 100 ${liquidY}`}
                fill="none" stroke="white" strokeWidth="2.5" strokeOpacity="0.5" />
              <ellipse cx="35" cy={liquidY+10} rx="10" ry="4" fill="white" fillOpacity="0.2" />
            </g>
            <path d="M50 85 C50 85 10 58 10 32 C10 18 20 8 33 8 C40 8 46 12 50 18 C54 12 60 8 67 8 C80 8 90 18 90 32 C90 58 50 85 50 85Z"
              fill="url(#heartShine)" />
          </svg>
        </div>
      </div>

      <div style={{ fontSize:17, fontWeight:700, color:col, marginBottom:18, transition:"color 0.3s" }}>
        {getLabel(localVal)}
      </div>

      {/* ネイティブ input[type=range] — Gemini推奨方式 */}
      <input
        type="range"
        min={0} max={100} value={localVal} step={1}
        className="emo-range"
        onChange={handleChange}
        onClick={e => e.stopPropagation()}
        onMouseDown={e => e.stopPropagation()}
        onTouchStart={e => e.stopPropagation()}
        style={{
          background: `linear-gradient(to right, ${col} 0%, ${col} ${localVal}%, #fce7f3 ${localVal}%, #fce7f3 100%)`,
        }}
      />
      <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#bbb", marginBottom:18 }}>
        <span>モヤモヤ…</span><span>…最高にワクワク！</span>
      </div>

      {/* 感情アイコン */}
      <div style={{ display:"flex", justifyContent:"space-between", padding:"0 2px" }}>
        {[
          { icon:"😔", label:"とても\n落ち込んでいる", pct:5 },
          { icon:"😕", label:"少し\n落ち込んでいる", pct:25 },
          { icon:"😊", label:"ちょっと\n満たされた", pct:50 },
          { icon:"😄", label:"とても\n満たされている", pct:75 },
          { icon:"🥰", label:"最高に\n幸せいっぱい！", pct:100 },
        ].map((em, i) => (
          <div key={i}
            onClick={() => { setLocalVal(em.pct); onChange(em.pct); }}
            style={{
              textAlign:"center", cursor:"pointer",
              opacity: Math.abs(localVal - em.pct) < 18 ? 1 : 0.42,
              transform: Math.abs(localVal - em.pct) < 18 ? "scale(1.15)" : "scale(1)",
              transition:"opacity 0.2s, transform 0.2s",
            }}>
            <div style={{ fontSize:22, marginBottom:3 }}>{em.icon}</div>
            <div style={{ fontSize:8, color:"#9d174d", lineHeight:1.3, whiteSpace:"pre-line" }}>{em.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Vessel SVG ────────────────────────────────────────────────
function VesselDisplay({ level, energy, maxEnergy }) {
  const fillPct = Math.min((energy / maxEnergy) * 100, 100);
  const glow = level >= 3;
  return (
    <div style={{ position: "relative", width: 160, height: 160, margin: "0 auto" }}>
      {glow && (
        <div style={{
          position: "absolute", inset: -20, borderRadius: "50%",
          background: `radial-gradient(circle, ${COLORS.goldGlow}22 0%, transparent 70%)`,
          animation: "pulseGlow 2.5s ease-in-out infinite",
        }} />
      )}
      <svg width="160" height="160" viewBox="0 0 160 160" style={{ filter: glow ? `drop-shadow(0 0 12px ${COLORS.goldGlow}88)` : "none" }}>
        <defs>
          <clipPath id="vesselClip">
            <path d="M52 55 Q40 70 36 95 Q34 120 80 130 Q126 120 124 95 Q120 70 108 55 Z"/>
          </clipPath>
          <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COLORS.aquaTeal} stopOpacity="0.5" />
            <stop offset="100%" stopColor="#1a7a9a" stopOpacity="0.7" />
          </linearGradient>
          <linearGradient id="vesselGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#90b8d8" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#c8dff0" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#7090b8" stopOpacity="0.35" />
          </linearGradient>
          <radialGradient id="goldShine" cx="35%" cy="30%">
            <stop offset="0%" stopColor={COLORS.goldLight} stopOpacity="0.6" />
            <stop offset="100%" stopColor={COLORS.goldPrimary} stopOpacity="0" />
          </radialGradient>
        </defs>
        <path d="M52 55 Q40 70 36 95 Q34 120 80 130 Q126 120 124 95 Q120 70 108 55 Z"
          fill="url(#vesselGrad)" stroke={level >= 4 ? COLORS.goldLight : COLORS.aquaLight}
          strokeWidth={level >= 4 ? 1.5 : 1} strokeOpacity="0.5" />
        <g clipPath="url(#vesselClip)">
          <rect x="28" y={130 - fillPct * 0.75} width="104" height={fillPct * 0.75 + 10}
            fill="url(#waterGrad)" style={{ transition: "y 1s ease, height 1s ease" }} />
          <path d={`M28 ${130 - fillPct * 0.75} Q52 ${128 - fillPct * 0.75} 80 ${130 - fillPct * 0.75} Q108 ${132 - fillPct * 0.75} 132 ${130 - fillPct * 0.75}`}
            fill="none" stroke={COLORS.aquaLight} strokeWidth="1.5" strokeOpacity="0.7"
            style={{ animation: "waveFloat 3s ease-in-out infinite" }} />
        </g>
        <path d="M52 55 Q40 70 36 95 Q34 120 80 130 Q126 120 124 95 Q120 70 108 55 Z" fill="url(#goldShine)" />
        <ellipse cx="80" cy="56" rx="28" ry="6" fill="none"
          stroke={level >= 4 ? COLORS.goldLight : "#a0b8d8"} strokeWidth="1.5" strokeOpacity="0.6" />
        {level >= 3 && [0, 1, 2].map(i => (
          <circle key={i} cx={60 + i * 20} cy={60 + i * 5} r="1.5" fill={COLORS.goldGlow} opacity="0.7"
            style={{ animation: `floatDot${i} ${2 + i * 0.5}s ease-in-out infinite` }} />
        ))}
        {/* Level indicator */}
        <text x="80" y="100" textAnchor="middle" fontSize="11" fill={COLORS.pearlWhite} fillOpacity="0.6">
          Lv.{level}
        </text>
      </svg>
    </div>
  );
}

// ─── AI Result Card ────────────────────────────────────────────
function AIResultCard({ result, onClose, onCloseToHome }) {
  if (!result) return null;
  const [showDetail, setShowDetail] = React.useState(false);
  const pts = result.energy;
  const isBonus = result.bonus;
  const isPending = result.pending;
  const jikoBonus = result.jikoBonus || 0;
  const hasComfort = result.tags?.includes("comfort") && result.comfortCount > 0 && result.comfortCount % 5 === 0;
  const comboName = result.comboName || null;
  const feelingId = result.feelingId || "";
  const isMoyana = ["monya", "neutral"].includes(feelingId);
  const aiVal = result.aikaOsoreDetail?.ai ?? 50;
  const osoreVal = result.aikaOsoreDetail?.osore ?? 50;
  const total = aiVal + osoreVal || 100;
  const aiPct = Math.round((aiVal / total) * 100);
  const aikaOsoreLabel = aiPct >= 65 ? "愛から使った" : aiPct <= 35 ? "恐れから使った" : "愛と恐れが混在";
  const aikaOsoreColor = aiPct >= 65 ? COLORS.aquaTeal : aiPct <= 35 ? COLORS.lotusRose : COLORS.goldPrimary;

  return (
    <div style={{
      position: "fixed", inset: 0, background: "#00000088", zIndex: 100,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20, overflowY: "auto",
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "linear-gradient(145deg, #ffffff, #f8f6f1)",
        border: `1px solid ${isBonus ? COLORS.goldLight : COLORS.aquaTeal}88`,
        borderRadius: 24, padding: 28, maxWidth: 340, width: "100%",
        boxShadow: `0 0 40px ${isBonus ? COLORS.goldGlow : COLORS.aquaTeal}44`,
        animation: "slideUpIn 0.4s cubic-bezier(0.16,1,0.3,1)",
      }}>
        {/* ── 愛か恐れか：詳細トグル ── */}
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <button onClick={() => setShowDetail(v => !v)} style={{
            background: `${aikaOsoreColor}22`, border: `1px solid ${aikaOsoreColor}55`,
            borderRadius: 999, padding: "6px 18px", fontSize: 13, fontWeight: 700,
            color: aikaOsoreColor, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6,
          }}>
            {aiPct >= 65 ? "❤️" : aiPct <= 35 ? "🌫️" : "💛"} {aikaOsoreLabel}
            <span style={{ fontSize: 10, opacity: 0.7 }}>{showDetail ? "▲" : "▼ 詳細"}</span>
          </button>
        </div>
        {showDetail && (
          <div style={{
            textAlign: "center", marginBottom: 20, padding: "16px",
            borderRadius: 16,
            background: aiPct >= 65
              ? `linear-gradient(135deg, ${COLORS.aquaTeal}22, ${COLORS.aquaLight}11)`
              : aiPct <= 35
              ? `linear-gradient(135deg, #b0a0b822, #c0b0c811)`
              : `linear-gradient(135deg, ${COLORS.goldGlow}22, ${COLORS.goldLight}11)`,
            border: `1px solid ${aikaOsoreColor}44`,
          }}>
            {result.aikaOsoreDetail?.reason && (
              <div style={{ fontSize: 12, color: COLORS.mutedText, lineHeight: 1.7, fontStyle: "italic", marginBottom: 12 }}>
                {result.aikaOsoreDetail.reason}
              </div>
            )}
            <div style={{ position: "relative", height: 8, borderRadius: 4, background: `${COLORS.lotusRose}33` }}>
              <div style={{
                position: "absolute", left: 0, top: 0, height: "100%", borderRadius: 4,
                width: `${aiPct}%`, background: `linear-gradient(to right, ${COLORS.aquaTeal}, ${COLORS.aquaLight})`,
                transition: "width 1s ease",
              }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
              <span style={{ fontSize: 10, color: COLORS.aquaTeal, fontWeight: 700 }}>❤️ 愛 {aiPct}%</span>
              <span style={{ fontSize: 10, color: COLORS.mutedText, fontWeight: 700 }}>🌫️ 恐れ {100 - aiPct}%</span>
            </div>
          </div>
        )}

        {(comboName || isBonus) && (
          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 24 }}>⭐</div>
            {comboName && (
              <div style={{ fontSize: 16, color: COLORS.goldLight, fontWeight: 800, letterSpacing: 1, marginBottom: 2 }}>
                ✨ {comboName} ✨
              </div>
            )}
            {isBonus && (
              <div style={{ fontSize: 13, color: COLORS.goldLight, fontWeight: 700, letterSpacing: 2 }}>感情×合わせ技 発動！</div>
            )}
          </div>
        )}
        {hasComfort && (
          <div style={{
            textAlign: "center", marginBottom: 16, padding: "12px 16px",
            background: "linear-gradient(135deg, #eef6ff, #e8f4ff)",
            borderRadius: 14, border: "1px solid #a8d8f055",
          }}>
            <div style={{ fontSize: 22, marginBottom: 4 }}>🦋</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#4a8abf", marginBottom: 2 }}>コンフォートゾーンを超えました！</div>
            <div style={{ fontSize: 11, color: "#7aaacf" }}>その一歩が、器を広げています</div>
          </div>
        )}
        {isPending && (
          <div style={{
            background: `${COLORS.mutedText}22`, borderRadius: 10, padding: "8px 12px",
            marginBottom: 16, border: `1px solid ${COLORS.mutedText}44`,
            fontSize: 12, color: COLORS.mutedText, textAlign: "center",
          }}>⏸ 情報不足のため一部判定保留</div>
        )}
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <div style={{
            fontSize: 44, fontWeight: 900, lineHeight: 1,
            background: `linear-gradient(135deg, ${COLORS.goldGlow}, ${COLORS.lotusLight})`,
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>+{pts}</div>
          <div style={{ fontSize: 12, color: COLORS.mutedText, marginTop: 4 }}>循環エネルギー獲得</div>
          {jikoBonus > 0 && (
            <div style={{
              marginTop: 8, display: "inline-flex", alignItems: "center", gap: 5,
              background: "#8b5cf622", border: "1px solid #8b5cf655",
              borderRadius: 999, padding: "4px 14px", fontSize: 12, fontWeight: 700, color: "#7c3aed",
            }}>
              🌱 自己投資ボーナス +{jikoBonus}pt
            </div>
          )}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", marginBottom: 16 }}>
          {result.tags.map(t => {
            const tag = CIRCULATION_TAGS.find(x => x.id === t);
            return tag ? (
              <span key={t} style={{
                background: `${COLORS.aquaTeal}22`, border: `1px solid ${COLORS.aquaTeal}55`,
                borderRadius: 20, padding: "4px 10px", fontSize: 11, color: COLORS.aquaLight,
              }}>{tag.icon} {tag.label}</span>
            ) : null;
          })}
        </div>
        {result.valueTags && result.valueTags.length > 0 && (
          <div style={{ marginBottom: 16, padding: "12px 16px", background: "linear-gradient(135deg, #f3eeff, #ede6ff)", borderRadius: 14, border: "1px solid #c4a8e855" }}>
            <div style={{ fontSize: 11, color: "#9b72cf", fontWeight: 700, letterSpacing: 2, marginBottom: 8, textAlign: "center" }}>🧩 育った才能ピース</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
              {result.valueTags.map(tag => (
                <span key={tag} style={{
                  background: "#8b5cf622", border: "1px solid #8b5cf655",
                  borderRadius: 20, padding: "4px 12px", fontSize: 12, color: "#7c3aed", fontWeight: 600,
                }}>{tag}</span>
              ))}
            </div>
          </div>
        )}
        <div style={{ background: "#f0ede688", borderRadius: 12, padding: "12px 16px", marginBottom: 20, borderLeft: `2px solid ${COLORS.lotusRose}` }}>
          <div style={{ fontSize: 14, color: COLORS.lotusLight, marginBottom: 4, letterSpacing: 2, textAlign: "center" }}>ひ と こ と</div>
          <div style={{ fontSize: 13, color: COLORS.softWhite, lineHeight: 1.7 }}>{result.story}</div>
        </div>
        {isMoyana && (
          <div style={{
            marginBottom: 16, padding: "14px 16px",
            background: "linear-gradient(135deg, #f5f0ff, #ede8fa)",
            borderRadius: 14, border: "1px solid #c4b0e855",
            textAlign: "center",
          }}>
            <div style={{ fontSize: 18, marginBottom: 6 }}>🌱</div>
            <div style={{ fontSize: 13, color: "#7a5fa0", fontWeight: 700, marginBottom: 4 }}>モヤモヤは気づきのサイン</div>
            <div style={{ fontSize: 12, color: "#9a7fc0", lineHeight: 1.7 }}>この感情を記録したこと自体が、<br />次の支出を変えるはじめの一歩です。</div>
          </div>
        )}
        {result.insightMessage && (
          <div style={{
            marginBottom: 16, padding: "12px 16px",
            background: "linear-gradient(135deg, #fff8e8, #fff3d4)",
            borderRadius: 12, border: "1px solid #f0c84055",
          }}>
            <div style={{ fontSize: 11, color: "#c49a2a", fontWeight: 700,
              letterSpacing: 2, marginBottom: 6, textAlign: "center" }}>
              💡 あなたへのメッセージ
            </div>
            <div style={{ fontSize: 13, color: "#8a6a10", lineHeight: 1.7 }}>
              {result.insightMessage}
            </div>
          </div>
        )}
        {result.circulationQuest && (
          <div style={{
            marginBottom: 16, padding: "12px 16px",
            background: "linear-gradient(135deg, #f3e8ff, #ede4fc)",
            borderRadius: 12, border: "1px solid #c07fb055",
          }}>
            <div style={{ fontSize: 11, color: "#9b72cf", fontWeight: 700,
              letterSpacing: 2, marginBottom: 6, textAlign: "center" }}>
              🌱 循環クエスト
            </div>
            <div style={{ fontSize: 13, color: "#6a4a8a", lineHeight: 1.7, textAlign: "center" }}>
              {result.circulationQuest}
            </div>
          </div>
        )}
        <button onClick={onClose} style={{
          width: "100%", padding: 12, borderRadius: 12,
          background: "white", border: "2px solid #c49a2a",
          color: "#8a6a10", fontWeight: 700, fontSize: 14, cursor: "pointer",
          boxShadow: "0 4px 16px rgba(196,154,42,0.2)",
        }}>器に蓄積する ✨</button>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
          <button onClick={() => {
            const tagLabels = result.valueTags && result.valueTags.length > 0
              ? `『${result.valueTags.slice(0, 2).join("』『")}』の才能ピースが育ちました✨`
              : "循環が生まれました✨";
            const text = `+${pts}循環エネルギー獲得！🌱 ${tagLabels}\n#お金の器`;
            const url = "https://okane-app-two.vercel.app/";
            const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
            window.open(shareUrl, "_blank", "noopener,noreferrer");
          }} style={{
            padding: "4px 10px", borderRadius: 999,
            background: "#000000", border: "none",
            color: "white", fontWeight: 600, fontSize: 10, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 4,
          }}>
            <span style={{ fontSize: 10 }}>𝕏</span> シェア
          </button>
        </div>
        <button onClick={onCloseToHome} style={{
          width: "100%", padding: 10, borderRadius: 12,
          background: "transparent", border: "none",
          color: "#3a2a4a", fontWeight: 600, fontSize: 13, cursor: "pointer",
          marginTop: 8,
        }}>🏠 ホームに戻る</button>
      </div>
    </div>
  );
}

// ─── その他サブカテゴリ自由入力欄（独立コンポーネント）──────────
function OtherSubInput({ value, onChange, onSubmit }) {
  const inputRef = useRef(null);
  const composingRef = useRef(false);
  return (
    <div style={{ marginTop: 8, padding: "0 4px" }}>
      <input
        ref={inputRef}
        type="text"
        defaultValue={value}
        onCompositionStart={() => { composingRef.current = true; }}
        onCompositionEnd={() => { composingRef.current = false; }}
        onKeyDown={e => {
          if (e.key === "Enter" && !composingRef.current) {
            e.preventDefault();
            e.target.blur();
          }
        }}
        onBlur={e => onChange(e.target.value)}
        placeholder="自由に入力する"
        style={{
          width: "100%", padding: "12px 14px", borderRadius: 14,
          border: "2px solid #d4b8f0", fontSize: 14, color: "#4a3a5a",
          outline: "none", boxSizing: "border-box", background: "#ffffff",
        }}
      />
      <button
        onClick={() => onSubmit(inputRef.current ? inputRef.current.value : value)}
        style={{
          marginTop: 8, width: "100%", padding: "12px", borderRadius: 999,
          background: "#a080d0",
          color: "white", border: "none", fontSize: 14, fontWeight: 600,
          cursor: "pointer",
        }}
      >次へ</button>
    </div>
  );
}

// ─── Main App ──────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("home");

  // ── 永続化された初期値（localStorage） ──
  const [energy, setEnergy] = useState(() => loadLS("okane_energy", 0));
  const [level, setLevel] = useState(() => loadLS("okane_level", 1));
  const [history, setHistory] = useState(() => loadLS("okane_history", []));
  const [stats, setStats] = useState(null);
  const [lastComfortDate, setLastComfortDate] = useState(() => loadLS("lastComfortDate", null)); // 「1日のふりかえり」最終実施日

  // ── 永続化：値が変わるたびlocalStorageへ保存 ──
  useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" }); }, [tab]);

  useEffect(() => { saveLS("okane_energy", energy); }, [energy]);
  useEffect(() => { saveLS("okane_level", level); }, [level]);
  useEffect(() => { saveLS("okane_history", history); }, [history]);
  useEffect(() => { saveLS("lastComfortDate", lastComfortDate); }, [lastComfortDate]);

  // ── ふたりの器（簡易版）：招待リンクから相手の結果を読み込む ──
  const [partnerResult, setPartnerResult] = useState(() => loadLS("partnerResult", null));
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const invite = params.get("invite");
      if (invite) {
        const json = decodeURIComponent(escape(atob(invite)));
        const decoded = JSON.parse(json);
        if (decoded && (decoded.talents || decoded.complementaryNeeds)) {
          setPartnerResult(decoded);
          saveLS("partnerResult", decoded);
        }
        // URLをきれいにする（招待パラメータを消す）
        params.delete("invite");
        const newSearch = params.toString();
        window.history.replaceState({}, "", window.location.pathname + (newSearch ? `?${newSearch}` : ""));
      }
    } catch {}
  }, []);

  const [showInput, setShowInput] = useState(false);
  const [inputStep, setInputStep] = useState("sub");
  const [selCat, setSelCat] = useState(null);
  const [selSubCat, setSelSubCat] = useState(null);
  const [otherSubText, setOtherSubText] = useState("");
  const [selFeeling, setSelFeeling] = useState(null);
  const [selTimeInvest, setSelTimeInvest] = useState([]); // 複数選択対応
  const [sliderVal, setSliderVal] = useState(50);
  const [selTags, setSelTags] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [ripples, setRipples] = useState([]);
  const [showStartVideo, setShowStartVideo] = useState(true);
  const [hasPlayedUtuwa, setHasPlayedUtuwa] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [levelUpInfo, setLevelUpInfo] = useState(null);
  const [pendingLevelUp, setPendingLevelUp] = useState(null); // AIResultCardが閉じるまで保留するレベルアップ演出
  const [showTalentMatch, setShowTalentMatch] = useState(false);
  const [pieceToast, setPieceToast] = useState([]);
  const [comfortToast, setComfortToast] = useState(false);
  const [comfortAlreadyToast, setComfortAlreadyToast] = useState(false); // 「1日のふりかえり」本日実施済みメッセージ
  const [comfortCount, setComfortCount] = useState(0);
  const [recentlyGrownPieces, setRecentlyGrownPieces] = useState([]);
  const [reachedLevels, setReachedLevels] = useState(() => {
    try { return JSON.parse(localStorage.getItem("reachedLevels") || "[1]"); } catch { return [1]; }
  });
  const [calendarView, setCalendarView] = useState(true);
  const [calendarMonth, setCalendarMonth] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [calendarSelected, setCalendarSelected] = useState(null); // { dateStr, items[] }
  const [onboardingDone, setOnboardingDone] = useState(() => loadLS("onboardingDone", false));
  useEffect(() => { saveLS("onboardingDone", onboardingDone); }, [onboardingDone]);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [obAnswersGlobal, setObAnswersGlobal] = useState({});
  const [obStepGlobal, setObStepGlobal] = useState(0);

  const curLevel = LEVELS.find(l => l.lv === level) || LEVELS[0];
  const nextLevel = LEVELS.find(l => l.lv === level + 1);
  const progressPct = nextLevel
    ? Math.min(((energy - curLevel.needed) / (nextLevel.needed - curLevel.needed)) * 100, 100)
    : 100;

  // ── ポイント加算＋レベルアップ判定（共通関数）─────────────────
  // ポイントを増やす処理は必ずこの関数を通すこと。
  // これを通さず setEnergy だけ呼ぶと、ポイントは増えてもレベルが更新されないバグになる。
  const applyEnergyGain = (amount) => {
    const newEnergy = energy + amount;
    setEnergy(newEnergy);
    const newLevelObj = LEVELS.reduce((best, l) => newEnergy >= l.needed ? l : best, LEVELS[0]);
    if (newLevelObj.lv > level) {
      // Lv5初回到達時：器のMP4 → レベル5到達テキスト → 才能パズル、の専用シーケンスで演出する
      // （通常のLevelUpModal保留表示とは別経路にして、順序が入れ替わらないようにする）
      if (newLevelObj.lv === 5 && !reachedLevels.includes(5)) {
        const updated = [...reachedLevels, newLevelObj.lv];
        setReachedLevels(updated);
        try { localStorage.setItem("reachedLevels", JSON.stringify(updated)); } catch {}
        setHasPlayedUtuwa(false); // utuwa動画をトリガー
        // レベル5到達テキストとTalentMatchModalはutuwa動画終了後に順番に表示（VideoPlayerのonEndedで制御）
      } else {
        // ポイント獲得カード(AIResultCard)と同時に表示すると重なって見づらいため、
        // ここでは「保留」しておき、カードが閉じたタイミングで表示する（下のuseEffect参照）
        setPendingLevelUp({ from: level, to: newLevelObj.lv });
      }
    }
    setLevel(newLevelObj.lv);
    return newEnergy;
  };

  // ポイント獲得カード(AIResultCard)が閉じている時だけ、保留中のレベルアップ演出を表示する
  useEffect(() => {
    if (!aiResult && pendingLevelUp) {
      setLevelUpInfo(pendingLevelUp);
      setPendingLevelUp(null);
    }
  }, [aiResult, pendingLevelUp]);

  const addRipple = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now();
    setRipples(r => [...r, { id, x, y }]);
    setTimeout(() => setRipples(r => r.filter(rr => rr.id !== id)), 1500);
  };

  const resetInput = () => {
    setInputStep("sub"); setSelCat(null); setSelSubCat(null);
    setSelFeeling(null); setSelTimeInvest([]); setSliderVal(50); setSelTags([]);
  };

  const toggleTag = (id) => {
    setSelTags(t => t.includes(id) ? t.filter(x => x !== id) : [...t, id]);
  };

  // ── グローバルスパーク演出 ──────────────────────────────────
  const globalCanvasRef = useRef(null);
  const globalSparklesRef = useRef([]);
  const globalAnimRef = useRef(null);
  const SPARK_COLORS = ["#ff6b9d","#ff9f43","#ffd93d","#6bcb77","#4d96ff","#c77dff","#f472b6","#a78bfa","#fb923c","#34d399"];

  const handleGlobalClick = useCallback((e) => {
    const canvas = globalCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    // 少数・速め・短命でパッと散る
    const count = 10;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 2.5;
      globalSparklesRef.current.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.8,
        size: 1.2 + Math.random() * 2,
        col: SPARK_COLORS[Math.floor(Math.random() * SPARK_COLORS.length)],
        type: Math.random() > 0.4 ? "star" : "dot",
        life: 0,
        maxLife: 18 + Math.random() * 12, // 短命＝すばやく消える
      });
    }
    if (!globalAnimRef.current) {
      const drawStar = (ctx, cx, cy, r, alpha, col) => {
        ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = col;
        ctx.lineWidth = r * 0.5; ctx.lineCap = "round";
        for (let i = 0; i < 4; i++) {
          const a = i * Math.PI / 2;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(a) * r * 0.3, cy + Math.sin(a) * r * 0.3);
          ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
          ctx.stroke();
        }
        ctx.restore();
      };
      const loop = () => {
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        globalSparklesRef.current = globalSparklesRef.current.filter(s => s.life < s.maxLife);
        globalSparklesRef.current.forEach(s => {
          s.life++; s.x += s.vx; s.y += s.vy; s.vy += 0.12;
          const alpha = Math.pow(1 - s.life / s.maxLife, 1.5); // 最初は濃く、急速フェード
          if (s.type === "star") drawStar(ctx, s.x, s.y, s.size, alpha, s.col);
          else {
            ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = s.col;
            ctx.beginPath(); ctx.arc(s.x, s.y, s.size * 0.6, 0, Math.PI * 2); ctx.fill(); ctx.restore();
          }
        });
        if (globalSparklesRef.current.length > 0) {
          globalAnimRef.current = requestAnimationFrame(loop);
        } else {
          globalAnimRef.current = null;
        }
      };
      globalAnimRef.current = requestAnimationFrame(loop);
    }
  }, []);

  const runAI = async () => {
    if (!selCat || !selFeeling) return;
    setAiLoading(true);
    setInputStep("loading");

    const valueTags = getValueTags(selCat.label, selSubCat);

    // アプリ側で価値タグを集計（AI に丸投げしない）
    const tagCountMap = {};
    [...history, { valueTags }].forEach(h => {
      (h.valueTags || []).forEach(t => { tagCountMap[t] = (tagCountMap[t] || 0) + 1; });
    });
    const sortedTags = Object.entries(tagCountMap).sort((a, b) => b[1] - a[1]);
    const topValues = sortedTags.slice(0, 3).map(([t]) => t);

    // 才能領域スコア（アプリ側で計算）
    const DOMAIN_MAP = {
      "学習":  "成長", "知識": "成長", "成長": "成長", "挑戦": "成長", "探究": "成長", "スキル": "成長", "専門性": "成長",
      "創造":  "創造", "発想": "創造", "表現": "創造", "企画": "創造", "開発": "創造",
      "共感":  "つながり", "協力": "つながり", "仲間": "つながり", "出会い": "つながり", "感謝": "つながり", "信頼": "つながり",
      "健康":  "安定", "安心": "安定", "整理": "安定", "継続": "安定", "自己管理": "安定", "快適": "安定",
      "応援":  "貢献", "貢献": "貢献", "育成": "貢献", "支援": "貢献", "社会性": "貢献", "利他": "貢献",
      "自由":  "個性", "好奇心": "個性", "ワクワク": "個性", "冒険": "個性", "癒し": "個性",
    };
    const domainScore = {};
    sortedTags.forEach(([tag, cnt]) => {
      const d = DOMAIN_MAP[tag];
      if (d) domainScore[d] = (domainScore[d] || 0) + cnt;
    });
    const topTalents = Object.entries(domainScore).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([d]) => d);

    // 循環クエスト用：保存済みの補完ピース（Lv5以降、才能パズル実施済みなら存在）
    const savedPuzzle = loadLS("talentPuzzleResult", null);
    const complementaryTitles = (savedPuzzle?.complementaryNeeds || []).map(n => n.title).filter(Boolean);

    const systemPrompt = `あなたは「循環エネルギー分析AI」であり「才能発掘コーチ」です。
このアプリは家計簿アプリではありません。
ユーザーがお金の使い方を通して感情・価値観・循環に気づき、最終的に自分の才能を発見するためのアプリです。

【あなたの役割】
・AIは「診断士」ではなく「才能発掘コーチ」として振る舞う
・決めつけない・断定しない・可能性として表現する
・ユーザーが気づいていない「未発見のピース」を必ず1つ提案する
・「あなたの中にはまだ組み上がっていないピースがあります」という世界観を大切に

重要ルール：
・支出金額は評価対象ではありません
・ユーザーの感情や動機を重視してください
・根拠のない推測は禁止
・情報不足の場合は「判定保留」を返してください
・弱点・否定的表現は禁止

＜判定対象＞
【1. 感情が震えた】嬉しい、楽しい、ワクワク、感動、達成感、不安、緊張など、感情が大きく動いた体験
【2. 初めての体験ができた】人生で初めて経験したこと、新しいことへの潜在意識からの恐怖
【3. 未来の可能性が広がった】学び、挑戦、経験、人との出会い、創作、発信など未来の可能性を広げる行動
【4. 少し挑戦できた】少し怖い、緊張する、勇気が必要など安全圏を超えた挑戦
【5. 自分を大切にした】健康、美容、休息、快適な環境づくり、自己ケアにつながる行動
【6. 誰かを喜ばせた】応援、寄付、プレゼント、感謝、支援など他者への貢献
【7. 心から選べた】義務や恐れではなく、感謝、好奇心、挑戦、応援、成長など前向きな動機からの支出

また、この支出が生み出しそうな循環を50文字以内で表現してください。
・支出カテゴリや気持ちを踏まえた具体的な内容にする（例：「学んだことが、誰かの背中を押す言葉になるかもしれない」）
・詩的な余韻を残しつつ、「何がどう育ったか」が伝わる一文にする
・説教禁止・断定禁止・前向きな可能性として表現する

insight_messageについて：
・上位の才能タグから「本人が気づいていない意外な才能・未発見ピース」を1つ必ず含める
・例：学習タグが高い場合→「知識を集めるだけでなく、それを人に伝える『案内役』の才能が眠っているかもしれません」
・例：感謝・共感タグが高い場合→「人の気持ちに寄り添う力が、誰かの背中を押す力に育つ可能性があります」
・70文字以内、可能性・問いかけとして表現

circulation_questについて（補完ピースが渡された場合のみ生成）：
・ユーザーの「補完ピース（自分にはない才能）」を他人に頼る前に、小さく自分で試せる挑戦を1つ提案する
・例：補完ピースが「実行」なら→「今週、迷わず1つだけ即決してみる、というのはどうでしょう」
・命令・説教・断定は禁止。「〜してみるのはどうでしょう」など提案・問いかけの形にする
・40文字以内
・補完ピースが渡されなかった場合は空文字列を返す

出力は必ずJSONのみ（マークダウン不要）:
{
  "判定結果": [{"要素": "", "確信度": 0, "根拠": ""}],
  "愛恐れ判定": {"愛": 0, "恐れ": 0, "理由": ""},
  "循環ストーリー": "",
  "insight_message": "",
  "circulation_quest": "",
  "判定保留": false,
  "不足情報": []
}`;

    const userPrompt = `支出カテゴリ: ${selCat.label}${selSubCat ? ` > ${selSubCat}` : ""}
気持ち: ${selFeeling.label}
感情スライダー: ${sliderVal}%（0%=ニュートラル、100%=ワクワク満点）
ユーザー自己申告タグ: ${selTags.map(id => CIRCULATION_TAGS.find(t => t.id === id)?.label).join(", ") || "なし"}
今回の価値タグ（アプリ算出）: ${valueTags.join(", ") || "なし"}
蓄積上位価値タグ（アプリ算出）: ${topValues.join(", ") || "まだ蓄積なし"}
上位才能領域（アプリ算出）: ${topTalents.join(", ") || "まだ蓄積なし"}
補完ピース（アプリ算出・才能パズル済みの場合のみ）: ${complementaryTitles.join(", ") || "なし"}

上記の「蓄積上位価値タグ」と「上位才能領域」をもとに、
insight_messageとして未発見ピースへの気づきを必ず含めてください。
補完ピースがある場合は、circulation_questとして小さな挑戦を1つ提案してください。`;

    try {
      const resp = await fetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-License-Key": loadLS("license_key", "") },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
        }),
      });
      if (!resp.ok) throw new Error("AI判定APIが利用できません");
      const data = await resp.json();
      if (!data.content) throw new Error("AI判定の応答が不正です");
      const text = data.content?.find(c => c.type === "text")?.text || "{}";
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);

      const ELEMENT_MAP = {
        "感情が震えた": "kanjou", "初めての体験ができた": "hajimete", "未来の可能性が広がった": "mirai",
        "少し挑戦できた": "comfort", "自分を大切にした": "jibun", "誰かを喜ばせた": "dareka", "心から選べた": "ai",
      };
      const judgements = parsed["判定結果"] || [];
      const tags = judgements
        .filter(j => j["確信度"] >= 40)
        .map(j => {
          const key = Object.keys(ELEMENT_MAP).find(k => j["要素"]?.includes(k));
          return key ? ELEMENT_MAP[key] : null;
        })
        .filter(Boolean);

      const aikaOsore = parsed["愛恐れ判定"] || {};
      const aiVal = Number(aikaOsore["愛"] ?? 50);
      const osoreVal = Number(aikaOsore["恐れ"] ?? 50);
      const story = parsed["循環ストーリー"] || "あなたの選択が、静かに循環を生んでいます。";
      const insightMessage = parsed["insight_message"] || "";
      const circulationQuest = parsed["circulation_quest"] || "";
      const isPending = parsed["判定保留"] === true;

      const combinedTags = [...new Set([...tags, ...selTags])]; // AI判定 + ユーザー自己選択を合算（重複除去）
      const count = combinedTags.length;
      const isHighEmotion = ["waku", "shiawase"].includes(selFeeling.id);
      const isBonus = isHighEmotion && count >= 1; // 仕様書通り：気持ち上位2項目＋合わせ技1つ以上
      const baseEnergy = count >= 3 ? 5 : count === 2 ? 4 : 3;
      const comfortBonus = 0; // コンフォートゾーン超えはAI判定ではなく本人のふりかえり（comfort_check）で加算
      const timeInvestBonus = (selTimeInvest || []).length > 0 ? 5 : 0;
      const jikoBonus = selCat?.label === "自己投資" ? 5 : 0;
      const emotionBonus = isBonus ? 8 : 0;
      const finalEnergy = baseEnergy + emotionBonus + comfortBonus + timeInvestBonus + jikoBonus;

      const result = {
        tags, energy: finalEnergy, bonus: isBonus, pending: isPending, story, jikoBonus,
        comboName: getComboName(combinedTags),
        insightMessage, circulationQuest, topValues, topTalents,
        feelingId: selFeeling.id,
        aikaOsoreDetail: { ai: aiVal, osore: osoreVal, reason: aikaOsore["理由"] || "" },
        valueTags: getValueTags(selCat.label, selSubCat),
      };

      // comfortタグがあればカウントアップ
      let newComfortCount = comfortCount;
      if (result.tags?.includes("comfort")) {
        newComfortCount = comfortCount + 1;
        setComfortCount(newComfortCount);
      }
      setAiResult({ ...result, comfortCount: newComfortCount });
      const newEnergy = applyEnergyGain(finalEnergy);

      const newEntry = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        date: new Date().toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" }),
        cat: selCat.label, feeling: selFeeling.label, tags: combinedTags,
        valueTags: getValueTags(selCat.label, selSubCat),
        energy: finalEnergy, ai: story,
        aiPct: Math.round((aiVal / (aiVal + osoreVal || 100)) * 100),
        aikaOsoreDetail: { ai: aiVal, osore: osoreVal, reason: aikaOsore["理由"] || "" },
        recordedAt: new Date().toISOString(),
        aiFallback: false,
      };
      setHistory(h => [newEntry, ...h.slice(0, 499)]);
      setStats(s => StorageService.updateStats(s, newEntry));

      // パズルピース成長トースト
      if (valueTags.length > 0) {
        setPieceToast(valueTags.slice(0, 2));
        setTimeout(() => setPieceToast([]), 3000);
      }

      // ホーム画面「あなたの才能ピース」の成長ハイライト対象を記録
      const grownDomains = Array.from(new Set(valueTags.map(t => TALENT_TAG_MAP[t]?.label).filter(Boolean)));
      if (grownDomains.length > 0) setRecentlyGrownPieces(grownDomains);

    } catch (err) {
      const count = selTags.length || 2;
      const fallbackIsHighEmotion = ["waku", "shiawase"].includes(selFeeling?.id);
      const fallbackIsBonus = fallbackIsHighEmotion && count >= 1;
      const fallbackEnergy = (count >= 3 ? 5 : count === 2 ? 4 : 3) + (fallbackIsBonus ? 8 : 0) + ((selTimeInvest || []).length > 0 ? 5 : 0) + (selCat?.label === "自己投資" ? 5 : 0);
      const fallbackEntry = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        date: new Date().toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" }),
        cat: selCat?.label || "不明", feeling: selFeeling?.label || "不明",
        tags: selTags.length ? selTags : [],
        valueTags: getValueTags(selCat?.label || "", selSubCat),
        energy: fallbackEnergy, ai: "あなたの選択が、静かに循環を生んでいます。", aiPct: 70,
        recordedAt: new Date().toISOString(),
        aiFallback: true,
      };
      const fbHasComfort = (selTags || []).includes("comfort");
      const fbNewComfortCount = fbHasComfort ? comfortCount + 1 : comfortCount;
      if (fbHasComfort) setComfortCount(fbNewComfortCount);
      setAiResult({
        tags: fallbackEntry.tags, energy: fallbackEnergy, bonus: fallbackIsBonus, pending: false,
        story: fallbackEntry.ai, feelingId: selFeeling?.id, valueTags: getValueTags(selCat?.label || "", selSubCat), aikaOsoreDetail: { ai: 70, osore: 30, reason: "感情スライダーと気持ちから判断しました。" },
        jikoBonus: selCat?.label === "自己投資" ? 5 : 0,
        comfortCount: fbNewComfortCount,
        comboName: getComboName(selTags),
        insightMessage: "",
        topValues: [],
        topTalents: [],
      });
      applyEnergyGain(fallbackEnergy);
      setHistory(h => [fallbackEntry, ...h.slice(0, 499)]);
      setStats(s => StorageService.updateStats(s, fallbackEntry));
    } finally {
      setAiLoading(false);
    }
  };

  // ── フォールバック記録の再判定（⑥） ─────────────────────────
  const [retryingFallback, setRetryingFallback] = useState(false);
  const retryFallbackEntries = async () => {
    const targets = history.filter(h => h.aiFallback);
    if (targets.length === 0) return;
    setRetryingFallback(true);
    let successCount = 0;
    for (const entry of targets) {
      try {
        const tagLabels = (entry.tags || []).map(id => CIRCULATION_TAGS.find(t => t.id === id)?.label).filter(Boolean);
        const system = `あなたは「循環エネルギー分析AI」であり「才能発掘コーチ」です。
過去に記録された支出について、後から愛か恐れかの判定と循環ストーリーを付け直します。
断定・説教は禁止。可能性・詩的な余韻として表現してください。
出力は必ずJSONのみ（マークダウン不要）:
{
  "愛恐れ判定": {"愛": 0, "恐れ": 0},
  "循環ストーリー": "",
  "insight_message": ""
}`;
        const user = `支出カテゴリ: ${entry.cat}
気持ち: ${entry.feeling}
自己申告タグ: ${tagLabels.join(", ") || "なし"}
価値タグ: ${(entry.valueTags || []).join(", ") || "なし"}`;
        const resp = await fetch("/api/claude", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-License-Key": loadLS("license_key", "") },
          body: JSON.stringify({
            model: "claude-sonnet-4-6",
            max_tokens: 500,
            system,
            messages: [{ role: "user", content: user }],
          }),
        });
        const data = await resp.json();
        if (!resp.ok || !data.content) throw new Error("AI判定APIが利用できません");
        const text = data.content?.find(c => c.type === "text")?.text || "";
        const clean = text.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(clean);
        const aiVal = parsed["愛恐れ判定"]?.["愛"] ?? 70;
        const osoreVal = parsed["愛恐れ判定"]?.["恐れ"] ?? 30;
        const story = parsed["循環ストーリー"] || entry.ai;
        setHistory(h => h.map(e => e.id === entry.id ? {
          ...e,
          ai: story,
          aiPct: Math.round((aiVal / (aiVal + osoreVal || 100)) * 100),
          aikaOsoreDetail: { ai: aiVal, osore: osoreVal, reason: "後からAI判定を反映しました。" },
          insightMessage: parsed["insight_message"] || e.insightMessage || "",
          aiFallback: false,
        } : e));
        successCount++;
      } catch {
        // このエントリは失敗、次へ（aiFallbackのまま残る）
      }
    }
    setRetryingFallback(false);
    alert(successCount > 0
      ? `${successCount}件の記録にAI判定を反映しました。`
      : "再判定できませんでした。しばらくしてからもう一度お試しください。");
  };

  // ── HOME TAB（カテゴリ選択をホームに）────────────────────────
  const [catchcopyIdx] = useState(() => Math.floor(Math.random() * CATCHCOPIES.length));
  // ─── OnboardingScreen ────────────────────────────────────────
  const OnboardingScreen = () => {
    const obStep = obStepGlobal;
    const setObStep = setObStepGlobal;
    const obAnswers = obAnswersGlobal;
    const [obSelected, setObSelected] = useState(null);
    const [obFreeText, setObFreeText] = useState("");
    const [obAnimating, setObAnimating] = useState(false);
    const q = ONBOARDING_QUESTIONS[obStep - 1];
    const progressPct = obStep === 0 ? 0 : Math.round((obStep / 5) * 100);

    const handleObSelect = (optId) => {
      setObSelected(optId);
      if (optId !== "other") setObFreeText("");
    };
    const handleObNext = () => {
      if (!obSelected && obStep >= 1 && obStep <= 5) return;
      setObAnimating(true);
      setTimeout(() => {
        if (obStep >= 1 && obStep <= 5) {
          setObAnswersGlobal(a => ({ ...a, [q.id]: obSelected }));
          applyEnergyGain(1); // 1問回答につき+1pt（最大5pt）
        }
        setObSelected(null);
        setObFreeText("");
        setObStep(s => s + 1);
        setObAnimating(false);
        window.scrollTo({ top: 0, behavior: "instant" });
      }, 300);
    };
    const handleObDone = () => {
      setOnboardingDone(true);
      setShowOnboarding(false);
      setTab("home");
    };

    return (
      <div style={{
        minHeight: "100vh", background: "white",
        fontFamily: "'Hiragino Kaku Gothic ProN','Noto Sans JP',sans-serif",
        display: "flex", flexDirection: "column", alignItems: "center",
        padding: "0 0 80px", maxWidth: 390, margin: "0 auto",
      }}>
        <style>{`
          @keyframes obSlideUp { from{transform:translateY(24px);opacity:0} to{transform:translateY(0);opacity:1} }
          @keyframes obFadeIn { from{opacity:0} to{opacity:1} }
          @keyframes obSparkle { 0%,100%{transform:translateY(0) scale(1);opacity:0.5} 50%{transform:translateY(-5px) scale(1.4);opacity:1} }
          @keyframes obUnlockPop { 0%{transform:scale(0.5) rotate(-20deg);opacity:0} 60%{transform:scale(1.2) rotate(5deg)} 100%{transform:scale(1) rotate(0deg);opacity:1} }
          @keyframes obShimmer { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
          .ob-opt:active{transform:scale(0.97)}
        `}</style>

        {/* ── INTRO ── */}
        {obStep === 0 && (
          <div style={{ width: "100%", minHeight: "100vh", animation: "obFadeIn 0.6s ease", display: "flex", flexDirection: "column" }}>
            <img src={FIVE5_IMG} alt="5つの問い" style={{ width: "100%", display: "block" }} />
            <div style={{
              background: "white",
              padding: "20px 32px 24px",
              display: "flex", flexDirection: "column", alignItems: "center",
            }}>
              <button onClick={handleObNext} style={{
                position: "relative", overflow: "hidden",
                width: "85%", padding: "16px 0", borderRadius: 999,
                background: "white",
                border: "2px solid #c49a2a",
                color: "#c49a2a", fontSize: 16, fontWeight: 700,
                cursor: "pointer", letterSpacing: "0.1em",
                boxShadow: "0 2px 12px rgba(196,154,42,0.15)",
              }}>
                {["10%","25%","40%","60%","75%","88%"].map((left, i) => (
                  <span key={i} style={{
                    position: "absolute",
                    left, top: ["20%","60%","30%","70%","25%","55%"][i],
                    fontSize: [10,8,12,9,11,8][i],
                    color: "#c49a2a", opacity: 0.7,
                    animation: `obSparkle ${1.5+i*0.3}s ${i*0.2}s ease-in-out infinite`,
                  }}>{["★","✦","★","✦","★","✦"][i]}</span>
                ))}
                <span style={{ position: "relative", zIndex: 1 }}>✦ はじめる</span>
              </button>
              <div style={{ fontSize: 11, color: "#b0a090", marginTop: 14 }}>正解はありません。直感で選んでみてください。</div>
            </div>
          </div>
        )}

        {/* ── QUESTIONS 1-5 ── */}
        {obStep >= 1 && obStep <= 5 && q && (
          <div style={{
            width: "100%", padding: "32px 20px 0",
            opacity: obAnimating ? 0 : 1,
            transform: obAnimating ? "translateY(16px)" : "translateY(0)",
            transition: "opacity 0.3s, transform 0.3s",
          }}>
            {/* プログレスバー */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: "#a090b0" }}>Question {obStep} / 5</span>
                <span style={{ fontSize: 11, color: "#a090b0" }}>{progressPct}%</span>
              </div>
              <div style={{ height: 4, background: "#ede8f8", borderRadius: 2, overflow: "hidden" }}>
                <div style={{
                  height: "100%", borderRadius: 2, width: `${progressPct}%`,
                  background: `linear-gradient(to right, ${q.color}88, ${q.color})`,
                  transition: "width 0.5s ease",
                }} />
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 10, justifyContent: "center" }}>
                {ONBOARDING_QUESTIONS.map((qq, i) => (
                  <div key={qq.id} style={{
                    width: i + 1 <= obStep ? 20 : 6, height: 6, borderRadius: 3,
                    background: i + 1 <= obStep ? qq.color : "#e0d8f0",
                    transition: "all 0.4s ease",
                  }} />
                ))}
              </div>
            </div>

            {/* テーマバッジ */}
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: `${q.color}18`, border: `1.5px solid ${q.color}44`,
              borderRadius: 999, padding: "4px 14px", fontSize: 11,
              color: q.color, fontWeight: 700, marginBottom: 16,
            }}>🔓 {q.theme}</div>

            {/* 質問文 */}
            <div style={{
              fontSize: 18, fontWeight: 800, color: "#3a2a4a",
              lineHeight: 1.6, marginBottom: 24, whiteSpace: "pre-line",
              animation: "obSlideUp 0.4s ease",
            }}>{q.question}</div>

            {/* 選択肢 */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
              {q.options.map((opt, i) => {
                const isSel = obSelected === opt.id;
                return (
                  <button key={opt.id} className="ob-opt"
                    onClick={() => handleObSelect(opt.id)}
                    style={{
                      width: "100%", padding: "14px 18px", borderRadius: 16,
                      background: isSel ? q.bg : "white",
                      border: `2px solid ${isSel ? q.color : "#e8e0f4"}`,
                      cursor: "pointer", textAlign: "left",
                      display: "flex", alignItems: "center", gap: 12,
                      boxShadow: isSel ? `0 4px 16px ${q.color}33` : "0 1px 6px rgba(0,0,0,0.05)",
                      transition: "all 0.18s ease",
                      animation: `obSlideUp 0.35s ${i * 0.07}s both`,
                    }}>
                    <span style={{ fontSize: 22 }}>{opt.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: isSel ? 700 : 500, color: isSel ? q.color : "#4a3a5a" }}>
                        {opt.label}
                      </div>
                      {opt.sub && <div style={{ fontSize: 11, color: isSel ? q.color : "#a090b0", marginTop: 2 }}>{opt.sub}</div>}
                    </div>
                    {isSel && <span style={{ fontSize: 16, color: q.color }}>✓</span>}
                  </button>
                );
              })}
            </div>

            {/* その他：自由入力 */}
            {obSelected === "other" && (
              <div style={{ marginBottom: 16 }}>
                <input type="text" value={obFreeText} onChange={e => setObFreeText(e.target.value)}
                  placeholder="自由に入力してください..."
                  style={{
                    width: "100%", padding: "14px 16px", borderRadius: 14,
                    border: `2px solid ${q.color}88`, outline: "none",
                    fontSize: 14, color: "#4a3a5a", background: "white", boxSizing: "border-box",
                  }} />
              </div>
            )}

            {/* 次へ */}
            <button onClick={handleObNext} disabled={!obSelected} style={{
              position: "relative", overflow: "hidden",
              width: "100%", padding: "15px 0", borderRadius: 999,
              background: obSelected ? `linear-gradient(135deg, ${q.color}, ${q.color}cc)` : "#e8e0f4",
              border: "none",
              color: obSelected ? "white" : "#b0a0c0",
              fontSize: 15, fontWeight: 700, cursor: obSelected ? "pointer" : "default",
              transition: "all 0.2s",
              boxShadow: obSelected ? `0 6px 20px ${q.color}44` : "none",
              marginBottom: 12,
            }}>
              {obSelected && ["12%","25%","40%","55%","70%","85%"].map((left, i) => (
                <span key={i} style={{
                  position: "absolute", left, top: ["20%","60%","35%","65%","25%","50%"][i],
                  fontSize: [9,7,11,8,10,7][i], color: "rgba(255,255,255,0.8)",
                  animation: `obSparkle ${1.4+i*0.25}s ${i*0.15}s ease-in-out infinite`,
                  pointerEvents: "none",
                }}>{["★","✦","★","✦","★","✦"][i]}</span>
              ))}
              <span style={{ position: "relative", zIndex: 1 }}>
                {obStep === 5 ? "✦ 器を確認する" : "次へ →"}
              </span>
            </button>

            {/* 戻るボタン（Q2〜Q4のみ） */}
            {obStep >= 2 && obStep <= 4 && (
              <div style={{ textAlign: "center" }}>
                <button onClick={() => { setObSelected(null); setObFreeText(""); setObStep(s => s - 1); }}
                  style={{ background: "none", border: "none", fontSize: 12, color: "#b0a0c0", cursor: "pointer" }}>
                  ← 戻る
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── DONE ── */}
        {obStep === 6 && (
          <div style={{ width: "100%", padding: "60px 28px 0", textAlign: "center", animation: "obFadeIn 0.6s ease", position: "relative" }}>
            {/* キラキラ星：シャンパンゴールド／パープル／ペパーミントグリーン */}
            {[
              {top:"5%", left:"6%",  color:"#d4a843", size:9},
              {top:"7%", left:"22%", color:"#9b6fd4", size:7},
              {top:"4%", left:"50%", color:"#5ecfb0", size:8},
              {top:"8%", right:"18%",color:"#d4a843", size:7},
              {top:"5%", right:"6%", color:"#9b6fd4", size:9},
              {top:"14%",left:"4%",  color:"#5ecfb0", size:6},
              {top:"16%",left:"30%", color:"#d4a843", size:8},
              {top:"13%",right:"28%",color:"#9b6fd4", size:6},
              {top:"17%",right:"5%", color:"#5ecfb0", size:7},
              {top:"24%",left:"8%",  color:"#d4a843", size:6},
              {top:"22%",left:"45%", color:"#9b6fd4", size:8},
              {top:"25%",right:"10%",color:"#5ecfb0", size:6},
              {top:"32%",left:"3%",  color:"#d4a843", size:7},
              {top:"30%",right:"4%", color:"#9b6fd4", size:6},
              {top:"38%",left:"12%", color:"#5ecfb0", size:8},
              {top:"36%",right:"14%",color:"#d4a843", size:6},
              {bottom:"38%",left:"5%", color:"#9b6fd4", size:7},
              {bottom:"36%",right:"6%",color:"#5ecfb0", size:6},
              {bottom:"30%",left:"18%",color:"#d4a843", size:8},
              {bottom:"28%",right:"16%",color:"#9b6fd4",size:6},
              {bottom:"22%",left:"4%", color:"#5ecfb0", size:7},
              {bottom:"20%",left:"35%",color:"#d4a843", size:6},
              {bottom:"21%",right:"5%",color:"#9b6fd4", size:8},
              {bottom:"14%",left:"10%",color:"#5ecfb0", size:6},
              {bottom:"12%",left:"50%",color:"#d4a843", size:7},
              {bottom:"13%",right:"12%",color:"#9b6fd4",size:6},
              {bottom:"6%", left:"5%", color:"#5ecfb0", size:8},
              {bottom:"5%", left:"28%",color:"#d4a843", size:6},
              {bottom:"7%", right:"8%",color:"#9b6fd4", size:7},
              {bottom:"4%", right:"30%",color:"#5ecfb0",size:6},
            ].map((s, i) => (
              <span key={i} style={{
                position:"absolute", top:s.top, bottom:s.bottom, left:s.left, right:s.right,
                fontSize: s.size, color: s.color,
                animation: `obSparkle ${1.4+i*0.18}s ${i*0.12}s ease-in-out infinite`,
                pointerEvents:"none",
              }}>★</span>
            ))}
            <img src={FIVE5B_IMG} alt="器" style={{ width: 120, marginBottom: 20, animation: "obUnlockPop 0.6s ease", display: "block", marginLeft: "auto", marginRight: "auto" }} />
            <div style={{ fontSize: 22, fontWeight: 900, color: "#3a2a4a", lineHeight: 1.7, marginBottom: 12 }}>
              あなたの器の<br />準備ができました
            </div>
            <div style={{ fontSize: 13, color: "#8a7a9a", lineHeight: 1.9, marginBottom: 16 }}>
              5つの問いに答えてくれて<br />ありがとうございます。<br />
              ここから、お金の器を育てていきましょう。
            </div>
            <div style={{
              background: "linear-gradient(135deg, #f5f0ff, #ede8f8)",
              borderRadius: 16, padding: "28px 18px", marginBottom: 24,
              border: "1px solid #d0c0e8", textAlign: "center", position: "relative", overflow: "hidden", minHeight: 130,
            }}>
              {/* バラバラ配置のパズル */}
              <span style={{ position:"absolute", top:8,  left:10,  fontSize:28, transform:"rotate(-20deg)", opacity:0.7 }}>🧩</span>
              <span style={{ position:"absolute", top:6,  right:14, fontSize:36, transform:"rotate(15deg)",  opacity:0.85 }}>🧩</span>
              <span style={{ position:"absolute", bottom:8, left:18,  fontSize:22, transform:"rotate(10deg)",  opacity:0.6 }}>🧩</span>
              <span style={{ position:"absolute", bottom:6, right:10, fontSize:30, transform:"rotate(-25deg)", opacity:0.75 }}>🧩</span>
              <span style={{ position:"absolute", top:"40%", left:6,  fontSize:18, transform:"rotate(30deg)",  opacity:0.5 }}>🧩</span>
              <div style={{ fontSize: 15, color: "#6a5a8a", lineHeight: 2, position: "relative", zIndex: 1 }}>
                この5つの答えは、あなたの<br />
                <span style={{ fontWeight: 900, fontSize: 18, color: "#9b6fd4" }}>才能パズルのピース</span>として<br />
                支出を重ねるたびに育っていきます
              </div>
            </div>
            <div style={{
              background: "white", borderRadius: 20, padding: "20px 16px",
              border: "2px solid #e8e0f4", marginBottom: 32, textAlign: "left",
            }}>
              <div style={{ fontSize: 12, color: "#a090b0", marginBottom: 14, fontWeight: 600, letterSpacing: 1 }}>
                ✦ あなたの答え
              </div>
              {ONBOARDING_QUESTIONS.map((qq, i) => {
                const ans = obAnswers[qq.id];
                const opt = qq.options.find(o => o.id === ans);
                return (
                  <div key={qq.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: qq.color, flexShrink: 0 }} />
                    <div style={{ fontSize: 11, color: "#8a7a9a", width: 80, flexShrink: 0 }}>{qq.theme}</div>
                    <div style={{ fontSize: 13, color: "#4a3a5a", fontWeight: 600 }}>
                      {opt ? `${opt.emoji} ${opt.label}` : "スキップ"}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{
              textAlign: "center", marginBottom: 16,
              animation: "obFadeIn 0.8s ease",
            }}>
              <div style={{
                display: "inline-block", padding: "10px 28px",
                background: "linear-gradient(135deg, #fff8e8, #fff3d4)",
                borderRadius: 999, border: "2px solid #d4a843",
                fontSize: 18, fontWeight: 900, color: "#b8860b",
                boxShadow: "0 4px 16px rgba(196,154,42,0.25)",
                letterSpacing: 1,
              }}>
                🎉 +5pt 獲得！
              </div>
            </div>
            <button onClick={handleObDone} style={{
              position: "relative", overflow: "hidden",
              width: "100%", padding: "16px 0", borderRadius: 999,
              background: "linear-gradient(135deg, #b8860b, #d4a843, #c49a2a, #e8c060, #c49a2a)",
              backgroundSize: "300% 300%",
              animation: "obShimmer 3s ease infinite",
              border: "none", color: "white", fontSize: 16, fontWeight: 700,
              cursor: "pointer", boxShadow: "0 6px 24px rgba(196,154,42,0.35)",
            }}>
              {["10%","22%","38%","55%","70%","85%"].map((left, i) => (
                <span key={i} style={{
                  position: "absolute",
                  left, top: ["20%","60%","30%","65%","25%","55%"][i],
                  fontSize: [9,7,12,8,10,7][i],
                  color: "rgba(255,255,255,0.85)",
                  animation: `obSparkle ${1.5+i*0.28}s ${i*0.18}s ease-in-out infinite`,
                  pointerEvents: "none",
                }}>{["★","✦","★","✦","★","✦"][i]}</span>
              ))}
              <span style={{ position: "relative", zIndex: 1 }}>✦ お金の器へ進む</span>
            </button>
          </div>
        )}
      </div>
    );
  };

  const HomeTab = () => {
    useEffect(() => {
      if (recentlyGrownPieces.length === 0) return;
      const t = setTimeout(() => setRecentlyGrownPieces([]), 2600);
      return () => clearTimeout(t);
    }, []);
    return (
    <div
      onClick={e => e.stopPropagation()}
      style={{ background: "linear-gradient(180deg, #fff9f5 0%, #fff 100%)", padding: "0 16px 100px", minHeight: "100vh" }}
    >
      {/* Header area */}
      <div style={{ position: "relative", paddingTop: 16, marginBottom: 20 }}>
        {/* Puzzle pieces decoration top-right */}
        <div style={{ position: "absolute", top: 8, right: -4, fontSize: 44, opacity: 0.9, transform: "rotate(10deg)", lineHeight: 1, zIndex: 1 }}>🧩</div>
        <div style={{ position: "absolute", top: 32, right: 40, fontSize: 26, opacity: 0.55, transform: "rotate(-15deg)" }}>🧩</div>
        {/* Header badge + お金の器？リンク */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingRight: 80, marginBottom: 10 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            border: "1.5px dashed #c8a0d8", borderRadius: 999, padding: "5px 14px",
            fontSize: 12, color: "#9a6ab8", fontWeight: 600, background: "white",
          }}>✦ 支出を、才能に変える ✦</div>
          <button onClick={() => setTab("concept")} style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 1,
            background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0,
          }}>
            <span style={{ fontSize: 16, color: "#f0c84a" }}>✦</span>
            <span style={{ fontSize: 9, color: "#9a6ab8", fontWeight: 700, whiteSpace: "nowrap" }}>お金の器？</span>
          </button>
        </div>
        {/* Catchcopy box */}
        <div style={{
          border: "1.5px dashed #c8b8e8", borderRadius: 16, padding: "14px 16px",
          background: "linear-gradient(135deg, #faf6ff, #fff8fb)", marginBottom: 8,
          minHeight: 64, display: "flex", alignItems: "center",
        }}>
          <div style={{ fontSize: 17, color: "#7a5a98", lineHeight: 1.7, fontStyle: "italic" }}>
            {CATCHCOPIES[catchcopyIdx]}
          </div>
        </div>
        {/* Subtitle pill */}
        <div style={{
          fontSize: 12, color: "#7a5a98", fontWeight: 600,
          background: "linear-gradient(to right, #faf2e2, #f5e9cc)",
          display: "inline-block", padding: "4px 14px", borderRadius: 999,
        }}>✦ 今日の支出を選んで記録しよう ✦</div>

        {/* 初回のみ：5つの問いサブテキスト */}
        {!onboardingDone && (
          <div onClick={() => { setObStepGlobal(0); setShowOnboarding(true); }} style={{
            marginTop: 12, padding: "12px 16px", borderRadius: 16,
            background: "linear-gradient(135deg, #f5f0ff, #fff0f8)",
            border: "1.5px dashed #c8b8e8",
            cursor: "pointer",
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <span style={{
              fontSize: 22,
              display: "inline-block",
              animation: "sparkle 2s ease-in-out infinite",
            }}>🧩</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: "#8a7ca8", fontWeight: 700, marginBottom: 2 }}>
                初回のみ →
              </div>
              <div style={{ fontSize: 15, color: "#5a4a7a", fontWeight: 600 }}>
                お金の器を育てるための、5つの問い
              </div>
            </div>
            <span style={{ fontSize: 14, color: "#c8b8e8" }}>›</span>
          </div>
        )}
      </div>

      {/* Category grid */}
      {(() => {
        const puzzleColors = ["#d4a8e8","#a8d4e8","#e8c4a8","#e8a8c4","#a8e8c4","#e8e4a8","#a8c4e8","#c8c8c8"];
        const subTexts = {
          "自己投資": "自分の成長に\n使ったお金",
          "健康・美容": "心と体の健康や\n美容のために",
          "体験・思い出": "旅行・体験に\n使ったお金",
          "人とのつながり": "大切な人との\n時間に",
          "暮らしを整える": "快適で心地よい\n暮らしのために",
          "楽しみ・ごほうび": "自分を満たす\nごほうびに",
          "社会貢献・応援": "人や社会を\n応援するお金",
          "必要な支出": "生きるために\n必要なお金",
        };

        // 時間投資ボタン（通常カテゴリと同デザイン）
        const TimeInvestBtn = ({ idx }) => (
          <button onClick={() => {
            setSelCat({ id: "_time_invest_shortcut", label: "時間投資", icon: "⏳", iconBg: "#ede8ff", sub: [] });
            setInputStep("time_invest");
            setShowInput(true);
          }} style={{
            position: "relative", padding: "14px 12px", borderRadius: 18,
            background: "white", border: "1px solid #f0e8f4",
            boxShadow: "0 2px 12px rgba(160,100,200,0.08)",
            cursor: "pointer", textAlign: "left", overflow: "visible",
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <div style={{ position: "absolute", top: -8, right: 8, fontSize: 18, color: puzzleColors[idx % puzzleColors.length], lineHeight: 1 }}>🧩</div>
            <div style={{ width: 52, height: 52, borderRadius: "50%", flexShrink: 0, background: "#ede8ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>⏳</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#3a2a4a", marginBottom: 3 }}>時間投資</div>
              <div style={{ fontSize: 10, color: "#a090b0", lineHeight: 1.5, whiteSpace: "pre-line" }}>{"時間をつくる\nためのお金"}</div>
            </div>
            <div style={{ fontSize: 14, color: "#c8a0d8", flexShrink: 0 }}>›</div>
          </button>
        );

        // CATEGORIESを「自己投資」の直後に「時間投資」を挟んで並べる
        const gridItems = [];
        CATEGORIES.forEach((cat, idx) => {
          const isYen = cat.label === "必要な支出";
          gridItems.push(
            <button key={cat.id} onClick={() => { setSelCat(cat); setInputStep("sub"); setShowInput(true); }} style={{
              position: "relative", padding: "14px 12px", borderRadius: 18,
              background: "white", border: "1px solid #f0e8f4",
              boxShadow: "0 2px 12px rgba(160,100,200,0.08)",
              cursor: "pointer", textAlign: "left", overflow: "visible",
              display: "flex", alignItems: "center", gap: 10, minHeight: 100,
            }}>
              <div style={{ position: "absolute", top: -8, right: 8, fontSize: 18, color: puzzleColors[idx % puzzleColors.length], lineHeight: 1 }}>🧩</div>
              <div style={{ width: 52, height: 52, borderRadius: "50%", flexShrink: 0, background: cat.iconBg || "#f0e8f8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: isYen ? 700 : 400, color: isYen ? "#c49a2a" : undefined }}>{cat.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: ["体験・思い出","人とのつながり","社会貢献・応援"].includes(cat.label) ? 13 : 14, fontWeight: 700, color: "#3a2a4a", marginBottom: 3 }}>{cat.label}</div>
                <div style={{ fontSize: 10, color: "#a090b0", lineHeight: 1.5, whiteSpace: "pre-line" }}>{subTexts[cat.label] || ""}</div>
              </div>
              <div style={{ fontSize: 14, color: "#c8a0d8", flexShrink: 0 }}>›</div>
            </button>
          );
          // 自己投資の直後に時間投資を挿入
          if (cat.label === "自己投資") {
            gridItems.push(<TimeInvestBtn key="_time_invest" idx={idx + 1} />);
          }
          // 必要な支出の直後に一日のふりかえりを挿入
          if (cat.label === "必要な支出") {
            gridItems.push(
              <button key="_comfort_shortcut" onClick={() => {
                const today = new Date().toLocaleDateString("ja-JP");
                if (lastComfortDate === today) {
                  setComfortAlreadyToast(true);
                  setTimeout(() => setComfortAlreadyToast(false), 2500);
                  return;
                }
                setSelCat({ id: "_comfort_shortcut", label: "一日のふりかえり", icon: "🦋", iconBg: "#eef6ff", sub: [] });
                setInputStep("comfort_check");
                setShowInput(true);
              }} style={{
                position: "relative", padding: "14px 12px", borderRadius: 18,
                background: "linear-gradient(135deg, #f5f8ff, #eef3ff)",
                border: "1.5px dashed #b8ccf0",
                boxShadow: "0 1px 8px rgba(100,140,220,0.08)",
                cursor: "pointer", textAlign: "left", overflow: "visible",
                display: "flex", alignItems: "center", gap: 10, minHeight: 100,
              }}>
                <div style={{ width: 52, height: 52, borderRadius: "50%", flexShrink: 0, background: "#eeeaf8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, opacity: 0.75 }}>🦋</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#7090c0", marginBottom: 3 }}>１日の<br/>ふりかえり</div>
                  <div style={{ fontSize: 10, color: "#a0b0cc", lineHeight: 1.5 }}>コンフォートゾーンを超えた？</div>
                </div>
                <div style={{ fontSize: 14, color: "#b0c4e0", flexShrink: 0 }}>›</div>
              </button>
            );
          }
        });

        return (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            {gridItems}
          </div>
        );
      })()}

      {/* Hint */}
      <div style={{ textAlign: "center", fontSize: 12, color: "#c090c0", padding: "8px 0 12px" }}>
        🧩 迷ったときは、直感で選んでみてくださいね ♡
      </div>

      {/* 才能ピース プレビュー + 循環レポートリンク */}
      {(() => {
        const tagCounts = {};
        history.forEach(h => h.tags.forEach(t => { tagCounts[t] = (tagCounts[t] || 0) + 1; }));
        const TALENT_MAP = TALENT_TAG_MAP;
        // タグを領域別に集計
        const domainCounts = {};
        history.forEach(h => {
          (h.valueTags || []).forEach(tag => {
            const info = TALENT_MAP[tag];
            if (info) {
              domainCounts[info.label] = (domainCounts[info.label] || { count: 0, color: info.color, bar: info.bar });
              domainCounts[info.label].count++;
            }
          });
        });
        const pieces = Object.entries(domainCounts)
          .map(([label, v]) => ({ label, ...v }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 3);
        const maxCount = pieces.length > 0 ? pieces[0].count : 1;

        return (
          <div style={{
            margin: "0 0 16px", padding: "14px 16px",
            background: "white", borderRadius: 16,
            border: "1px solid #f0e8f8",
            boxShadow: "0 2px 12px rgba(160,100,200,0.08)",
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              {/* 左：才能ピース */}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#7a5a98", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                  🧩 <span>あなたの才能ピース 🧩</span>
                </div>
                <div style={{ fontSize: 11, color: "#a090b0", marginBottom: 10, lineHeight: 1.4 }}>支出からあなたの隠れた才能が見えてきます</div>
                {pieces.length === 0 ? (
                  <div style={{ fontSize: 12, color: "#c0a8d0", lineHeight: 1.6 }}>
                    支出を記録すると<br />才能ピースが育ちます🌱
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    {pieces.map(p => {
                      const grown = recentlyGrownPieces.includes(p.label);
                      return (
                        <div key={p.label} style={{ display: "flex", alignItems: "center", gap: 8, position: "relative" }}>
                          <div style={{ fontSize: 12, color: "#6a5080", width: 80, flexShrink: 0 }}>{p.label}</div>
                          <div style={{
                            flex: 1, height: 10, borderRadius: 999, background: "#f4f0f8", overflow: "hidden",
                            boxShadow: grown ? `0 0 0 2px ${p.bar}55` : "none", transition: "box-shadow 0.4s ease",
                          }}>
                            <div style={{
                              height: "100%", borderRadius: 999,
                              width: `${Math.round((p.count / maxCount) * 100)}%`,
                              background: `linear-gradient(90deg, ${p.bar}99, ${p.bar})`,
                              transition: "width 0.6s ease",
                            }} />
                          </div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: p.bar, width: 20, textAlign: "right" }}>{p.count}</div>
                          {grown && (
                            <span style={{
                              position: "absolute", right: 18, top: -14, fontSize: 10, fontWeight: 700,
                              color: p.bar, background: "white", padding: "1px 6px", borderRadius: 999,
                              border: `1px solid ${p.bar}66`, animation: "slideUpIn 0.4s ease, fadeOut 0.6s 2s ease forwards",
                            }}>+1</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 右：循環レポートリンク */}
              <button onClick={() => setTab("report")} style={{
                marginLeft: 14, display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                background: "none", border: "none", cursor: "pointer", padding: "2px 4px", flexShrink: 0,
                alignSelf: "center",
              }}>
                <span style={{ fontSize: 28 }}>📊</span>
                <span style={{ fontSize: 10, color: "#22c55e", fontWeight: 700 }}>マイページ</span>
              </button>
            </div>
          </div>
        );
      })()}

    </div>
    );
  };

  // ── REPORT TAB ──────────────────────────────────────────────
  const ReportTab = () => {
    const [inviteCopied, setInviteCopied] = useState(false);
    const [licenseDraft, setLicenseDraft] = useState(() => loadLS("license_key", ""));
    const [licenseSavedMsg, setLicenseSavedMsg] = useState("");
    const tagCounts = {};
    history.forEach(h => h.tags.forEach(t => { tagCounts[t] = (tagCounts[t] || 0) + 1; }));
    const totalEnergy = history.reduce((s, h) => s + h.energy, 0);
    const loveCount = history.filter(h => (h.aiPct ?? 0) >= 65).length;
    const lovePct = history.length > 0 ? Math.round((loveCount / history.length) * 100) : 0;
    const catCounts = {};
    history.forEach(h => { catCounts[h.cat] = (catCounts[h.cat] || 0) + 1; });
    const topCats = Object.entries(catCounts).sort((a, b) => b[1] - a[1]).slice(0, 4);
    const mirai = tagCounts["mirai"] || 0;
    const hajimete = tagCounts["hajimete"] || 0;
    const dareka = tagCounts["dareka"] || 0;
    const kanjou = tagCounts["kanjou"] || 0;
    const comfort = tagCounts["comfort"] || 0;
    const REPORT_COLORS = ["#4db8c8", "#d4a843", "#c07fb0", "#6a7ca8", "#e8c870", "#b06a9a", "#2a9aaa"];

    return (
      <div style={{ padding: "20px 20px 100px" }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: "#22c55e", letterSpacing: 2, marginBottom: 4 }}>✦ マイページ ✦</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.softWhite, marginBottom: 16 }}>人生の拡張履歴</div>

        {/* 器カード */}
        <div onClick={addRipple} style={{
          position: "relative", overflow: "hidden",
          background: `linear-gradient(145deg, ${COLORS.indigoDeep}, ${COLORS.midnightBlue})`,
          borderRadius: 24, padding: "20px 18px", marginBottom: 12,
          border: `1px solid ${COLORS.goldPrimary}33`,
          boxShadow: `0 6px 30px #00000050, inset 0 1px 0 ${COLORS.goldPrimary}22`,
          cursor: "pointer",
        }}>
          {ripples.map(r => (
            <div key={r.id} style={{
              position: "absolute", left: r.x, top: r.y,
              width: 4, height: 4, borderRadius: "50%", pointerEvents: "none",
              transform: "translate(-50%, -50%)",
              border: `1px solid ${COLORS.aquaTeal}aa`,
              animation: "rippleOut 1.5s ease-out forwards",
            }} />
          ))}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <VesselDisplay level={level} energy={energy} maxEnergy={nextLevel?.needed || 300} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: COLORS.mutedText, marginBottom: 2 }}>現在の器</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.softWhite, marginBottom: 2 }}>
                {curLevel.emoji} {curLevel.label}
              </div>
              <div style={{
                fontSize: 26, fontWeight: 900, lineHeight: 1,
                background: `linear-gradient(135deg, ${COLORS.goldGlow}, ${COLORS.goldLight})`,
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              }}>{energy}<span style={{ fontSize: 13, fontWeight: 500, WebkitTextFillColor: COLORS.mutedText }}> pt</span></div>
              {nextLevel && (
                <>
                  <div style={{ fontSize: 13, color: COLORS.mutedText, marginTop: 6, marginBottom: 4 }}>
                    次のLv.{nextLevel.lv}まで あと {nextLevel.needed - energy}pt
                  </div>
                  <div style={{ height: 5, background: COLORS.circleBlue, borderRadius: 3, overflow: "hidden" }}>
                    <div style={{
                      height: "100%", borderRadius: 3, width: `${progressPct}%`,
                      background: `linear-gradient(to right, ${COLORS.aquaTeal}, ${COLORS.goldLight})`,
                      transition: "width 0.8s ease",
                    }} />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 成長ステージ */}
        <div style={{ background: `${COLORS.indigoDeep}cc`, borderRadius: 20, padding: 16, marginBottom: 16, border: `1px solid ${COLORS.circleBlue}` }}>
          <div style={{ fontSize: 15, color: COLORS.mutedText, letterSpacing: 1, marginBottom: 12 }}>器の成長ステージ</div>
          <div style={{ display: "flex", gap: 4, alignItems: "flex-end" }}>
            {LEVELS.map(l => {
              const active = l.lv <= level;
              const current = l.lv === level;
              return (
                <div key={l.lv} style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ fontSize: current ? 20 : 13, marginBottom: 4, filter: active ? "none" : "grayscale(100%) opacity(0.3)", transition: "all 0.5s" }}>{l.emoji}</div>
                  <div style={{ height: current ? 40 : 24, borderRadius: "4px 4px 0 0", background: active ? `linear-gradient(to top, ${l.color}, ${l.color}88)` : COLORS.circleBlue, transition: "all 0.5s" }} />
                  <div style={{ fontSize: 9, color: current ? COLORS.goldLight : COLORS.mutedText, marginTop: 4 }}>{l.needed}pt</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* カテゴリ別・器への貢献（因果の可視化）*/}
        {topCats.length > 0 && (() => {
          const catEnergy = {};
          history.forEach(h => { catEnergy[h.cat] = (catEnergy[h.cat] || 0) + (h.energy || 0); });
          const totalCatE = Object.values(catEnergy).reduce((s, v) => s + v, 0) || 1;
          const sorted = Object.entries(catEnergy).sort((a, b) => b[1] - a[1]);
          const CAT_COLORS_R = {
            "自己投資":       { bar: "#8b5cf6", badge: "#f5f3ff", tc: "#7c3aed" },
            "健康・美容":     { bar: "#34d399", badge: "#ecfdf5", tc: "#059669" },
            "体験・思い出":   { bar: "#fbbf24", badge: "#fffbeb", tc: "#d97706" },
            "人とのつながり": { bar: "#f472b6", badge: "#fdf2f8", tc: "#db2777" },
            "暮らしを整える": { bar: "#fb923c", badge: "#fff7ed", tc: "#ea580c" },
            "楽しみ・ごほうび":{ bar: "#facc15", badge: "#fefce8", tc: "#ca8a04" },
            "社会貢献・応援": { bar: "#38bdf8", badge: "#f0f9ff", tc: "#0284c7" },
            "必要な支出":     { bar: "#9ca3af", badge: "#f9fafb", tc: "#6b7280" },
          };
          const maxE = sorted[0]?.[1] || 1;
          return (
            <div style={{ background: "white", borderRadius: 20, padding: "18px 18px 14px", marginBottom: 16, border: "1px solid #c49a2a55", boxShadow: "0 2px 16px rgba(196,154,42,0.08)" }}>
              <div style={{ fontSize: 11, color: "#8a7060", letterSpacing: 1, marginBottom: 4 }}>カテゴリ別・器への貢献</div>
              <div style={{ fontSize: 10, color: "#a09080", marginBottom: 14 }}>どの使い方が器を最も育てたか</div>
              {sorted.map(([cat, eng], i) => {
                const catInfo = CATEGORIES.find(c => c.label === cat);
                const info = CAT_COLORS_R[cat] || { bar: "#a87ad8", badge: "#faf6ff", tc: "#7a5a98" };
                const pct = Math.round((eng / totalCatE) * 100);
                const isTop = i === 0;
                return (
                  <div key={cat} style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: "#3a3030", display: "flex", alignItems: "center", gap: 5 }}>
                        {catInfo?.icon} {cat}
                        {isTop && <span style={{ fontSize: 9, background: `${info.bar}22`, color: info.tc || info.bar, borderRadius: 999, padding: "1px 6px", fontWeight: 700 }}>最多貢献</span>}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: info.tc || info.bar }}>
                        {eng}pt <span style={{ fontSize: 9, color: "#a09080", fontWeight: 400 }}>({pct}%)</span>
                      </span>
                    </div>
                    <div style={{ height: 6, background: `${info.bar}18`, borderRadius: 3 }}>
                      <div style={{
                        height: "100%", borderRadius: 3,
                        width: `${(eng / maxE) * 100}%`,
                        background: `linear-gradient(to right, ${info.bar}, ${info.bar}88)`,
                        transition: "width 0.8s ease",
                        boxShadow: `0 0 6px ${info.bar}33`,
                      }} />
                    </div>
                  </div>
                );
              })}
              {/* 一言メッセージ＋アクション */}
              {sorted[0] && (() => {
                const topCat = sorted[0][0];
                const nextLv = LEVELS.find(l => l.lv === level + 1);
                const remaining = nextLv ? nextLv.needed - energy : 0;
                const isJiko = topCat === "自己投資";
                const actionMsg = nextLv
                  ? `次のLv.${level + 1}まであと${remaining}pt ——${isJiko ? "自己投資を続けることが一番の近道です" : `「${topCat}」への支出を続けましょう`}`
                  : "器は最大レベルに達しています！才能パズルへ進みましょう 🧩";
                return (
                  <div style={{
                    marginTop: 10, padding: "12px 14px", borderRadius: 12,
                    background: "#fffdf0", border: "1px solid #c49a2a44",
                    fontSize: 11, color: "#6a5030", lineHeight: 1.8,
                  }}>
                    <div style={{ marginBottom: 6 }}>
                      {isJiko
                        ? "✦ 自己投資が器の成長をいちばん牽引しています。この調子で学びを続けましょう 📚"
                        : `✦「${topCat}」への支出が器を最も育てています。あなたの価値観がここに現れています。`}
                    </div>
                    <div style={{
                      marginTop: 6, padding: "8px 12px", borderRadius: 8,
                      background: "#c49a2a18", border: "1px solid #c49a2a33",
                      fontSize: 11, color: "#8a6010", fontWeight: 600,
                    }}>
                      💡 {actionMsg}
                    </div>
                  </div>
                );
              })()}
            </div>
          );
        })()}

        {/* 才能ピース トータル実績 */}
        {(() => {
          const domainTotals = {};
          history.forEach(h => {
            (h.valueTags || []).forEach(tag => {
              const info = TALENT_TAG_MAP[tag];
              if (info) {
                if (!domainTotals[info.label]) domainTotals[info.label] = { count: 0, bar: info.bar, color: info.color };
                domainTotals[info.label].count++;
              }
            });
          });
          const allDomains = Object.entries(domainTotals).sort((a, b) => b[1].count - a[1].count);
          const maxCount = allDomains[0]?.[1]?.count || 1;
          return (
            <div style={{ background: "white", borderRadius: 20, padding: "18px 18px 14px", marginBottom: 16, border: "1px solid #e0d8f0", boxShadow: "0 2px 16px rgba(160,100,200,0.08)" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#7a5a98", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                🧩 あなたの才能、育ってます
              </div>
              <div style={{ fontSize: 10, color: "#a090b0", marginBottom: 14 }}>使うたびに、あなたの"普通"がピースになっていく</div>
              {allDomains.length === 0 ? (
                <div style={{ fontSize: 12, color: "#c0a8d0", lineHeight: 1.6 }}>支出を記録すると才能ピースが育ちます🌱</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {allDomains.map(([label, v], i) => (
                    <div key={label}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, alignItems: "center" }}>
                        <span style={{ fontSize: 12, color: "#3a2a4a", fontWeight: i === 0 ? 700 : 400 }}>
                          {i === 0 ? "🌟 " : ""}{label}
                          {i === 0 && <span style={{ fontSize: 9, background: `${v.bar}22`, color: v.bar, borderRadius: 999, padding: "1px 6px", marginLeft: 6, fontWeight: 700 }}>最多</span>}
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: v.bar }}>{v.count}個</span>
                      </div>
                      <div style={{ height: 8, borderRadius: 999, background: "#f4f0f8", overflow: "hidden" }}>
                        <div style={{
                          height: "100%", borderRadius: 999,
                          width: `${Math.round((v.count / maxCount) * 100)}%`,
                          background: `linear-gradient(90deg, ${v.bar}88, ${v.bar})`,
                          transition: "width 0.8s ease",
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}


        {/* プレミアム機能（ライセンスキー） */}
        <div style={{ marginTop: 8, marginBottom: 16, padding: "14px 16px", borderRadius: 16, background: `${COLORS.indigoDeep}44`, border: `1px solid ${COLORS.goldPrimary}55` }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.goldLight, letterSpacing: 1, marginBottom: 4 }}>プレミアム機能</div>
          <div style={{ fontSize: 11, color: COLORS.mutedText, marginBottom: 10, lineHeight: 1.7 }}>
            ライセンスキーをお持ちの方は、こちらに入力して保存すると、AIによる循環ストーリーや才能パズルのすべての機能をお使いいただけます。
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              value={licenseDraft}
              onChange={(e) => { setLicenseDraft(e.target.value); setLicenseSavedMsg(""); }}
              placeholder="UTSUWA-XXXX-XXXX"
              style={{
                flex: 1, padding: "8px 12px", borderRadius: 10, fontSize: 12,
                background: `${COLORS.indigoDeep}88`, border: `1px solid ${COLORS.circleBlue}`,
                color: COLORS.softWhite, outline: "none", letterSpacing: 1,
              }}
            />
            <button onClick={() => {
              const key = licenseDraft.trim();
              saveLS("license_key", key);
              setLicenseDraft(key);
              setLicenseSavedMsg(key ? "✓ 保存しました" : "キーを削除しました");
            }} style={{
              padding: "8px 16px", borderRadius: 10, fontSize: 12, fontWeight: 700,
              background: `${COLORS.goldPrimary}33`, border: `1px solid ${COLORS.goldPrimary}77`,
              color: COLORS.goldLight, cursor: "pointer", whiteSpace: "nowrap",
            }}>保存</button>
          </div>
          {licenseSavedMsg && (
            <div style={{ fontSize: 11, color: COLORS.goldLight, marginTop: 8 }}>{licenseSavedMsg}</div>
          )}
          <div style={{ fontSize: 10, color: COLORS.mutedText, marginTop: 8 }}>
            現在の状態: {loadLS("license_key", "") ? "キー登録済み" : "未登録（無料版）"}
          </div>
        </div>

        {/* 循環タグ内訳 */}
        <div style={{ background: `${COLORS.indigoDeep}cc`, borderRadius: 20, padding: "18px 18px 14px", marginBottom: 16, border: `1px solid ${COLORS.circleBlue}` }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.softWhite, letterSpacing: 2, marginBottom: 14, textAlign: "center" }}>【いままでの循環実績】</div>
          {CIRCULATION_TAGS.map((tag, idx) => {
            const count = tagCounts[tag.id] || 0;
            const max = Math.max(...Object.values(tagCounts), 1);
            const barColor = REPORT_COLORS[idx % REPORT_COLORS.length];
            return (
              <div key={tag.id} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: COLORS.softWhite }}>{tag.icon} {tag.label}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: barColor, background: `${barColor}18`, borderRadius: 8, padding: "1px 8px" }}>{count}回</span>
                </div>
                <div style={{ height: 6, background: `${barColor}22`, borderRadius: 3 }}>
                  <div style={{ height: "100%", borderRadius: 3, width: `${(count / max) * 100}%`, background: `linear-gradient(to right, ${barColor}, ${barColor}88)`, transition: "width 0.8s ease", boxShadow: `0 0 8px ${barColor}44` }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* 才能パズル（Lv5） */}
        {level >= 5 && (
          <div style={{ background: "linear-gradient(135deg, #1a0a3a, #2a0a5a)", borderRadius: 20, padding: 20, marginBottom: 16, border: "1px solid #c07fb066", textAlign: "center", boxShadow: "0 0 40px #c07fb033" }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>🧩</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#ffd97a", marginBottom: 8 }}>才能パズル機能が解放されました！</div>
            <div style={{ fontSize: 12, color: "#aaa", marginBottom: 16 }}>あなたの循環パターンから「普通」が才能に変わる瞬間を発見します<span style={{ fontSize: 10, color: "#8a7a9a", marginLeft: 4 }}>（プレミアム機能）</span></div>
            <button onClick={() => setShowTalentMatch(true)} style={{
              padding: "12px 28px", borderRadius: 999, fontSize: 14, fontWeight: 700,
              background: "linear-gradient(135deg, #c49a2a, #ffd97a)", border: "none",
              color: "#1a0a1a", cursor: "pointer", boxShadow: "0 4px 20px #ffd97a44",
            }}>✦ 才能パズルを見る</button>
          </div>
        )}

        {/* 補完ピース図鑑（Lv5以降・才能パズル実施済みなら表示） */}
        {level >= 5 && (() => {
          const puzzleResult = loadLS("talentPuzzleResult", null);
          const needs = puzzleResult?.complementaryNeeds || [];
          return (
            <div style={{ background: "white", borderRadius: 20, padding: "18px 18px 16px", marginBottom: 16, border: "1px solid #e0d8f0", boxShadow: "0 2px 16px rgba(160,100,200,0.08)" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#7a5a98", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                🧩 補完ピース図鑑
              </div>
              <div style={{ fontSize: 12, color: "#a090b0", marginBottom: 14 }}>あなたと補い合うことで、循環が大きく育つ人の特徴</div>
              {needs.length === 0 ? (
                <div style={{ fontSize: 12, color: "#c0a8d0", lineHeight: 1.6 }}>
                  「才能パズルを見る」から診断すると、ここにあなたを補完する才能が表示されます（プレミアム機能）🌱
                </div>
              ) : (
                <>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
                    {needs.map((n, i) => (
                      <div key={i} style={{
                        background: "#faf7fd", borderRadius: 14, padding: "12px 14px",
                        border: "1px solid #ecd8f5",
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 20 }}>{n.emoji}</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "#7a5a98" }}>{n.title}</span>
                        </div>
                        <div style={{ fontSize: 12, color: "#5a4a68", lineHeight: 1.7 }}>{n.description}</div>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => {
                    try {
                      const payload = {
                        talents: (puzzleResult?.talents || []).map(t => t.title).filter(Boolean),
                        complementaryNeeds: needs.map(n => n.title).filter(Boolean),
                        level,
                        savedAt: new Date().toISOString(),
                      };
                      const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
                      const url = `${window.location.origin}${window.location.pathname}?invite=${encoded}`;
                      if (navigator.clipboard?.writeText) {
                        navigator.clipboard.writeText(url);
                      }
                      setInviteCopied(true);
                      setTimeout(() => setInviteCopied(false), 2500);
                    } catch {}
                  }} style={{
                    width: "100%", padding: "10px 16px", borderRadius: 999, fontSize: 12, fontWeight: 700,
                    background: inviteCopied ? "#e8f5e9" : "#faf7fd",
                    border: `1px solid ${inviteCopied ? "#66bb6a" : "#c07fb0"}`,
                    color: inviteCopied ? "#2e7d32" : "#7a5a98", cursor: "pointer",
                  }}>{inviteCopied ? "✓ リンクをコピーしました" : "🔗 招待リンクをコピー（ふたりの器）"}</button>
                </>
              )}
            </div>
          );
        })()}

        {/* ふたりの器（相手の招待リンクから開いた場合に表示） */}
        {partnerResult && (() => {
          const own = loadLS("talentPuzzleResult", null);
          return (
            <div style={{ background: "linear-gradient(135deg, #fff8f0, #fff0f5)", borderRadius: 20, padding: "18px 18px 16px", marginBottom: 16, border: "1px solid #f0c0d0" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#b06a8a", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                💞 ふたりの器
              </div>
              <div style={{ fontSize: 10, color: "#c090a0", marginBottom: 14 }}>招待リンクから届いた、もう一つの器</div>
              <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                <div style={{ flex: 1, background: "white", borderRadius: 14, padding: "12px 12px", border: "1px solid #f0d8e0" }}>
                  <div style={{ fontSize: 10, color: "#b06a8a", fontWeight: 700, marginBottom: 8 }}>あなたの才能</div>
                  {(own?.talents || []).map((t, i) => (
                    <div key={i} style={{ fontSize: 11, color: "#5a4a68", marginBottom: 4 }}>{t.emoji} {t.title}</div>
                  ))}
                  {(!own?.talents || own.talents.length === 0) && (
                    <div style={{ fontSize: 10, color: "#c0a8b0" }}>まだ才能パズル未診断</div>
                  )}
                </div>
                <div style={{ flex: 1, background: "white", borderRadius: 14, padding: "12px 12px", border: "1px solid #f0d8e0" }}>
                  <div style={{ fontSize: 10, color: "#b06a8a", fontWeight: 700, marginBottom: 8 }}>相手の才能</div>
                  {(partnerResult.talents || []).map((title, i) => (
                    <div key={i} style={{ fontSize: 11, color: "#5a4a68", marginBottom: 4 }}>✦ {title}</div>
                  ))}
                </div>
              </div>
              <div style={{ background: "white", borderRadius: 14, padding: "12px 12px", border: "1px solid #f0d8e0", marginBottom: 10 }}>
                <div style={{ fontSize: 10, color: "#b06a8a", fontWeight: 700, marginBottom: 8 }}>相手が求めている補完ピース</div>
                {(partnerResult.complementaryNeeds || []).map((title, i) => (
                  <div key={i} style={{ fontSize: 11, color: "#5a4a68", marginBottom: 4 }}>🧩 {title}</div>
                ))}
                {(!partnerResult.complementaryNeeds || partnerResult.complementaryNeeds.length === 0) && (
                  <div style={{ fontSize: 10, color: "#c0a8b0" }}>情報なし</div>
                )}
              </div>
              <div style={{ fontSize: 11, color: "#c090a0", lineHeight: 1.7, marginBottom: 10 }}>
                お互いの才能と補完ピースを見比べて、どんな循環が生まれそうか話してみてください✨
              </div>
              <button onClick={() => { setPartnerResult(null); saveLS("partnerResult", null); }} style={{
                fontSize: 10, color: "#c090a0", background: "none", border: "none", cursor: "pointer", textDecoration: "underline",
              }}>この表示を消す</button>
            </div>
          );
        })()}


        <div style={{ background: `${COLORS.indigoDeep}88`, borderRadius: 16, padding: 16, marginBottom: 16, border: `1px solid ${COLORS.lotusRose}33` }}>
          <div style={{ fontSize: 11, color: COLORS.lotusLight, letterSpacing: 1, marginBottom: 8 }}>愛か恐れか——お金の使い方の本質</div>
          {[
            { label: "「この人を喜ばせたい」でプレゼントを選ぶ", type: "愛", icon: "💛" },
            { label: "「取り残されるから」で講座を申し込む", type: "恐れ", icon: "🌫️" },
            { label: "「自分を大切にしたい」でマッサージへ", type: "愛", icon: "🌸" },
          ].map((ex, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, padding: "8px 10px", borderRadius: 10, background: ex.type === "愛" ? `${COLORS.aquaTeal}11` : `${COLORS.lotusRose}11` }}>
              <span>{ex.icon}</span>
              <span style={{ fontSize: 11, color: COLORS.softWhite, flex: 1 }}>{ex.label}</span>
              <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 8, background: ex.type === "愛" ? `${COLORS.aquaTeal}33` : `${COLORS.lotusRose}33`, color: ex.type === "愛" ? COLORS.aquaLight : COLORS.lotusLight }}>{ex.type}</span>
            </div>
          ))}
        </div>


        {/* AI判定の再実行（⑥フォールバック記録） */}
        {history.some(h => h.aiFallback) && (
          <div style={{ marginTop: 8, padding: "14px 16px", borderRadius: 16, background: `${COLORS.goldPrimary}18`, border: `1px solid ${COLORS.goldPrimary}44` }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.goldLight, letterSpacing: 1, marginBottom: 4 }}>AI判定<span style={{ fontSize: 10, fontWeight: 400, color: COLORS.mutedText, marginLeft: 6 }}>（プレミアム機能）</span></div>
            <div style={{ fontSize: 11, color: COLORS.mutedText, marginBottom: 10 }}>
              {history.filter(h => h.aiFallback).length}件の記録が、AIが混み合っていた（またはお休み中だった）ため簡易判定のままです。今のうちに、本来のAI判定を反映できます。
            </div>
            <button onClick={retryFallbackEntries} disabled={retryingFallback} style={{
              width: "100%", padding: "10px 16px", borderRadius: 10, fontSize: 12, fontWeight: 700,
              background: retryingFallback ? `${COLORS.goldPrimary}22` : `${COLORS.goldPrimary}33`,
              border: `1px solid ${COLORS.goldPrimary}77`, color: COLORS.goldLight,
              cursor: retryingFallback ? "default" : "pointer", opacity: retryingFallback ? 0.7 : 1,
            }}>{retryingFallback ? "判定中…" : "✨ AI判定を再実行"}</button>
          </div>
        )}


        {/* 循環記録：リスト／カレンダー切り替え */}
        <div style={{ marginBottom: 16 }}>
          {/* ヘッダー＋切り替えボタン */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: COLORS.mutedText, letterSpacing: 1 }}>循環記録</div>
            <div style={{ display: "flex", gap: 0, borderRadius: 10, overflow: "hidden", border: `1px solid ${COLORS.circleBlue}` }}>
              {[{ label: "リスト", val: false }, { label: "カレンダー", val: true }].map(opt => (
                <button key={opt.label} onClick={() => setCalendarView(opt.val)} style={{
                  padding: "5px 12px", fontSize: 11, fontWeight: calendarView === opt.val ? 700 : 400,
                  background: calendarView === opt.val ? COLORS.aquaTeal : "transparent",
                  color: calendarView === opt.val ? "#fff" : COLORS.mutedText,
                  border: "none", cursor: "pointer", transition: "all 0.2s",
                }}>{opt.label}</button>
              ))}
            </div>
          </div>

          {/* リスト表示 */}
          {!calendarView && (
            <div>
              {history.slice(0, 5).map((item, i) => (
                <div key={i} style={{
                  background: `${COLORS.indigoDeep}88`, borderRadius: 16, padding: "12px 14px",
                  marginBottom: 8, border: `1px solid ${COLORS.circleBlue}`,
                  display: "flex", alignItems: "flex-start", gap: 12,
                }}>
                  <div style={{ textAlign: "center", minWidth: 32 }}>
                    <div style={{ fontSize: 10, color: COLORS.mutedText }}>{item.date}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: item.energy >= 25 ? COLORS.goldGlow : item.energy >= 5 ? COLORS.aquaLight : COLORS.softWhite }}>+{item.energy}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: COLORS.softWhite, marginBottom: 2 }}>{item.cat}</div>
                    <div style={{ fontSize: 11, color: COLORS.mutedText, marginBottom: 6 }}>{item.feeling}</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {item.tags.slice(0, 3).map(t => {
                        const tag = CIRCULATION_TAGS.find(x => x.id === t);
                        return tag ? (
                          <span key={t} style={{ fontSize: 9, padding: "2px 6px", borderRadius: 10, background: `${COLORS.aquaTeal}18`, border: `1px solid ${COLORS.aquaTeal}33`, color: COLORS.aquaLight }}>
                            {tag.icon} {tag.label}
                          </span>
                        ) : null;
                      })}
                    </div>
                    {item.ai && <div style={{ fontSize: 10, color: COLORS.lotusLight, marginTop: 6, fontStyle: "italic" }}>"{item.ai}"</div>}
                    {item.aiPct !== undefined && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
                        <div style={{ flex: 1, height: 3, borderRadius: 2, background: `${COLORS.lotusRose}44`, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${item.aiPct}%`, background: `linear-gradient(to right, ${COLORS.aquaTeal}, ${COLORS.aquaLight})` }} />
                        </div>
                        <span style={{ fontSize: 9, color: item.aiPct >= 65 ? COLORS.aquaTeal : COLORS.lotusLight, whiteSpace: "nowrap" }}>
                          {item.aiPct >= 65 ? "❤️ 愛" : item.aiPct <= 35 ? "🌫️ 恐れ" : "⚬ 混在"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* カレンダー表示 */}
          {calendarView && (() => {
            const { y, m } = calendarMonth;
            const firstDay = new Date(y, m, 1).getDay(); // 0=日
            const daysInMonth = new Date(y, m + 1, 0).getDate();
            const monthLabel = `${y}年${m + 1}月`;
            const DAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

            // 日付→記録のマップ（"M/D"形式でhistoryを索引）
            const dayMap = {};
            history.forEach(item => {
              const key = item.date; // e.g. "6/6"
              if (!dayMap[key]) dayMap[key] = [];
              dayMap[key].push(item);
            });

            // 日付文字列生成（historyのdate形式に合わせる）
            const makeDateStr = (d) => `${m + 1}/${d}`;

            return (
              <div style={{ background: `${COLORS.indigoDeep}cc`, borderRadius: 16, padding: 16, border: `1px solid ${COLORS.circleBlue}` }}>
                {/* 月ナビ */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <button onClick={() => setCalendarMonth(({ y, m }) => m === 0 ? { y: y - 1, m: 11 } : { y, m: m - 1 })}
                    style={{ background: "none", border: "none", color: COLORS.mutedText, fontSize: 18, cursor: "pointer", padding: "0 8px" }}>‹</button>
                  <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.softWhite }}>{monthLabel}</div>
                  <button onClick={() => setCalendarMonth(({ y, m }) => m === 11 ? { y: y + 1, m: 0 } : { y, m: m + 1 })}
                    style={{ background: "none", border: "none", color: COLORS.mutedText, fontSize: 18, cursor: "pointer", padding: "0 8px" }}>›</button>
                </div>

                {/* 曜日ヘッダー */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 6 }}>
                  {DAY_LABELS.map((d, i) => (
                    <div key={d} style={{ textAlign: "center", fontSize: 10, color: i === 0 ? "#f87171" : i === 6 ? COLORS.aquaLight : COLORS.mutedText, fontWeight: 600, paddingBottom: 4 }}>{d}</div>
                  ))}
                </div>

                {/* 日付グリッド */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>
                  {/* 空白（月初の曜日オフセット）*/}
                  {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
                  {/* 日付セル */}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const d = i + 1;
                    const dateStr = makeDateStr(d);
                    const items = dayMap[dateStr] || [];
                    const hasRecord = items.length > 0;
                    const totalPt = items.reduce((s, h) => s + (h.energy || 0), 0);
                    const today = new Date();
                    const isToday = today.getFullYear() === y && today.getMonth() === m && today.getDate() === d;
                    // 愛か恐れかでドット色を決定（愛=ティール、混在=ゴールド、恐れ=グレー）
                    const avgAiPct = items.length > 0
                      ? items.reduce((s, h) => s + (h.aiPct ?? 50), 0) / items.length
                      : 50;
                    const dotColor = avgAiPct >= 65 ? COLORS.aquaTeal : avgAiPct <= 35 ? "#b0a0b8" : COLORS.goldGlow;

                    return (
                      <button key={d} onClick={() => hasRecord && setCalendarSelected({ dateStr, items })}
                        style={{
                          position: "relative", width: "100%", aspectRatio: "1",
                          borderRadius: 8, border: isToday ? `1.5px solid ${COLORS.goldLight}` : "1px solid transparent",
                          background: hasRecord ? `${COLORS.aquaTeal}18` : "transparent",
                          cursor: hasRecord ? "pointer" : "default",
                          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                          padding: 0, transition: "background 0.15s",
                        }}>
                        <span style={{ fontSize: 12, color: isToday ? COLORS.goldLight : hasRecord ? COLORS.softWhite : COLORS.mutedText, fontWeight: isToday ? 700 : 400, lineHeight: 1 }}>{d}</span>
                        {hasRecord && (
                          <div style={{ display: "flex", gap: 2, marginTop: 3, flexWrap: "wrap", justifyContent: "center" }}>
                            {items.slice(0, 3).map((_, di) => (
                              <div key={di} style={{ width: 4, height: 4, borderRadius: "50%", background: dotColor }} />
                            ))}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
                <div style={{ marginTop: 10, fontSize: 10, color: COLORS.mutedText, textAlign: "center" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: COLORS.aquaTeal, display: "inline-block" }} /> 愛から</span> <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: COLORS.goldGlow, display: "inline-block" }} /> 混在</span> <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: "#b0a0b8", display: "inline-block" }} /> 恐れから</span>
                </div>
              </div>
            );
          })()}
        </div>

        {/* カレンダー詳細モーダル */}
        {calendarSelected && (
          <div onClick={() => setCalendarSelected(null)} style={{
            position: "fixed", inset: 0, background: "#00000077", zIndex: 200,
            display: "flex", alignItems: "flex-end", justifyContent: "center",
          }}>
            <div onClick={e => e.stopPropagation()} style={{
              width: "100%", maxWidth: 390,
              background: COLORS.midnightBlue,
              borderRadius: "24px 24px 0 0",
              padding: "24px 20px 40px",
              border: `1px solid ${COLORS.circleBlue}`,
              animation: "slideUpIn 0.3s cubic-bezier(0.16,1,0.3,1)",
              maxHeight: "70vh", overflowY: "auto",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.softWhite }}>{calendarSelected.dateStr} の記録</div>
                <button onClick={() => setCalendarSelected(null)} style={{ background: "none", border: "none", color: COLORS.mutedText, fontSize: 20, cursor: "pointer" }}>✕</button>
              </div>
              {calendarSelected.items.map((item, i) => (
                <div key={i} style={{
                  background: `${COLORS.indigoDeep}88`, borderRadius: 16, padding: "12px 14px",
                  marginBottom: 10, border: `1px solid ${COLORS.circleBlue}`,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.softWhite }}>{item.cat}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.goldGlow }}>+{item.energy}pt</div>
                  </div>
                  <div style={{ fontSize: 11, color: COLORS.mutedText, marginBottom: 6 }}>{item.feeling}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
                    {item.tags.map(t => {
                      const tag = CIRCULATION_TAGS.find(x => x.id === t);
                      return tag ? (
                        <span key={t} style={{ fontSize: 9, padding: "2px 6px", borderRadius: 10, background: `${COLORS.aquaTeal}18`, border: `1px solid ${COLORS.aquaTeal}33`, color: COLORS.aquaLight }}>
                          {tag.icon} {tag.label}
                        </span>
                      ) : null;
                    })}
                  </div>
                  {item.ai && <div style={{ fontSize: 10, color: COLORS.lotusLight, fontStyle: "italic" }}>"{item.ai}"</div>}
                  {item.aiPct !== undefined && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
                      <div style={{ flex: 1, height: 3, borderRadius: 2, background: `${COLORS.lotusRose}44`, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${item.aiPct}%`, background: `linear-gradient(to right, ${COLORS.aquaTeal}, ${COLORS.aquaLight})` }} />
                      </div>
                      <span style={{ fontSize: 9, color: item.aiPct >= 65 ? COLORS.aquaTeal : COLORS.lotusLight, whiteSpace: "nowrap" }}>
                        {item.aiPct >= 65 ? "❤️ 愛" : item.aiPct <= 35 ? "🌫️ 恐れ" : "⚬ 混在"}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 総合エネルギー + 愛か恐れか */}
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          <div style={{ flex: 1, background: "linear-gradient(135deg, #c49a2a22, #f0ede6)", borderRadius: 20, padding: 16, border: "1px solid #c49a2a33", textAlign: "center" }}>
            <div style={{ fontSize: 10, color: COLORS.mutedText, marginBottom: 4 }}>総循環エネルギー</div>
            <div style={{ fontSize: 32, fontWeight: 900, background: "linear-gradient(135deg, #e8b84b, #d4a843)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{totalEnergy}<span style={{ fontSize: 12 }}>pt</span></div>
          </div>
          <div style={{ flex: 1, background: "linear-gradient(135deg, #4db8c822, #f0ede6)", borderRadius: 20, padding: 16, border: "1px solid #4db8c833", textAlign: "center" }}>
            <div style={{ fontSize: 10, color: COLORS.mutedText, marginBottom: 6 }}>愛の支出率</div>
            <div style={{ position: "relative", height: 8, background: "#c07fb044", borderRadius: 4, marginBottom: 6 }}>
              <div style={{ position: "absolute", left: 0, top: 0, height: "100%", borderRadius: 4, width: `${lovePct}%`, background: "linear-gradient(to right, #4db8c8, #2a9aaa)", transition: "width 1s ease" }} />
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#4db8c8" }}>{lovePct}<span style={{ fontSize: 12 }}>%</span></div>
            <div style={{ fontSize: 9, color: COLORS.mutedText }}>❤️ 愛から使った</div>
          </div>
        </div>

        {/* データ管理 */}
        <div style={{ marginTop: 8, padding: "14px 16px", borderRadius: 16, background: `${COLORS.indigoDeep}44`, border: `1px solid ${COLORS.circleBlue}` }}>
          <div style={{ fontSize: 10, color: COLORS.mutedText, letterSpacing: 1, marginBottom: 4 }}>データ管理</div>
          <div style={{ fontSize: 11, color: COLORS.mutedText, marginBottom: 10 }}>
            記録・レベル・才能パズルの結果はこの端末に保存されています。機種変更やブラウザのデータ削除に備えて、バックアップしておくことをおすすめします。
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <button onClick={() => {
              try {
                const backup = {
                  version: 1,
                  exportedAt: new Date().toISOString(),
                  okane_energy: loadLS("okane_energy", 0),
                  okane_level: loadLS("okane_level", 1),
                  okane_history: loadLS("okane_history", []),
                  onboardingDone: loadLS("onboardingDone", false),
                  talentPuzzleResult: loadLS("talentPuzzleResult", null),
                  partnerResult: loadLS("partnerResult", null),
                  reachedLevels: (() => { try { return JSON.parse(localStorage.getItem("reachedLevels") || "[1]"); } catch { return [1]; } })(),
                };
                const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                const dateStr = new Date().toISOString().slice(0, 10);
                a.href = url;
                a.download = `okane-no-utsuwa_backup_${dateStr}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              } catch {
                alert("バックアップの書き出しに失敗しました。");
              }
            }} style={{
              flex: 1, padding: "8px 12px", borderRadius: 10, fontSize: 11,
              background: `${COLORS.goldPrimary}22`, border: `1px solid ${COLORS.goldPrimary}55`,
              color: COLORS.goldLight, cursor: "pointer",
            }}>💾 バックアップを書き出す</button>

            <label style={{
              flex: 1, padding: "8px 12px", borderRadius: 10, fontSize: 11, textAlign: "center",
              background: `${COLORS.aquaTeal}22`, border: `1px solid ${COLORS.aquaTeal}55`,
              color: COLORS.aquaLight, cursor: "pointer",
            }}>
              📂 バックアップを読み込む
              <input type="file" accept="application/json" style={{ display: "none" }} onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => {
                  try {
                    const data = JSON.parse(ev.target.result);
                    if (!window.confirm("バックアップを読み込むと、今の記録は上書きされます。よろしいですか？")) return;
                    const newEnergy = typeof data.okane_energy === "number" ? data.okane_energy : 0;
                    const newLevel = typeof data.okane_level === "number" ? data.okane_level : 1;
                    const newHistory = Array.isArray(data.okane_history) ? data.okane_history : [];
                    saveLS("okane_energy", newEnergy);
                    saveLS("okane_level", newLevel);
                    saveLS("okane_history", newHistory);
                    if (data.talentPuzzleResult) saveLS("talentPuzzleResult", data.talentPuzzleResult);
                    if (data.partnerResult) saveLS("partnerResult", data.partnerResult);
                    if (Array.isArray(data.reachedLevels)) {
                      try { localStorage.setItem("reachedLevels", JSON.stringify(data.reachedLevels)); } catch {}
                    }
                    if (typeof data.onboardingDone === "boolean") {
                      saveLS("onboardingDone", data.onboardingDone);
                      setOnboardingDone(data.onboardingDone);
                    }
                    setEnergy(newEnergy);
                    setLevel(newLevel);
                    setHistory(newHistory);
                    if (data.partnerResult) setPartnerResult(data.partnerResult);
                    alert("バックアップを読み込みました。");
                  } catch {
                    alert("ファイルの読み込みに失敗しました。正しいバックアップファイルか確認してください。");
                  }
                };
                reader.readAsText(file);
                e.target.value = "";
              }} />
            </label>
          </div>
          <button onClick={() => {
            if (window.confirm("すべてのデータをリセットしますか？\nこの操作は取り消せません。")) {
              StorageService.clearAll();
              setEnergy(0); setLevel(1); setHistory([]); setStats(null);
            }
          }} style={{
            padding: "8px 16px", borderRadius: 10, fontSize: 11,
            background: `${COLORS.lotusRose}22`, border: `1px solid ${COLORS.lotusRose}55`,
            color: COLORS.lotusLight, cursor: "pointer",
          }}>🗑 データをリセット</button>
        </div>
      </div>
    );
  };

  // ── INPUT MODAL（STEP2から開始）─────────────────────────────
  const InputModal = () => (
    <div
      onClick={e => e.stopPropagation()}
      onMouseDown={e => e.stopPropagation()}
      onTouchStart={e => e.stopPropagation()}
      style={{
        position: "fixed", inset: 0, zIndex: 90, background: COLORS.deepNight,
        display: "flex", flexDirection: "column", animation: "slideUpIn 0.35s cubic-bezier(0.16,1,0.3,1)",
      }}>
      {/* ヘッダー：カテゴリ名のみ */}
      <div style={{ display: "flex", alignItems: "center", padding: "14px 20px", borderBottom: `1px solid ${COLORS.circleBlue}`, background: `${COLORS.midnightBlue}cc` }}>
        <button onClick={() => {
          const isShortcut = selCat?.id === "_time_invest_shortcut" || selCat?.id === "_comfort_shortcut";
          const isTimeInvest = selCat?.id === "_time_invest_shortcut";
          if (inputStep === "sub") { setShowInput(false); resetInput(); return; }
          if (inputStep === "feeling") { isTimeInvest ? setInputStep("time_invest") : setInputStep("sub"); return; }
          if (inputStep === "comfort_check") { selCat?.id === "_comfort_shortcut" ? (setShowInput(false), resetInput()) : isShortcut ? (setShowInput(false), resetInput()) : setInputStep("feeling"); return; }
          if (inputStep === "time_invest") { isShortcut ? (setShowInput(false), resetInput()) : setInputStep("feeling"); return; }
          if (inputStep === "tags") { setInputStep("feeling"); return; }
          if (inputStep === "slider") { setInputStep("tags"); return; }
          setShowInput(false); resetInput();
        }} style={{ background: "none", border: "none", color: COLORS.softWhite, fontSize: 28, fontWeight: 700, cursor: "pointer", padding: 6, marginRight: 12, lineHeight: 1 }}>↩</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.softWhite }}>
            {selCat ? `${selCat.icon} ${selCat.label}` : "支出を記録する"}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>

        {/* STEP 2a: 詳しい使い道 */}
        {inputStep === "sub" && selCat && (
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.softWhite, marginBottom: 10 }}>使い道は？</div>
            {(() => {
              const SUB_EMOJI = {
                "本・電子書籍・音声アプリ":"📖","講座・セミナー・ワークショップ":"🎓","資格・副業・スキル習得":"🏅",
                "オンラインサロン新規登録":"🤝","挑戦への投資":"🚀","株・投資信託":"📈","カウンセリング・コーチング":"🌱",
                "医療・治療・整体":"🩺","スキンケア・サプリ":"🧴","ジム・フィットネス":"💪",
                "サウナ":"🧖","アロマ・お香・ディフューザー":"🕯️","マットレス・枕":"🛏️","ヘアサロン":"💇",
                "旅行・聖地巡礼":"✈️","イベント参加":"🎪","ライブ・観劇":"🎭",
                "体験ワークショップ":"🔮","アウトドア":"⛺","美術館・博物館":"🎨","映画":"🎬",
                "プレゼント":"🎁","クラウドファンディング":"💌","家族や友人との外食":"🍽️",
                "お祝・お礼":"🎉","季節イベント（花見・紅葉・初詣など）":"🌸","交流会":"🤝","お土産":"🛍️",
                "調理家電・包丁・フライパン":"🍳","デスク周り・収納用品":"🗂️","インテリア・観葉植物":"🪴",
                "ロボット掃除機":"🤖","家具":"🛋️","食器・保存容器":"🍽️","引っ越し・リフォーム":"🏠",
                "推し活":"⭐","リラクゼーション":"🛁","グルメ・スイーツ":"🍰",
                "ファッション・コスメ・アクセサリー":"👗","エンタメ・ゲーム・漫画":"🎮","入浴剤":"🛀","文房具":"📒",
                "クラウドファンディング":"🚀","寄付":"💛","災害支援":"🆘",
                "祭り・町おこし":"🏮","クリエイター支援・投げ銭":"🎨","子ども食堂":"🍱","動物支援":"🐾",
                "光熱費・通信費":"💡","食費":"🍚","日用品":"🛒",
                "交通費":"🚃","税金":"🏛️","家賃・住居費":"🔑","保険・医療・薬":"💊",
              };
              const pastelColors = ["#f7f2ff","#f2f9ff","#fff2f7","#fff7f2","#f2fff9","#fffbf2","#f2f6ff","#fff2f2"];
              const borderColors = ["#e5d4f6","#d4e8f6","#f6d4e5","#f6e5d4","#d4f6e5","#f6f1d4","#d4def6","#f6d4d4"];
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {selCat.sub.map((sub, i) => {
                    const sel = selSubCat === sub;
                    const bg = pastelColors[i % pastelColors.length];
                    const bd = borderColors[i % borderColors.length];
                    const isOther = sub === "その他";
                    return (
                      <div key={sub}>
                        <button onClick={() => {
                          setSelSubCat(sub);
                          if (!isOther) setInputStep("feeling");
                        }} style={{
                          width: "100%", padding: "14px 18px", borderRadius: 999,
                          background: isOther ? "#ffffff" : (sel ? bd : bg),
                          border: `2px solid ${sel ? "#a080d0" : bd}`,
                          color: sel ? "#5a3080" : "#6a5a7a",
                          cursor: "pointer", fontSize: 14, fontWeight: 500,
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          gap: 8, transition: "all 0.15s",
                          boxShadow: sel ? "0 2px 10px rgba(160,120,200,0.25)" : "0 1px 4px rgba(0,0,0,0.06)",
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{
                              width: 36, height: 36, borderRadius: "50%",
                              background: "#ffffff", flexShrink: 0,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: 18, boxShadow: "0 1px 4px rgba(0,0,0,0.10)",
                            }}>{isOther ? "✏️" : (SUB_EMOJI[sub] || "✦")}</div>
                            <span>{sub}</span>
                          </div>
                          <span style={{ fontSize: 16, opacity: 0.5 }}>›</span>
                        </button>
                        {isOther && sel && (
                          <OtherSubInput
                            value={otherSubText}
                            onChange={setOtherSubText}
                            onSubmit={(text) => { const t = (text || "").trim(); if (t) { setSelSubCat(t); setInputStep("feeling"); } }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {/* STEP 2b: 気持ちは？ */}
        {inputStep === "feeling" && (
          <div>
            <div style={{ fontSize: 13, color: COLORS.mutedText, marginBottom: 4 }}>
              {selSubCat && `✦ ${selSubCat}`}
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.softWhite, marginBottom: 12 }}>どう感じた？</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {FEELINGS.map((f, i) => {
                const palettes = [
                  { bg:"#fff6fa", bd:"#fbd9e8", tc:"#c0507a" },
                  { bg:"#fffbf0", bd:"#f6e8c1", tc:"#907830" },
                  { bg:"#f6fbff", bd:"#d4e8fb", tc:"#3878b8" },
                  { bg:"#f6fff8", bd:"#cbf1d4", tc:"#287848" },
                  { bg:"#fbf6ff", bd:"#e8d4fb", tc:"#7848b8" },
                  { bg:"#fff8f6", bd:"#fbded4", tc:"#c85838" },
                ];
                const p = palettes[i % palettes.length];
                const sel = selFeeling?.id === f.id;
                return (
                  <button key={f.id} onClick={() => {
                    setSelFeeling(f);
                    if (selCat?.id === "_time_invest_shortcut") {
                      setInputStep("tags");
                    } else if (selCat?.id === "_comfort_shortcut") {
                      setInputStep("comfort_check");
                    } else {
                      setInputStep("tags");
                    }
                  }} style={{
                    width: "100%", padding: "14px 18px", borderRadius: 999,
                    background: sel ? p.bd : p.bg, border: `2px solid ${p.bd}`,
                    color: sel ? p.tc : "#5a5060",
                    cursor: "pointer", fontSize: 14, fontWeight: 500,
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    gap: 8, transition: "all 0.15s",
                    boxShadow: sel ? `0 2px 10px ${p.bd}88` : "0 1px 4px rgba(0,0,0,0.06)",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: "50%",
                        background: "#ffffff", flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 18, boxShadow: "0 1px 4px rgba(0,0,0,0.10)",
                      }}>{f.icon}</div>
                      <span>{f.label}</span>
                    </div>
                    <span style={{ fontSize: 16, opacity: 0.5 }}>›</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}


        {/* STEP time_invest: 時間投資（使い道は？と同じ単一選択UI） */}
        {inputStep === "time_invest" && (
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.softWhite, marginBottom: 10 }}>使い道は？</div>
            {(() => {
              const TIME_ITEMS = [
                { key: "taxi",      label: "タクシー",                  emoji: "🚕" },
                { key: "appliance", label: "時短家電",                  emoji: "🤖" },
                { key: "delivery",  label: "出前・ネットスーパー",       emoji: "🛒" },
                { key: "outsource", label: "プロへ外注・クラウドソーシング", emoji: "🤝" },
                { key: "ai",        label: "AIツールの有料プラン",       emoji: "✨" },
                { key: "express",   label: "有料特急・グリーン車",       emoji: "🚄" },
                { key: "hotel",     label: "気分転換にビジネスホテル一泊", emoji: "🏨" },
              ];
              const pastelColors = ["#f0e6ff","#e6f4ff","#ffe6f0","#fff0e6","#e6fff4","#fff8e6","#e6eeff"];
              const borderColors = ["#d4b8f0","#b8d8f0","#f0b8d4","#f0d4b8","#b8f0d4","#f0e8b8","#b8c8f0"];
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {TIME_ITEMS.map((opt, i) => {
                    const bg = pastelColors[i % pastelColors.length];
                    const bd = borderColors[i % borderColors.length];
                    return (
                      <button key={opt.key} onClick={() => {
                        setSelSubCat(opt.label);
                        setSelTimeInvest([opt.key]);
                        setInputStep("feeling");
                      }} style={{
                        width: "100%", padding: "14px 18px", borderRadius: 999,
                        background: bg, border: `2px solid ${bd}`,
                        color: "#6a5a7a",
                        cursor: "pointer", fontSize: 14, fontWeight: 500,
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        gap: 8, transition: "all 0.15s",
                        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: "50%",
                            background: "#ffffff", flexShrink: 0,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 18, boxShadow: "0 1px 4px rgba(0,0,0,0.10)",
                          }}>{opt.emoji}</div>
                          <span>{opt.label}</span>
                        </div>
                        <span style={{ fontSize: 16, opacity: 0.5 }}>›</span>
                      </button>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {/* STEP comfort_check: 一日のふりかえり */}
        {inputStep === "comfort_check" && (
          <div style={{ animation: "slideUpIn 0.3s cubic-bezier(0.16,1,0.3,1)" }}>
            {/* ヘッダー */}
            <div style={{ textAlign: "center", marginBottom: 28, position: "relative" }}>
              <Sparkles count={22} color="#c8a0e8" />
              <Sparkles count={15} color="#c49a2a" />
              <div style={{ fontSize: 44, marginBottom: 48, animation: "pulseGlow 2.5s ease-in-out infinite", position: "relative", zIndex: 1 }}>🦋</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#3a2a4a", marginBottom: 20, lineHeight: 1.5, position: "relative", zIndex: 1 }}>
                今日のお金の使い方、<br />いつもの自分より<br />少し外に出ましたか？
              </div>
              <div style={{ fontSize: 11, color: "#a090b0", lineHeight: 1.7, position: "relative", zIndex: 1 }}>
                コンフォートゾーンを超えると<br />器が一回り大きく育ちます 🌱
              </div>
            </div>

            {/* 選択肢 */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                {
                  key: "over",
                  emoji: "🦋",
                  title: "超えた！",
                  desc: "ちょっと怖かったけど、やってみた",
                  bg: "linear-gradient(135deg, #f0f8ff, #e8f0ff)",
                  border: "#a8c8f8",
                  tc: "#2860b8",
                  pt: 10,
                },
                {
                  key: "same",
                  emoji: "🌱",
                  title: "いつもと同じくらい",
                  desc: "自分らしい大切な使い方",
                  bg: "linear-gradient(135deg, #f0fff4, #e8faf0)",
                  border: "#98e8b8",
                  tc: "#287848",
                  pt: 2,
                },
                {
                  key: "unknown",
                  emoji: "🤔",
                  title: "よくわからない",
                  desc: "それでも大丈夫、記録しよう",
                  bg: "linear-gradient(135deg, #faf8ff, #f5f0ff)",
                  border: "#c8b8f0",
                  tc: "#6848a8",
                  pt: 1,
                },
              ].map(opt => (
                <button
                  key={opt.key}
                  onClick={() => {
                    // ポイント加算
                    applyEnergyGain(opt.pt);
                    // historyに記録
                    const comfortEntry = {
                      date: new Date().toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" }),
                      cat: "一日のふりかえり",
                      feeling: opt.title,
                      tags: opt.key === "over" ? ["comfort"] : [],
                      valueTags: [],
                      energy: opt.pt,
                      ai: opt.key === "over" ? "コンフォートゾーンを超えた一歩が、器を育てています。" : "今日も記録できました。積み重ねが器になります。",
                      aiPct: 70,
                      recordedAt: new Date().toISOString(),
                    };
                    setHistory(h => [comfortEntry, ...h.slice(0, 499)]);
                    setStats(s => StorageService.updateStats(s, comfortEntry));
                    setLastComfortDate(new Date().toLocaleDateString("ja-JP")); // 本日実施済みを記録
                    // 超えた！のみトースト
                    if (opt.key === "over") {
                      setComfortToast(true);
                      setTimeout(() => setComfortToast(false), 2500);
                    }
                    // ホームへ戻る
                    setShowInput(false);
                    resetInput();
                    setTab("home");
                  }}
                  style={{
                    width: "100%", padding: "18px 20px", borderRadius: 20,
                    background: opt.bg, border: `2px solid ${opt.border}`,
                    cursor: "pointer", textAlign: "left",
                    display: "flex", alignItems: "center", gap: 14,
                    boxShadow: `0 2px 12px ${opt.border}66`,
                    transition: "transform 0.1s, box-shadow 0.1s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.01)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
                >
                  <div style={{
                    width: 44, height: 44, borderRadius: "50%",
                    background: "#ffffff", flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 22, boxShadow: "0 1px 4px rgba(0,0,0,0.10)",
                  }}>{opt.emoji}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: opt.tc, marginBottom: 3 }}>{opt.title}</div>
                    <div style={{ fontSize: 12, color: "#8a7a9a" }}>{opt.desc}</div>
                  </div>
                  <span style={{ fontSize: 18, color: opt.border, opacity: 0.7 }}>›</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP tags: 循環タグ選択 */}
        {inputStep === "tags" && (
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.softWhite, marginBottom: 10 }}>この支出のおかげで…</div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#191970", marginBottom: 4 }}>複数選択OK ✦ 当てはまるものを選んでね</div>
              <div style={{ fontSize: 13, color: "#9b6fd4", fontWeight: 600 }}>どれも当てはまらない場合は選ばずに次へ進めます</div>
            </div>
            {(() => {
              const TAG_PALETTES = {
                kanjou:  { bg:"#fff6fb", bd:"#fbd4e8", tc:"#c04878" },
                hajimete:{ bg:"#fffbf1", bd:"#fbe8c1", tc:"#906828" },
                mirai:   { bg:"#f1f8ff", bd:"#c1defb", tc:"#2860b8" },
                jibun:   { bg:"#f6fff8", bd:"#c1f1d4", tc:"#287848" },
                dareka:  { bg:"#fbf6ff", bd:"#e3c1fb", tc:"#7038b8" },
                ai:      { bg:"#fff8f1", bd:"#fbdec1", tc:"#b86828" },
                comfort: { bg:"#f6fbff", bd:"#cbe8fb", tc:"#2878b8" },
              };
              // このステップでだけ使う表示用ラベル（CIRCULATION_TAGS本体のlabelはレポート等で使うため変更しない）
              const TAG_STEP_LABELS = {
                kanjou: "感情が震えた",
                mirai: "未来の可能性が広がった",
                hajimete: "初めての体験ができた",
                comfort: "少し挑戦できた",
                jibun: "自分を大切にした",
                dareka: "誰かを喜ばせた",
                ai: "心から選べた",
              };
              const RAINBOW = ["#ff6b9d","#ff9f43","#ffd93d","#6bcb77","#4d96ff","#c77dff","#f472b6","#a78bfa"];

              // Canvasパーティクルコンポーネント
              const TagSparkleCanvas = ({ color, active }) => {
                const canvasRef = useRef(null);
                const animRef = useRef(null);
                const sparklesRef = useRef([]);

                const spawnSparkles = (col) => {
                  const cx = 30, cy = 28;
                  const count = 14;
                  for (let i = 0; i < count; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const speed = 0.5 + Math.random() * 1.8;
                    sparklesRef.current.push({
                      x: cx + (Math.random() - 0.5) * 20,
                      y: cy + (Math.random() - 0.5) * 16,
                      vx: Math.cos(angle) * speed,
                      vy: Math.sin(angle) * speed - 0.6,
                      size: 1.2 + Math.random() * 2.2,
                      alpha: 1,
                      col: RAINBOW[Math.floor(Math.random() * RAINBOW.length)],
                      type: Math.random() > 0.5 ? "star" : "dot",
                      life: 0,
                      maxLife: 28 + Math.random() * 24,
                    });
                  }
                };

                const drawStar = (ctx, cx, cy, r, alpha, col) => {
                  ctx.save();
                  ctx.globalAlpha = alpha;
                  ctx.strokeStyle = col;
                  ctx.lineWidth = r * 0.5;
                  ctx.lineCap = "round";
                  for (let i = 0; i < 4; i++) {
                    const a = i * Math.PI / 2;
                    ctx.beginPath();
                    ctx.moveTo(cx + Math.cos(a) * r * 0.3, cy + Math.sin(a) * r * 0.3);
                    ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
                    ctx.stroke();
                  }
                  ctx.restore();
                };

                useEffect(() => {
                  if (!active) { sparklesRef.current = []; return; }
                  spawnSparkles(color);
                  const canvas = canvasRef.current;
                  if (!canvas) return;
                  const ctx = canvas.getContext("2d");
                  const loop = () => {
                    ctx.clearRect(0, 0, 60, 56);
                    sparklesRef.current = sparklesRef.current.filter(s => s.life < s.maxLife);
                    sparklesRef.current.forEach(s => {
                      s.life++; s.x += s.vx; s.y += s.vy; s.vy += 0.04;
                      s.alpha = 1 - s.life / s.maxLife;
                      if (s.type === "star") drawStar(ctx, s.x, s.y, s.size, s.alpha, s.col);
                      else {
                        ctx.save(); ctx.globalAlpha = s.alpha; ctx.fillStyle = s.col;
                        ctx.beginPath(); ctx.arc(s.x, s.y, s.size * 0.6, 0, Math.PI * 2); ctx.fill(); ctx.restore();
                      }
                    });
                    if (sparklesRef.current.length > 0) animRef.current = requestAnimationFrame(loop);
                  };
                  animRef.current = requestAnimationFrame(loop);
                  return () => cancelAnimationFrame(animRef.current);
                }, [active]);

                return (
                  <canvas ref={canvasRef} width={60} height={56} style={{
                    position: "absolute", top: "50%", left: 16,
                    transform: "translateY(-50%)",
                    pointerEvents: "none", zIndex: 10,
                  }} />
                );
              };

              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
                  {CIRCULATION_TAGS.map(tag => {
                    const p = TAG_PALETTES[tag.id] || { bg:"#f4f4f8", bd:"#c8c8d8", tc:"#585868" };
                    const sel = selTags.includes(tag.id);
                    return (
                      <div key={tag.id} style={{ position: "relative" }}>
                        <TagSparkleCanvas color={p.tc} active={sel} />
                        <button onClick={() => toggleTag(tag.id)} style={{
                          width: "100%", padding: "14px 18px", borderRadius: 999,
                          background: sel ? p.bd : p.bg, border: `2px solid ${p.bd}`,
                          color: sel ? p.tc : "#5a5060",
                          cursor: "pointer", fontSize: 14, fontWeight: sel ? 700 : 500,
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          gap: 8, transition: "all 0.15s",
                          boxShadow: sel ? `0 2px 14px ${p.bd}cc, 0 0 0 2px ${p.tc}33` : "0 1px 4px rgba(0,0,0,0.06)",
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{
                              width: 36, height: 36, borderRadius: "50%",
                              background: "#ffffff", flexShrink: 0,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: 18, boxShadow: "0 1px 4px rgba(0,0,0,0.10)",
                            }}>{tag.icon}</div>
                            <span>{TAG_STEP_LABELS[tag.id] || tag.label}</span>
                          </div>
                          {sel
                            ? <span style={{ fontSize: 16, color: p.tc, fontWeight: 700 }}>✓</span>
                            : <span style={{ fontSize: 16, opacity: 0.4 }}>+</span>
                          }
                        </button>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
            <div style={{ position: "relative", overflow: "hidden", borderRadius: 999, background: "white", border: "2px solid #c49a2a", boxShadow: "0 2px 10px rgba(196,154,42,0.2)" }}>
              <Sparkles count={12} color="#c49a2a" />
              <button
                onClick={e => { e.stopPropagation(); setInputStep("slider"); }}
                onMouseDown={e => e.stopPropagation()}
                onTouchStart={e => e.stopPropagation()}
                style={{
                  width: "100%", padding: 16, borderRadius: 999,
                  background: "transparent",
                  border: "none",
                  color: "#8a6a10", fontWeight: 700, fontSize: 15,
                  cursor: "pointer", letterSpacing: "0.05em",
                  position: "relative", zIndex: 1,
                }}>次へ →</button>
            </div>
          </div>
        )}

        {/* STEP slider: 感情スライダー＋循環チェック */}
        {inputStep === "slider" && (
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.softWhite, marginBottom: 4 }}>この支出でどのくらい心が満たされましたか？</div>
            <div style={{ fontSize: 12, color: COLORS.mutedText, marginBottom: 20 }}>感情スライダー（ワクワク度・満足度）</div>
            <div style={{ background: `${COLORS.indigoDeep}88`, borderRadius: 16, padding: 20, marginBottom: 28 }}>
              <EmotionSliderEnhanced value={sliderVal} onChange={setSliderVal} />
            </div>
            <button
              onClick={e => { e.stopPropagation(); runAI(); }}
              onMouseDown={e => e.stopPropagation()}
              onTouchStart={e => e.stopPropagation()}
              style={{
                width: "100%", padding: 13, borderRadius: 999,
                background: "linear-gradient(135deg, #db2777, #f472b6)",
                border: "none", color: "white", fontWeight: 700, fontSize: 15,
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                boxShadow: "0 4px 16px rgba(244,114,182,0.45)", letterSpacing: "0.05em",
              }}><span>★</span> 循環チェック <span>★</span></button>
          </div>
        )}
        {/* STEP 5: Loading */}
        {inputStep === "loading" && aiLoading && (() => {
          const LoadingSparkle = () => {
            const canvasRef = React.useRef(null);
            const animRef = React.useRef(null);
            const sparklesRef = React.useRef([]);
            const COLORS_SP = ["#ff6b9d","#ff9f43","#ffd93d","#6bcb77","#4d96ff","#c77dff","#f472b6","#a78bfa","#fb923c","#34d399"];
            React.useEffect(() => {
              const canvas = canvasRef.current;
              if (!canvas) return;
              const ctx = canvas.getContext("2d");
              const cx = canvas.width / 2, cy = canvas.height / 2;
              const spawn = () => {
                for (let i = 0; i < 3; i++) {
                  const angle = Math.random() * Math.PI * 2;
                  const speed = 0.4 + Math.random() * 1.2;
                  sparklesRef.current.push({
                    x: cx + (Math.random()-0.5)*40,
                    y: cy + (Math.random()-0.5)*40,
                    vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed - 0.3,
                    size: 2 + Math.random()*3,
                    col: COLORS_SP[Math.floor(Math.random()*COLORS_SP.length)],
                    type: Math.random() > 0.5 ? "star" : "dot",
                    life: 0, maxLife: 50+Math.random()*30,
                  });
                }
              };
              const drawStar = (ctx, cx, cy, r, alpha, col) => {
                ctx.save(); ctx.globalAlpha=alpha; ctx.strokeStyle=col;
                ctx.lineWidth=r*0.5; ctx.lineCap="round";
                for (let i=0;i<4;i++){
                  const a=i*Math.PI/2;
                  ctx.beginPath();
                  ctx.moveTo(cx+Math.cos(a)*r*0.3,cy+Math.sin(a)*r*0.3);
                  ctx.lineTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r);
                  ctx.stroke();
                }
                ctx.restore();
              };
              let frame = 0;
              const loop = () => {
                frame++;
                if (frame % 4 === 0) spawn();
                ctx.clearRect(0,0,canvas.width,canvas.height);
                sparklesRef.current = sparklesRef.current.filter(s=>s.life<s.maxLife);
                sparklesRef.current.forEach(s=>{
                  s.life++; s.x+=s.vx; s.y+=s.vy; s.vy+=0.07;
                  const alpha = Math.pow(1-s.life/s.maxLife, 1.5);
                  if(s.type==="star") drawStar(ctx,s.x,s.y,s.size,alpha,s.col);
                  else { ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle=s.col;ctx.beginPath();ctx.arc(s.x,s.y,s.size*0.6,0,Math.PI*2);ctx.fill();ctx.restore(); }
                });
                animRef.current = requestAnimationFrame(loop);
              };
              animRef.current = requestAnimationFrame(loop);
              return () => cancelAnimationFrame(animRef.current);
            }, []);
            return (
              <div style={{ position:"relative", width:180, height:180, margin:"0 auto 16px" }}>
                <canvas ref={canvasRef} width={180} height={180} style={{ position:"absolute",top:0,left:0,pointerEvents:"none" }} />
              </div>
            );
          };
          return (
            <div style={{ textAlign: "center", paddingTop: 60 }}>
              <LoadingSparkle />
              <div style={{ fontSize: 16, color: COLORS.goldLight, fontWeight: 700, marginBottom: 8 }}>ただいま循環を判定中...</div>
              <div style={{ fontSize: 12, color: COLORS.mutedText }}>あなたの支出のエネルギーを読み取っています</div>
            </div>
          );
        })()}

      </div>

      {/* InputModal内にもナビバーを表示（feeling/subステップ以外） */}
      {<div style={{
        borderTop: `1px solid ${COLORS.circleBlue}`, background: `${COLORS.midnightBlue}f0`,
        display: "flex", padding: "8px 0 12px",
      }}>
        {[
          { id: "home", label: "ホーム", icon: "🏠" },
          { id: "report", label: "マイページ", icon: "📊" },
          { id: "concept", label: "お金の器？", icon: "✦", iconColor: "#f0c84a" },
        ].map(t => (
          <button key={t.id} onClick={() => { setShowInput(false); resetInput(); setTab(t.id); }}
            style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, background: "none", border: "none", cursor: "pointer", padding: "4px 0" }}>
            <div style={{ height: 26, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 18, lineHeight: 1, color: t.iconColor || "inherit" }}>{t.icon}</span>
            </div>
            <span style={{ fontSize: 9, color: COLORS.mutedText }}>{t.label}</span>
          </button>
        ))}
        <button onClick={() => {
          const isShortcut = selCat?.id === "_time_invest_shortcut" || selCat?.id === "_comfort_shortcut";
          const isTimeInvest = selCat?.id === "_time_invest_shortcut";
          if (inputStep === "sub") { setShowInput(false); resetInput(); return; }
          if (inputStep === "feeling") { isTimeInvest ? setInputStep("time_invest") : setInputStep("sub"); return; }
          if (inputStep === "comfort_check") { selCat?.id === "_comfort_shortcut" ? (setShowInput(false), resetInput()) : isShortcut ? (setShowInput(false), resetInput()) : setInputStep("feeling"); return; }
          if (inputStep === "time_invest") { isShortcut ? (setShowInput(false), resetInput()) : setInputStep("feeling"); return; }
          if (inputStep === "tags") { setInputStep("feeling"); return; }
          if (inputStep === "slider") { setInputStep("tags"); return; }
          setShowInput(false); resetInput();
        }} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, background: "none", border: "none", cursor: "pointer", padding: "4px 0" }}>
          <div style={{ height: 26, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 30, fontWeight: 800, lineHeight: 1, color: "#333" }}>↩</span>
          </div>
          <span style={{ fontSize: 9, color: COLORS.mutedText }}>戻る</span>
        </button>
      </div>}
    </div>
  );

  // ── RENDER ──────────────────────────────────────────────────
  // start.mp4: アプリ起動時に全画面再生
  if (showStartVideo) {
    return <VideoPlayer src="/start.mp4" onEnded={() => setShowStartVideo(false)} />;
  }

  return (
    <div onClickCapture={handleGlobalClick} style={{
      minHeight: "100vh", background: COLORS.deepNight,
      fontFamily: "'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif",
      maxWidth: 390, margin: "0 auto", position: "relative", color: COLORS.softWhite,
    }}>
      {/* グローバルスパークCanvas */}
      <canvas ref={globalCanvasRef} width={390} height={window.innerHeight}
        style={{ position: "fixed", top: 0, left: "50%", transform: "translateX(-50%)", width: 390, height: "100vh", pointerEvents: "none", zIndex: 9998 }}
      />

      {/* パズルピース成長トースト */}
      {pieceToast.length > 0 && (
        <div style={{
          position: "fixed", bottom: 90, left: "50%", transform: "translateX(-50%)",
          zIndex: 9999, display: "flex", gap: 8, pointerEvents: "none",
          animation: "slideUpIn 0.4s ease, fadeOut 0.5s 2.5s ease forwards",
        }}>
          {pieceToast.map((tag, i) => {
            const col = getTalentColor(tag);
            return (
              <div key={tag} style={{
                background: "white",
                border: `2.5px solid ${col}`,
                borderRadius: 999, padding: "8px 16px",
                fontSize: 13, fontWeight: 700, color: "#7a5a00",
                boxShadow: "0 4px 16px rgba(196,154,42,0.25)",
                animation: `slideUpIn 0.4s ${i * 0.1}s both`,
              }}>🧩 {tag} <span style={{ color: "#c49a2a" }}>+1</span></div>
            );
          })}
        </div>
      )}

      {/* 超えた！やったねトースト */}
      {comfortToast && (
        <div style={{
          position: "fixed", bottom: 130, left: "50%", transform: "translateX(-50%)",
          zIndex: 9999, pointerEvents: "none",
          animation: "slideUpIn 0.4s ease, fadeOut 0.5s 2s ease forwards",
        }}>
          <div style={{
            background: "white",
            border: "2.5px solid #a8c8f8",
            borderRadius: 999, padding: "10px 24px",
            fontSize: 15, fontWeight: 700, color: "#2860b8",
            boxShadow: "0 4px 20px rgba(100,160,240,0.3)",
          }}>👆 やったね！</div>
        </div>
      )}
      {/* 1日のふりかえり：本日実施済みメッセージ */}
      {comfortAlreadyToast && (
        <div style={{
          position: "fixed", bottom: 130, left: "50%", transform: "translateX(-50%)",
          zIndex: 9999, pointerEvents: "none",
          animation: "slideUpIn 0.4s ease, fadeOut 0.5s 2s ease forwards",
        }}>
          <div style={{
            background: "white",
            border: "2.5px solid #b8ccf0",
            borderRadius: 999, padding: "10px 24px",
            fontSize: 14, fontWeight: 700, color: "#7090c0",
            boxShadow: "0 4px 20px rgba(100,140,220,0.2)",
          }}>🦋 今日のふりかえりは、もう済んでいます</div>
        </div>
      )}
      <style>{`
        @keyframes pulseGlow { 0%,100%{opacity:0.5;transform:scale(1)} 50%{opacity:1;transform:scale(1.05)} }
        @keyframes waveFloat { 0%,100%{transform:translateX(0)} 50%{transform:translateX(4px)} }
        @keyframes rippleOut { 0%{width:4px;height:4px;opacity:0.8} 100%{width:120px;height:120px;opacity:0;margin:-58px} }
        @keyframes slideUpIn { from{transform:translateY(30px);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes spinSlow { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes fadeOut { from{opacity:1} to{opacity:0} }
        @keyframes floatDot0 { 0%,100%{transform:translateY(0) translateX(0);opacity:0.7} 50%{transform:translateY(-8px) translateX(2px);opacity:1} }
        @keyframes floatDot1 { 0%,100%{transform:translateY(0) translateX(0);opacity:0.5} 50%{transform:translateY(-6px) translateX(-3px);opacity:0.9} }
        @keyframes floatDot2 { 0%,100%{transform:translateY(0) translateX(0);opacity:0.6} 50%{transform:translateY(-10px) translateX(1px);opacity:1} }
        @keyframes bounceIn { 0%{transform:scale(0.3);opacity:0} 60%{transform:scale(1.15);opacity:1} 80%{transform:scale(0.95)} 100%{transform:scale(1)} }
        @keyframes vesselGrow { from{transform:translateX(-50%) scale(0.5);opacity:0} to{transform:translateX(-50%) scale(1);opacity:1} }
        @keyframes vesselGrowCenter { from{transform:scale(0.5);opacity:0} to{transform:scale(1);opacity:1} }
        @keyframes sparkleFloat { 0%{opacity:0;transform:translateY(0) scale(0.5)} 30%{opacity:1;transform:translateY(-8px) scale(1)} 70%{opacity:0.8;transform:translateY(-16px) scale(1)} 100%{opacity:0;transform:translateY(-24px) scale(0.5)} }
        @keyframes fadeInOut { 0%{opacity:0} 30%{opacity:1} 70%{opacity:1} 100%{opacity:0} }
        input[type=range] { -webkit-appearance:none; appearance:none; border-radius:999px; outline:none; cursor:pointer; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance:none; appearance:none; border-radius:50%; background:white; cursor:grab; }
        input[type=range]::-moz-range-thumb { border-radius:50%; background:white; cursor:grab; }
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-track{background:transparent} ::-webkit-scrollbar-thumb{background:#d0c8bc;border-radius:2px}
      `}</style>

      <div style={{ paddingBottom: 80, display: (showInput || showOnboarding) ? "none" : "block" }}>
        {tab === "home" && <HomeTab />}
        {tab === "report" && <ReportTab />}
        {tab === "concept" && (
          <div style={{ padding: "20px 20px 100px", textAlign: "left" }}>

            {/* イントロ：お金の器とは */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: COLORS.goldLight, marginBottom: 10 }}>お金の器？</div>
              <div style={{ fontSize: 13, color: COLORS.mutedText, lineHeight: 1.9 }}>
                「お金の器」とは、豊かさを受け取る見えない器。コンフォートゾーン（安心できる領域）とリンクしていて、器が小さいままだと大きなお金が入ってきても受け取れずにこぼれてしまいます。器を広げる近道は、いきなりの大きな変化ではなく、少し不安を感じる「ストレッチゾーン」へ踏み出すこと。少し抵抗を感じながらも自分の成長につながるお金の使い方が、器を育てます。
              </div>
            </div>

            {/* 使う → 循環する → 拡がる */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 24, flexWrap: "wrap" }}>
              <div style={{
                padding: "8px 16px", borderRadius: 999,
                background: "white", border: `1.5px solid ${COLORS.aquaTeal}55`,
                color: COLORS.aquaTeal, fontSize: 14, fontWeight: 700,
              }}>使う</div>
              <span style={{ color: COLORS.mutedText, fontSize: 14 }}>→</span>
              <div style={{
                padding: "8px 16px", borderRadius: 999,
                background: "white", border: "1.5px solid #cbb8f0",
                color: "#7a52b0", fontSize: 14, fontWeight: 700,
              }}>循環する</div>
              <span style={{ color: COLORS.mutedText, fontSize: 14 }}>→</span>
              <div style={{
                padding: "8px 16px", borderRadius: 999,
                background: "white", border: "1.5px solid #93c5fd",
                color: "#1d4ed8", fontSize: 14, fontWeight: 700,
              }}>拡がる</div>
            </div>

            {[
              { title: "記録するのはエネルギー循環", body: "記録するのは金額ではありません。「何に使ったか」「どんな気持ちだったか」その時感じたことをクリックするだけ。金額の入力は不要です。", icon: "✨" },
              { title: "ステージ1：お金の器を育てる", body: "過剰な節約は自分への投資を止め、感情を抑え込む行為。器が小さいままでは、大きなお金が入ってきても受け取れずにこぼれてしまいます。エネルギーを循環しながら使うことで器を育てていきます。", icon: "🫙" },
              { title: "ネクストステージ：才能パズル", body: "器がレベル5に達すると、才能パズルの世界へ扉が開きます。日々の支出から見えてきた価値観のピースが組み合わさり、あなたの「普通＝価値＝才能」が見える化されます。今後は、その価値を必要としている誰かとつながるサービスも計画中です。", icon: "🧩" },
            ].map((c, i) => (
              <div key={i} style={{ background: `${COLORS.indigoDeep}cc`, borderRadius: 20, padding: 20, marginBottom: 12, border: `1px solid ${COLORS.circleBlue}` }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>{c.icon}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.goldLight, marginBottom: 8 }}>{c.title}</div>
                <div style={{ fontSize: 13, color: COLORS.mutedText, lineHeight: 1.8 }}>{c.body}</div>
              </div>
            ))}
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 11, color: COLORS.mutedText, letterSpacing: 1, marginBottom: 12 }}>3つの成長フェーズ</div>
              {[
                { ph: "①", title: "豊かさを受け取れる自分へ", desc: "お金の器を育て、コンフォートゾーンを広げる", col: COLORS.aquaTeal },
                { ph: "②", title: "循環を生み出せる自分へ", desc: "エネルギーを蓄積し、合わせ技で循環を大きくする", col: COLORS.goldPrimary },
                { ph: "③", title: "価値を使って稼げる自分へ", desc: "才能を発見し、「普通」が誰かの価値になる", col: COLORS.lotusRose },
              ].map(p => (
                <div key={p.ph} style={{ display: "flex", gap: 12, marginBottom: 12, alignItems: "flex-start" }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0, background: `${p.col}22`, border: `1px solid ${p.col}66`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: p.col, fontWeight: 700 }}>{p.ph}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.softWhite, marginBottom: 2 }}>{p.title}</div>
                    <div style={{ fontSize: 12, color: COLORS.mutedText }}>{p.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* アプリの見方 */}
            <div style={{ marginTop: 24 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: COLORS.softWhite, letterSpacing: 1, marginBottom: 4 }}>アプリの見方</div>
              <div style={{ fontSize: 10, color: COLORS.mutedText, marginBottom: 16 }}>記録するたびに、器が育っていきます</div>

              {/* 記録の流れ */}
              {[
                { step: "1", icon: "📂", title: "カテゴリーを選ぶ", desc: "何に使ったかを9つのカテゴリーから選択。帰宅途中や寝る前に「一日のふりかえり」をしましょう。", col: "#8b5cf6" },
                { step: "2", icon: "💭", title: "どう感じた？", desc: "お金を支払った時の感情を選択。意識して記録してゆくと動いた感情＝エネルギーの動きに気づきやすくなります。", col: "#ec4899" },
                { step: "3", icon: "🦋", title: "支出で何が変わった？", desc: "お金を払ったことで何か変わったことがあったら変化を記録しましょう。もちろん何もなくてもOKです。", col: "#0ea5e9" },
                { step: "4", icon: "✦", title: "AIが判定", desc: "この支出で心が満たされたか、どんな循環が生まれたかAIが読み取り、あなたに必要なひとことを届けます。", col: COLORS.goldPrimary, premium: true },
                { step: "5", icon: "🫙", title: "お金の器を育てる", desc: "データが「器」に蓄積され、器が成長すると共にあなたのコンフォートゾーンも拡がり、才能パズルも蓄積されます", col: COLORS.aquaTeal },
              ].map((s, i, arr) => (
                <div key={s.step} style={{ display: "flex", gap: 12, marginBottom: 0, alignItems: "stretch" }}>
                  {/* ステップ縦線 */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                      background: `${s.col}22`, border: `2px solid ${s.col}66`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 16,
                    }}>{s.icon}</div>
                    {i < arr.length - 1 && (
                      <div style={{ width: 2, flex: 1, minHeight: 20, background: `linear-gradient(to bottom, ${s.col}44, ${arr[i+1].col}22)`, margin: "4px 0" }} />
                    )}
                  </div>
                  {/* テキスト */}
                  <div style={{ paddingBottom: i < arr.length - 1 ? 16 : 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: s.col, marginBottom: 3 }}>
                      Step {s.step}｜{s.title}
                      {s.premium && (
                        <span style={{ fontSize: 10, fontWeight: 600, color: COLORS.mutedText, marginLeft: 6 }}>（プレミアム機能）</span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: COLORS.mutedText, lineHeight: 1.7 }}>{s.desc}</div>
                  </div>
                </div>
              ))}

              {/* ポイントが貯まるとどうなる？ */}
              <div style={{ marginTop: 20, background: `${COLORS.indigoDeep}cc`, borderRadius: 16, padding: 16, border: `1px solid ${COLORS.circleBlue}` }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.goldLight, marginBottom: 10 }}>✦ ポイントが貯まるとどうなる？</div>
                <div style={{ fontSize: 11, color: COLORS.mutedText, lineHeight: 1.8, marginBottom: 10 }}>
                  ポイントは支出金額ではなく、その使い方がどれだけ豊かな循環を生んだかを表します。記録のたびに蓄積され、お金の器のレベル（Lv.1〜5）が上がり、コンフォートゾーンが広がっていきます。
                </div>
                <div style={{ fontSize: 11, color: COLORS.mutedText, lineHeight: 1.8, marginBottom: 10 }}>
                  「🧩 冒険 +1」のようなポップは「価値タグ」が育っているサイン。ポイントとは別に、裏側で静かに積み重なります。
                </div>
                <div style={{ fontSize: 11, color: COLORS.mutedText, lineHeight: 1.8 }}>
                  Lv.5に到達すると「才能パズル」が解放され、積み重ねた価値観のピースからあなたの才能の傾向が見えてきます。
                </div>
              </div>

              {/* ポイントの読み方 */}
              <div style={{ marginTop: 16, background: `${COLORS.indigoDeep}cc`, borderRadius: 16, padding: 16, border: `1px solid ${COLORS.circleBlue}` }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.goldLight, marginBottom: 12 }}>✦ ポイントの読み方</div>
                {[
                  { label: "基本pt", val: "3〜5pt", desc: "循環タグの数で決まる（1個:3pt / 2個:4pt / 3個以上:5pt）" },
                  { label: "感情ボーナス", val: "+8pt", desc: "ワクワク・幸せ感情＋合わせ技タグ1個以上で発動" },
                  { label: "CZ超えボーナス", val: "+5pt", desc: "コンフォートゾーンを超えたと答えると必ず加算" },
                  { label: "時間投資ボーナス", val: "+5pt", desc: "タクシー・時短家電などの時間投資を選ぶと加算" },
                  { label: "自己投資ボーナス", val: "+5pt", desc: "カテゴリ「自己投資」を選ぶと加算" },
                ].map((r, i, arr) => (
                  <div key={i} style={{ display: "flex", gap: 10, marginBottom: i < arr.length - 1 ? 10 : 0, alignItems: "flex-start" }}>
                    <div style={{ minWidth: 90, fontSize: 11, fontWeight: 700, color: COLORS.aquaLight }}>{r.label}</div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.softWhite, marginBottom: 1 }}>{r.val}</div>
                      <div style={{ fontSize: 10, color: COLORS.mutedText, lineHeight: 1.6 }}>{r.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Nav - ホーム以外で表示 */}
      {tab !== "home" && !showOnboarding && (
      <div style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "88%", maxWidth: 340, background: `${COLORS.midnightBlue}f0`,
        borderTop: `1px solid ${COLORS.circleBlue}`, backdropFilter: "blur(12px)",
        display: "flex", padding: "8px 0 16px", borderRadius: "16px 16px 0 0",
      }}>
        {[
          { id: "home", label: "ホーム", icon: "🏠" },
          { id: "report", label: "マイページ", icon: "📊" },
          { id: "concept", label: "お金の器？", icon: "✦", iconColor: "#f0c84a" },
        ].map(t => (
          <button key={t.id} onClick={() => {
            setTab(t.id);
          }} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "none", border: "none", cursor: "pointer", padding: "6px 0" }}>
            <div style={{ height: 26, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 18, lineHeight: 1, color: t.iconColor || "inherit" }}>{t.icon}</span>
            </div>
            <span style={{ fontSize: 9, fontWeight: tab === t.id ? 700 : 400, color: tab === t.id ? COLORS.goldLight : COLORS.mutedText }}>{t.label}</span>
            {tab === t.id && <div style={{ width: 20, height: 2, borderRadius: 1, background: `linear-gradient(to right, ${COLORS.goldPrimary}, ${COLORS.goldLight})` }} />}
          </button>
        ))}
        {/* 戻るボタン */}
        <button onClick={() => {
          if (showInput) { setShowInput(false); resetInput(); }
          else if (tab !== "home") setTab("home");
        }} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "none", border: "none", cursor: "pointer", padding: "6px 0" }}>
          <div style={{ height: 26, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 30, fontWeight: 800, lineHeight: 1, color: "#333" }}>↩</span>
          </div>
          <span style={{ fontSize: 9, color: COLORS.mutedText }}>戻る</span>
        </button>
      </div>
      )}

      {showInput && <InputModal />}
      {aiResult && <AIResultCard result={aiResult} onClose={() => { setAiResult(null); setShowInput(false); resetInput(); setTab("report"); }} onCloseToHome={() => { setAiResult(null); setShowInput(false); resetInput(); setTab("home"); }} />}
      {showSplash && <SplashScreen onDone={() => setShowSplash(false)} />}
      {/* utuwa.mp4: Lv5到達時演出（① 器のMP4） */}
      {level === 5 && !hasPlayedUtuwa && (
        <div style={{ position: "fixed", inset: 0, zIndex: 10000 }}>
          <VideoPlayer
            src="/utuwa.mp4"
            onEnded={() => {
              setHasPlayedUtuwa(true);
              // ② 器のMP4のあと「レベル5に到達しました」テキストを表示
              setLevelUpInfo({ from: 4, to: 5, viaVideo: true });
            }}
          />
        </div>
      )}
      {levelUpInfo && <LevelUpModal
        fromLevel={levelUpInfo.from}
        toLevel={levelUpInfo.to}
        skipFlash={!!levelUpInfo.viaVideo}
        onClose={() => {
          const wasViaVideo = levelUpInfo.viaVideo;
          setLevelUpInfo(null);
          // ③ テキストを閉じたら ④ 才能パズルへ
          if (wasViaVideo) setShowTalentMatch(true);
        }}
      />}
      {showTalentMatch && <TalentMatchModal
        onClose={() => setShowTalentMatch(false)}
        insightMessage={aiResult?.insightMessage || ""}
        topValues={aiResult?.topValues || []}
        topTalents={aiResult?.topTalents || []}
        aiPct={(() => {
          const loveCount = history.filter(h => (h.aiPct ?? 0) >= 65).length;
          return history.length > 0 ? Math.round((loveCount / history.length) * 100) : 0;
        })()}
        topCats={(() => {
          const catCounts = {};
          history.forEach(h => { if (h.cat) catCounts[h.cat] = (catCounts[h.cat] || 0) + 1; });
          return Object.entries(catCounts).sort((a, b) => b[1] - a[1]).slice(0, 4);
        })()}
        userProfile={obAnswersGlobal}
        pieceCounts={(() => {
          // マイページ「あなたの才能、育ってます」と同じ集計（ピース数の根拠として使用）
          const domainTotals = {};
          history.forEach(h => {
            (h.valueTags || []).forEach(tag => {
              const info = TALENT_TAG_MAP[tag];
              if (info) domainTotals[info.label] = (domainTotals[info.label] || 0) + 1;
            });
          });
          return Object.entries(domainTotals).sort((a, b) => b[1] - a[1]);
        })()}
      />}
      {showOnboarding && <OnboardingScreen />}
    </div>
  );
}
