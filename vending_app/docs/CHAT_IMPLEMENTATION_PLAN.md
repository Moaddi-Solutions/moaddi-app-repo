# Chat Feature Implementation Plan for vending_app

**Date:** 2026-07-31  
**Status:** Planning  
**Package:** `@kesha-antonov/react-native-chat` v4.1.0  
**Scope:** Full-featured chat UI with media support (image, document, location, voice notes)

---

## Overview

Integrate `@kesha-antonov/react-native-chat` into the Expo/React Native app to provide a production-ready chat UI with built-in reactions, swipe-to-reply, and message customization. This is a maintained fork of `react-native-gifted-chat` with streaming support and latest fixes.

### Known Limitations
- **No RTL support** — will need custom RTL handling for Arabic; not built into the package
- **StyleSheet-based styling** — uses React Native StyleSheet, not NativeWind; teal tokens will need manual mapping
- **Voice notes & documents** — require custom `renderCustomView` implementation (not built-in)

---

## Phase 1: Core Dependencies

### Install packages

```bash
yarn add @kesha-antonov/react-native-chat@^4.1.0
yarn add @shopify/flash-list@^1.7.6  # already installed
yarn add react-native-keyboard-controller
yarn add react-native-gesture-handler
yarn add expo-audio@^17.0.0
yarn add expo-document-picker@^14.0.0
yarn add expo-image-picker@^16.1.4  # already installed
yarn add expo-location@^17.0.0
```

### Existing packages (verify versions)
```json
{
  "react-native-reanimated": "~3.17.4",
  "react-native-gesture-handler": "[version needed]",
  "react-native-screens": "~4.11.1",
  "socket.io-client": "^4.8.1",
  "i18next": "^25.5.2",
  "react-i18next": "^16.6.4"
}
```

---

## Phase 2: Project Structure

```
vending_app/
├── app/
│   └── (root)/
│       ├── context/
│       │   └── ChatContext.tsx          # Socket + REST transport (port from web)
│       └── screens/
│           └── ChatScreen.tsx           # Thread screen with chat UI
├── components/
│   └── chat/
│       ├── ChatBubble.tsx               # Message bubble wrapper
│       ├── AudioBubble.tsx              # Voice note component
│       ├── DocumentBubble.tsx           # Document attachment display
│       ├── LocationBubble.tsx           # Location map preview
│       ├── ImageBubble.tsx              # Image display
│       ├── MessageActions.tsx           # Long-press menu (reactions, reply, delete)
│       ├── ComposerInput.tsx            # Text input + attachment buttons
│       ├── MediaPicker.tsx              # Unified media selection UI
│       └── VoiceRecorder.tsx            # Audio recording component
├── lib/
│   ├── chatMessageTypes.ts              # Message type definitions (port from server)
│   ├── chatTypes.ts                     # TypeScript interfaces
│   └── mockChatData.ts                  # Dummy data for UI development
├── services/
│   └── chatMediaService.ts              # Upload/download handlers
└── theme/
    └── chatTheme.ts                     # Design system color mappings
```

---

## Phase 3: Design System Integration

### 3.1 Theme Colors (from moaddi-redesign-direction)

**File:** `theme/chatTheme.ts`

Map the Moaddi teal + gold palette to chat UI components:

