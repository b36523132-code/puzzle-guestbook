"use client";

interface StepIndicatorProps {
  /** 각 단계의 캡션 (예: "이름 입력", "한마디 남기기 (선택)") */
  steps: string[];
  currentStep: number;
  /** 사용자가 지금까지 도달한 가장 먼 단계. 이보다 먼 단계는 아직 누를 수 없다 (건너뛰기 방지). */
  maxReachedStep: number;
  onStepClick: (index: number) => void;
}

/**
 * 등록 폼 상단에 붙는 단계 진행 표시.
 * 이미 지나온 단계는 눌러서 바로 되돌아가 수정할 수 있고, 아직 가보지 않은 단계는 비활성 상태라
 * 순서를 건너뛸 수 없다 - "지금 할 일 하나"만 보여주는 단계별 흐름을 유지하기 위함이다.
 */
export default function StepIndicator({ steps, currentStep, maxReachedStep, onStepClick }: StepIndicatorProps) {
  return (
    <div className="shrink-0">
      <div className="flex items-center gap-1.5">
        {steps.map((label, i) => {
          const done = i < currentStep;
          const active = i === currentStep;
          const reachable = i <= maxReachedStep && !active;
          return (
            <button
              key={label}
              type="button"
              disabled={!reachable}
              onClick={() => onStepClick(i)}
              aria-current={active ? "step" : undefined}
              aria-label={`${i + 1}단계 ${label}${done ? " - 완료, 눌러서 수정" : ""}`}
              className={`h-1.5 flex-1 rounded-full transition-colors duration-200 ${
                active ? "bg-violet-600" : done ? "bg-violet-300" : "bg-slate-200"
              } ${reachable ? "cursor-pointer hover:bg-violet-400" : active ? "cursor-default" : "cursor-not-allowed"}`}
            />
          );
        })}
      </div>
      <p className="mt-2 text-xs font-semibold text-violet-500">
        STEP {currentStep + 1}/{steps.length} · {steps[currentStep]}
      </p>
    </div>
  );
}
