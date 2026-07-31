"use client";

import { CornerUpLeft } from "lucide-react";
import { motion, useMotionValue, useTransform } from "motion/react";
import { useRef } from "react";

const THRESHOLD_PX = 64;

/**
 * A swipe-to-quote gesture, WhatsApp-style. Touch-only and invisible, so it
 * is a shortcut on top of MessageActions's "Reply" action — never the only
 * way to reply.
 *
 * The drag direction is intentionally physical, not locale-relative: users
 * pull the bubble left-to-right to quote it.
 */
export function SwipeToReply({
  onReply,
  children,
}: {
  onReply: () => void;
  children: React.ReactNode;
}) {
  const x = useMotionValue(0);
  const triggeredRef = useRef(false);
  const suppressClickRef = useRef(false);

  const dragConstraints = { left: 0, right: THRESHOLD_PX * 1.4 };
  const iconOpacity = useTransform(x, [0, THRESHOLD_PX * 0.4], [0, 1]);

  return (
    // flex-1/min-w-0: this sits directly inside Message's flex row, and must
    // stretch to fill it — otherwise it (and MessageContent inside it) just
    // shrink-wraps to the bubble's own width, and every message ends up at a
    // different horizontal offset instead of sharing one aligned edge.
    <div className="relative min-w-0 flex-1">
      <motion.div
        aria-hidden="true"
        style={{ opacity: iconOpacity }}
        className="text-primary-text pointer-events-none absolute start-2 top-1/2 -translate-y-1/2"
      >
        <CornerUpLeft className="size-4.5 rotate-90" />
      </motion.div>

      <motion.div
        drag="x"
        dragConstraints={dragConstraints}
        dragDirectionLock
        dragElastic={0.15}
        dragSnapToOrigin
        style={{ x, touchAction: "pan-y" }}
        onClickCapture={(event) => {
          if (!suppressClickRef.current) return;
          event.preventDefault();
          event.stopPropagation();
        }}
        onDrag={(_event, info) => {
          if (info.offset.x > THRESHOLD_PX && !triggeredRef.current) {
            triggeredRef.current = true;
            suppressClickRef.current = true;
            if (navigator.vibrate) navigator.vibrate(10);
          }
        }}
        onDragEnd={() => {
          if (triggeredRef.current) onReply();
          triggeredRef.current = false;
          window.setTimeout(() => {
            suppressClickRef.current = false;
          }, 0);
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}
