import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "퍼즐 방명록 | 졸업전시",
  description: "관람객 한 분 한 분이 퍼즐 조각이 되어 함께 하나의 작품을 완성하는 실시간 참여형 방명록입니다.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="h-[100dvh] overflow-hidden bg-slate-50 text-slate-900">{children}</body>
    </html>
  );
}
