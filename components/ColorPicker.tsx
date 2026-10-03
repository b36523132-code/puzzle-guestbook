"use client";

import { COLOR_PALETTE, type ColorVariantId } from "@/config/colors";

interface ColorPickerProps {
  value: ColorVariantId;
  onChange: (id: ColorVariantId) => void;
}

export default function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div className="grid grid-cols-5 gap-2.5">
      {COLOR_PALETTE.map((color) => {
        const selected = color.id === value;
        return (
          <button
            key={color.id}
            type="button"
            aria-label={color.label}
            aria-pressed={selected}
            onClick={() => onChange(color.id)}
            className={`relative flex h-11 w-11 items-center justify-center rounded-full ring-offset-2 transition-transform duration-150 ease-out active:scale-95 ${
              selected ? "scale-110 ring-2 ring-slate-900" : "ring-0"
            }`}
            style={{ backgroundColor: color.fill }}
          >
            {selected && (
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
                <path
                  d="M5 13l4 4L19 7"
                  stroke={color.text}
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>
        );
      })}
    </div>
  );
}