```typescript
// Primary palette (teal ramp for chat UI)
export const chatColors = {
  // Teal scale (chat messages, bubbles, accents)
  teal50: '#f0fdfa',
  teal100: '#ccfbf1',
  teal200: '#99f6e4',
  teal300: '#5eead4',
  teal400: '#2dd4bf',
  teal500: '#14b8a6',     // Primary action, own messages
  teal600: '#0d9488',     // Hover, active states
  teal700: '#0f766e',     // Dark mode primary
  
  // Gold (reserved for offers/discounts per design system — NOT for chat)
  // gold500: '#eab308',  // NOT USED IN CHAT
  
  // Neutral (text, borders, backgrounds)
  gray50: '#f9fafb',
  gray100: '#f3f4f6',
  gray200: '#e5e7eb',
  gray300: '#d1d5db',
  gray400: '#9ca3af',
  gray500: '#6b7280',
  gray600: '#4b5563',
  gray700: '#374151',
  gray800: '#1f2937',
  gray900: '#111827',
  
  // Semantic (for reactions, status)
  successGreen: '#10b981',
  warningYellow: '#f59e0b',
  errorRed: '#ef4444',
  infoBlue: '#3b82f6',
};

// Component-specific mappings
export const chatTheme = {
  // Own message bubble
  ownBubbleBg: chatColors.teal500,
  ownBubbleText: '#ffffff',
  
  // Other's message bubble
  otherBubbleBg: chatColors.gray200,
  otherBubbleText: chatColors.gray900,
  
  // Reactions
  reactionBg: chatColors.teal100,
  reactionBorder: chatColors.teal300,
  reactionText: chatColors.teal700,
  
  // Reply strip
  replyBg: chatColors.gray100,
  replyBorder: chatColors.teal400,
  replyText: chatColors.gray700,
  
  // Input area
  composerBg: chatColors.gray50,
  composerBorder: chatColors.gray300,
  composerText: chatColors.gray900,
  composerPlaceholder: chatColors.gray400,
  sendButtonBg: chatColors.teal500,
  sendButtonText: '#ffffff',
  
  // Media bubbles
  imageBorder: chatColors.teal200,
  documentIcon: chatColors.teal500,
  locationMapBorder: chatColors.teal300,
  audioPlayButton: chatColors.teal500,
  
  // Status & timestamps
  timestampText: chatColors.gray500,
  deliveredTick: chatColors.teal500,
  readTick: chatColors.teal600,
  
  // Dark mode (optional)
  dark: {
    ownBubbleBg: chatColors.teal600,
    otherBubbleBg: chatColors.gray700,
    otherBubbleText: chatColors.gray100,
    composerBg: chatColors.gray800,
    composerText: chatColors.gray100,
  },
};

export const chatStyles = {
  bubbleLeft: {
    backgroundColor: chatTheme.otherBubbleBg,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 4,
  },
  bubbleRight: {
    backgroundColor: chatTheme.ownBubbleBg,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 4,
  },
  time: {
    color: chatTheme.timestampText,
    fontSize: 12,
    marginTop: 4,
  },
  composer: {
    borderTopWidth: 1,
    borderTopColor: chatTheme.composerBorder,
    backgroundColor: chatTheme.composerBg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 56,
  },
  textInput: {
    color: chatTheme.composerText,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: chatTheme.composerBorder,
  },
};
```

### 3.2 Apply Theme to Chat Components

**Usage in components:**

```typescript
import { chatTheme, chatStyles } from '@/theme/chatTheme';
import { useColorScheme } from 'react-native';

export function ChatBubble(props) {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? chatTheme.dark : chatTheme;
  
  const bubbleStyle = props.currentMessage.user._id === userId
    ? { ...chatStyles.bubbleRight, backgroundColor: theme.ownBubbleBg }
    : { ...chatStyles.bubbleLeft, backgroundColor: theme.otherBubbleBg };
    
  return <View style={bubbleStyle}>{/* content */}</View>;
}
```

---

## Phase 4: Mock Data Setup

### 4.1 Dummy Chat Data Generator

**File:** `lib/mockChatData.ts`

