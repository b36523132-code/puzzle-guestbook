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
        <p className="flex flex-wrap items-baseline gap-1 text-base font-bold text-slate-700 sm:text-lg">
          지금{" "}
          <motion.span
            key={filledCount}
            initial={{ scale: 1 }}
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 0.4 }}
            className="text-4xl font-black text-violet-600 sm:text-5xl"
          >
            {filledCount}개
          </motion.span>
          의 조각이 이어졌어요.
        </p>
        <p className="text-xs text-slate-400 sm:text-sm">
          {boardNumber}번째 퍼즐 · {filledCount} / {totalPieces}
        </p>
        <p className="mt-2 text-lg font-extrabold leading-snug text-slate-900 sm:text-2xl">
          당신의 조각 하나로 퍼즐이 완성돼요! 지금 함께해주세요 🧩
        </p>
      </div>
      <div className="flex items-center gap-3">
        <motion.div
          key={`badge-${filledCount}`}
          initial={{ scale: 1 }}
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 0.35 }}
          className="rounded-full bg-slate-900 px-4 py-2 text-lg font-bold text-white sm:text-xl"
        >
          {filledCount} / {totalPieces}
        </motion.div>
        {hasPreviousBoards && onShowPrevious && (
          <button
            type="button"
            onClick={onShowPrevious}
            className="h-9 rounded-full border border-violet-100 bg-violet-50 px-3 text-xs font-semibold text-violet-600 sm:text-sm"
          >
            이전 퍼즐 보기
          </button>
        )}
      </div>
    </div>
  );
}
