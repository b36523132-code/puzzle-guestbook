"use client";

import { getColorVariant } from "@/config/colors";
import { getStandalonePiecePathD, STANDALONE_VIEWBOX } from "@/lib/puzzle";
import type { Participant } from "@/types/puzzle";

interface PieceDetailCardProps {
  participant: Participant;
  onClose: () => void;
}

/**
 * 보드에서 조각을 누르면 뜨는 상세 카드.
 * 퍼즐 조각 자체는 공간이 좁아 한마디(메모)가 줄 수 제한으로 잘려 보일 수 있으므로,
 * 이 카드에서는 줄 제한 없이 전체 내용을 그대로 보여준다.
 */
export default function PieceDetailCard({ participant, onClose }: PieceDetailCardProps) {
  const color = getColorVariant(participant.colorVariant);
  const pathD = getStandalonePiecePathD();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${participant.relayNumber}번째 참가자 ${participant.name}의 조각 상세`}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-500 transition-colors hover:bg-slate-200"
        >
          ✕
        </button>

        <div className="mx-auto mb-3 h-24 w-24">
          <svg viewBox={STANDALONE_VIEWBOX} className="h-full w-full drop-shadow-md">
            <path d={pathD} fill={color.fill} stroke={color.stroke} strokeWidth={2} />
          </svg>
        </div>

        <p className="text-center text-xs font-semibold uppercase tracking-wide text-violet-500">
          {participant.relayNumber}번째 참가자
        </p>
        <h3 className="mt-1 break-words text-center text-xl font-extrabold text-slate-900">{participant.name}</h3>

        {participant.message && (
          <p className="mt-3 whitespace-pre-wrap break-words rounded-2xl bg-slate-50 px-4 py-3 text-center text-sm font-medium leading-relaxed text-slate-600">
            {participant.message}
          </p>
        )}

        {participant.emojis.length > 0 && (
          <p className="mt-3 text-center text-2xl leading-none">{participant.emojis.join(" ")}</p>
        )}
      </div>
    </div>
  );
}
