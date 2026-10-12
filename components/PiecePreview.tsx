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
      {/* 이 미리보기는 최종 확인 단계에서 아주 작은 크기(가로 64px)로도 쓰인다. 그 작은 크기에서
          이름+한마디+이모지가 한꺼번에 들어가면 원래 글자 크기로는 안쪽 영역을 넘쳐 잘려 보일 수 있다.
          이 작은 크기는 퍼즐판과 세로로 쌓이는 레이아웃(= lg(1024px) 미만, 모바일부터 태블릿 폭까지)에서
          계속 쓰이므로, 더 큰 글자로 바뀌는 기준도 sm 이 아니라 lg 로 맞춰 그 구간에서 잘리지 않게 했다.
          lg 이상(퍼즐판과 좌우로 나란히 배치되어 미리보기 자체도 커지는 화면)에서는 원래 크기 그대로. */}
      <div className="absolute inset-[12%] flex flex-col items-center justify-center gap-0.5 overflow-hidden text-center lg:inset-[20%] lg:gap-1">
        <span
          className="max-w-full truncate text-[11px] font-bold leading-none lg:text-lg lg:leading-tight"
          style={{ color: color.text }}
        >
          {displayName}
        </span>
        {message.trim() && (
          <span
            className="line-clamp-1 max-w-full text-[8px] font-medium leading-none opacity-90 lg:line-clamp-2 lg:text-xs lg:leading-snug"
            style={{ color: color.text }}
          >
            {message.trim()}
          </span>
        )}
        {emojis.length > 0 && (
          <span className="mt-0.5 text-[10px] leading-none lg:text-xl">{emojis.join(" ")}</span>
        )}
      </div>
    </div>
  );
});

export default PiecePreview;