```typescript
import { ChatMessage } from './chatMessageTypes';

export const mockUsers = [
  {
    _id: 'user-1',
    name: 'You',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user1',
  },
  {
    _id: 'user-2',
    name: 'Support Agent',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user2',
  },
  {
    _id: 'user-3',
    name: 'Manager',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user3',
  },
];

export const mockMessages: ChatMessage[] = [
  {
    _id: '1',
    text: 'Hi! How can I help you today?',
    createdAt: new Date(Date.now() - 3600000),
    user: mockUsers[1],
    status: 'sent',
  },
  {
    _id: '2',
    text: 'I'd like to check the status of my vending machine delivery',
    createdAt: new Date(Date.now() - 3480000),
    user: mockUsers[0],
    status: 'sent',
  },
  {
    _id: '3',
    text: 'Sure! Can you share your order number?',
    createdAt: new Date(Date.now() - 3300000),
    user: mockUsers[1],
    status: 'sent',
  },
  {
    _id: '4',
    text: 'Order #VM-2026-001234',
    createdAt: new Date(Date.now() - 3100000),
    user: mockUsers[0],
    status: 'sent',
    reaction: [{ emoji: '👍', userIds: ['user-2'] }],
  },
  {
    _id: '5',
    image: 'https://picsum.photos/300/400?random=1',
    createdAt: new Date(Date.now() - 2900000),
    user: mockUsers[1],
    status: 'sent',
  },
  {
    _id: '6',
    text: 'Your machine will arrive tomorrow between 2-4 PM',
    createdAt: new Date(Date.now() - 2700000),
    user: mockUsers[1],
    status: 'sent',
    reaction: [
      { emoji: '😊', userIds: ['user-1'] },
      { emoji: '👍', userIds: ['user-1', 'user-2'] },
    ],
  },
  {
    _id: '7',
    text: 'Perfect! What time should I be home?',
    createdAt: new Date(Date.now() - 2500000),
    user: mockUsers[0],
    status: 'sent',
    replyTo: {
      _id: '6',
      text: 'Your machine will arrive tomorrow between 2-4 PM',
      user: mockUsers[1],
      createdAt: new Date(Date.now() - 2700000),
    } as ChatMessage,
  },
  {
    _id: '8',
    location: {
      latitude: 25.2048,
      longitude: 55.2708,
      address: 'Dubai Marina, Dubai, UAE',
    },
    createdAt: new Date(Date.now() - 2300000),
    user: mockUsers[0],
    status: 'sent',
  },
  {
    _id: '9',
    text: 'Got it! We'll deliver to that location',
    createdAt: new Date(Date.now() - 2100000),
    user: mockUsers[1],
    status: 'sent',
  },
  {
    _id: '10',
    audio: {
      uri: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
      duration: 45,
      waveform: [0.1, 0.3, 0.5, 0.7, 0.8, 0.7, 0.5, 0.3, 0.2],
    },
    createdAt: new Date(Date.now() - 1900000),
    user: mockUsers[0],
    status: 'sent',
  },
  {
    _id: '11',
    document: {
      uri: 'https://example.com/docs/invoice.pdf',
      name: 'Invoice_VM-2026-001234.pdf',
      mimeType: 'application/pdf',
      size: 245000,
    },
    createdAt: new Date(Date.now() - 1700000),
    user: mockUsers[1],
    status: 'sent',
  },
  {
    _id: '12',
    text: 'Thank you! Excited to receive the machine 🎉',
    createdAt: new Date(Date.now() - 1500000),
    user: mockUsers[0],
    status: 'sent',
  },
];

export const mockConversations = [
  {
    _id: 'conv-1',
    participantName: 'Support Agent',
    participantAvatar: mockUsers[1].avatar,
    lastMessage: mockMessages[mockMessages.length - 1].text,
    lastMessageTime: new Date(Date.now() - 1500000),
    unreadCount: 0,
    messages: mockMessages,
  },
];

export const mockConversationsList = [
  mockConversations[0],
  {
    _id: 'conv-2',
    participantName: 'Manager',
    participantAvatar: mockUsers[2].avatar,
    lastMessage: 'Please review the attached document',
    lastMessageTime: new Date(Date.now() - 86400000),
    unreadCount: 2,
    messages: [],
  },
  {
    _id: 'conv-3',
    participantName: 'Technical Support',
    participantAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=tech',
    lastMessage: 'Machine is operational',
    lastMessageTime: new Date(Date.now() - 172800000),
    unreadCount: 0,
    messages: [],
  },
];
```

