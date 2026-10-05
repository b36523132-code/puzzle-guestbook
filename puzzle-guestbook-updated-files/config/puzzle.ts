/**
 * 퍼즐판 핵심 설정.
 * 조각 수/행렬 구성을 바꾸고 싶으면 이 파일만 수정하면 된다.
 * rows * columns === totalPieces 를 반드시 유지해야 한다.
 */
export const PUZZLE_CONFIG = {
  rows: 6,
  columns: 8,
  totalPieces: 48,
  /** 퍼즐판 제목. 화면 상단과 완료 메시지 등에서 공통으로 사용한다. */
  title: "광안리 해수욕장 환경정화",
  /** 제목 아래에 붙는 짧은 보조 문구 */
  subtitle: "함께 남긴 조각이 하나의 장면을 완성합니다.",
  /**
   * 퍼즐 앞면 전체에 깔리는 공동 이미지 경로 (public/ 기준 절대 경로).
   * 이 값 하나만 바꾸면 퍼즐판 전체 이미지가 교체된다 - 컴포넌트에 경로를 직접 반복해서 쓰지 말 것.
   */
  frontImage: "/images/gwangalli-cleanup.jpg",
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

/** 한마디(메모) 최대 길이 */
export const MAX_MESSAGE_LENGTH = 35;

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

/** 신규 참가자의 조각이 퍼즐판에 도착한 뒤, 뒷면(이름/메모)을 잠깐 보여주는 시간 (ms) */
export const JOIN_REVEAL_HOLD_MS = 1300;

/** 조각 flip(앞면 <-> 뒷면) 3D 애니메이션 길이 (ms) */
export const FLIP_DURATION_MS = 600;

/** "내 조각 확인하기"를 눌렀을 때 글로우 강조가 유지되는 시간 (ms) */
export const MANUAL_REVEAL_GLOW_MS = 2400;
