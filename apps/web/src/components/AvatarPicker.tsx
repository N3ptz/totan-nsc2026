"use client";

import { useRef } from "react";

interface AvatarPickerProps {
  initial: string;
  gradient: string;
  preview?: string | null;
  onChange: (file: File, previewUrl: string) => void;
  size?: number;
  label?: string;
}

export function AvatarPicker({ initial, gradient, preview, onChange, size = 72, label }: AvatarPickerProps) {
  const ref = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    onChange(file, url);
    e.target.value = "";
  };

  const iconSize = Math.round(size * 0.28);
  const fontSize  = Math.round(size * 0.35);

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="relative group cursor-pointer flex-shrink-0"
        style={{ width: size, height: size }}
        onClick={() => ref.current?.click()}
        title={label ?? "เปลี่ยนรูปโปรไฟล์"}
      >
        {preview ? (
          <img
            src={preview}
            alt="avatar"
            className="w-full h-full rounded-2xl object-cover"
            style={{ boxShadow: "0 6px 20px rgba(0,0,0,0.18)" }}
          />
        ) : (
          <div
            className="w-full h-full rounded-2xl flex items-center justify-center font-bold text-white select-none"
            style={{ background: gradient, fontSize, boxShadow: "0 6px 20px rgb(var(--primary)/0.22)" }}
          >
            {initial}
          </div>
        )}

        {/* Camera overlay */}
        <div className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center gap-1 bg-black/50 opacity-0 group-hover:opacity-100 transition-all duration-200 backdrop-blur-[1px]">
          <svg
            style={{ width: iconSize, height: iconSize }}
            className="text-white drop-shadow"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
          </svg>
          {size >= 64 && (
            <span className="text-white font-body font-semibold text-[10px] drop-shadow">
              {label ?? "เปลี่ยนรูป"}
            </span>
          )}
        </div>

        {/* Badge */}
        <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full border-2 border-bg flex items-center justify-center"
          style={{ background: "linear-gradient(135deg,rgb(var(--aurora-1)),rgb(var(--aurora-3)))" }}>
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </div>

        <input
          ref={ref}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleChange}
        />
      </div>

      {label && (
        <p className="font-body text-[11px] text-muted text-center">{label}</p>
      )}
    </div>
  );
}
