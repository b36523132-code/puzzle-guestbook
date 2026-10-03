"use client";

import { motion } from "framer-motion";
import { getColorVariant } from "@/config/colors";
import type { Participant } from "@/types/puzzle";

interface PuzzlePieceProps {
  pathD: string;
  participant: Participant;
  /** 지금 이 화면을 보고 있는 사람이 방금 등록한 조각인지 (등록 직후 애니메이션은 JoinAnimation 이 별도 처리) */
  isHighlighted?: boolean;
  /** Realtime 으로 "다른 사람"의 조각이 막 들어온 경우 (fade/scale 로 부드럽게 등장) */
  isIncoming?: boolean;
}

export default function PuzzlePiece({ pathD, participant, isHighlighted, isIncoming }: PuzzlePieceProps) {
  const color = getColorVariant(participant.colorVariant);

  return (
    <motion.path
      d={pathD}
      fill={color.fill}
      stroke={color.stroke}
      strokeWidth={1.5}
      vectorEffect="non-scaling-stroke"
      style={{ transformOrigin: "center", transformBox: "fill-box" }}
      initial={isIncoming ? { opacity: 0, scale: 0.75 } : false}
      animate={
        isHighlighted
          ? { opacity: 1, scale: [1, 1.07, 1], filter: ["brightness(1)", "brightness(1.35)", "brightness(1)"] }
          : { opacity: 1, scale: 1 }
      }
      transition={
        isHighlighted
          ? { duration: 0.9, times: [0, 0.4, 1], ease: "easeInOut" }
          : { duration: 0.5, ease: "easeOut" }
      }
    />
  );
}