### 4.2 Use Mock Data in ChatScreen (Development)

**File:** `app/(root)/screens/ChatScreen.tsx` (dev mode)

```typescript
import { useEffect, useState } from 'react';
import { GiftedChat } from '@kesha-antonov/react-native-chat';
import { useChatContext } from '../context/ChatContext';
import { mockMessages, mockUsers } from '@/lib/mockChatData';
import { chatTheme, chatStyles } from '@/theme/chatTheme';

const isDev = __DEV__; // Expo dev flag

export default function ChatScreen({ conversationId }) {
  const [messages, setMessages] = useState([]);
  
  useEffect(() => {
    if (isDev) {
      // Load mock data for UI development
      setMessages(mockMessages.reverse()); // GiftedChat expects reversed order
    } else {
      // Load from context in production
      const { messages: contextMessages } = useChatContext();
      setMessages(contextMessages);
    }
  }, []);

  return (
    <GiftedChat
      messages={messages}
      onSend={handleSend}
      user={{ _id: isDev ? 'user-1' : userId }}
      // Theme via chatTheme
      showUserAvatar={true}
      showAvatarForEveryMessage={false}
      renderBubble={(props) => (
        <Bubble
          {...props}
          wrapperStyle={{
            left: { backgroundColor: chatTheme.otherBubbleBg },
            right: { backgroundColor: chatTheme.ownBubbleBg },
          }}
          textStyle={{
            left: { color: chatTheme.otherBubbleText },
            right: { color: '#fff' },
          }}
        />
      )}
      textInputStyle={chatStyles.textInput}
      // Use FlashList for performance
      isFlashListEnabled={true}
      inverted={true}
    />
  );
}

function handleSend(messages) {
  if (__DEV__) {
    setMessages((prevMessages) =>
      GiftedChat.append(prevMessages, messages)
    );
  } else {
    // Send via socket in production
    const { sendMessage } = useChatContext();
    messages.forEach((msg) => sendMessage(msg.text));
  }
}
```

---

## Phase 5: Configuration & Setup

### 5.1 Chat Context (Port from web)

**File:** `app/(root)/context/ChatContext.tsx`

Port the transport layer from `moaddi-next/app/(root)/context/chat-context.tsx`:
- Socket.io connection setup (`chat:message.new`, `chat:conversation.updated`, etc.)
- Message state management
- Optimistic sends & deduplication
- Unread count tracking
- Reactions & replies state

**Key changes for RN:**
- Replace web's `services/events` fetch wrapper with RN-compatible HTTP client
- Emit socket events unchanged (contract stays the same)
- Use `AsyncStorage` for caching (already in package.json)

### 5.2 Message Type System

**File:** `lib/chatMessageTypes.ts`

Extend message objects with media metadata:

```typescript
export type ChatMessage = {
  _id: string;
  text: string;
  createdAt: Date;
  user: {
    _id: string;
    name: string;
    avatar?: string;
  };
  // Media types
  image?: string; // URL
  document?: {
    uri: string;
    name: string;
    mimeType: string;
    size: number;
  };
  audio?: {
    uri: string;
    duration: number; // seconds
    waveform?: number[]; // peak data for visualization
  };
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  // Meta
  reaction?: { emoji: string; userIds: string[] }[];
  replyTo?: ChatMessage;
  status?: 'sending' | 'sent' | 'failed';
};
```

---

## Phase 6: Component Implementation

### 6.1 Main Chat Screen

**File:** `app/(root)/screens/ChatScreen.tsx`

