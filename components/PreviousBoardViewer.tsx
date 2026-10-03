"use client";

import { useEffect, useState } from "react";
import { PUZZLE_CONFIG } from "@/config/puzzle";
import { fetchParticipantsByBoard } from "@/lib/supabase";
import type { Board, Participant } from "@/types/puzzle";
import PuzzleBoard from "./PuzzleBoard";

interface PreviousBoardViewerProps {
  boards: Board[];
  onClose: () => void;
}

export default function PreviousBoardViewer({ boards, onClose }: PreviousBoardViewerProps) {
  const [selectedId, setSelectedId] = useState<string | null>(boards[0]?.id ?? null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    // 선택된 이전 퍼즐이 바뀔 때마다 로딩 상태로 전환 후 데이터를 새로 가져온다
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    fetchParticipantsByBoard(selectedId)
      .then((data) => {
        if (!cancelled) setParticipants(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const selectedBoard = boards.find((b) => b.id === selectedId) ?? null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white/98 p-4 backdrop-blur sm:p-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900 sm:text-xl">이전 퍼즐 보기</h2>
        <button
          type="button"
          onClick={onClose}
          className="h-11 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white"
        >
          현재 퍼즐로 돌아가기
        </button>
      </div>

      <div className="flex min-h-0 flex-1 gap-4">
        <div className="w-40 shrink-0 space-y-1.5 overflow-y-auto sm:w-48">
          {boards.length === 0 && <p className="text-sm text-slate-400">아직 완성된 퍼즐이 없어요.</p>}
          {boards.map((board) => (
            <button
              key={board.id}
              type="button"
              onClick={() => setSelectedId(board.id)}
              className={`w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors ${
                board.id === selectedId ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-600"
              }`}
            >
              {board.boardNumber}번째 퍼즐
            </button>
          ))}
        </div>

        <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center gap-2 rounded-2xl bg-slate-50 p-4">
          {!selectedBoard && <p className="text-slate-400">왼쪽에서 퍼즐을 선택해주세요.</p>}
          {selectedBoard && (
            <>
              <div className="relative min-h-0 w-full flex-1">
                <PuzzleBoard participants={participants} rows={PUZZLE_CONFIG.rows} columns={PUZZLE_CONFIG.columns} />
              </div>
              {loading && <p className="text-center text-xs text-slate-400">불러오는 중...</p>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
