import { forwardRef } from "react";
import { getColorVariant, type ColorVariantId } from "@/config/colors";
import { getStandalonePiecePathD, STANDALONE_VIEWBOX } from "@/lib/puzzle";

interface PiecePreviewProps {
  name: string;
  message: string;
  colorVariant: ColorVariantId;
  emojis: string[];
  className?: string;
}

/**
 * 참가자가 이름/한마디/색상/이모지를 고르는 동안 실시간으로 보여주는 "내 조각 뒷면" 미리보기.
 * 실제 퍼즐 앞면은 공동 이미지이고 참가자가 꾸미는 대상이 아니므로, 미리보기는 뒷면 디자인
 * (색상 + 이름 + 한마디 + 이모지) 중심으로 보여준다.
 * 등록 버튼을 누르면 이 모양 그대로(JoinAnimation) 퍼즐판으로 날아가듯 이동한다.
 */
const PiecePreview = forwardRef<HTMLDivElement, PiecePreviewProps>(function PiecePreview(
  { name, message, colorVariant, emojis, className },
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
      <div className="absolute inset-[20%] flex flex-col items-center justify-center gap-1 overflow-hidden text-center">
        <span
          className="max-w-full truncate text-base font-bold leading-tight sm:text-lg"
          style={{ color: color.text }}
        >
          {displayName}
        </span>
        {message.trim() && (
          <span
            className="line-clamp-2 max-w-full text-[11px] font-medium leading-snug opacity-90 sm:text-xs"
            style={{ color: color.text }}
          >
            {message.trim()}
          </span>
        )}
        {emojis.length > 0 && (
          <span className="mt-0.5 text-lg leading-none sm:text-xl">{emojis.join(" ")}</span>
        )}
      </div>
    </div>
  );
});

export default PiecePreview;
