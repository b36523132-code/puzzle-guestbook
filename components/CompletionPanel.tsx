"use client";

import { motion } from "framer-motion";

interface CompletionPanelProps {
  relayNumber: number;
  filledCount: number;
  totalPieces: number;
  boardJustCompleted: boolean;
  onShowMyPiece: () => void;
  onStartOver: () => void;
}

export default function CompletionPanel({
  relayNumber,
  filledCount,
  totalPieces,
  boardJustCompleted,
  onShowMyPiece,
  onStartOver,
}: CompletionPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex h-full flex-col items-center justify-center gap-5 text-center"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-violet-100 text-3xl">🧩</div>

      <div>
        <p className="text-2xl font-extrabold leading-snug text-slate-900 sm:text-3xl">
          {relayNumber}번째 릴레이어로
          <br />
          참여하셨습니다!
        </p>
        <p className="mt-2 text-sm text-slate-500">당신의 한 조각이 새로운 연결을 만들었어요.</p>
      </div>

      {boardJustCompleted && (
        <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
          48개의 조각이 하나로 이어졌어요.
          <br />
          함께 하나의 퍼즐을 완성했습니다.
        </div>
      )}

      <div className="w-full rounded-2xl bg-slate-100 px-4 py-3">
        <p className="text-sm font-semibold text-slate-600">
          {filledCount} / {totalPieces} 조각
        </p>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <motion.div
            className="h-full rounded-full bg-violet-500"
            initial={{ width: 0 }}
            animate={{ width: `${(filledCount / totalPieces) * 100}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={onShowMyPiece}
        className="h-14 w-full rounded-2xl bg-slate-900 text-lg font-bold text-white transition-transform active:scale-[0.98]"
      >
        내 조각 확인하기
      </button>

      <button type="button" onClick={onStartOver} className="text-sm font-medium text-slate-400 underline underline-offset-2">
        다음 참가자 시작하기
      </button>
    </motion.div>
  );
}
