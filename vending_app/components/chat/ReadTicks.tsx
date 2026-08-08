import Svg, { Circle, Path } from "react-native-svg";
import { palette } from "~/theme/moaddi";

/**
 * Delivery/read mark for MY outgoing messages, inside a teal bubble.
 *
 * `peerLastReadSeq` is the peer's read cursor for the whole conversation, so a
 * message counts as read once its `seq` is at or below it — there is no
 * per-message receipt, and none is needed for a two-party conversation.
 *
 * Geometry mirrors the web `ReadTicks.tsx` (viewBox 0 0 16 16, r=7.25 disc) so
 * the two platforms render the same mark. Both states draw the SAME double
 * tick and differ only by fill: unread is outlined, read is knocked out of a
 * filled disc, colored WhatsApp-style green. Colors are bubble-relative
 * (white-on-teal) rather than the web's theme tokens, because this always
 * sits on the outgoing bubble.
 */
const READ_GREEN = "#16a34a";

export function ReadTicks({
  seq,
  peerLastReadSeq,
}: {
  seq: number;
  peerLastReadSeq: number;
}) {
  const isRead = seq <= peerLastReadSeq;

  return (
    <Svg width={14} height={14} viewBox="0 0 16 16" fill="none">
      <Circle
        cx="8"
        cy="8"
        r="7.25"
        fill={isRead ? palette.white : "none"}
        stroke={isRead ? "none" : "rgba(255,255,255,0.55)"}
        strokeWidth="1.25"
      />
      <Path
        d="M3.6 8.3 5.5 10.2 9.1 6.1"
        stroke={isRead ? READ_GREEN : "rgba(255,255,255,0.9)"}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M7.8 10.1 11.2 6.1"
        stroke={isRead ? READ_GREEN : "rgba(255,255,255,0.9)"}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default ReadTicks;
