"use client";

import { useEffect, useState } from "react";

/**
 * 세로 모드일 때만 살짝 보여주는 안내 배너. 세로 사용 자체를 막지는 않는다.
 */
function getIsPortrait(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(orientation: portrait)").matches;
}

export default function OrientationHint() {
  const [isPortrait, setIsPortrait] = useState(getIsPortrait);

  useEffect(() => {
    const mql = window.matchMedia("(orientation: portrait)");
    const update = () => setIsPortrait(mql.matches);
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);

  if (!isPortrait) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-40 bg-amber-100 px-3 py-2 text-center text-xs font-medium text-amber-800 sm:text-sm">
      더 편한 참여를 위해 화면을 가로로 돌려주세요. 📱↔️
    </div>
  );
}
