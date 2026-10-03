"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PUZZLE_CONFIG } from "@/config/puzzle";
import { getColorVariant } from "@/config/colors";
import { EMOJI_POSITION_CLASS } from "@/lib/emoji";
import { BOARD_VIEWBOX_HEIGHT, BOARD_VIEWBOX_WIDTH, getPiecePathD, getPuzzleLayout, positionToRowCol } from "@/lib/puzzle";
import type { EmojiPosition, Participant } from "@/types/puzzle";
import PuzzlePiece from "./PuzzlePiece";
import EmptyPuzzlePiece from "./EmptyPuzzlePiece";

interface PuzzleBoardProps {
  participants: Participant[];
  rows?: number;
  columns?: number;
  highlightParticipantId?: string | null;
  incomingIds?: Set<string>;
  /** 등록 애니메이션이 퍼즐판으로 "착지"하는 순간까지는 해당 위치를 비워둔 채로 그린다 */
  pendingHiddenPosition?: number | null;
  /** 실제 DOM 크기가 필요한 곳(조각 이동 애니메이션의 도착 지점 계산 등)에서 사용하는 ref */
  containerRef?: React.RefObject<HTMLDivElement | null>;
}

/**
 * 퍼즐판은 항상 columns:rows 비율을 "정확히" 유지해야 한다 (SVG 안의 조각 좌표와
 * 이름/이모지를 그리는 HTML 오버레이 그리드가 1px 오차 없이 겹쳐야 하기 때문).
 * CSS aspect-ratio 만으로는 max-width/max-height 가 동시에 걸릴 때 비율이 깨지는
 * 경우가 있어, 부모 영역 크기를 측정해서 "contain" 방식으로 정확한 픽셀 크기를 계산한다.
 */
export default function PuzzleBoard({
  participants,
  rows = PUZZLE_CONFIG.rows,
  columns = PUZZLE_CONFIG.columns,
  highlightParticipantId = null,
  incomingIds,
  pendingHiddenPosition = null,
  containerRef,
}: PuzzleBoardProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const wrapperEl = wrapperRef.current;
    if (!wrapperEl) return;
    const ratio = columns / rows;

    const compute = () => {
      const availW = wrapperEl.clientWidth;
      const availH = wrapperEl.clientHeight;
      if (availW <= 0 || availH <= 0) return;
      let w = availW;
      let h = w / ratio;
      if (h > availH) {
        h = availH;
        w = h * ratio;
      }
      setSize({ width: Math.floor(w), height: Math.floor(h) });
    };

    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(wrapperEl);
    window.addEventListener("resize", compute);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", compute);
    };
  }, [rows, columns]);

  function setBoardRef(node: HTMLDivElement | null) {
    boardRef.current = node;
    if (containerRef) containerRef.current = node;
  }

  const layout = useMemo(() => getPuzzleLayout(rows, columns), [rows, columns]);

  const byPosition = useMemo(() => {
    const map = new Map<number, Participant>();
    for (const p of participants) map.set(p.puzzlePosition, p);
    return map;
  }, [participants]);

  const cells = useMemo(() => {
    const total = rows * columns;
    const list: { position: number; row: number; col: number; pathD: string }[] = [];
    for (let position = 0; position < total; position++) {
      const { row, col } = positionToRowCol(position, columns);
      list.push({ position, row, col, pathD: getPiecePathD(layout, row, col) });
    }
    return list;
  }, [layout, rows, columns]);

  return (
    <div ref={wrapperRef} className="flex h-full w-full items-center justify-center">
      <div
        ref={setBoardRef}
        className="relative select-none"
        style={{ width: size.width || "100%", height: size.height || "100%" }}
        aria-label="퍼즐판"
      >
        <svg
          viewBox={`0 0 ${BOARD_VIEWBOX_WIDTH} ${BOARD_VIEWBOX_HEIGHT}`}
          className="absolute inset-0 h-full w-full drop-shadow-sm"
          preserveAspectRatio="none"
        >
          {cells.map(({ position, pathD }) => {
            const participant = position === pendingHiddenPosition ? undefined : byPosition.get(position);
            if (!participant) {
              return <EmptyPuzzlePiece key={position} pathD={pathD} />;
            }
            return (
              <PuzzlePiece
                key={participant.id}
                pathD={pathD}
                participant={participant}
                isHighlighted={highlightParticipantId === participant.id}
                isIncoming={incomingIds?.has(participant.id)}
              />
            );
          })}
        </svg>

        {/* 이름 / 이모지 오버레이 (SVG 위에 겹쳐서, 탭의 돌출부를 피해 셀 중앙 영역에만 표시) */}
        <div
          className="pointer-events-none absolute inset-0 grid"
          style={{
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            gridTemplateRows: `repeat(${rows}, 1fr)`,
          }}
        >
          {cells.map(({ position }) => {
            const participant = position === pendingHiddenPosition ? undefined : byPosition.get(position);
            if (!participant) return <div key={position} />;
            const color = getColorVariant(participant.colorVariant);
            return (
              <div key={position} className="relative flex items-center justify-center overflow-hidden">
                <span
                  className="max-w-[78%] truncate text-center text-[clamp(9px,1.5vw,15px)] font-bold leading-none"
                  style={{ color: color.text }}
                >
                  {participant.name}
                </span>
                {participant.emojis.map((emoji, i) => {
                  const pos = (participant.emojiPositions[i] ?? "center-accent") as EmojiPosition;
                  return (
                    <span
                      key={i}
                      className={`absolute text-[clamp(8px,1.6vw,16px)] leading-none ${EMOJI_POSITION_CLASS[pos]}`}
                    >
                      {emoji}
                    </span>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
