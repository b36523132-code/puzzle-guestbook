"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import type { DraftPiece } from "@/types/puzzle";
import PiecePreview from "./PiecePreview";

function getPrefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface JoinAnimationProps {
  draft: DraftPiece;
  sourceRect: Rect;
  targetRect: Rect;
  durationMs: number;
  onComplete: () => void;
}

/**
 * 오른쪽 패널에서 꾸민 조각이 그대로 분리되어 왼쪽 퍼즐판의 배정된 위치로 이동하는 애니메이션.
 * 다른 조각들은 전혀 움직이지 않고, 이 조각 하나만 화면 위에 고정 레이어로 떠서 이동한다.
 */
export default function JoinAnimation({ draft, sourceRect, targetRect, durationMs, onComplete }: JoinAnimationProps) {
  const [prefersReduced] = useState(getPrefersReducedMotion);

  const duration = prefersReduced ? 0.2 : durationMs / 1000;

  return (
    <motion.div
      className="pointer-events-none fixed z-50 drop-shadow-xl"
      initial={{
        left: sourceRect.left,
        top: sourceRect.top,
        width: sourceRect.width,
        height: sourceRect.height,
        opacity: 1,
      }}
      animate={{
        left: targetRect.left,
        top: targetRect.top,
        width: targetRect.width,
        height: targetRect.height,
      }}
      transition={{ duration, ease: [0.22, 1, 0.36, 1] }}
      onAnimationComplete={onComplete}
      style={{ position: "fixed" }}
    >
      <PiecePreview
        name={draft.name}
        message={draft.message}
        colorVariant={draft.colorVariant}
        emojis={draft.emojis}
        className="h-full w-full"
      />
    </motion.div>
  );
}
