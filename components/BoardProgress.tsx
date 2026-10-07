"use client";

import { motion } from "framer-motion";

interface BoardProgressProps {
  boardNumber: number;
  filledCount: number;
  totalPieces: number;
  onShowPrevious?: () => void;
  hasPreviousBoards?: boolean;
}

export default function BoardProgress({
  boardNumber,
  filledCount,
  totalPieces,
  onShowPrevious,
  hasPreviousBoards,
}: BoardProgressProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div>
        <p className="text-base font-bold text-slate-700 sm:text-lg">
          지금 <span className="text-violet-600">{filledCount}개</span>의 조각이 이어졌어요.
        </p>
        <p className="text-xs text-slate-400 sm:text-sm">
          {boardNumber}번째 퍼즐 · {filledCount} / {totalPieces}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <motion.div
          key={filledCount}
          initial={{ scale: 1 }}
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 0.35 }}
          className="rounded-full bg-slate-900 px-3 py-1 text-base font-bold text-white"
        >
          {filledCount} / {totalPieces}
        </motion.div>
        {hasPreviousBoards && onShowPrevious && (
          <button
            type="button"
            onClick={onShowPrevious}
            className="h-9 rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-500 sm:text-sm"
          >
            이전 퍼즐 보기
          </button>
        )}
      </div>
    </div>
  );
}
