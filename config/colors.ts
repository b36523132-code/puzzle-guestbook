/**
 * 참가자가 선택할 수 있는 퍼즐 조각 색상 팔레트.
 * 전체 퍼즐이 하나의 작품처럼 보이도록 명도/채도 톤을 통일했다.
 * 자유 color picker 대신 이 목록 중에서만 선택할 수 있다.
 */
export type ColorVariantId =
  | "purple"
  | "lavender"
  | "yellow"
  | "lime"
  | "sky"
  | "blue"
  | "coral"
  | "pink"
  | "orange"
  | "mint";

export interface ColorVariant {
  id: ColorVariantId;
  label: string;
  /** 조각을 채우는 메인 색상 */
  fill: string;
  /** 조각 테두리(살짝 더 진한 톤) */
  stroke: string;
  /** 조각 위에 올라가는 글자색 */
  text: string;
}

export const COLOR_PALETTE: ColorVariant[] = [
  { id: "purple", label: "Purple", fill: "#8B7FD1", stroke: "#6B5FAE", text: "#2B2550" },
  { id: "lavender", label: "Lavender", fill: "#BDB3EC", stroke: "#9C90CE", text: "#3A3362" },
  { id: "yellow", label: "Yellow", fill: "#EAC866", stroke: "#CBA73F", text: "#4A3A10" },
  { id: "lime", label: "Lime", fill: "#BFD86E", stroke: "#9EB84A", text: "#36431A" },
  { id: "sky", label: "Sky Blue", fill: "#80C6E3", stroke: "#57A5C6", text: "#153C4D" },
  { id: "blue", label: "Blue", fill: "#6E97D6", stroke: "#4F76B6", text: "#1C2E52" },
  { id: "coral", label: "Coral", fill: "#E99280", stroke: "#CB6F5C", text: "#4A1F15" },
  { id: "pink", label: "Pink", fill: "#E7A3C7", stroke: "#CA7DA8", text: "#4A1F37" },
  { id: "orange", label: "Orange", fill: "#E9A866", stroke: "#CB873F", text: "#4A2E10" },
  { id: "mint", label: "Mint", fill: "#82D1B2", stroke: "#59AF8D", text: "#143D2D" },
];

export const DEFAULT_COLOR_VARIANT: ColorVariantId = "purple";

export function getColorVariant(id: string | null | undefined): ColorVariant {
  return (
    COLOR_PALETTE.find((c) => c.id === id) ??
    COLOR_PALETTE.find((c) => c.id === DEFAULT_COLOR_VARIANT)!
  );
}

/** 참가자가 없는 빈 조각 스타일 (채도를 낮춰서 "아직 비어있다"는 느낌을 준다) */
export const EMPTY_PIECE_STYLE = {
  fill: "#F4F2FA",
  stroke: "#E1DCEE",
};
