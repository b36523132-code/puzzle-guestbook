import { JIGSAW_SEED, JIGSAW_TAB_SIZE_RATIO, PUZZLE_CONFIG } from "@/config/puzzle";

/** SVG 내부 좌표 단위로 쓰는 한 칸(셀)의 크기. 실제 화면 크기와는 무관하며
 *  viewBox 로 전체를 스케일하기 때문에 반응형 레이아웃에 영향을 주지 않는다. */
export const CELL = 100;

export interface Point {
  x: number;
  y: number;
}

interface LocalSegment {
  c1: Point;
  c2: Point;
  p1: Point;
}

interface EdgeCurve {
  /** 정규(canonical) 방향 기준 시작점 (global 좌표) */
  p0: Point;
  /** 정규 방향으로 이어지는 3차 베지어 구간들 (global 좌표) */
  segments: LocalSegment[];
}

export interface PuzzleLayout {
  rows: number;
  columns: number;
  /** verticalEdges[r][c] : row r 에서 column c 와 c+1 사이의 경계 (세로선), c = 0..columns-2 */
  verticalEdges: EdgeCurve[][];
  /** horizontalEdges[r][c] : row r 과 r+1 사이, column c 의 경계 (가로선), r = 0..rows-2 */
  horizontalEdges: EdgeCurve[][];
}

