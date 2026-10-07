"use client";

import { useEffect, useState } from "react";
import { DEFAULT_COLOR_VARIANT, type ColorVariantId } from "@/config/colors";
import { MAX_EMOJIS_PER_PIECE, MAX_MESSAGE_LENGTH, MAX_NAME_LENGTH } from "@/config/puzzle";
import { assignEmojiPositions } from "@/lib/emoji";
import type { DraftPiece, SubmitStatus } from "@/types/puzzle";
import ColorPicker from "./ColorPicker";
import EmojiPicker from "./EmojiPicker";
import PiecePreview from "./PiecePreview";
import StepIndicator from "./StepIndicator";

interface ParticipantFormProps {
  previewRef: React.RefObject<HTMLDivElement | null>;
  submitStatus: SubmitStatus;
  errorMessage: string | null;
  onSubmit: (draft: DraftPiece) => void;
  onActivity: () => void;
  onDraftEmptyChange: (isEmpty: boolean) => void;
}

// 한 화면에 모든 입력을 몰아넣지 않고, "지금 할 일 하나"만 보여주는 단계로 나눈다.
// 순서: 이름(필수) -> 한마디(선택) -> 색상 -> 이모지(선택) -> 최종 확인/제출.
const STEP_LABELS = ["이름 입력", "한마디 남기기 (선택)", "색상 선택", "이모지 꾸미기 (선택)", "최종 확인"] as const;
const LAST_STEP = STEP_LABELS.length - 1;

export default function ParticipantForm({
  previewRef,
  submitStatus,
  errorMessage,
  onSubmit,
  onActivity,
  onDraftEmptyChange,
}: ParticipantFormProps) {
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(0);
  const [maxReachedStep, setMaxReachedStep] = useState(0);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [colorVariant, setColorVariant] = useState<ColorVariantId>(DEFAULT_COLOR_VARIANT);
  const [emojis, setEmojis] = useState<string[]>([]);
  const [nameError, setNameError] = useState<string | null>(null);
  const isSubmitting = submitStatus === "submitting";

  const emojiPositions = assignEmojiPositions(emojis);
  const trimmedName = name.trim();

  useEffect(() => {
    onDraftEmptyChange(
      name.trim().length === 0 &&
        message.trim().length === 0 &&
        emojis.length === 0 &&
        colorVariant === DEFAULT_COLOR_VARIANT
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, message, emojis, colorVariant]);

  function goToStep(index: number) {
    onActivity();
    setStep(index);
  }

  function goNext() {
    if (step === 0 && !trimmedName) {
      setNameError("이름 또는 닉네임을 입력해주세요.");
      return;
    }
    onActivity();
    const next = Math.min(step + 1, LAST_STEP);
    setStep(next);
    setMaxReachedStep((prev) => Math.max(prev, next));
  }

  function goBack() {
    onActivity();
    setStep((prev) => Math.max(prev - 1, 0));
  }

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
    if (!trimmedName) {
      // 중간에 이전 단계로 돌아가 이름을 지운 경우에 대한 안전장치.
      setStep(0);
      setMaxReachedStep((prev) => Math.max(prev, 0));
      setNameError("이름 또는 닉네임을 입력해주세요.");
      return;
    }
    const draft: DraftPiece = {
      name: trimmedName,
      message: message.trim(),
      colorVariant,
      emojis,
      emojiPositions,
    };
    onSubmit(draft);
  }

  if (!started) {
    return (
      <IntroScreen
        onStart={() => {
          onActivity();
          setStarted(true);
        }}
      />
    );
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <StepIndicator
        steps={[...STEP_LABELS]}
        currentStep={step}
        maxReachedStep={maxReachedStep}
        onStepClick={goToStep}
      />

      <div className="min-h-0 flex-1">
        {step === 0 && (
          <StepName
            name={name}
            error={nameError}
            disabled={isSubmitting}
            onChange={(v) => {
              onActivity();
              setNameError(null);
              setName(v.slice(0, MAX_NAME_LENGTH));
            }}
            onEnter={goNext}
          />
        )}
        {step === 1 && (
          <StepMessage
            message={message}
            disabled={isSubmitting}
            onChange={(v) => {
              onActivity();
              setMessage(v.slice(0, MAX_MESSAGE_LENGTH));
            }}
          />
        )}
        {step === 2 && (
          <StepColor
            value={colorVariant}
            onChange={(c) => {
              onActivity();
              setColorVariant(c);
            }}
          />
        )}
        {step === 3 && (
          <StepEmoji emojis={emojis} onToggle={toggleEmoji} onAddCustom={addCustomEmoji} onRemoveAt={removeEmojiAt} />
        )}
        {step === 4 && (
          <StepReview
            previewRef={previewRef}
            name={name}
            message={message}
            colorVariant={colorVariant}
            emojis={emojis}
            errorMessage={errorMessage}
          />
        )}
      </div>

      <div className="flex shrink-0 gap-2">
        {step > 0 && (
          <button
            type="button"
            onClick={goBack}
            disabled={isSubmitting}
            className="h-14 shrink-0 rounded-2xl bg-slate-100 px-5 text-base font-bold text-slate-600 transition-transform active:scale-[0.98] disabled:opacity-50"
          >
            이전
          </button>
        )}
        {step < LAST_STEP ? (
          <button
            type="button"
            onClick={goNext}
            className="h-14 flex-1 rounded-2xl bg-slate-900 text-lg font-bold text-white transition-transform active:scale-[0.98]"
          >
            다음
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="h-14 flex-1 rounded-2xl bg-slate-900 text-lg font-bold text-white transition-transform active:scale-[0.98] disabled:bg-slate-300"
          >
            {isSubmitting ? "조각을 잇는 중..." : "내 조각 이어가기"}
          </button>
        )}
      </div>
    </div>
  );
}

