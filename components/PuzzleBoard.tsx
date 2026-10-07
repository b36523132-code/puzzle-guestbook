"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getColorVariant } from "@/config/colors";
import { PUZZLE_CONFIG, JOIN_REVEAL_HOLD_MS, MANUAL_REVEAL_GLOW_MS, FLIP_DURATION_MS } from "@/config/puzzle";
import {
  BOARD_VIEWBOX_HEIGHT,
  BOARD_VIEWBOX_WIDTH,
  PIECE_BOX_SPAN_RATIO,
  PIECE_CLIP_PAD_RATIO,
  getPiecePathD,
  getPieceLocalPathD,
  getPuzzleLayout,
  positionToRowCol,
} from "@/lib/puzzle";
import type { Participant } from "@/types/puzzle";
import PuzzlePiece from "./PuzzlePiece";
import EmptyPuzzlePiece from "./EmptyPuzzlePiece";
import PieceDetailCard from "./PieceDetailCard";

export type RevealMode = "auto" | "manual";

interface PuzzleBoardProps {
  participants: Participant[];
  rows?: number;
  columns?: number;
  incomingIds?: Set<string>;
  /** 등록 애니메이션이 퍼즐판으로 "착지"하는 순간까지는 해당 위치를 비워둔 채로 그린다 */
  pendingHiddenPosition?: number | null;
  /** 실제 DOM 크기가 필요한 곳(조각 이동 애니메이션의 도착 지점 계산 등)에서 사용하는 ref */
  containerRef?: React.RefObject<HTMLDivElement | null>;
  /** 특정 위치를 강제로 뒷면(이름/메모) 상태로 보여주고 싶을 때 (신규 참가 직후 / "내 조각 확인하기") */
  revealPosition?: number | null;
  /** revealPosition 이 바뀌지 않아도 같은 위치를 다시 트리거하고 싶을 때 증가시키는 값 */
  revealNonce?: number;
  /** auto: 잠깐 보여준 뒤 스스로 앞면(이미지)으로 돌아간다 / manual: 계속 뒷면에 머무르고(사용자가 직접 눌러야 돌아감) */
  revealMode?: RevealMode;
  /** revealMode='auto' 의 전체 시퀀스(뒷면 유지 + 자동 flip)가 끝났을 때 */
  onRevealComplete?: () => void;
}

/**
 * 퍼즐판은 항상 columns:rows 비율을 "정확히" 유지해야 한다 (SVG 안의 이미지/조각 경계와
 * HTML 오버레이 카드가 1px 오차 없이 겹쳐야 하기 때문).
 * CSS aspect-ratio 만으로는 max-width/max-height 가 동시에 걸릴 때 비율이 깨지는
 * 경우가 있어, 부모 영역 크기를 측정해서 "contain" 방식으로 정확한 픽셀 크기를 계산한다.
 *
 * 레이어 구성 (아래 -> 위):
 *  1) SVG 이미지 레이어 - 모든 칸에 하나의 공동 이미지를 조각 모양대로 잘라 보여준다. 항상 보인다.
 *  2) flip 카드 레이어 (pointer-events: none) - 참가자가 있는 칸만, 조각 모양 그대로 뒷면 카드를
 *     3D flip 으로 얹는다. 앞면일 때는 backface-visibility 로 완전히 숨어 1번 레이어가 그대로 보인다.
 *  3) 히트 영역 레이어 - 칸마다 정확히 겹치는 투명 버튼. 실제 탭 입력은 여기서만 받는다.
 */