/** 결정론적 시드 기반 PRNG (mulberry32). 모든 클라이언트가 동일한 퍼즐 모양을 그리기 위함. */
function mulberry32(seed: number) {
  let a = seed;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function corner(r: number, c: number): Point {
  return { x: c * CELL, y: r * CELL };
}

/**
 * 한 변(길이 L, 로컬 좌표 0..L, x축 기준)에 돌출부/홈을 만드는 베지어 구간들을 생성한다.
 * amp 가 양수면 로컬 +y 방향으로 볼록, 음수면 -y 방향으로 들어간 모양이 된다.
 * (로컬 좌표는 이후 호출부에서 실제 보드 좌표로 회전/이동 변환된다)
 */
function buildLocalTabSegments(L: number, amp: number, rng: () => number): LocalSegment[] {
  const centerFrac = 0.5 + (rng() - 0.5) * 0.14; // 0.43 ~ 0.57
  const sizeJitter = 0.9 + rng() * 0.2; // 0.9 ~ 1.1
  const center = centerFrac * L;
  const neck = L * 0.14;
  const knob = L * 0.12;
  const a = amp * sizeJitter;

  const x0 = center - neck - knob;
  const x1 = center - neck;
  const x2 = center - knob;
  const x3 = center;
  const x4 = center + knob;
  const x5 = center + neck;
  const x6 = center + neck + knob;

  const p = (x: number, y: number): Point => ({ x, y });

  return [
    // 직선처럼 보이는 시작 구간
    { c1: p(x0 * 0.5, 0), c2: p(x0, 0), p1: p(x0, 0) },
    // 목(neck) 부분에서 돌출부 쪽으로 올라감
    { c1: p(x1, 0), c2: p(x1, a * 0.6), p1: p(x2, a) },
    // 둥근 돌출부(knob) 머리
    { c1: p(x3 - knob * 0.55, a * 1.28), c2: p(x3 + knob * 0.55, a * 1.28), p1: p(x4, a) },
    // 반대쪽 목으로 내려옴
    { c1: p(x5, a * 0.6), c2: p(x5, 0), p1: p(x6, 0) },
    // 직선처럼 보이는 끝 구간
    { c1: p((x6 + L) / 2, 0), c2: p(L, 0), p1: p(L, 0) },
  ];
}

function transformVertical(topCorner: Point, seg: { x: number; y: number }): Point {
  // 세로 경계: 로컬 x(0..L) -> 보드 y, 로컬 y(amp) -> 보드 x
  return { x: topCorner.x + seg.y, y: topCorner.y + seg.x };
}

function transformHorizontal(leftCorner: Point, seg: { x: number; y: number }): Point {
  // 가로 경계: 로컬 x(0..L) -> 보드 x, 로컬 y(amp) -> 보드 y
  return { x: leftCorner.x + seg.x, y: leftCorner.y + seg.y };
}

let cachedLayout: PuzzleLayout | null = null;

/**
 * 전체 퍼즐판의 맞물림 구조(모든 경계의 돌출부/홈 모양)를 한 번 계산해서 캐시한다.
 * JIGSAW_SEED 가 고정되어 있으므로 모든 사용자의 화면에서 완전히 동일한 모양이 그려진다.
 */
export function getPuzzleLayout(
  rows: number = PUZZLE_CONFIG.rows,
  columns: number = PUZZLE_CONFIG.columns
): PuzzleLayout {
  if (cachedLayout && cachedLayout.rows === rows && cachedLayout.columns === columns) {
    return cachedLayout;
  }

  const rng = mulberry32(JIGSAW_SEED + rows * 1000 + columns);
  const tabSize = CELL * JIGSAW_TAB_SIZE_RATIO;

  const verticalEdges: EdgeCurve[][] = [];
  for (let r = 0; r < rows; r++) {
    verticalEdges[r] = [];
    for (let c = 0; c < columns - 1; c++) {
      const leftHasTab = rng() < 0.5;
      const amp = leftHasTab ? tabSize : -tabSize;
      const topCorner = corner(r, c + 1);
      const localSegs = buildLocalTabSegments(CELL, amp, rng);
      verticalEdges[r][c] = {
        p0: transformVertical(topCorner, { x: 0, y: 0 }),
        segments: localSegs.map((s) => ({
          c1: transformVertical(topCorner, s.c1),
          c2: transformVertical(topCorner, s.c2),
          p1: transformVertical(topCorner, s.p1),
        })),
      };
    }
  }

  const horizontalEdges: EdgeCurve[][] = [];
  for (let r = 0; r < rows - 1; r++) {
    horizontalEdges[r] = [];
    for (let c = 0; c < columns; c++) {
      const topHasTab = rng() < 0.5;
      const amp = topHasTab ? tabSize : -tabSize;
      const leftCorner = corner(r + 1, c);
      const localSegs = buildLocalTabSegments(CELL, amp, rng);
      horizontalEdges[r][c] = {
        p0: transformHorizontal(leftCorner, { x: 0, y: 0 }),
        segments: localSegs.map((s) => ({
          c1: transformHorizontal(leftCorner, s.c1),
          c2: transformHorizontal(leftCorner, s.c2),
          p1: transformHorizontal(leftCorner, s.p1),
        })),
      };
    }
  }

  cachedLayout = { rows, columns, verticalEdges, horizontalEdges };
  return cachedLayout;
}

function emitForward(edge: EdgeCurve, t: (p: Point) => Point = (p) => p): string {
  return edge.segments
    .map((s) => {
      const c1 = t(s.c1);
      const c2 = t(s.c2);
      const p1 = t(s.p1);
      return `C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${p1.x} ${p1.y}`;
    })
    .join(" ");
}

function emitReverse(edge: EdgeCurve, t: (p: Point) => Point = (p) => p): string {
  const points = [edge.p0, ...edge.segments.map((s) => s.p1)];
  const parts: string[] = [];
  for (let i = edge.segments.length - 1; i >= 0; i--) {
    const seg = edge.segments[i];
    const target = t(points[i]); // 역방향으로 갈 때 도착점 = 원래 구간의 시작점
    const c2 = t(seg.c2);
    const c1 = t(seg.c1);
    parts.push(`C ${c2.x} ${c2.y} ${c1.x} ${c1.y} ${target.x} ${target.y}`);
  }
  return parts.join(" ");
}

/**
 * (r, c) 조각의 SVG path "d" 문자열을 생성하는 공통 로직.
 * 좌표 변환 함수 `t` 를 바꿔 끼우면 절대 보드 좌표(getPiecePathD)뿐 아니라,
 * 조각 하나만의 로컬/정규화 좌표(getPieceLocalPathD)도 동일한 경계 데이터로 만들어낼 수 있다.
 */
function buildPiecePathD(layout: PuzzleLayout, r: number, c: number, t: (p: Point) => Point): string {
  const { rows, columns, verticalEdges, horizontalEdges } = layout;
  const TL = t(corner(r, c));
  const TR = t(corner(r, c + 1));
  const BR = t(corner(r + 1, c + 1));
  const BL = t(corner(r + 1, c));

  let d = `M ${TL.x} ${TL.y} `;

  // TOP
  if (r === 0) {
    d += `L ${TR.x} ${TR.y} `;
  } else {
    d += emitForward(horizontalEdges[r - 1][c], t) + " ";
  }

  // RIGHT
  if (c === columns - 1) {
    d += `L ${BR.x} ${BR.y} `;
  } else {
    d += emitForward(verticalEdges[r][c], t) + " ";
  }

  // BOTTOM
  if (r === rows - 1) {
    d += `L ${BL.x} ${BL.y} `;
  } else {
    d += emitReverse(horizontalEdges[r][c], t) + " ";
  }

  // LEFT
  if (c === 0) {
    d += `L ${TL.x} ${TL.y} `;
  } else {
    d += emitReverse(verticalEdges[r][c - 1], t) + " ";
  }

  d += "Z";
  return d;
}

/** (r, c) 조각의 SVG path "d" 문자열을 생성한다 (보드 전체 기준 절대 좌표). */
export function getPiecePathD(layout: PuzzleLayout, r: number, c: number): string {
  return buildPiecePathD(layout, r, c, (p) => p);
}

/**
 * 조각 하나의 돌출부(탭)가 이웃 셀 쪽으로 튀어나올 수 있는 최대 여유분.
 * CELL 에 대한 비율이며, 베지어 곡선은 자신의 제어점이 만드는 볼록 껍질(convex hull)을
 * 절대 벗어나지 않으므로 buildLocalTabSegments 의 최대 제어점 y 값(tabSize * 1.1 * 1.28)보다
 * 넉넉히 크게 잡아두면 어떤 조각이라도 경계가 잘려나가지 않는다.
 */
export const PIECE_CLIP_PAD_RATIO = JIGSAW_TAB_SIZE_RATIO * 1.55;

/**
 * (r, c) 조각 하나만을 위한 "로컬" path "d" 문자열을, 그 조각을 감싸는 패딩 포함 바운딩 박스
 * 기준 0..1 로 정규화해서 생성한다. CSS `clip-path: url(#...)` 를 objectBoundingBox 단위로 쓸 때
 * 그대로 사용할 수 있어, 반응형으로 크기가 바뀌는 HTML 카드(퍼즐 조각 뒷면)에도 정확히 들어맞는다.
 */
export function getPieceLocalPathD(
  layout: PuzzleLayout,
  r: number,
  c: number,
  padRatio: number = PIECE_CLIP_PAD_RATIO
): string {
  const pad = CELL * padRatio;
  const span = CELL + pad * 2;
  const originX = c * CELL - pad;
  const originY = r * CELL - pad;
  return buildPiecePathD(layout, r, c, (p) => ({
    x: (p.x - originX) / span,
    y: (p.y - originY) / span,
  }));
}

/** getPieceLocalPathD 가 가정하는 패딩 포함 박스의, 셀 1칸(CELL) 대비 배율. HTML 오버레이 위치 계산에 사용한다. */
export const PIECE_BOX_SPAN_RATIO = 1 + 2 * PIECE_CLIP_PAD_RATIO;

/** 0..totalPieces-1 위치 인덱스를 (row, col) 으로 변환 (row-major) */
export function positionToRowCol(position: number, columns: number = PUZZLE_CONFIG.columns) {
  return { row: Math.floor(position / columns), col: position % columns };
}

export function rowColToPosition(row: number, col: number, columns: number = PUZZLE_CONFIG.columns) {
  return row * columns + col;
}

/**
 * 컨테이너의 화면상 bounding rect 와 viewBox 스케일을 이용해, 특정 퍼즐 위치가
 * 화면 좌표계에서 차지하는 사각형을 계산한다. (조각 이동 애니메이션의 도착 지점 계산용)
 * SVG 는 보드 컨테이너와 동일한 종횡비(columns:rows)를 유지한다고 가정한다.
 */
export function getCellScreenRect(
  containerRect: { left: number; top: number; width: number; height: number },
  position: number,
  rows: number = PUZZLE_CONFIG.rows,
  columns: number = PUZZLE_CONFIG.columns
) {
  const { row, col } = positionToRowCol(position, columns);
  const scaleX = containerRect.width / (columns * CELL);
  const scaleY = containerRect.height / (rows * CELL);
  return {
    left: containerRect.left + col * CELL * scaleX,
    top: containerRect.top + row * CELL * scaleY,
    width: CELL * scaleX,
    height: CELL * scaleY,
  };
}

export const BOARD_VIEWBOX_WIDTH = PUZZLE_CONFIG.columns * CELL;
export const BOARD_VIEWBOX_HEIGHT = PUZZLE_CONFIG.rows * CELL;

// ---------------------------------------------------------------------------
// 독립된 단일 조각 모양 (오른쪽 패널의 "내 조각 미리보기" / 이동 애니메이션용)
// 실제 보드 위 위치와는 무관하게 늘 같은 아이콘 같은 조각 모양을 사용한다.
// ---------------------------------------------------------------------------
const STANDALONE_PAD = CELL * JIGSAW_TAB_SIZE_RATIO * 1.1;
export const STANDALONE_VIEWBOX = `${-STANDALONE_PAD} ${-STANDALONE_PAD} ${CELL + STANDALONE_PAD * 2} ${
  CELL + STANDALONE_PAD * 2
}`;

let cachedStandalonePath: string | null = null;

export function getStandalonePiecePathD(): string {
  if (cachedStandalonePath) return cachedStandalonePath;

  const rng = mulberry32(777);
  const tabSize = CELL * JIGSAW_TAB_SIZE_RATIO;

  const topLocal = buildLocalTabSegments(CELL, -tabSize, rng); // 홈 (들어감)
  const rightLocal = buildLocalTabSegments(CELL, tabSize, rng); // 돌출
  const bottomLocal = buildLocalTabSegments(CELL, tabSize, rng); // 돌출
  const leftLocal = buildLocalTabSegments(CELL, -tabSize, rng); // 홈 (들어감)

  const TL = { x: 0, y: 0 };
  const TR = { x: CELL, y: 0 };
  const BL = { x: 0, y: CELL };

  const top = topLocal.map((s) => ({
    c1: transformHorizontal(TL, s.c1),
    c2: transformHorizontal(TL, s.c2),
    p1: transformHorizontal(TL, s.p1),
  }));
  const right = rightLocal.map((s) => ({
    c1: transformVertical(TR, s.c1),
    c2: transformVertical(TR, s.c2),
    p1: transformVertical(TR, s.p1),
  }));
  const bottomPoints = [BL, ...bottomLocal.map((s) => transformHorizontal(BL, s.p1))];
  const bottomReversed: LocalSegment[] = [];
  for (let i = bottomLocal.length - 1; i >= 0; i--) {
    const s = bottomLocal[i];
    bottomReversed.push({
      c1: transformHorizontal(BL, s.c2),
      c2: transformHorizontal(BL, s.c1),
      p1: bottomPoints[i],
    });
  }
  const leftPoints = [TL, ...leftLocal.map((s) => transformVertical(TL, s.p1))];
  const leftReversed: LocalSegment[] = [];
  for (let i = leftLocal.length - 1; i >= 0; i--) {
    const s = leftLocal[i];
    leftReversed.push({
      c1: transformVertical(TL, s.c2),
      c2: transformVertical(TL, s.c1),
      p1: leftPoints[i],
    });
  }

  let d = `M ${TL.x} ${TL.y} `;
  d += top.map((s) => `C ${s.c1.x} ${s.c1.y} ${s.c2.x} ${s.c2.y} ${s.p1.x} ${s.p1.y}`).join(" ") + " ";
  d += right.map((s) => `C ${s.c1.x} ${s.c1.y} ${s.c2.x} ${s.c2.y} ${s.p1.x} ${s.p1.y}`).join(" ") + " ";
  d += bottomReversed.map((s) => `C ${s.c1.x} ${s.c1.y} ${s.c2.x} ${s.c2.y} ${s.p1.x} ${s.p1.y}`).join(" ") + " ";
  d += leftReversed.map((s) => `C ${s.c1.x} ${s.c1.y} ${s.c2.x} ${s.c2.y} ${s.p1.x} ${s.p1.y}`).join(" ") + " ";
  d += "Z";

  cachedStandalonePath = d;
  return d;
}
