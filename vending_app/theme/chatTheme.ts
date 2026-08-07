// Chat-specific semantic mapping over the app's design tokens.
// Every colour here resolves to `~/theme/moaddi` so chat matches the rest of
// the app and follows future brand changes automatically.

import { StyleSheet } from 'react-native';
import { colors, palette, radius, space, status, type as typo } from '~/theme/moaddi';

export const chatColors = {
  teal50: palette.teal[50],
  teal100: palette.teal[100],
  teal200: palette.teal[200],
  teal300: palette.teal[300],
  teal400: palette.teal[400],
  teal500: palette.teal[500],
  teal600: palette.teal[600],
  teal700: palette.teal[700],

  gray50: palette.ink[50],
  gray100: palette.ink[100],
  gray200: palette.ink[200],
  gray300: palette.ink[300],
  gray400: palette.ink[400],
  gray500: palette.ink[500],
  gray600: palette.ink[500],
  gray700: palette.ink[700],
  gray800: palette.ink[900],
  gray900: palette.ink[950],

  successGreen: status.success,
  warningYellow: status.warning,
  errorRed: status.danger,
  infoBlue: status.info,
};

export const chatTheme = {
  // Outgoing bubble — always the physical right side (see ChatBubble RTL note).
  ownBubbleBg: colors.interactivePrimary,
  ownBubbleText: colors.textOnBrand,

  // Incoming bubble — always the physical left side.
  otherBubbleBg: colors.surfaceSunken,
  otherBubbleText: colors.textHeading,

  reactionBg: palette.teal[100],
  reactionBorder: palette.teal[300],
  reactionText: palette.teal[700],
  reactionPillBg: palette.teal[50],

  replyBg: colors.surfaceSunken,
  replyBorder: colors.borderBrand,
  replyText: colors.textBody,
  replyNameText: palette.teal[600],

  composerBg: colors.surfaceCard,
  composerBorder: colors.borderDefault,
  composerText: colors.textHeading,
  composerPlaceholder: colors.textMuted,
  sendButtonBg: colors.interactivePrimary,
  sendButtonText: colors.textOnBrand,
  attachmentButtonTint: colors.textBrand,

  imageBorder: palette.teal[200],
  imageBg: colors.surfaceSunken,
  documentIcon: colors.textBrand,
  documentNameText: colors.textHeading,
  documentSizeText: colors.textMuted,
  locationMapBorder: palette.teal[300],
  locationAddressText: colors.textBody,
  audioPlayButton: colors.interactivePrimary,
  audioProgressBg: palette.teal[100],
  audioDurationText: colors.textBody,

  timestampText: colors.textMuted,
  deliveredTick: colors.textBrand,
  readTick: palette.teal[600],
  errorText: status.danger,

  uploadProgressBg: palette.teal[100],
  uploadProgressFill: colors.interactivePrimary,
  uploadProgressText: palette.teal[700],
};

