"use client";

import Link from "next/link";
import { useState } from "react";

type ArmState = "idle" | "armed";

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [arm, setArm] = useState<ArmState>("idle");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleReset() {
    if (arm !== "armed") {
      setArm("armed");
      setTimeout(() => setArm("idle"), 5000);
      return;
    }

    setStatus("loading");
    setMessage(null);
    try {
      const res = await fetch("/api/admin/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error ?? "초기화에 실패했어요.");
        return;
      }
      setStatus("success");
      setMessage("모든 테스트 데이터가 초기화되었습니다. 퍼즐 1번판이 새로 시작됩니다.");
      setArm("idle");
    } catch {
      setStatus("error");
      setMessage("네트워크 오류로 초기화하지 못했어요.");
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-5 p-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">관리자 - 퍼즐 초기화</h1>
        <p className="mt-1 text-sm text-slate-500">
          전시 시작 전 테스트 데이터를 모두 지우고 1번 퍼즐판을 새로 시작합니다. 이 작업은 되돌릴 수 없습니다.
        </p>
      </div>

      <input
        type="password"
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
          setArm("idle");
        }}
        placeholder="관리자 비밀번호"
        className="h-12 rounded-xl border border-slate-200 px-4 text-base outline-none focus:border-violet-400"
      />

      <button
        type="button"
        onClick={handleReset}
        disabled={!password || status === "loading"}
        className={`h-12 rounded-xl text-base font-bold text-white transition-colors disabled:bg-slate-200 disabled:text-slate-400 ${
          arm === "armed" ? "bg-rose-600" : "bg-slate-900"
        }`}
      >
        {status === "loading" ? "초기화 중..." : arm === "armed" ? "정말 초기화하려면 다시 눌러주세요" : "전체 데이터 초기화"}
      </button>

      {message && (
        <p className={`text-sm font-medium ${status === "success" ? "text-emerald-600" : "text-rose-600"}`}>
          {message}
        </p>
      )}

      <Link href="/" className="text-center text-sm text-slate-400 underline underline-offset-2">
        참여 화면으로 돌아가기
      </Link>
    </div>
  );
}
