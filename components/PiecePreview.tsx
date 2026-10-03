import { forwardRef } from "react";
import { getColorVariant, type ColorVariantId } from "@/config/colors";
import { EMOJI_POSITION_CLASS } from "@/lib/emoji";
import { getStandalonePiecePathD, STANDALONE_VIEWBOX } from "@/lib/puzzle";
import type { EmojiPosition } from "@/types/puzzle";

interface PiecePreviewProps {
  name: string;
  colorVariant: ColorVariantId;
  emojis: string[];
  emojiPositions: EmojiPosition[];
  className?: string;
}

/**
 * 참가자가 이름/색상/이모지를 고르는 동안 실시간으로 보여주는 "내 조각" 미리보기.
 * 등록 버튼을 누르면 이 모양 그대로(JoinAnimation) 퍼즐판으로 날아가듯 이동한다.
 */
const PiecePreview = forwardRef<HTMLDivElement, PiecePreviewProps>(function PiecePreview(
  { name, colorVariant, emojis, emojiPositions, className },
  ref
) {
  const color = getColorVariant(colorVariant);
  const pathD = getStandalonePiecePathD();
  const displayName = name.trim() || "나";

  return (
    <div ref={ref} className={`relative aspect-square w-full ${className ?? ""}`}>
      <svg viewBox={STANDALONE_VIEWBOX} className="absolute inset-0 h-full w-full drop-shadow-md">
        <path d={pathD} fill={color.fill} stroke={color.stroke} strokeWidth={2} />
      </svg>
      <div className="absolute inset-[18%] flex items-center justify-center overflow-hidden">
        <span
          className="max-w-[85%] truncate text-center text-base font-bold leading-none sm:text-lg"
          style={{ color: color.text }}
        >
          {displayName}
        </span>
        {emojis.map((emoji, i) => (
          <span
            key={i}
            className={`absolute text-xl leading-none sm:text-2xl ${EMOJI_POSITION_CLASS[emojiPositions[i] ?? "center-accent"]}`}
          >
            {emoji}
          </span>
        ))}
      </div>
    </div>
  );
});

export default PiecePreview;
