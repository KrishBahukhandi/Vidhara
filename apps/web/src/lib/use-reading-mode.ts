"use client";

import { useEffect, useState } from "react";

/** Scrolling down by less than this is a wobble, not an intention. */
const INTENT_PX = 12;
/** Long enough to mean "stopped reading", short enough not to feel stuck. */
const SETTLE_MS = 500;

/**
 * True while the reader is moving down the page.
 *
 * On a 375px phone the reading column runs to within 20px of the right edge, so
 * a floating control in that corner necessarily sits on top of the last two
 * lines — on BNS 151 it covers "by means of criminal force or the show of". No
 * amount of shrinking fixes that; the corner and the column are the same place.
 *
 * So the controls yield instead. Scrolling down means reading, and reading is
 * the one thing this site exists for, so they slide out. They come back the
 * moment the reader scrolls up or stops — which is when someone actually wants
 * to explain a section or report a problem with it.
 *
 * Nothing is hidden from assistive technology or from keyboard users: the
 * controls stay focusable and are only transformed, and under
 * `prefers-reduced-motion` the transform is dropped so they simply stay put.
 */
export function useReadingMode(): boolean {
  const [reading, setReading] = useState(false);

  useEffect(() => {
    let lastY = window.scrollY;
    let settle: ReturnType<typeof setTimeout> | undefined;

    const onScroll = () => {
      const y = window.scrollY;
      const movedDown = y - lastY;
      // Near the top there is nothing to read past yet, and hiding the controls
      // there just makes them flicker on a short page.
      if (y < 120) setReading(false);
      else if (movedDown > INTENT_PX) setReading(true);
      else if (movedDown < -INTENT_PX) setReading(false);
      if (Math.abs(movedDown) > INTENT_PX) lastY = y;

      clearTimeout(settle);
      settle = setTimeout(() => setReading(false), SETTLE_MS);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      clearTimeout(settle);
    };
  }, []);

  return reading;
}
