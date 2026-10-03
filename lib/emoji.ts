import { MAX_EMOJIS_PER_PIECE } from "@/config/puzzle";
import type { EmojiPosition } from "@/types/puzzle";

/** 이모지를 추가하는 순서대로 자동 배정되는 위치. 서로 겹치지 않도록 미리 정한 순서다. */
export const EMOJI_SLOT_ORDER: EmojiPosition[] = ["bottom-right", "top-right", "top-left"];

export function assignEmojiPositions(emojis: string[]): EmojiPosition[] {
  return emojis.slice(0, MAX_EMOJIS_PER_PIECE).map((_, i) => EMOJI_SLOT_ORDER[i] ?? "center-accent");
}

/** 이모지 위치 -> 오버레이에서 쓰는 CSS 클래스 (조각 중앙의 이름 글자를 가리지 않도록 모서리에 배치) */
export const EMOJI_POSITION_CLASS: Record<EmojiPosition, string> = {
  "top-left": "top-[12%] left-[14%]",
  "top-right": "top-[12%] right-[14%]",
  "bottom-left": "bottom-[14%] left-[14%]",
  "bottom-right": "bottom-[14%] right-[14%]",
  "center-accent": "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
};

/**
 * 사용자가 직접 붙여넣는 이모지 입력을 안전한 plain text 로 정리한다.
 * - HTML/스크립트로 해석될 수 있는 문자를 제거
 * - 과도하게 긴 입력 방지 (이모지 1~2개 정도의 길이로 제한)
 * - 실행 가능한 문자열이 아니라 순수 텍스트로만 취급 (dangerouslySetInnerHTML 사용 안 함)
 */
export function sanitizeEmojiInput(raw: string): string {
  const stripped = raw.replace(/[<>&"'\`]/g, "").trim();
  // 이모지는 서로게이트 페어 + variation selector + ZWJ 등으로 여러 code unit 을 쓸 수 있으므로
  // 코드 포인트 기준으로 넉넉히 8개까지만 허용 (단일 이모지 + 합성 이모지 대응)
  const codePoints = Array.from(stripped);
  return codePoints.slice(0, 8).join("");
}

export function isLikelyEmoji(text: string): boolean {
  if (!text) return false;
  // 이모지/기호 범위에 해당하는 코드포인트가 하나라도 있으면 허용 (관대한 검증 - 서버에서 다시 한 번 길이 검증함)
  const emojiPattern = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}\u{FE0F}]/u;
  return emojiPattern.test(text) || Array.from(text).length <= 4;
}
