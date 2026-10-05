"use client";

import { useEffect, useState } from "react";
import { DEFAULT_COLOR_VARIANT, type ColorVariantId } from "@/config/colors";
import { MAX_EMOJIS_PER_PIECE, MAX_MESSAGE_LENGTH, MAX_NAME_LENGTH } from "@/config/puzzle";
import { assignEmojiPositions } from "@/lib/emoji";
import type { DraftPiece, SubmitStatus } from "@/types/puzzle";
import ColorPicker from "./ColorPicker";
import EmojiPicker from "./EmojiPicker";
import PiecePreview from "./PiecePreview";

interface ParticipantFormProps {
  previewRef: React.RefObject<HTMLDivElement | null>;
  submitStatus: SubmitStatus;
  errorMessage: string | null;
  onSubmit: (draft: DraftPiece) => void;
  onActivity: () => void;
  onDraftEmptyChange: (isEmpty: boolean) => void;
}

export default function ParticipantForm({
  previewRef,
  submitStatus,
  errorMessage,
  onSubmit,
  onActivity,
  onDraftEmptyChange,
}: ParticipantFormProps) {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [colorVariant, setColorVariant] = useState<ColorVariantId>(DEFAULT_COLOR_VARIANT);
  const [emojis, setEmojis] = useState<string[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const isSubmitting = submitStatus === "submitting";

  const emojiPositions = assignEmojiPositions(emojis);

  useEffect(() => {
    onDraftEmptyChange(
      name.trim().length === 0 &&
        message.trim().length === 0 &&
        emojis.length === 0 &&
        colorVariant === DEFAULT_COLOR_VARIANT
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, message, emojis, colorVariant]);

  function toggleEmoji(emoji: string) {
    onActivity();
    setEmojis((prev) => {
      if (prev.includes(emoji)) return prev.filter((e) => e !== emoji);
      if (prev.length >= MAX_EMOJIS_PER_PIECE) return prev;
      return [...prev, emoji];
    });
  }

  function addCustomEmoji(emoji: string) {
    onActivity();
    setEmojis((prev) => (prev.length >= MAX_EMOJIS_PER_PIECE ? prev : [...prev, emoji]));
  }

  function removeEmojiAt(index: number) {
    onActivity();
    setEmojis((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit() {
    const trimmed = name.trim();
    if (!trimmed) {
      setValidationError("이름 또는 닉네임을 입력해주세요.");
      return;
    }
    if (trimmed.length > MAX_NAME_LENGTH) {
      setValidationError(`이름은 최대 ${MAX_NAME_LENGTH}자까지 입력할 수 있어요.`);
      return;
    }
    const trimmedMessage = message.trim();
    if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
      setValidationError(`한마디는 최대 ${MAX_MESSAGE_LENGTH}자까지 입력할 수 있어요.`);
      return;
    }
    setValidationError(null);
    const draft: DraftPiece = {
      name: trimmed,
      message: trimmedMessage,
      colorVariant,
      emojis,
      emojiPositions,
    };
    onSubmit(draft);
  }

  const displayError = validationError ?? errorMessage;

  return (
    <div className="flex h-full flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">당신의 조각을 이어주세요.</h2>
        <p className="mt-1 text-sm text-slate-500">이름을 남기면 하나의 조각이 되어 퍼즐에 이어집니다.</p>
      </div>

      <div>
        <input
          type="text"
          value={name}
          onChange={(e) => {
            onActivity();
            setName(e.target.value.slice(0, MAX_NAME_LENGTH));
          }}
          placeholder="이름 또는 닉네임"
          maxLength={MAX_NAME_LENGTH}
          disabled={isSubmitting}
          className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-base font-medium outline-none focus:border-violet-400 disabled:bg-slate-50"
        />
        <p className="mt-1.5 text-[11px] text-slate-400">
          작성한 이름 또는 닉네임은 전시 퍼즐에 공개됩니다. ({name.trim().length}/{MAX_NAME_LENGTH})
        </p>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-600">한마디 남기기 (선택)</p>
          <span className="text-xs font-medium text-slate-400">
            {message.trim().length}/{MAX_MESSAGE_LENGTH}
          </span>
        </div>
        <textarea
          value={message}
          onChange={(e) => {
            onActivity();
            setMessage(e.target.value.slice(0, MAX_MESSAGE_LENGTH));
          }}
          placeholder="다음 사람에게 짧은 메시지를 남겨주세요."
          maxLength={MAX_MESSAGE_LENGTH}
          disabled={isSubmitting}
          rows={2}
          className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium outline-none focus:border-violet-400 disabled:bg-slate-50"
        />
      </div>

      <div className="grid flex-1 grid-cols-5 gap-4 overflow-y-auto">
        <div className="col-span-3 space-y-4">
          <div>
            <p className="mb-2 text-sm font-semibold text-slate-600">조각 뒷면 색상</p>
            <ColorPicker
              value={colorVariant}
              onChange={(c) => {
                onActivity();
                setColorVariant(c);
              }}
            />
          </div>
          <EmojiPicker selected={emojis} onToggle={toggleEmoji} onAddCustom={addCustomEmoji} onRemoveAt={removeEmojiAt} />
        </div>

        <div className="col-span-2 flex flex-col items-center justify-start gap-2 pt-1">
          <p className="text-center text-xs font-semibold text-slate-500">내 조각 뒷면 미리보기</p>
          <PiecePreview
            ref={previewRef}
            name={name}
            message={message}
            colorVariant={colorVariant}
            emojis={emojis}
            className="max-w-[160px]"
          />
          <p className="text-center text-[11px] leading-snug text-slate-400">
            조각이 퍼즐에 들어간 뒤 뒤집으면 이 모습이 보여요.
          </p>
        </div>
      </div>

      {displayError && (
        <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600">
          {displayError}
        </p>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isSubmitting}
        className="h-14 w-full shrink-0 rounded-2xl bg-slate-900 text-lg font-bold text-white transition-transform active:scale-[0.98] disabled:bg-slate-300"
      >
        {isSubmitting ? "조각을 잇는 중..." : "내 조각 이어가기"}
      </button>
    </div>
  );
}
