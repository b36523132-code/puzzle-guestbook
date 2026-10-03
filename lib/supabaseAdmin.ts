import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * 서버에서만 사용하는 Supabase 관리자 클라이언트.
 * SUPABASE_SERVICE_ROLE_KEY 는 절대 NEXT_PUBLIC_ 접두사를 붙이지 않고,
 * 이 파일도 "server-only" 패키지로 보호되어 클라이언트 번들에 포함되면 빌드 에러가 난다.
 * 절대 이 파일을 클라이언트 컴포넌트("use client")에서 import 하지 말 것.
 */
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY 또는 NEXT_PUBLIC_SUPABASE_URL 환경변수가 설정되지 않았습니다."
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

export async function resetAllPuzzleData() {
  const admin = getSupabaseAdmin();

  const { error: deleteParticipantsError } = await admin
    .from("participants")
    .delete()
    .not("id", "is", null);
  if (deleteParticipantsError) throw deleteParticipantsError;

  const { error: deleteBoardsError } = await admin
    .from("boards")
    .delete()
    .not("id", "is", null);
  if (deleteBoardsError) throw deleteBoardsError;

  const { error: insertError } = await admin
    .from("boards")
    .insert({ board_number: 1, status: "active", total_pieces: 48 });
  if (insertError) throw insertError;

  // relay_number_seq 는 테이블 데이터와 무관하게 계속 증가하므로,
  // 완전히 1부터 다시 시작하려면 SQL 함수를 통해 시퀀스도 리셋한다.
  const { error: rpcError } = await admin.rpc("admin_reset_relay_sequence");
  if (rpcError) {
    // 함수가 아직 schema.sql 에 없는 구버전 DB 일 수 있으므로 치명적 에러로 취급하지 않는다.
    console.warn("[admin reset] relay_number_seq 리셋 실패 (무시):", rpcError.message);
  }
}
