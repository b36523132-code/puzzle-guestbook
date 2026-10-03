import { EMPTY_PIECE_STYLE } from "@/config/colors";

interface EmptyPuzzlePieceProps {
  pathD: string;
}

/**
 * 아직 아무도 참여하지 않은 빈 조각.
 * 완전히 흰 화면처럼 보이지 않도록 옅은 색상의 실제 퍼즐 조각 외곽선을 보여준다.
 */
export default function EmptyPuzzlePiece({ pathD }: EmptyPuzzlePieceProps) {
  return (
    <path
      d={pathD}
      fill={EMPTY_PIECE_STYLE.fill}
      stroke={EMPTY_PIECE_STYLE.stroke}
      strokeWidth={1.5}
      vectorEffect="non-scaling-stroke"
    />
  );
}
