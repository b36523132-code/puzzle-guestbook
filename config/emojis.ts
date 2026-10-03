/**
 * 추천 이모지 팔레트. 실제 Unicode Emoji 문자만 사용하고,
 * 별도의 이미지 파일(PNG 등)은 사용하지 않는다.
 */
export interface EmojiCategory {
  id: string;
  label: string;
  emojis: string[];
}

export const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    id: "mood",
    label: "기분",
    emojis: ["😊", "😎", "🥰", "😆", "🤩"],
  },
  {
    id: "nature",
    label: "자연",
    emojis: ["🌱", "🌸", "🌈", "☀️", "🌙", "🍀"],
  },
  {
    id: "cheer",
    label: "응원",
    emojis: ["❤️", "💜", "⭐️", "✨", "🔥", "🙌"],
  },
  {
    id: "activity",
    label: "활동",
    emojis: ["⚽️", "🎵", "🎨", "📚", "🐶", "🧩"],
  },
];

export const ALL_RECOMMENDED_EMOJIS = EMOJI_CATEGORIES.flatMap((c) => c.emojis);
