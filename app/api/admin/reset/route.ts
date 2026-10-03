import { NextRequest, NextResponse } from "next/server";
import { resetAllPuzzleData } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

/**
 * 관리자 전용 초기화 API.
 * - Service Role Key 는 이 서버 라우트 안에서만 사용되고 브라우저로 절대 전달되지 않는다.
 * - ADMIN_SECRET 환경변수와 일치하는 비밀번호를 body 로 보내야만 실행된다.
 * - 일반 참가자 화면에는 이 API 를 호출하는 버튼/링크가 전혀 노출되지 않는다.
 */
export async function POST(request: NextRequest) {
  const adminSecret = process.env.ADMIN_SECRET;

  if (!adminSecret) {
    return NextResponse.json(
      { error: "ADMIN_SECRET 환경변수가 설정되어 있지 않습니다." },
      { status: 500 }
    );
  }

  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  if (!body.password || body.password !== adminSecret) {
    return NextResponse.json({ error: "비밀번호가 올바르지 않습니다." }, { status: 401 });
  }

  try {
    await resetAllPuzzleData();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[admin reset] failed", err);
    return NextResponse.json({ error: "초기화 중 오류가 발생했습니다." }, { status: 500 });
  }
}
