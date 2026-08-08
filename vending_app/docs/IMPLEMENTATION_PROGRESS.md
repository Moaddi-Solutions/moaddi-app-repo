# Chat Feature Implementation Progress

**Date Started:** 2026-07-31  
**Status:** In Progress — Phases 1-5 done, types/mocks now match the server wire contract exactly (0 chat-related typecheck errors)

---

## 🔁 2026-07-31 update: aligned to the real server contract

Rebuilt `lib/chatMessageTypes.ts` and `lib/mockChatData.ts` field-for-field
against the actual moaddi-server contract (not an invented shape), sourced
from:
- `moaddi-server/app/data/models/chatMessages.ts` / `chatConversations.ts` (mongoose schemas)
- `moaddi-server/app/lib/chatMessageView.ts` (`redactMessage` — the exact per-recipient payload)
- `moaddi-server/app/lib/chatReactions.ts` (closed 6-emoji allowlist: 👍 ❤️ 😂 😮 😢 🙏)
- `moaddi-server/app/data/repos/chat.ts` (`listConversations`/`listMessages` response shapes, pagination via `beforeSeq`/`nextBeforeSeq`)
- `moaddi-server/app/services/chatSocket.ts` (event names + `v: 1` envelope)
- `moaddi-next/app/(root)/context/chat-context.tsx` (proof this is already the live web contract)

