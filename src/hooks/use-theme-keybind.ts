"use client";

import { useEffect } from "react";
import { playSound } from "@/lib/audio";
import { clickSoftSound } from "@/sounds/click-soft";

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  );
}

function blurActiveElement() {
  const active = document.activeElement;

  if (
    !(active instanceof HTMLElement) ||
    active === document.body ||
    active === document.documentElement
  ) {
    return;
  }

  active.blur();
}

/*
  Binds `D` to a theme toggle - ignored in editable fields and while modifier keys are held.
  Pointer-focused controls are blurred first so `:focus-visible` does not appear on toggle.
*/
export function useThemeKeybind(onToggle: () => void) {
  useEffect(() => {
    let pointerFocus = false;

    function markPointerFocus() {
      pointerFocus = true;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Tab") {
        pointerFocus = false;
        return;
      }

      if (event.defaultPrevented || event.repeat) {
        return;
      }

      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      if (event.key.toLowerCase() !== "d") {
        return;
      }

      if (isTypingTarget(event.target)) {
        return;
      }

      if (pointerFocus) {
        blurActiveElement();
      }

      void playSound(clickSoftSound.dataUri, { volume: 0.2 });
      onToggle();
    }

    window.addEventListener("pointerdown", markPointerFocus, true);
    window.addEventListener("keydown", handleKeyDown, true);

    return () => {
      window.removeEventListener("pointerdown", markPointerFocus, true);
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [onToggle]);
}
