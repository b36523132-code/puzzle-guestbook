"use client";

import { useState } from "react";
import { EMOJI_CATEGORIES } from "@/config/emojis";
import { MAX_EMOJIS_PER_PIECE } from "@/config/puzzle";
import { sanitizeEmojiInput } from "@/lib/emoji";

interface EmojiPickerProps {
  selected: string[];
  onToggle: (emoji: string) => void;
  onAddCustom: (emoji: string) => void;
  onRemoveAt: (index: number) => void;
  /** 이 조각이 다른 상위 헤딩(예: 단계별 화면의 큰 제목) 안에 들어갈 때, 중복되는 자체 제목 줄을 숨긴다. */
  hideHeader?: boolean;
}

export default function EmojiPicker({ selected, onToggle, onAddCustom, onRemoveAt, hideHeader }: EmojiPickerProps) {
  const [customInput, setCustomInput] = useState("");
  const isFull = selected.length >= MAX_EMOJIS_PER_PIECE;

  function handleAddCustom() {
    const clean = sanitizeEmojiInput(customInput);
    if (!clean) return;
    if (isFull) return;
    onAddCustom(clean);
    setCustomInput("");
  }

  return (
    <div className="space-y-3">
      {!hideHeader && (
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-600">이모지로 꾸미기 (선택)</p>
          <span className="text-xs font-medium text-slate-400">{selected.length} / {MAX_EMOJIS_PER_PIECE}</span>
        </div>
      )}

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((emoji, i) => (
            <button
              key={`${emoji}-${i}`}
              type="button"
              onClick={() => onRemoveAt(i)}
              className="flex h-9 items-center gap-1 rounded-full bg-violet-100 pl-2.5 pr-1.5 text-base text-violet-700"
              aria-label={`${emoji} 삭제`}
            >
              <span>{emoji}</span>
              <span className="text-xs text-violet-400">✕</span>
            </button>
          ))}
        </div>
      )}

      <div className="space-y-2.5">
        {EMOJI_CATEGORIES.map((cat) => (
          <div key={cat.id} className="flex items-center gap-1.5">
            <span className="w-9 shrink-0 text-[11px] font-medium text-slate-400">{cat.label}</span>
            <div className="flex flex-wrap gap-1">
              {cat.emojis.map((emoji) => {
                const active = selected.includes(emoji);
                const disabled = !active && isFull;
                return (
                  <button
                    key={emoji}
                    type="button"
                    disabled={disabled}
                    onClick={() => onToggle(emoji)}
                    aria-pressed={active}
                    className={`flex h-11 w-11 items-center justify-center rounded-xl text-xl transition-all duration-150 active:scale-90 ${
                      active
                        ? "bg-violet-200 ring-2 ring-violet-500"
                        : disabled
                        ? "bg-slate-50 opacity-40"
                        : "bg-slate-100 hover:bg-slate-200"
                    }`}
                  >
                    {emoji}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 pt-1">
        <input
          type="text"
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          placeholder="원하는 이모지를 붙여넣어 보세요 ✨"
          disabled={isFull}
          maxLength={8}
          className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-base outline-none focus:border-violet-400 disabled:bg-slate-50 disabled:text-slate-300"
        />
        <button
          type="button"
          onClick={handleAddCustom}
          disabled={isFull || !customInput.trim()}
          className="h-11 shrink-0 rounded-xl bg-slate-800 px-4 text-sm font-semibold text-white disabled:bg-slate-200 disabled:text-slate-400"
        >
          추가
        </button>
      </div>
    </div>
  );
}