export default function PuzzleBoard({
  participants,
  rows = PUZZLE_CONFIG.rows,
  columns = PUZZLE_CONFIG.columns,
  incomingIds,
  pendingHiddenPosition = null,
  containerRef,
  revealPosition = null,
  revealNonce = 0,
  revealMode = "manual",
  onRevealComplete,
}: PuzzleBoardProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  // flip 상태는 참가자 데이터(Realtime 으로 계속 바뀜)와 완전히 분리된 "현재 화면" UI 상태다.
  // 다른 사람이 새로 참여해서 participants 배열이 바뀌어도, 내가 이미 열어본 조각의 flip 상태는 유지된다.
  const [flipped, setFlipped] = useState<Set<number>>(new Set());
  const [glowing, setGlowing] = useState<Set<number>>(new Set());
  // 조각을 눌렀을 때 이름/한마디를 줄임 없이 자세히 보여주는 상세 카드가 열려있는 위치
  const [detailPosition, setDetailPosition] = useState<number | null>(null);

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
    const list: { position: number; row: number; col: number; pathD: string; localD: string }[] = [];
    for (let position = 0; position < total; position++) {
      const { row, col } = positionToRowCol(position, columns);
      list.push({
        position,
        row,
        col,
        pathD: getPiecePathD(layout, row, col),
        localD: getPieceLocalPathD(layout, row, col),
      });
    }
    return list;
  }, [layout, rows, columns]);

  // 외부에서 특정 위치를 강제로 뒷면으로 드러내고 싶을 때(신규 참가 직후 / "내 조각 확인하기").
  useEffect(() => {
    if (revealPosition == null) return;
    const pos = revealPosition;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFlipped((prev) => new Set(prev).add(pos));
    setGlowing((prev) => new Set(prev).add(pos));

    const glowMs = revealMode === "manual" ? MANUAL_REVEAL_GLOW_MS : JOIN_REVEAL_HOLD_MS;
    const glowTimer = setTimeout(() => {
      setGlowing((prev) => {
        const next = new Set(prev);
        next.delete(pos);
        return next;
      });
    }, glowMs);

    let unflipTimer: ReturnType<typeof setTimeout> | undefined;
    let completeTimer: ReturnType<typeof setTimeout> | undefined;
    if (revealMode === "auto") {
      unflipTimer = setTimeout(() => {
        setFlipped((prev) => {
          const next = new Set(prev);
          next.delete(pos);
          return next;
        });
        completeTimer = setTimeout(() => onRevealComplete?.(), FLIP_DURATION_MS);
      }, JOIN_REVEAL_HOLD_MS);
    }

    return () => {
      clearTimeout(glowTimer);
      if (unflipTimer) clearTimeout(unflipTimer);
      if (completeTimer) clearTimeout(completeTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealPosition, revealNonce, revealMode]);

  /**
   * 조각 하나를 눌렀을 때:
   * - 아직 앞면(이미지)이면: 뒷면(이름/한마디)으로 뒤집히면서 동시에 상세 카드를 띄운다.
   *   카드를 닫아도(X/배경 클릭) 뒷면 상태는 그대로 유지된다 - 카드만 사라진다.
   * - 이미 뒷면이 보이는 상태라면(카드는 이미 닫혀 있는 상태): 카드 없이 바로 실제 3D flip
   *   애니메이션과 함께 앞면(이미지)으로 되돌아간다.
   */
  function handlePieceClick(position: number) {
    if (flipped.has(position)) {
      setFlipped((prev) => {
        const next = new Set(prev);
        next.delete(position);
        return next;
      });
    } else {
      setFlipped((prev) => new Set(prev).add(position));
      setDetailPosition(position);
    }
  }

  return (
    <div ref={wrapperRef} className="flex h-full w-full items-center justify-center">
      <div
        ref={setBoardRef}
        className="relative select-none overflow-hidden rounded-2xl shadow-sm"
        style={{ width: size.width || "100%", height: size.height || "100%" }}
        aria-label={`${PUZZLE_CONFIG.title} 퍼즐판`}
      >
        {/* 1) 공동 이미지 레이어 - 항상 완성된 사진처럼 이어져 보인다 */}
        <svg
          viewBox={`0 0 ${BOARD_VIEWBOX_WIDTH} ${BOARD_VIEWBOX_HEIGHT}`}
          className="absolute inset-0 h-full w-full drop-shadow-sm"
          preserveAspectRatio="none"
        >
          <defs>
            <image
              id="board-photo"
              href={PUZZLE_CONFIG.frontImage}
              x={0}
              y={0}
              width={BOARD_VIEWBOX_WIDTH}
              height={BOARD_VIEWBOX_HEIGHT}
              preserveAspectRatio="xMidYMid slice"
            />
            {cells.map(({ position, pathD }) => (
              <clipPath id={`piece-abs-${position}`} key={`abs-${position}`}>
                <path d={pathD} />
              </clipPath>
            ))}
            {cells.map(({ position, localD }) => (
              <clipPath id={`piece-rel-${position}`} key={`rel-${position}`} clipPathUnits="objectBoundingBox">
                <path d={localD} />
              </clipPath>
            ))}
            {/* 맞춰진(참가자가 있는) 조각 테두리에 번지는 빛을 주기 위한 블러 필터 */}
            <filter id="piece-glow-blur" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="3.2" />
            </filter>

            {/*
              채워진 조각: 사진 색이 또렷하게 보여야 한다.
              (예전 버전은 feGaussianBlur(SourceAlpha) 결과가 조각 내부까지 거의 불투명하게
              남는 특성 때문에, 하이라이트/쉐도우 feComposite 가 테두리만이 아니라 조각 전체를
              흰색/검은색으로 덮어버려 사진이 하얗게 떠 보이는 버그가 있었다. 사진 색은 전혀
              건드리지 않고 뒤쪽에 그림자만 드리워 볼록한 느낌을 주는 feDropShadow 하나로 단순화한다.)
            */}
            <filter id="piece-emboss" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0.6" dy="1.2" stdDeviation="1" floodColor="#000000" floodOpacity="0.28" />
            </filter>

            {/* 빈 조각: 안으로 들어간 느낌(이너 쉐도우) + 종이처럼 보이도록 채도를 낮춘다 */}
            <filter id="piece-inset" x="-20%" y="-20%" width="140%" height="140%">
              <feColorMatrix in="SourceGraphic" type="saturate" values="0.2" result="desat" />
              <feGaussianBlur in="SourceAlpha" stdDeviation="2.2" result="alphaBlur" />
              <feOffset in="alphaBlur" dx="-1.4" dy="-1.4" result="shOff" />
              <feFlood floodColor="#000000" floodOpacity="0.55" result="shColor" />
              <feComposite in="shColor" in2="shOff" operator="in" result="shRaw" />
              <feComposite in="shRaw" in2="SourceAlpha" operator="in" result="innerShadow" />
              <feOffset in="alphaBlur" dx="1.4" dy="1.4" result="hiOff" />
              <feFlood floodColor="#ffffff" floodOpacity="0.4" result="hiColor" />
              <feComposite in="hiColor" in2="hiOff" operator="in" result="hiRaw" />
              <feComposite in="hiRaw" in2="SourceAlpha" operator="in" result="innerHighlight" />
              <feBlend in="desat" in2="innerShadow" mode="multiply" result="step1" />
              <feBlend in="step1" in2="innerHighlight" mode="screen" />
            </filter>
          </defs>

          {cells.map(({ position }) => {
            const participant = position === pendingHiddenPosition ? undefined : byPosition.get(position);
            const isIncoming = participant ? incomingIds?.has(participant.id) : false;
            return (
              <g key={`img-${position}`} filter={participant ? "url(#piece-emboss)" : "url(#piece-inset)"}>
                <g
                  clipPath={`url(#piece-abs-${position})`}
                  opacity={participant ? 1 : 0.5}
                  style={{ transition: isIncoming ? "opacity 0.6s ease" : undefined }}
                >
                  <use href="#board-photo" />
                  {!participant && (
                    <rect
                      x={0}
                      y={0}
                      width={BOARD_VIEWBOX_WIDTH}
                      height={BOARD_VIEWBOX_HEIGHT}
                      fill="#d8d3c6"
                      fillOpacity={0.4}
                    />
                  )}
                </g>
              </g>
            );
          })}

          {cells.map(({ position, pathD }) => {
            const participant = position === pendingHiddenPosition ? undefined : byPosition.get(position);
            return (
              <path
                key={`stroke-${position}`}
                d={pathD}
                fill="none"
                stroke={participant ? "rgba(255,255,255,0.6)" : "rgba(120,110,92,0.4)"}
                strokeWidth={participant ? 1 : 1.3}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}

          {/* 맞춰진 조각은 테두리를 따라 은은하게 숨쉬듯 빛난다 */}
          {cells.map(({ position, pathD }) => {
            const participant = position === pendingHiddenPosition ? undefined : byPosition.get(position);
            if (!participant) return null;
            const color = getColorVariant(participant.colorVariant);
            return (
              <path
                key={`glow-${position}`}
                className="piece-glow"
                d={pathD}
                fill="none"
                stroke={color.fill}
                strokeWidth={5.5}
                filter="url(#piece-glow-blur)"
                style={{ animationDelay: `${(position % 7) * 0.35}s` }}
              />
            );
          })}
        </svg>

        {/* 2) flip 카드 레이어 - 참가자가 있는 칸만, 조각 모양 그대로 뒷면 카드를 얹는다 */}
        <div className="pointer-events-none absolute inset-0">
          {cells.map(({ position, row, col }) => {
            const participant = position === pendingHiddenPosition ? undefined : byPosition.get(position);
            if (!participant) return null;

            const leftPct = ((col - PIECE_CLIP_PAD_RATIO) / columns) * 100;
            const topPct = ((row - PIECE_CLIP_PAD_RATIO) / rows) * 100;
            const widthPct = (PIECE_BOX_SPAN_RATIO / columns) * 100;
            const heightPct = (PIECE_BOX_SPAN_RATIO / rows) * 100;

            return (
              <PuzzlePiece
                key={participant.id}
                participant={participant}
                clipPathId={`piece-rel-${position}`}
                flipped={flipped.has(position)}
                glowing={glowing.has(position)}
                style={{
                  left: `${leftPct}%`,
                  top: `${topPct}%`,
                  width: `${widthPct}%`,
                  height: `${heightPct}%`,
                }}
              />
            );
          })}
        </div>

        {/* 3) 히트 영역 레이어 - 칸마다 정확히 겹치는 투명 버튼 (실제 탭 입력은 여기서만) */}
        <div
          className="absolute inset-0 grid"
          style={{
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            gridTemplateRows: `repeat(${rows}, 1fr)`,
          }}
        >
          {cells.map(({ position }) => {
            const participant = position === pendingHiddenPosition ? undefined : byPosition.get(position);
            if (!participant) return <EmptyPuzzlePiece key={position} position={position} />;
            return (
              <button
                key={position}
                type="button"
                aria-label={`${participant.relayNumber}번째 참가자 ${participant.name}의 조각 보기`}
                onClick={() => handlePieceClick(position)}
                className="h-full w-full cursor-default bg-transparent transition-transform active:scale-[0.96] md:cursor-pointer"
                style={{ WebkitTapHighlightColor: "transparent" }}
              />
            );
          })}
        </div>
      </div>

      {detailPosition != null &&
        (() => {
          const detailParticipant = byPosition.get(detailPosition);
          if (!detailParticipant) return null;
          // 카드를 닫는 것은 카드만 닫는다 - 조각의 뒷면 상태는 그대로 유지된다.
          return <PieceDetailCard participant={detailParticipant} onClose={() => setDetailPosition(null)} />;
        })()}

      <style jsx>{`
        .piece-glow {
          opacity: 0.55;
          animation: piece-glow-pulse 3.2s ease-in-out infinite;
          pointer-events: none;
        }
        @keyframes piece-glow-pulse {
          0%,
          100% {
            opacity: 0.4;
          }
          50% {
            opacity: 0.95;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .piece-glow {
            animation: none;
            opacity: 0.65;
          }
        }
      `}</style>
    </div>
  );
}
