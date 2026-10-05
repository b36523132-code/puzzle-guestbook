"use client";

import { getColorVariant } from "@/config/colors";
import { PUZZLE_CONFIG } from "@/config/puzzle";
import {
  BOARD_VIEWBOX_HEIGHT,
  BOARD_VIEWBOX_WIDTH,
  CELL,
  PIECE_CLIP_PAD_RATIO,
  getPiecePathD,
  getPuzzleLayout,
  positionToRowCol,
} from "@/lib/puzzle";
import type { Participant } from "@/types/puzzle";

interface PieceDetailCardProps {
  participant: Participant;
  onClose: () => void;
}

/**
 * 보드에서 조각을 누르면 뜨는 상세 카드.
 * 퍼즐 조각 자체는 공간이 좁아 한마디(메모)가 줄 수 제한으로 잘려 보일 수 있으므로,
 * 이 카드에서는 줄 제한 없이 전체 내용을 그대로 보여준다.
 * 조각 미리보기는 단색이 아니라, 실제 보드에서 이 조각이 차지하는 공동 이미지 영역을 그대로
 * 잘라서 보여준다. 돌출부(탭)가 셀 경계 밖으로 튀어나오므로, 보드와 동일하게 "절대 잘리지 않는"
 * 여백(PIECE_CLIP_PAD_RATIO)을 둔 viewBox 를 써서 조각 테두리가 잘려 보이지 않게 한다.
 */
export default function PieceDetailCard({ participant, onClose }: PieceDetailCardProps) {
  const color = getColorVariant(participant.colorVariant);
  const { rows, columns } = PUZZLE_CONFIG;
  const layout = getPuzzleLayout(rows, columns);
  const { row, col } = positionToRowCol(participant.puzzlePosition, columns);
  const pathD = getPiecePathD(layout, row, col);
  const clipId = `piece-detail-clip-${participant.id}`;

  // 이 조각의 돌출부까지 전부 포함하는, 보드와 같은 절대 좌표계의 정사각 viewBox
  const pad = CELL * PIECE_CLIP_PAD_RATIO;
  const span = CELL + pad * 2;
  const viewMinX = col * CELL - pad;
  const viewMinY = row * CELL - pad;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${participant.relayNumber}번째 참가자 ${participant.name}의 조각 상세`}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-500 transition-colors hover:bg-slate-200"
        >
          ✕
        </button>

        <div className="mx-auto mb-3 h-28 w-28">
          <svg
            viewBox={`${viewMinX} ${viewMinY} ${span} ${span}`}
            className="h-full w-full overflow-visible drop-shadow-md"
          >
            <defs>
              <clipPath id={clipId}>
                <path d={pathD} />
              </clipPath>
            </defs>
            <g clipPath={`url(#${clipId})`}>
              <image
                href={PUZZLE_CONFIG.frontImage}
                x={0}
                y={0}
                width={BOARD_VIEWBOX_WIDTH}
                height={BOARD_VIEWBOX_HEIGHT}
                preserveAspectRatio="xMidYMid slice"
              />
            </g>
            <path d={pathD} fill="none" stroke={color.fill} strokeWidth={3} />
          </svg>
        </div>

        <p className="text-center text-xs font-semibold uppercase tracking-wide text-violet-500">
          {participant.relayNumber}번째 참가자
        </p>
        <h3 className="mt-1 break-words text-center text-xl font-extrabold text-slate-900">{participant.name}</h3>

        {participant.message && (
          <p className="mt-3 whitespace-pre-wrap break-words rounded-2xl bg-slate-50 px-4 py-3 text-center text-sm font-medium leading-relaxed text-slate-600">
            {participant.message}
          </p>
        )}

        {participant.emojis.length > 0 && (
          <p className="mt-3 text-center text-2xl leading-none">{participant.emojis.join(" ")}</p>
        )}
      </div>
    </div>
  );
}
