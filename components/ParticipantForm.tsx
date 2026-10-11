"use client";

import { useEffect, useRef, useState } from "react";
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
  totalPieces: number;
  filledCount: number;
  onSubmit: (draft: DraftPiece) => void;
  onActivity: () => void;
  onDraftEmptyChange: (isEmpty: boolean) => void;
  /** 인트로(캐러셀) 화면을 보여주는 중인지 여부. 좌측 패널의 배경 테마를 바꾸는 데 쓰인다. */
  onIntroActiveChange?: (active: boolean) => void;
}

// 한 화면에 모든 입력을 몰아넣지 않고, "지금 할 일 하나"만 보여주는 단계로 나눈다.
// 순서: 이름(필수) -> 한마디(선택) -> 색상 -> 이모지(선택) -> 최종 확인/제출.
const STEP_LABELS = ["이름 입력", "한마디 남기기 (선택)", "색상 선택", "이모지 꾸미기 (선택)", "최종 확인"] as const;
const LAST_STEP = STEP_LABELS.length - 1;

export default function ParticipantForm({
  previewRef,
  submitStatus,
  errorMessage,
  totalPieces,
  filledCount,
  onSubmit,
  onActivity,
  onDraftEmptyChange,
  onIntroActiveChange,
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

  useEffect(() => {
    onIntroActiveChange?.(!started);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started]);

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
        totalPieces={totalPieces}
        filledCount={filledCount}
        onPageChange={onActivity}
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

      {step === LAST_STEP && !isSubmitting && (
        <div className="flex shrink-0 justify-center">
          <div className="bubble-bounce relative rounded-xl bg-slate-900 px-3 py-1.5 text-center text-xs font-semibold leading-snug text-white shadow-lg sm:text-sm">
            아래 버튼을 눌러 완성된 조각을 퍼즐판에 이어주세요.
            <span className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-x-8 border-t-8 border-x-transparent border-t-slate-900" />
          </div>
        </div>
      )}

      <div className="flex shrink-0 gap-3">
        {step > 0 && (
          <button
            type="button"
            onClick={goBack}
            disabled={isSubmitting}
            className="h-16 shrink-0 rounded-2xl bg-slate-100 px-6 text-lg font-bold text-slate-600 transition-transform active:scale-[0.98] disabled:opacity-50"
          >
            이전
          </button>
        )}
        {step < LAST_STEP ? (
          <button
            type="button"
            onClick={goNext}
            className="h-16 flex-1 rounded-2xl bg-slate-900 text-xl font-bold text-white transition-transform active:scale-[0.98]"
          >
            다음
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={`h-16 flex-1 rounded-2xl bg-slate-900 text-xl font-bold text-white transition-transform active:scale-[0.98] disabled:bg-slate-300 ${
              isSubmitting ? "" : "cta-glow"
            }`}
          >
            {isSubmitting ? "조각을 잇는 중..." : "퍼즐판에 조각 잇기"}
          </button>
        )}
      </div>
    </div>
  );
}

// 참여 단계(이름 -> 한마디 -> 색상 -> 이모지 -> 확인)를 시작하기 전 보여주는 안내 캐러셀.
// 5개의 카드를 순서대로 넘기며 "왜 참여하는지 -> 무엇을 하는지 -> 어떤 순서로 하는지"를
// 한 번에 하나씩 보여준 뒤, 마지막 "이어가기"에서 실제 입력 단계로 넘어간다.
const INTRO_STEPS = [
  { no: "01", title: "기본 정보 입력하기", desc: "이름과 한마디를 남겨요" },
  { no: "02", title: "조각 꾸미기", desc: "색상과 이모지로 꾸며요" },
  { no: "03", title: "퍼즐에 조각 잇기", desc: "완성된 조각을 퍼즐에 이어요" },
] as const;

const INTRO_PAGE_COUNT = 3; // 남은 조각 안내 + 스토리 + 단계 안내

function IntroHeader() {
  return (
    <div className="flex items-center justify-between text-sm font-semibold tracking-wide text-white/70 sm:text-base">
      <span>가상 릴레이 봉사체험</span>
      <span>퍼즐 방명록</span>
    </div>
  );
}

function IntroDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center justify-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={`h-1.5 rounded-full transition-all ${i === current ? "w-6 bg-white" : "w-1.5 bg-white/35"}`}
        />
      ))}
    </div>
  );
}

function IntroScreen({
  totalPieces,
  filledCount,
  onPageChange,
  onStart,
}: {
  totalPieces: number;
  filledCount: number;
  onPageChange: () => void;
  onStart: () => void;
}) {
  const [page, setPage] = useState(0);
  const remaining = Math.max(totalPieces - filledCount, 0);
  const touchStartXRef = useRef<number | null>(null);

  function goNextPage() {
    onPageChange();
    setPage((p) => Math.min(p + 1, INTRO_PAGE_COUNT - 1));
  }

  function goPrevPage() {
    onPageChange();
    setPage((p) => Math.max(p - 1, 0));
  }

  // 스토리(1) / 방법 안내(2) 두 페이지는 버튼뿐 아니라 손가락 스와이프로도 넘길 수 있게 한다.
  function handleTouchStart(e: React.TouchEvent) {
    touchStartXRef.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    const startX = touchStartXRef.current;
    touchStartXRef.current = null;
    if (startX === null) return;
    const deltaX = e.changedTouches[0].clientX - startX;
    const SWIPE_THRESHOLD = 40;
    if (Math.abs(deltaX) < SWIPE_THRESHOLD) return;
    if (deltaX < 0) {
      if (page < INTRO_PAGE_COUNT - 1) goNextPage();
    } else if (page > 0) {
      goPrevPage();
    }
  }

  return (
    <div className="flex h-full flex-col justify-between gap-4 rounded-3xl bg-gradient-to-b from-violet-600 to-violet-800 p-5 text-white sm:gap-6">
      <IntroHeader />

      <div
        className="flex min-h-0 flex-1 flex-col touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {page === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
            <div className="w-full rounded-2xl border border-white/25 px-4 py-7">
              <p className="text-base font-semibold text-white/70">남은 조각</p>
              <p className="mt-2 flex items-baseline justify-center gap-2 font-extrabold text-amber-200">
                <span className="text-7xl">{remaining}</span>
                <span className="text-3xl">개</span>
              </p>
            </div>
            <h2 className="text-2xl font-extrabold leading-tight">
              남은 빈자리를 채워줄
              <br />
              당신이 필요해요!
            </h2>
            <p className="text-sm text-white/60">ⓘ 본 프로그램은 실제 봉사 신청 없이 참여할 수 있는 가상 릴레이 봉사 체험입니다.</p>
          </div>
        )}

        {page === 1 && (
          <div className="flex flex-1 flex-col justify-center gap-6">
            <p className="text-base font-bold leading-relaxed">
              반짝이는 바다와 아름다운
              <br />
              풍경으로 가득한 광안리,
              <br />
              하지만 해변 곳곳에는 누군가의
              <br />
              손길이 필요한 쓰레기가 남아있어요.
            </p>
            <p className="text-xl font-extrabold leading-snug text-amber-200">
              깨끗한 광안리를 완성할
              <br />
              다음 주인공이 되어주세요!
            </p>
          </div>
        )}

        {page === 2 && (
          <div className="flex flex-1 flex-col justify-center gap-4">
            <h2 className="text-center text-2xl font-extrabold">방법은 간단해요!</h2>
            <div className="flex flex-col gap-2.5">
              {INTRO_STEPS.map(({ no, title, desc }, i) => (
                <div
                  key={no}
                  className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 text-white shadow-lg ring-1 ring-white/15 backdrop-blur-sm"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 text-lg font-extrabold text-white">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-base font-extrabold">{title}</p>
                    <p className="mt-0.5 text-sm font-medium text-white/70">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 스와이프/버튼으로 페이지를 넘겨도 내용 높이와 무관하게 항상 같은 위치에 고정된다. */}
      {page > 0 && (
        <div className="flex shrink-0 items-center justify-center">
          <IntroDots total={INTRO_PAGE_COUNT - 1} current={page - 1} />
        </div>
      )}

      <button
        type="button"
        onClick={page === INTRO_PAGE_COUNT - 1 ? onStart : goNextPage}
        className="h-16 w-full shrink-0 rounded-2xl bg-white text-xl font-extrabold text-slate-900 shadow-md transition-transform active:scale-[0.98] sm:h-20 sm:text-2xl"
      >
        {page === 0 ? "참여하기" : page === 1 ? "다음" : "이어가기"}
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
    <div className="flex h-full flex-col justify-center gap-4">
      <div>
        <h2 className="text-xl font-extrabold leading-tight text-slate-900">당신의 이름을 알려주세요</h2>
        <p className="mt-2 text-sm text-slate-500">이름 또는 닉네임이 조각에 남아요.</p>
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
        className="h-16 w-full rounded-xl border border-slate-200 bg-white px-5 text-xl font-medium outline-none focus:border-violet-400 disabled:bg-slate-50"
      />
      <p className="text-sm text-slate-400">
        작성한 이름 또는 닉네임은 전시 퍼즐에 공개됩니다. ({name.trim().length}/{MAX_NAME_LENGTH})
      </p>
      {error && (
        <p role="alert" className="rounded-lg bg-rose-50 px-4 py-3 text-base font-medium text-rose-600">
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
    <div className="flex h-full flex-col justify-center gap-4">
      <div>
        <h2 className="text-xl font-extrabold leading-tight text-slate-900">한마디 남겨주세요</h2>
        <p className="mt-2 text-sm text-slate-500">
          다음 사람에게 전하고 싶은
          <br />
          짧은 메시지를 적어보세요.
          <br />
          비워두고 넘어가도 괜찮아요.
        </p>
      </div>
      <textarea
        value={message}
        autoFocus
        onChange={(e) => onChange(e.target.value)}
        placeholder="다음 사람에게 짧은 메시지를 남겨주세요."
        maxLength={MAX_MESSAGE_LENGTH}
        disabled={disabled}
        rows={4}
        className="w-full resize-none rounded-xl border border-slate-200 bg-white px-5 py-4 text-lg font-medium outline-none focus:border-violet-400 disabled:bg-slate-50"
      />
      <p className="text-right text-sm font-medium text-slate-400">
        {message.trim().length}/{MAX_MESSAGE_LENGTH}
      </p>
    </div>
  );
}

function StepColor({ value, onChange }: { value: ColorVariantId; onChange: (id: ColorVariantId) => void }) {
  return (
    <div className="flex h-full flex-col justify-center gap-4">
      <div>
        <h2 className="text-xl font-extrabold leading-tight text-slate-900">조각 뒷면 색상을 골라주세요</h2>
        <p className="mt-2 text-sm text-slate-500">조각을 뒤집으면 보이는 색이에요.</p>
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
          <h2 className="text-xl font-extrabold leading-tight text-slate-900">이모지로 꾸며보세요</h2>
          <p className="mt-2 text-sm text-slate-500">최대 {MAX_EMOJIS_PER_PIECE}개까지 고를 수 있어요. 생략해도 괜찮아요.</p>
        </div>
        <span className="mt-1 shrink-0 text-sm font-semibold text-slate-400">
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
    <div className="flex h-full flex-col items-center justify-center gap-2 overflow-y-auto text-center sm:gap-3">
      <div>
        <h2 className="text-lg font-extrabold leading-tight text-slate-900 sm:text-2xl">
          모든 단계를 완료하고
          <br />
          나만의 조각을 완성했어요!
        </h2>
        <p className="mt-1 text-xs text-slate-500 sm:text-base">당신이 완성한 조각을 확인해 보세요.</p>
      </div>

      <PiecePreview
        ref={previewRef}
        name={name}
        message={message}
        colorVariant={colorVariant}
        emojis={emojis}
        className="max-w-[100px] sm:max-w-[160px]"
      />

      <div className="w-full rounded-2xl bg-violet-50 px-3 py-2 text-left sm:px-4 sm:py-3">
        <p className="text-sm font-extrabold text-violet-700">작은 실천이 모여 깨끗한 광안리로!</p>
        <p className="mt-0.5 text-xs leading-snug text-slate-600">
          해변의 쓰레기 하나를 줍는 작은 실천처럼, 한 사람의 봉사가 다음 사람에게 이어질 때 더 큰 변화를 만들 수 있어요.
        </p>
      </div>

      {errorMessage && (
        <p role="alert" className="rounded-lg bg-rose-50 px-4 py-3 text-base font-medium text-rose-600">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
