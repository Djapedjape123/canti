"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";

export type NavApartment = {
  href: string;
  name: string;
  /** e.g. "od 65 € / noć" */
  meta: string;
};

type NavApartmentsDropdownProps = {
  label: string;
  items: NavApartment[];
};

/** Opens on hover (desktop mouse), on click/tap, and from the keyboard. Esc closes. */
export function NavApartmentsDropdown({ label, items }: NavApartmentsDropdownProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const lastPointerType = useRef<string | null>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div
      ref={wrapperRef}
      className="relative"
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") setOpen(true);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse") setOpen(false);
      }}
      onBlur={(event) => {
        if (!wrapperRef.current?.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        onPointerDown={(event) => {
          lastPointerType.current = event.pointerType;
        }}
        onClick={() => {
          // With a mouse, hover already opened the menu: a click must not close it again.
          if (lastPointerType.current === "mouse") setOpen(true);
          else setOpen((value) => !value);
          lastPointerType.current = null;
        }}
        className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-cream-50/90 transition-colors hover:text-gold-500"
      >
        {label}
        <Icon
          name="chevronDown"
          strokeWidth={1.75}
          className={`size-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* pt-3 bridges the gap so the menu doesn't close while the mouse travels to it */}
      <div id={menuId} hidden={!open} className="absolute left-1/2 top-full w-72 -translate-x-1/2 pt-3">
        <ul className="rounded-xl bg-cream-50 p-2 shadow-lg ring-1 ring-sand-200">
          {items.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex min-h-11 items-center justify-between gap-4 rounded-lg px-4 py-3 text-ink-900 transition-colors hover:bg-cream-100"
              >
                <span className="font-serif text-lg font-semibold">{item.name}</span>
                <span className="shrink-0 text-xs text-ink-600">{item.meta}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