// 참여 단계(이름 -> 한마디 -> 색상 -> 이모지 -> 확인)를 시작하기 전 보여주는 안내 화면.
// 목표는 "무엇에 참여하는지 -> 무엇을 해야 하는지 -> 어떻게 다음으로 넘어가는지"를
// 몇 초 안에 스캔해서 이해하고 바로 시작 버튼을 누르게 만드는 것 - 길게 읽는 설명 페이지가 아니다.
const INTRO_STEPS = [
  { no: "01", title: "기본 정보 입력", desc: "이름과 한마디를 남겨요" },
  { no: "02", title: "조각 꾸미기", desc: "색상과 이모지로 꾸며요" },
  { no: "03", title: "퍼즐에 조각 잇기", desc: "완성한 조각을 퍼즐에 이어요" },
] as const;

function IntroScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex h-full flex-col justify-center gap-7">
      <div>
        <p className="text-lg font-bold text-violet-500 sm:text-xl">퍼즐 방명록</p>
        <h2 className="mt-2 text-3xl font-extrabold leading-tight text-slate-900 sm:text-4xl">
          광안리 환경정화,
          <br />
          이제 당신의 조각을
          <br />
          이어볼 차례예요!
        </h2>
      </div>

      <p className="text-lg font-bold leading-relaxed text-violet-600 sm:text-xl sm:leading-relaxed">
        이름과 메모를 남기고
        <br />
        나만의 조각을 완성해보세요.
      </p>

      <div className="flex flex-col">
        {INTRO_STEPS.map(({ no, title, desc }, i) => (
          <div
            key={no}
            className={`flex items-center gap-3 py-3 ${
              i !== INTRO_STEPS.length - 1 ? "border-b border-slate-100" : ""
            }`}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-600 text-xs font-extrabold text-white">
              {no}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-base font-bold text-slate-900">{title}</p>
              <p className="text-sm text-slate-400">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onStart}
        className="h-14 w-full shrink-0 rounded-2xl bg-violet-600 text-lg font-bold text-white shadow-sm shadow-violet-600/30 transition-transform active:scale-[0.98]"
      >
        참여 시작하기 →
      </button>
    </div>
  );
}

