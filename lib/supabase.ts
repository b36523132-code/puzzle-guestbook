import { createClient } from "@supabase/supabase-js";
import type { ColorVariantId } from "@/config/colors";
import type { Board, BoardStatus, DraftPiece, EmojiPosition, JoinPuzzleResult, Participant } from "@/types/puzzle";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // 빌드 타임에는 에러를 던지지 않고, 실제로 호출될 때만 명확한 에러를 낸다.
  // (Vercel 배포 전 환경변수를 아직 설정하지 않은 상태에서도 빌드는 통과해야 하므로)
  console.warn(
    "[supabase] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 가 설정되지 않았습니다. .env.local 을 확인하세요."
  );
}

// 빌드/프리렌더 단계에서는 실제 네트워크 요청이 일어나지 않으므로, 환경변수가 비어있어도
// createClient() 자체가 예외를 던지지 않도록 안전한 더미 값을 fallback 으로 사용한다.
// (실제 배포 환경에서는 .env.local / Vercel 환경변수에 진짜 값을 넣어야 정상 동작한다)
export const supabase = createClient(supabaseUrl || "https://placeholder.supabase.co", supabaseAnonKey || "placeholder-anon-key", {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// ---------------------------------------------------------------------------
// DB row (snake_case) <-> 앱에서 쓰는 타입 (camelCase) 매핑
// ---------------------------------------------------------------------------

interface BoardRow {
  id: string;
  board_number: number;
  status: BoardStatus;
  total_pieces: number;
  created_at: string;
  completed_at: string | null;
}

export interface ParticipantRow {
  id: string;
  name: string;
  puzzle_position: number;
  relay_number: number;
  color_variant: string;
  emojis: string[];
  emoji_positions: string[];
  board_id: string;
  created_at: string;
}

export function mapParticipantRow(row: ParticipantRow): Participant {
  return mapParticipant(row);
}

function mapBoard(row: BoardRow): Board {
  return {
    id: row.id,
    boardNumber: row.board_number,
    status: row.status,
    totalPieces: row.total_pieces,
    createdAt: row.created_at,
    completedAt: row.completed_at,
  };
}

function mapParticipant(row: ParticipantRow): Participant {
  return {
    id: row.id,
    name: row.name,
    puzzlePosition: row.puzzle_position,
    relayNumber: Number(row.relay_number),
    colorVariant: (row.color_variant as ColorVariantId) ?? "purple",
    emojis: row.emojis ?? [],
    emojiPositions: (row.emoji_positions ?? []) as EmojiPosition[],
    boardId: row.board_id,
    createdAt: row.created_at,
  };
}

// ---------------------------------------------------------------------------
// 조회 함수
// ---------------------------------------------------------------------------

export async function fetchActiveBoard(): Promise<Board | null> {
  const { data, error } = await supabase
    .from("boards")
    .select("*")
    .eq("status", "active")
    .order("board_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data ? mapBoard(data as BoardRow) : null;
}

export async function fetchParticipantsByBoard(boardId: string): Promise<Participant[]> {
  const { data, error } = await supabase
    .from("participants")
    .select("*")
    .eq("board_id", boardId)
    .order("relay_number", { ascending: true });

  if (error) throw error;
  return (data as ParticipantRow[]).map(mapParticipant);
}

export async function fetchCompletedBoards(): Promise<Board[]> {
  const { data, error } = await supabase
    .from("boards")
    .select("*")
    .eq("status", "completed")
    .order("board_number", { ascending: false });

  if (error) throw error;
  return (data as BoardRow[]).map(mapBoard);
}

export async function fetchBoardByNumber(boardNumber: number): Promise<Board | null> {
  const { data, error } = await supabase
    .from("boards")
    .select("*")
    .eq("board_number", boardNumber)
    .maybeSingle();

  if (error) throw error;
  return data ? mapBoard(data as BoardRow) : null;
}

// ---------------------------------------------------------------------------
// 참가 등록 (서버 측 RPC 호출 - 동시성 안전)
// ---------------------------------------------------------------------------

export async function joinPuzzle(draft: DraftPiece): Promise<JoinPuzzleResult> {
  const { data, error } = await supabase.rpc("join_puzzle", {
    p_name: draft.name,
    p_color_variant: draft.colorVariant,
    p_emojis: draft.emojis,
    p_emoji_positions: draft.emojiPositions,
  });

  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error("join_puzzle_no_result");

  return {
    participantId: row.participant_id,
    relayNumber: Number(row.relay_number),
    puzzlePosition: row.puzzle_position,
    boardId: row.board_id,
    boardNumber: row.board_number,
    totalPieces: row.total_pieces,
    boardCompleted: row.board_completed,
  };
}
