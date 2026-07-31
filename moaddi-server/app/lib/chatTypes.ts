/**
 * Type-only companion to the chat lib modules.
 *
 * Those modules use `export =` (the house style, so plain JS `require()` works),
 * which TypeScript will not let us combine with `export type`. Deriving the
 * types from the runtime arrays here keeps them from drifting apart.
 */

type MessageTypesModule = typeof import("./chatMessageTypes");
type ReactionsModule = typeof import("./chatReactions");

export type ChatMessageType = MessageTypesModule["MESSAGE_TYPES"][number];
export type ChatMediaType = MessageTypesModule["MEDIA_TYPES"][number];
export type ChatReaction = ReactionsModule["ALLOWED_REACTIONS"][number];
