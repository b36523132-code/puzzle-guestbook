"use client";

import { getColorVariant } from "@/config/colors";
import { MAX_EMOJIS_PER_PIECE } from "@/config/puzzle";
import { PIECE_BOX_SPAN_RATIO, PIECE_CLIP_PAD_RATIO } from "@/lib/puzzle";
import type { Participant } from "@/types/puzzle";

interface PuzzlePieceProps {
  participant: Participant;
  /** 이 조각 하나를 감싸는 패딩 포함 박스를 보드 안에서 어디에 둘지 (퍼센트 기준) */
  style: React.CSSProperties;
  /** objectBoundingBox 단위로 정의된, 이 조각 모양 그대로의 clipPath id */
  clipPathId: string;
  /** true면 뒷면(이름/메모/이모지)이 보이고, false면 앞면 이미지가 그대로 보인다 (뒤는 투명) */
  flipped: boolean;
  /** 방금 막 등록되었거나 "내 조각 확인하기"로 강조되는 중인지 */
  glowing?: boolean;
}

/** 안전 영역(실제 조각 1칸)이 패딩 포함 박스 안에서 차지하는 비율 (0~100%) */
const SAFE_INSET_PERCENT = (PIECE_CLIP_PAD_RATIO / PIECE_BOX_SPAN_RATIO) * 100;

/**
 * 퍼즐 조각 하나의 "뒷면" 카드.
 * 앞면(공동 이미지)은 이 컴포넌트가 그리지 않는다 - PuzzleBoard 의 SVG 이미지 레이어가 항상 그 자리에
 * 깔려 있고, 이 카드는 backface-visibility 로 숨겨진 채 그 위에 얹혀 있다가 flip 될 때만 드러난다.
 * 그래서 flip 되지 않은 상태에서는 완전히 투명하게 "사라져" 이미지가 그대로 보인다.
 */
export default function PuzzlePiece({ participant, style, clipPathId, flipped, glowing }: PuzzlePieceProps) {
  const color = getColorVariant(participant.colorVariant);

  return (
    <div
      className="absolute"
      style={{
        ...style,
        perspective: "1200px",
        pointerEvents: "none",
      }}
    >
      <div
        className="relative h-full w-full transition-transform duration-[600ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{
          transformStyle: "preserve-3d",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* 뒷면: preserve-3d 컨테이너 안에서 애초에 180도 돌아가 있으므로,
            컨테이너가 0도일 때는 backface-visibility 로 숨겨져 "사라지고"(=이미지가 보임),
            컨테이너가 180도일 때는 정면을 바라보게 되어 드러난다. */}
        <div
          className="absolute inset-0 flex items-center justify-center overflow-hidden"
          style={{
            clipPath: `url(#${clipPathId})`,
            WebkitClipPath: `url(#${clipPathId})`,
            backgroundColor: color.fill,
            transform: "rotateY(180deg)",
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            /* backfaceVisibility 만으로는 clip-path + 3D transform 조합에서 일부 브라우저가
               뒷면을 완전히 숨기지 못하는 경우가 있어, opacity 로 한 번 더 확실히 숨긴다.
               (visibility 는 transform 전환과 함께 자연스럽게 사라지는 flip 애니메이션을
               끊어버리므로 사용하지 않는다.) */
            opacity: flipped ? 1 : 0,
            boxShadow: glowing
              ? `0 0 0 3px rgba(255,255,255,0.9) inset, 0 0 22px 6px ${color.fill}`
              : "0 0 0 0 transparent",
            transition: "box-shadow 0.4s ease, opacity 0.6s ease",
          }}
        >
          <div
            className="flex flex-col items-center justify-center gap-0.5 text-center"
            style={{
              position: "absolute",
              inset: `${SAFE_INSET_PERCENT}%`,
            }}
          >
            <span
              className="max-w-full truncate text-[clamp(9px,1.6vw,15px)] font-bold leading-tight"
              style={{ color: color.text }}
            >
              {participant.name}
            </span>
            {participant.message && (
              <span
                className="line-clamp-3 max-w-full text-[clamp(7px,1.25vw,11.5px)] font-medium leading-[1.15] opacity-90"
                style={{ color: color.text }}
              >
                {participant.message}
              </span>
            )}
            {participant.emojis.length > 0 && (
              <span className="mt-0.5 text-[clamp(8px,1.4vw,13px)] leading-none">
                {participant.emojis.slice(0, MAX_EMOJIS_PER_PIECE).join(" ")}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