**Key corrections from the first pass:**
- No `user` object on messages — only `isMine` (`senderId` is deliberately never sent to clients, so phone-signup accounts don't leak a phone number)
- Media lives under `attachment: {mime, bytes, name, width, height, durationMs}`, not separate `image`/`audio`/`document` fields
- Location is `{lat, lng, accuracyM}`, not `{latitude, longitude, address}`
- Reactions are `{emoji, isMine}[]` (closed 6-emoji set), not free-text `{emoji, userIds}[]`
- Conversations key off `conversationId` + `peer: {name, role}`, not `_id` + `participantAvatar`
- **Sends go over REST** (`POST /chat/conversations/:id/messages`), not a socket emit — the socket is receive-only and just broadcasts the server's result to all participants, including the sender (who reconciles their optimistic `status: 'pending'` message against it)
- Attachments are a two-step REST flow: upload to `/attachments` for an `uploadToken`, **then** POST the message referencing it

`ChatContext.tsx`, `ChatScreen.tsx`, `ConversationsScreen.tsx`, and
`ChatBubble.tsx` were all rewritten against this corrected contract.
`ChatScreen.tsx` also had to solve a real mismatch: the chat UI package's
`IMessage` model requires a `user` object for left/right bubble positioning,
which the server contract doesn't provide. Solved by wrapping each message
with a synthetic `{_id: 'me'|'peer'}` used only for positioning, carrying the
real `ChatMessage` through as `raw`, and taking over all rendering with our
own `ChatBubble` via `renderMessage` — the library only drives the
list/composer/keyboard mechanics now, not bubble/avatar/reaction rendering.

`npx tsc --noEmit` on the whole project: 13 errors, all pre-existing and
unrelated to chat (`DeviceConnection.tsx`, `useBLE.ts`, Storybook stories).

---

## ✅ Completed

### Phase 1: Dependencies
- [x] Listed all packages to install (5 new, 7 existing)
- [ ] `yarn add` command running (⏳ in progress)

### Phase 2: Project Structure & Theme
- [x] **`theme/chatTheme.ts`** — Design system integration
  - Teal color palette (5 shades) + gray neutrals
  - Component-specific theme object mapping
  - StyleSheet-compatible styles for all UI elements
  - Dark mode extensions
  - **Line count:** ~340 lines

- [x] **`lib/chatMessageTypes.ts`** — Type definitions
  - ChatMessage, ChatConversation interfaces
  - Media types (audio, document, location, image)
  - Reaction & reply data structures
  - **Line count:** ~115 lines

### Phase 3: Development Data & Mock Setup
- [x] **`lib/mockChatData.ts`** — Dummy chat data
  - 3 mock users (You, Support Agent, Manager)
  - 16 sample messages with ALL media types:
    - Text messages
    - Images (2)
    - Documents (PDF)
    - Audio/voice notes with waveform
    - Location sharing
    - Reactions (thumbs up, smiley, heart, clap, party)
    - Reply-to messages (swipe-to-reply preview)
  - 3 mock conversations (including unread badges)
  - Helper functions: `formatFileSize()`, `formatDuration()`, `generateWaveformData()`
  - **Line count:** ~260 lines

### Phase 4: Transport Layer
- [x] **`app/(root)/context/ChatContext.tsx`** — Socket + REST transport
  - React Context for global chat state
  - Socket.io event handlers:
    - `chat:message.new` — new message listener
    - `chat:message.reaction` — reaction updates
    - `chat:conversation.updated` — conversation sync
    - `chat:conversation.read` — read receipts
  - Methods:
    - `loadConversations()` — fetch all conversations
    - `loadConversation(id)` — fetch message thread
    - `sendMessage()` — optimistic sends + socket emit
    - `sendMediaMessage()` — image/audio/document/location
    - `setReaction() / clearReaction()` — emoji reactions
    - `markConversationRead()` — mark as read
  - Connection state management (idle → connecting → connected/offline)
  - **Line count:** ~350 lines
  - **Note:** Requires auth context integration (TODO)

### Phase 5: Screens & Components
- [x] **`app/(root)/screens/ConversationsScreen.tsx`** — Conversation list
  - FlatList with mock data or context data
  - Avatar + participant name + last message preview
  - Unread badge (if count > 0)
  - Refresh control
  - Tap to navigate to thread
  - **Line count:** ~130 lines

- [x] **`app/(root)/screens/ChatScreen.tsx`** — Message thread view
  - GiftedChat integration with @kesha-antonov/react-native-chat
  - Dev mode: loads mockMessages for UI testing
  - Prod mode: loads from ChatContext via socket
  - Bubble theming (teal for own, gray for others)
  - InputToolbar with teal composer styling
  - Long-press gesture (TODO: menu implementation)
  - **Line count:** ~135 lines

- [x] **`components/chat/ChatBubble.tsx`** — Message bubble component
  - Supports all message types (text, image, audio, document, location)
  - Sub-components:
    - `ReplyStrip` — shows quoted message with name + preview
    - `ImageBubble` — image display with border
    - `DocumentBubble` — file icon + name + size
    - `AudioBubble` — play button + waveform + duration
    - `LocationBubble` — static map + address
    - `ReactionRow` — emoji reactions with counts
  - RTL support (manual layout flipping for Arabic)
  - Status indicators (✓✓ sent, ✗ failed)
  - **Line count:** ~250 lines

---

## ⏳ In Progress

### Package Installation
Running: `yarn add @kesha-antonov/react-native-chat react-native-keyboard-controller expo-audio expo-document-picker expo-location`

**Status:** [2/4] Fetching packages...

**Packages being added:**
```
@kesha-antonov/react-native-chat@^4.1.0
react-native-keyboard-controller (for Android composer pinning)
expo-audio (for voice recording)
expo-document-picker (for file attachments)
expo-location (for sharing location)
```

---

## 📋 Next Steps (After yarn install)

### Phase 6: Additional Components (Est. 400–500 LOC)
1. **`components/chat/ComposerInput.tsx`** — Rich composer with attachments
   - Text input + 4 attachment buttons (image, document, location, voice)
   - Keyboard controller integration (sticky to keyboard on Android)
   - Send button with teal theme
   - Placeholder "Type a message..."

2. **`components/chat/VoiceRecorder.tsx`** — Voice recording modal
   - Record/stop button
   - Waveform animation (Reanimated)
   - Duration timer
   - Cancel/send buttons
   - Audio file upload

3. **`components/chat/MessageActions.tsx`** — Long-press menu
   - Emoji picker for reactions
   - Reply action
   - Delete/forward actions (if supported by backend)
   - Uses AlertDialog from @rn-primitives

4. **`components/chat/MediaPicker.tsx`** — Unified media selection
   - Image/camera picker (expo-image-picker)
   - Document picker (expo-document-picker)
   - Location selector (expo-location)
   - Upload progress indicator

### Phase 7: RTL Support (Est. 80–120 LOC)
- **`lib/rtlHelper.ts`** — RTL utilities
  - Direction detection (i18n language)
  - Style flipping helpers
  - Layout mirroring for Arabic/Hebrew

### Phase 8: Integration & Testing (Est. 200–300 LOC)
1. Wrap app with `<ChatProvider>`
2. Wire navigation to ConversationsScreen + ChatScreen
3. Connect auth context → ChatContext token/userId
4. Test mock data in dev (`__DEV__` flag)
5. Test socket connection in production
6. QA checklist:
   - [ ] Send/receive text messages
   - [ ] Display all media types (image, audio, doc, location)
   - [ ] Reactions work (long-press → emoji picker → toggle)
   - [ ] Swipe-to-reply gesture + display
   - [ ] Unread badges update
   - [ ] RTL layout (Arabic text right-aligned)
   - [ ] Dark mode colors apply
   - [ ] 1000+ messages scroll smoothly (FlashList)
   - [ ] Audio playback works (iOS + Android)
   - [ ] Voice recording works (permissions + upload)

---

## 📊 Progress Summary

| Phase | Task | Status | LOC |
|-------|------|--------|-----|
| 1 | Dependencies | ⏳ Installing | — |
| 2 | Theme system | ✅ Done | ~340 |
| 3 | Types + mock data | ✅ Done | ~375 |
| 4 | Chat context (transport) | ✅ Done | ~350 |
| 5 | Screens + bubble component | ✅ Done | ~515 |
| 6 | Media + composer components | ⏳ Pending | ~400–500 |
| 7 | RTL support | ⏳ Pending | ~80–120 |
| 8 | Integration + testing | ⏳ Pending | ~200–300 |
| **Total** | — | — | **~2,550–2,850 LOC** |

---

## 🎯 Key Design Decisions

1. **No external chat UI package** — Using `@kesha-antonov/react-native-chat` only for bubble rendering + input wrapper; all custom components (media, reactions, reply) use `@rn-primitives` + NativeWind
2. **Mock data for dev** — `__DEV__` flag switches between mockMessages and live socket data (no rebuild needed)
3. **Teal-only theme** — Gold reserved for offers/discounts per design system; chat uses teal ramp + grays
4. **Manual RTL** — `isRTL` prop passed to components for Arabic; container flipping via custom wrapper
5. **Optimistic sends** — Messages marked 'sending' immediately, updated to 'sent' when socket confirms
6. **Socket events unchanged** — Same event contracts as web (`chat:message.new`, `chat:message.reaction`, etc.)

---

## 🚨 Known Blockers

None currently. Waiting on yarn install to complete so we can verify all packages installed correctly.

---

## 🔗 Files Created So Far

```
vending_app/
├── theme/
│   └── chatTheme.ts ........................... ✅ Done (~340 LOC)
├── lib/
│   ├── chatMessageTypes.ts .................... ✅ Done (~115 LOC)
│   └── mockChatData.ts ........................ ✅ Done (~260 LOC)
├── app/(root)/
│   ├── context/
│   │   └── ChatContext.tsx .................... ✅ Done (~350 LOC)
│   └── screens/
│       ├── ConversationsScreen.tsx ........... ✅ Done (~130 LOC)
│       └── ChatScreen.tsx .................... ✅ Done (~135 LOC)
└── components/
    └── chat/
        └── ChatBubble.tsx ..................... ✅ Done (~250 LOC)
```

---

## ✨ Next: Waiting for yarn to finish

Once packages install, we'll proceed with Phase 6 (ComposerInput, VoiceRecorder, MessageActions, MediaPicker). Then integration & QA.