export const chatStyles = StyleSheet.create({
  bubbleLeft: {
    backgroundColor: chatTheme.otherBubbleBg,
    borderRadius: radius.lg,
    paddingHorizontal: space[3],
    paddingVertical: space[2],
    marginHorizontal: space[1],
    maxWidth: '85%',
  },
  bubbleRight: {
    backgroundColor: chatTheme.ownBubbleBg,
    borderRadius: radius.lg,
    paddingHorizontal: space[3],
    paddingVertical: space[2],
    marginHorizontal: space[1],
    maxWidth: '85%',
  },
  bubbleText: {
    ...typo.body,
    // Each message picks its own direction from its content, so an Arabic and
    // an English message read correctly in the same thread (mirrors the web
    // client's dir="auto" on bubble content).
    writingDirection: 'auto',
    textAlign: 'auto',
  },
  bubbleTextLeft: {
    color: chatTheme.otherBubbleText,
  },
  bubbleTextRight: {
    color: chatTheme.ownBubbleText,
  },
  time: {
    ...typo.label,
    fontWeight: '400',
    color: chatTheme.timestampText,
    marginTop: space[1],
    marginHorizontal: space[2],
    // A clock reading must never reorder under RTL.
    writingDirection: 'ltr',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginHorizontal: space[1],
  },
  container: {
    flex: 1,
    backgroundColor: colors.surfacePage,
  },
  composer: {
    borderTopWidth: 1,
    borderTopColor: chatTheme.composerBorder,
    backgroundColor: chatTheme.composerBg,
    paddingHorizontal: space[3],
    paddingVertical: space[2],
    minHeight: 56,
  },
  textInput: {
    ...typo.body,
    color: chatTheme.composerText,
    paddingHorizontal: space[3],
    paddingVertical: space[2],
    borderRadius: radius.xl,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: chatTheme.composerBorder,
    maxHeight: 100,
    writingDirection: 'auto',
    textAlign: 'auto',
  },
  sendButton: {
    backgroundColor: chatTheme.sendButtonBg,
    paddingHorizontal: space[4],
    paddingVertical: space[2],
    borderRadius: radius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 44,
    minHeight: 44,
  },
  attachmentButton: {
    paddingHorizontal: space[2],
    paddingVertical: space[2],
    justifyContent: 'center',
    alignItems: 'center',
  },
  reactionContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: space[1],
    gap: space[1],
  },
  reactionPill: {
    backgroundColor: chatTheme.reactionPillBg,
    borderWidth: 1,
    borderColor: chatTheme.reactionBorder,
    borderRadius: radius.md,
    paddingHorizontal: space[2],
    paddingVertical: space[1],
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1],
  },
  reactionEmoji: {
    fontSize: 16,
  },
  reactionCount: {
    ...typo.label,
    color: chatTheme.reactionText,
  },
  replyStrip: {
    backgroundColor: chatTheme.replyBg,
    // Logical edge, so the accent sits on the reading-start side.
    borderStartWidth: 3,
    borderStartColor: chatTheme.replyBorder,
    paddingHorizontal: space[2],
    paddingVertical: 6,
    marginHorizontal: space[2],
    marginBottom: space[1],
    borderRadius: radius.sm,
  },
  replyNameText: {
    ...typo.caption,
    fontWeight: '600',
    color: chatTheme.replyNameText,
    writingDirection: 'auto',
    textAlign: 'auto',
  },
  replyMessageText: {
    ...typo.caption,
    color: chatTheme.replyText,
    marginTop: 2,
    writingDirection: 'auto',
    textAlign: 'auto',
  },
  documentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: chatTheme.imageBg,
    borderRadius: radius.sm,
    padding: space[3],
    gap: space[3],
  },
  documentIcon: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: chatTheme.reactionPillBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    ...typo.caption,
    fontSize: 14,
    fontWeight: '600',
    color: chatTheme.documentNameText,
    // A filename can be Arabic or Latin script.
    writingDirection: 'auto',
    textAlign: 'auto',
  },
  documentSize: {
    ...typo.label,
    fontWeight: '400',
    color: chatTheme.documentSizeText,
    marginTop: 2,
    writingDirection: 'ltr',
  },
  audioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: chatTheme.imageBg,
    borderRadius: radius.sm,
    paddingHorizontal: space[3],
    paddingVertical: space[2],
    gap: space[3],
  },
  audioPlayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: chatTheme.audioPlayButton,
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioWaveform: {
    flex: 1,
    height: 32,
  },
  audioDuration: {
    ...typo.label,
    color: chatTheme.audioDurationText,
    minWidth: 30,
    // mm:ss must not mirror.
    writingDirection: 'ltr',
  },
  locationContainer: {
    borderRadius: radius.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: chatTheme.locationMapBorder,
  },
  locationMap: {
    width: 200,
    height: 150,
  },
  locationAddress: {
    ...typo.caption,
    fontWeight: '600',
    color: chatTheme.locationAddressText,
    padding: space[2],
  },
});
