import type { ColorVariantId } from "@/config/colors";

export type EmojiPosition =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "center-accent";

export type BoardStatus = "active" | "completed";

/** boards 테이블 1행 */
export interface Board {
  id: string;
  boardNumber: number;
  status: BoardStatus;
  totalPieces: number;
  createdAt: string;
  completedAt: string | null;
}

/** participants 테이블 1행 */
export interface Participant {
  id: string;
  name: string;
  puzzlePosition: number;
  relayNumber: number;
  colorVariant: ColorVariantId;
  emojis: string[];
  emojiPositions: EmojiPosition[];
  boardId: string;
  createdAt: string;
}

/** join_puzzle RPC 가 반환하는 결과 */
export interface JoinPuzzleResult {
  participantId: string;
  relayNumber: number;
  puzzlePosition: number;
  boardId: string;
  boardNumber: number;
  totalPieces: number;
  boardCompleted: boolean;
}

/** 참여 폼에서 현재 사용자가 꾸미고 있는 조각 상태 (아직 등록 전) */
export interface DraftPiece {
  name: string;
  colorVariant: ColorVariantId;
  emojis: string[];
  emojiPositions: EmojiPosition[];
}

export type SubmitStatus = "idle" | "submitting" | "success" | "error";
