/**
 * 퍼즐판 핵심 설정.
 * 조각 수/행렬 구성을 바꾸고 싶으면 이 파일만 수정하면 된다.
 * rows * columns === totalPieces 를 반드시 유지해야 한다.
 */
export const PUZZLE_CONFIG = {
  rows: 6,
  columns: 8,
  totalPieces: 48,
} as const;

export const TOTAL_PIECES = PUZZLE_CONFIG.totalPieces;

/** 조각 하나의 기준 가로:세로 비율 (퍼즐판 전체는 columns:rows 비율의 사각형이 된다) */
export const PIECE_ASPECT_RATIO = PUZZLE_CONFIG.columns / PUZZLE_CONFIG.rows;

/** 직소 돌출부(탭) 크기 - 조각 한 변 길이에 대한 비율 */
export const JIGSAW_TAB_SIZE_RATIO = 0.22;

/** 퍼즐 전체 모양을 고정하기 위한 시드. 모든 클라이언트가 같은 값을 써야 서로 다른 기기에서도 같은 모양의 퍼즐이 그려진다. */
export const JIGSAW_SEED = 20260101;

/** 이름 최대 길이 */
export const MAX_NAME_LENGTH = 10;

/** 조각 하나에 붙일 수 있는 이모지 최대 개수 */
export const MAX_EMOJIS_PER_PIECE = 3;

/** 참여 폼에서 선택 가능한 이모지 위치 */
export const EMOJI_POSITIONS = [
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
  "center-accent",
] as const;

/** 입력이 없으면 자동으로 기본 화면으로 돌아가는 대기 시간 (ms) */
export const IDLE_RESET_TIMEOUT_MS = 30_000;

/** 조각이 패널에서 퍼즐판으로 이동하는 애니메이션 길이 (ms) */
export const JOIN_ANIMATION_DURATION_MS = 950;

/** 내 조각 강조 효과 유지 시간 (ms) */
export const HIGHLIGHT_DURATION_MS = 2000;