```typescript
import { GiftedChat } from '@kesha-antonov/react-native-chat';
import { useChatContext } from '../context/ChatContext';
import { chatTheme } from '@/theme/chatTheme';

export default function ChatScreen({ conversationId }) {
  const {
    messages,
    sendMessage,
    markAsRead,
    onReactionAdd,
    onReplySelect,
  } = useChatContext();

  return (
    <GiftedChat
      messages={messages}
      onSend={handleSend}
      user={{ _id: userId }}
      renderMessage={props => <ChatBubble {...props} />}
      renderBubble={props => <BubbleWrapper {...props} />}
      renderInputToolbar={props => <ComposerInput {...props} />}
      renderCustomView={renderMediaBubbles}
      onLongPress={handleMessageLongPress}
      isFlashListEnabled={true}
      // RTL handling (custom implementation needed)
      inverted={true}
      // Theme colors
      primaryColor={chatTheme.teal500}
      // ... more config
    />
  );
}
```

### 6.2 Media Bubbles

**Voice Note:** `components/chat/AudioBubble.tsx`
- Display waveform visualization (Reanimated)
- Play/pause button with duration
- Progress bar
- Theme: use `chatTheme.audioPlayButton` for controls

**Document:** `components/chat/DocumentBubble.tsx`
- Thumbnail (file icon)
- Filename + size + upload progress
- Download button
- Theme: use `chatTheme.documentIcon`

**Location:** `components/chat/LocationBubble.tsx`
- Static map preview (Mapbox/Google Maps static API)
- Address text
- Tap to open full map
- Theme: use `chatTheme.locationMapBorder`

**Image:** `components/chat/ImageBubble.tsx`
- Thumbnail in thread
- Tap to view full-screen gallery
- Long-press to save/share
- Theme: use `chatTheme.imageBorder`

### 6.3 Composer with Media Picker

**File:** `components/chat/ComposerInput.tsx`

- Text input (keyboard-pinned via `react-native-keyboard-controller`)
- 4 attachment buttons:
  1. Image (camera/gallery via `expo-image-picker`)
  2. Document (via `expo-document-picker`)
  3. Location (current via `expo-location`)
  4. Voice note (modal trigger to `VoiceRecorder`)
- Send button
- Theme: apply `chatTheme` to all buttons/inputs

### 6.4 Voice Recorder Modal

**File:** `components/chat/VoiceRecorder.tsx`

- Record/stop button
- Live waveform animation (Reanimated)
- Duration counter
- Cancel/send buttons
- URI stored, sent with audio metadata
- Theme: use `chatTheme.audioPlayButton`

---

## Phase 7: Integration with Backend

### 7.1 Socket Events (unchanged from web)

```typescript
// Listen
socket.on('chat:message.new', handleNewMessage);
socket.on('chat:message.reaction', handleReaction);
socket.on('chat:conversation.updated', handleConversationUpdate);

// Emit
socket.emit('chat:message.send', { conversationId, text, media });
socket.emit('chat:message.reaction.add', { messageId, emoji });
socket.emit('chat:message.reply', { messageId, replyToId });
```

### 7.2 Media Upload

**File:** `services/chatMediaService.ts`

- **Images:** FormData POST to `/api/chat-media/[conversationId]/[messageId]`
  - Auto-compress before upload (resize, quality 70-80)
- **Documents:** Same endpoint, multipart form
- **Audio:** Record to temp file, upload with duration/waveform metadata
- **Location:** No upload; JSON in message payload

---

## Phase 8: RTL Handling

Since `@kesha-antonov/react-native-chat` has no RTL support, implement custom wrapper:

```typescript
import { I18nManager, View } from 'react-native';
import { useTranslation } from 'react-i18next';

export default function ChatScreen() {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  
  // Custom layout flipping for Arabic
  return (
    <View style={[
      styles.container,
      isRTL && { direction: 'rtl', flexDirection: 'row-reverse' },
    ]}>
      {/* Bubble layout: swap left/right bubbles manually */}
      {messages.map((msg) => (
        <ChatBubble
          key={msg._id}
          message={msg}
          isOwn={msg.user._id === currentUserId}
          isRTL={isRTL}
        />
      ))}
    </View>
  );
}
```

---

## Phase 9: Testing Checklist

### Functional
- [ ] Connect to socket backend
- [ ] Send/receive text messages
- [ ] Display message bubbles with avatars
- [ ] Reactions (long-press, emoji picker, toggle)
- [ ] Swipe-to-reply gesture
- [ ] Reply strip displays above bubble
- [ ] Unread badges in conversation list

