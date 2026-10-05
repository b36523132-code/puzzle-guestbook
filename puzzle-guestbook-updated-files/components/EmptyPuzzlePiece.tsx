"use client";

import { useState } from "react";

interface EmptyPuzzlePieceProps {
  position: number;
}

/**
 * 아직 아무도 참여하지 않은 조각의 "히트 영역".
 * 눌러도 뒤집히지 않고, 아주 짧게 "아직 비어 있는 조각이에요." 피드백만 보여준다.
 * 실제 이미지/외곽선은 PuzzleBoard 의 SVG 레이어가 모든 칸에 공통으로 그려주므로
 * 이 컴포넌트는 순수하게 탭 처리만 담당한다.
 */
export default function EmptyPuzzlePiece({ position }: EmptyPuzzlePieceProps) {
  const [showTip, setShowTip] = useState(false);

  function handleTap() {
    if (showTip) return;
    setShowTip(true);
    setTimeout(() => setShowTip(false), 1100);
  }

  return (
    <button
      type="button"
      aria-label={`${position + 1}번째 조각, 아직 참여자가 없음`}
      onClick={handleTap}
      className="relative h-full w-full cursor-default select-none bg-transparent"
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      {showTip && (
        <span className="pointer-events-none absolute inset-1 z-10 flex items-center justify-center rounded-md bg-slate-900/80 px-0.5 text-center text-[7px] font-medium leading-[1.15] text-white shadow-sm sm:text-[9px]">
          비어 있어요
        </span>
      )}
    </button>
  );
}