function StepName({
  name,
  error,
  disabled,
  onChange,
  onEnter,
}: {
  name: string;
  error: string | null;
  disabled: boolean;
  onChange: (value: string) => void;
  onEnter: () => void;
}) {
  return (
    <div className="flex h-full flex-col justify-center gap-3">
      <div>
        <h2 className="text-2xl font-extrabold leading-tight text-slate-900 sm:text-3xl">당신의 이름을 알려주세요</h2>
        <p className="mt-1 text-sm text-slate-500">이름 또는 닉네임이 조각에 남아요.</p>
      </div>
      <input
        type="text"
        value={name}
        autoFocus
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onEnter();
        }}
        placeholder="이름 또는 닉네임"
        maxLength={MAX_NAME_LENGTH}
        disabled={disabled}
        className="h-14 w-full rounded-xl border border-slate-200 bg-white px-4 text-lg font-medium outline-none focus:border-violet-400 disabled:bg-slate-50"
      />
      <p className="text-[11px] text-slate-400">
        작성한 이름 또는 닉네임은 전시 퍼즐에 공개됩니다. ({name.trim().length}/{MAX_NAME_LENGTH})
      </p>
      {error && (
        <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600">
          {error}
        </p>
      )}
    </div>
  );
}

function StepMessage({
  message,
  disabled,
  onChange,
}: {
  message: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex h-full flex-col justify-center gap-3">
      <div>
        <h2 className="text-2xl font-extrabold leading-tight text-slate-900 sm:text-3xl">한마디 남겨주세요</h2>
        <p className="mt-1 text-sm text-slate-500">다음 사람에게 전하고 싶은 짧은 메시지를 적어보세요. 비워두고 넘어가도 괜찮아요.</p>
      </div>
      <textarea
        value={message}
        autoFocus
        onChange={(e) => onChange(e.target.value)}
        placeholder="다음 사람에게 짧은 메시지를 남겨주세요."
        maxLength={MAX_MESSAGE_LENGTH}
        disabled={disabled}
        rows={4}
        className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-base font-medium outline-none focus:border-violet-400 disabled:bg-slate-50"
      />
      <p className="text-right text-xs font-medium text-slate-400">
        {message.trim().length}/{MAX_MESSAGE_LENGTH}
      </p>
    </div>
  );
}

function StepColor({ value, onChange }: { value: ColorVariantId; onChange: (id: ColorVariantId) => void }) {
  return (
    <div className="flex h-full flex-col justify-center gap-4">
      <div>
        <h2 className="text-2xl font-extrabold leading-tight text-slate-900 sm:text-3xl">조각 뒷면 색상을 골라주세요</h2>
        <p className="mt-1 text-sm text-slate-500">조각을 뒤집으면 보이는 색이에요.</p>
      </div>
      <ColorPicker value={value} onChange={onChange} />
    </div>
  );
}

function StepEmoji({
  emojis,
  onToggle,
  onAddCustom,
  onRemoveAt,
}: {
  emojis: string[];
  onToggle: (emoji: string) => void;
  onAddCustom: (emoji: string) => void;
  onRemoveAt: (index: number) => void;
}) {
  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-2xl font-extrabold leading-tight text-slate-900 sm:text-3xl">이모지로 꾸며보세요</h2>
          <p className="mt-1 text-sm text-slate-500">최대 {MAX_EMOJIS_PER_PIECE}개까지 고를 수 있어요. 생략해도 괜찮아요.</p>
        </div>
        <span className="mt-1 shrink-0 text-xs font-semibold text-slate-400">
          {emojis.length}/{MAX_EMOJIS_PER_PIECE}
        </span>
      </div>
      <EmojiPicker selected={emojis} onToggle={onToggle} onAddCustom={onAddCustom} onRemoveAt={onRemoveAt} hideHeader />
    </div>
  );
}

function StepReview({
  previewRef,
  name,
  message,
  colorVariant,
  emojis,
  errorMessage,
}: {
  previewRef: React.RefObject<HTMLDivElement | null>;
  name: string;
  message: string;
  colorVariant: ColorVariantId;
  emojis: string[];
  errorMessage: string | null;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
      <div>
        <h2 className="text-2xl font-extrabold leading-tight text-slate-900 sm:text-3xl">조각을 확인해주세요</h2>
        <p className="mt-1 text-sm text-slate-500">이대로 퍼즐판에 조각을 이어줄게요.</p>
      </div>
      <PiecePreview
        ref={previewRef}
        name={name}
        message={message}
        colorVariant={colorVariant}
        emojis={emojis}
        className="max-w-[180px]"
      />
      {errorMessage && (
        <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