### Media
- [ ] Image picker → compress → upload → display
- [ ] Document picker → upload → display with filename + size
- [ ] Location share → static map preview
- [ ] Voice record → waveform → send → playback

### Theme & UI
- [ ] Teal theme applied to all bubbles/buttons/inputs
- [ ] Dark mode support (gray theme)
- [ ] Mock data shows all message types correctly
- [ ] Reactions display with correct teal background
- [ ] Reply strips have correct border color
- [ ] Timestamps, read ticks in correct gray tone

### Edge Cases
- [ ] Long messages (text wrapping)
- [ ] Rapid sends (optimistic UI + deduplication)
- [ ] Connection lost → reconnect & sync
- [ ] Swipe-to-reply while scrolling
- [ ] Keyboard focus on composer input
- [ ] RTL layout (Arabic messages right-aligned)
- [ ] Dark mode support

### Performance
- [ ] Message list smooth scroll (FlashList)
- [ ] No janky reactions/replies on old messages
- [ ] Audio playback doesn't stutter
- [ ] Image loads without blocking UI
- [ ] 1000+ message thread remains performant

---

## Phase 10: Deliverables

**Files to create/modify:**
1. `app/(root)/context/ChatContext.tsx` (ported from web)
2. `app/(root)/screens/ChatScreen.tsx` (main thread view with mock data option)
3. `components/chat/` (7 components: bubble, audio, document, location, image, actions, composer, recorder)
4. `lib/chatMessageTypes.ts` & `lib/chatTypes.ts` (types)
5. `lib/mockChatData.ts` (dummy data for dev)
6. `services/chatMediaService.ts` (upload/download)
7. `theme/chatTheme.ts` (design system color mappings + theme object)

**Total estimated LOC:** ~3,000–3,500 (including media handling, mock data, theme integration, RTL wrapper)

---

## Known Risks & Mitigations

| Risk | Mitigation |
|---|---|
| RTL breaks message layout | Custom wrapper + manual style flipping for Arabic |
| StyleSheet theming conflicts with design system | Use centralized `chatTheme.ts` object for all colors |
| Voice recording on Android permissions | Use `expo-permissions`, handle gracefully |
| Image upload size/compression | Client-side resize before FormData |
| Audio playback compatibility | Test on both iOS/Android simulators |
| Message list performance at 1000+ messages | FlashList v2 + pagination (load older messages on scroll-top) |
| Mock data stale during dev | Toggle via `__DEV__` flag; switch to socket when ready |

---

## Dependencies Summary

```json
{
  "new": {
    "@kesha-antonov/react-native-chat": "^4.1.0",
    "react-native-keyboard-controller": "^1.15.0",
    "expo-audio": "^17.0.0",
    "expo-document-picker": "^14.0.0",
    "expo-location": "^17.0.0"
  },
  "existing": {
    "react-native-reanimated": "~3.17.4",
    "react-native-gesture-handler": "[verify]",
    "@shopify/flash-list": "^1.7.6",
    "socket.io-client": "^4.8.1",
    "i18next": "^25.5.2",
    "react-i18next": "^16.6.4"
  }
}
```

---

## Next Steps

1. **Approval:** Confirm dependency list, theme mappings, mock data structure
2. **Setup:** `yarn add` all packages, run `yarn postinstall`
3. **Theme:** Create `theme/chatTheme.ts` with teal palette + component mappings
4. **Mock Data:** Build `lib/mockChatData.ts` with all message types
5. **Port Context:** Copy chat-context.tsx from web, adapt service calls
6. **Build Components:** Implement bubbles + composer in parallel
7. **Dev Testing:** Use mock data with `__DEV__` flag to verify UI
8. **Integration:** Wire socket events, swap to live data
9. **Polish:** RTL testing, dark mode, error handling
10. **QA:** Full test matrix (media types, edge cases, performance)
