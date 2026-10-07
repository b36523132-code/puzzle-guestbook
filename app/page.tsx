"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import BoardProgress from "@/components/BoardProgress";
import CompletionPanel from "@/components/CompletionPanel";
import JoinAnimation from "@/components/JoinAnimation";
import OrientationHint from "@/components/OrientationHint";
import ParticipantForm from "@/components/ParticipantForm";
import PreviousBoardViewer from "@/components/PreviousBoardViewer";
import PuzzleBoard, { type RevealMode } from "@/components/PuzzleBoard";
import { IDLE_RESET_TIMEOUT_MS, JOIN_ANIMATION_DURATION_MS, PUZZLE_CONFIG } from "@/config/puzzle";
import { getCellScreenRect } from "@/lib/puzzle";
import {
  fetchActiveBoard,
  fetchCompletedBoards,
  fetchParticipantsByBoard,
  joinPuzzle,
  mapParticipantRow,
  supabase,
  type ParticipantRow,
} from "@/lib/supabase";
import type { Board, DraftPiece, JoinPuzzleResult, Participant, SubmitStatus } from "@/types/puzzle";

// 이 페이지는 Supabase Realtime 으로 계속 바뀌는 데이터를 보여주는 화면이므로
// 정적 프리렌더 대상에서 제외하고 항상 클라이언트에서 최신 상태로 렌더링한다.
export const dynamic = "force-dynamic";

type ScreenState = "form" | "flying" | "revealing" | "completed";

interface FlightState {
  draft: DraftPiece;
  sourceRect: DOMRect;
  targetRect: { left: number; top: number; width: number; height: number };
}

export default function Home() {
  const [activeBoard, setActiveBoard] = useState<Board | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [incomingIds, setIncomingIds] = useState<Set<string>>(new Set());

  const [screenState, setScreenState] = useState<ScreenState>("form");
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<JoinPuzzleResult | null>(null);
  const [flight, setFlight] = useState<FlightState | null>(null);
  const [pendingHiddenPosition, setPendingHiddenPosition] = useState<number | null>(null);

  // 퍼즐판에 "이 위치를 뒷면으로 드러내라"고 지시하는 상태. participants 데이터와는
  // 완전히 분리되어 있어, Realtime 으로 다른 사람의 조각이 들어와도 이 값은 그대로 유지된다.
  const [revealPosition, setRevealPosition] = useState<number | null>(null);
  const [revealNonce, setRevealNonce] = useState(0);
  const [revealMode, setRevealMode] = useState<RevealMode>("auto");

  const [celebrating, setCelebrating] = useState(false);
  const [showPrevious, setShowPrevious] = useState(false);
  const [completedBoards, setCompletedBoards] = useState<Board[]>([]);
  const [formKey, setFormKey] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  const previewRef = useRef<HTMLDivElement | null>(null);
  const boardContainerRef = useRef<HTMLDivElement | null>(null);
  const lastActivityRef = useRef<number>(0);
  const draftEmptyRef = useRef(true);
  const celebratingRef = useRef(false);

  const markActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  // ---- 마운트 시각을 최초 활동 시각으로 기록 ----
  useEffect(() => {
    lastActivityRef.current = Date.now();
  }, []);

  // ---- 최초 로드: 현재 active board 조회 ----
  useEffect(() => {
    let cancelled = false;
    fetchActiveBoard()
      .then((board) => {
        if (!cancelled) setActiveBoard(board);
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setLoadError("퍼즐 정보를 불러오지 못했어요. 새로고침 해주세요.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // ---- activeBoard 가 바뀔 때마다 참가자 목록을 새로 불러온다 ----
  useEffect(() => {
    if (!activeBoard) return;
    let cancelled = false;
    fetchParticipantsByBoard(activeBoard.id)
      .then((data) => {
        if (!cancelled) setParticipants(data);
      })
      .catch((err) => console.error(err));
    return () => {
      cancelled = true;
    };
    // activeBoard.id 가 바뀔 때만 다시 불러오면 된다 (board 객체 자체가 바뀌는 다른 경우는 무시)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBoard?.id]);

  // ---- Realtime: 같은 보드에 새 참가자가 들어오면 모든 화면에 즉시 반영 ----
  useEffect(() => {
    if (!activeBoard) return;
    const channel = supabase
      .channel(`participants-board-${activeBoard.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "participants",
          filter: `board_id=eq.${activeBoard.id}`,
        },
        (payload) => {
          const participant = mapParticipantRow(payload.new as ParticipantRow);
          setParticipants((prev) => (prev.some((p) => p.id === participant.id) ? prev : [...prev, participant]));
          setIncomingIds((prev) => {
            const next = new Set(prev);
            next.add(participant.id);
            return next;
          });
          setTimeout(() => {
            setIncomingIds((prev) => {
              const next = new Set(prev);
              next.delete(participant.id);
              return next;
            });
          }, 1300);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // 채널을 board id 단위로만 재구독하면 된다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBoard?.id]);

  // ---- 보드가 가득 차면: 짧게 축하 연출 후 새 active board 로 전환 ----
  useEffect(() => {
    if (!activeBoard) return;
    if (participants.length < activeBoard.totalPieces) return;
    if (celebratingRef.current) return;

    celebratingRef.current = true;
    setCelebrating(true);

    const timer = setTimeout(async () => {
      try {
        const fresh = await fetchActiveBoard();
        if (fresh && fresh.id !== activeBoard.id) {
          setActiveBoard(fresh);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setCelebrating(false);
        celebratingRef.current = false;
      }
    }, 2400);

    return () => clearTimeout(timer);
  }, [participants.length, activeBoard]);

  // ---- 대기 상태: 30초 동안 활동이 없으면 기본 참여 화면으로 복귀 (DB 데이터는 절대 건드리지 않음) ----
  useEffect(() => {
    const interval = setInterval(() => {
      const idleFor = Date.now() - lastActivityRef.current;
      if (idleFor < IDLE_RESET_TIMEOUT_MS) return;

      if (screenState === "completed") {
        setScreenState("form");
        setLastResult(null);
        setFormKey((k) => k + 1);
        lastActivityRef.current = Date.now();
      }
      // screenState === 'form' 인데 작성 중인 내용이 있으면 그대로 둔다 (내용을 지우지 않음)
    }, 4000);
    return () => clearInterval(interval);
  }, [screenState]);

  async function handleSubmitDraft(draft: DraftPiece) {
    if (submitStatus === "submitting") return; // 중복 등록 방지
    markActivity();
    setErrorMessage(null);
    setSubmitStatus("submitting");

    const sourceEl = previewRef.current;
    const boardEl = boardContainerRef.current;

    if (!sourceEl || !boardEl) {
      setErrorMessage("조각을 연결하지 못했어요. 다시 한 번 시도해주세요.");
      setSubmitStatus("error");
      return;
    }

    const sourceRect = sourceEl.getBoundingClientRect();

    try {
      const result = await joinPuzzle(draft);
      const boardRect = boardEl.getBoundingClientRect();
      const targetRect = getCellScreenRect(boardRect, result.puzzlePosition, PUZZLE_CONFIG.rows, PUZZLE_CONFIG.columns);

      const newParticipant: Participant = {
        id: result.participantId,
        name: draft.name,
        message: draft.message,
        puzzlePosition: result.puzzlePosition,
        relayNumber: result.relayNumber,
        colorVariant: draft.colorVariant,
        emojis: draft.emojis,
        emojiPositions: draft.emojiPositions,
        boardId: result.boardId,
        createdAt: new Date().toISOString(),
      };

      setPendingHiddenPosition(result.puzzlePosition);
      setParticipants((prev) => (prev.some((p) => p.id === newParticipant.id) ? prev : [...prev, newParticipant]));
      setLastResult(result);
      setFlight({ draft, sourceRect, targetRect });
      setScreenState("flying");
    } catch (err) {
      console.error(err);
      setErrorMessage("조각을 연결하지 못했어요. 다시 한 번 시도해주세요.");
      setSubmitStatus("error");
    }
  }

  // 날아가는 애니메이션이 퍼즐판 위치에 "착지"한 직후: 뒷면(이름/한마디)을 잠깐 보여주고
  // 짧게 글로우한 뒤 스스로 앞면(공동 이미지)으로 돌아간다. 그 시퀀스가 끝나야 완료 화면을 보여준다.
  function handleFlightComplete() {
    if (!lastResult) return;
    setFlight(null);
    setPendingHiddenPosition(null);
    setScreenState("revealing");
    setRevealMode("auto");
    setRevealPosition(lastResult.puzzlePosition);
    setRevealNonce((n) => n + 1);
  }

  function handleAutoRevealComplete() {
    setSubmitStatus("idle");
    setScreenState("completed");
  }

  function handleShowMyPiece() {
    if (!lastResult) return;
    markActivity();
    setRevealMode("manual");
    setRevealPosition(lastResult.puzzlePosition);
    setRevealNonce((n) => n + 1);
  }

  function handleStartOver() {
    markActivity();
    setScreenState("form");
    setLastResult(null);
    setFormKey((k) => k + 1);
  }

  async function handleOpenPrevious() {
    markActivity();
    try {
      const boards = await fetchCompletedBoards();
      setCompletedBoards(boards);
      setShowPrevious(true);
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div
      className="relative mx-auto flex h-[100dvh] max-w-[1600px] flex-col gap-3 overflow-hidden bg-gradient-to-br from-slate-50 via-white to-violet-50 p-3 sm:gap-4 sm:p-5"
      onPointerDown={markActivity}
      onKeyDown={markActivity}
    >
      <OrientationHint />

      {loadError && (
        <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">{loadError}</div>
      )}

      <main className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[380px_1fr] xl:grid-cols-[420px_1fr]">
        <section className="flex min-h-0 flex-col rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-900/5 sm:p-9">
          {screenState === "form" && (
            <ParticipantForm
              key={formKey}
              previewRef={previewRef}
              submitStatus={submitStatus}
              errorMessage={errorMessage}
              onSubmit={handleSubmitDraft}
              onActivity={markActivity}
              onDraftEmptyChange={(empty) => {
                draftEmptyRef.current = empty;
              }}
            />
          )}

          {(screenState === "flying" || screenState === "revealing") && (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-slate-400">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-violet-500" />
              <p className="text-sm font-medium">
                {screenState === "flying" ? "조각을 퍼즐판에 잇는 중..." : "조각이 사진 속으로 스며드는 중..."}
              </p>
            </div>
          )}

          {screenState === "completed" && lastResult && (
            <CompletionPanel
              relayNumber={lastResult.relayNumber}
              filledCount={Math.min(participants.length, lastResult.totalPieces)}
              totalPieces={lastResult.totalPieces}
              boardJustCompleted={lastResult.boardCompleted}
              onShowMyPiece={handleShowMyPiece}
              onStartOver={handleStartOver}
            />
          )}
        </section>

        <section className="flex min-h-0 flex-col gap-4 rounded-3xl bg-gradient-to-br from-violet-600 to-purple-700 p-4 shadow-sm sm:gap-5 sm:p-6">
          {activeBoard && (
            <div className="shrink-0 rounded-2xl bg-white px-4 py-3 shadow-sm sm:px-5 sm:py-4">
              <BoardProgress
                boardNumber={activeBoard.boardNumber}
                filledCount={participants.length}
                totalPieces={activeBoard.totalPieces}
                onShowPrevious={handleOpenPrevious}
                hasPreviousBoards={activeBoard.boardNumber > 1}
              />
            </div>
          )}

          <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-2xl bg-white p-3 shadow-sm sm:p-4">
            <PuzzleBoard
              containerRef={boardContainerRef}
              participants={participants}
              rows={PUZZLE_CONFIG.rows}
              columns={PUZZLE_CONFIG.columns}
              incomingIds={incomingIds}
              pendingHiddenPosition={pendingHiddenPosition}
              revealPosition={revealPosition}
              revealNonce={revealNonce}
              revealMode={revealMode}
              onRevealComplete={handleAutoRevealComplete}
            />
            {celebrating && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-2xl bg-white/40 backdrop-blur-[1px]">
                <div className="animate-pulse rounded-2xl bg-white/80 px-6 py-4 text-center shadow-lg">
                  <p className="text-xl font-extrabold text-slate-900">48개의 조각이 하나로 이어졌어요.</p>
                  <p className="text-base text-slate-500">함께 하나의 퍼즐을 완성했습니다.</p>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      {flight && (
        <JoinAnimation
          draft={flight.draft}
          sourceRect={flight.sourceRect}
          targetRect={flight.targetRect}
          durationMs={JOIN_ANIMATION_DURATION_MS}
          onComplete={handleFlightComplete}
        />
      )}

      {showPrevious && <PreviousBoardViewer boards={completedBoards} onClose={() => setShowPrevious(false)} />}
    </div>
  );
}
