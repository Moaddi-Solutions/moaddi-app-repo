"use client";

import { useEffect, useState } from "react";

const FALLBACK_TOKENS = {
  fontFamily: 'Cairo, Tahoma, Arial, "Segoe UI", "Noto Sans Arabic", sans-serif',
  primary: "#1fa3b8",
  primaryForeground: "#ffffff",
  card: "#ffffff",
  foreground: "#10282e",
  mutedForeground: "#5f787e",
  input: "#dde8ea",
  border: "#dde8ea",
  ring: "#1fa3b8",
  destructive: "#d64545",
  accent: "#e2f2f5",
};

function readToken(styles, name, fallback) {
  const value = styles.getPropertyValue(name).trim();
  return value || fallback;
}

function buildStripeAppearance(tokens, isDark) {
  const focusRing = `0 0 0 3px color-mix(in srgb, ${tokens.ring} 28%, transparent)`;

  return {
    theme: isDark ? "night" : "flat",
    labels: "floating",
    variables: {
      fontFamily: tokens.fontFamily,
      fontSizeBase: "14px",
      fontWeightMedium: "700",
      spacingUnit: "4px",
      borderRadius: "12px",
      colorPrimary: tokens.primary,
      colorBackground: tokens.card,
      colorText: tokens.foreground,
      colorTextSecondary: tokens.mutedForeground,
      colorTextPlaceholder: tokens.mutedForeground,
      colorDanger: tokens.destructive,
      colorSuccess: tokens.primary,
      colorIcon: tokens.mutedForeground,
      accessibleColorOnColorPrimary: tokens.primaryForeground,
      accessibleColorOnColorBackground: tokens.foreground,
      buttonColorBackground: tokens.primary,
      buttonColorText: tokens.primaryForeground,
      focusBoxShadow: focusRing,
    },
    rules: {
      ".Input": {
        backgroundColor: tokens.card,
        border: `1px solid ${tokens.input}`,
        boxShadow: "none",
      },
      ".Input:focus": {
        borderColor: tokens.ring,
        boxShadow: focusRing,
      },
      ".Label": {
        color: tokens.mutedForeground,
      },
      ".Tab": {
        backgroundColor: tokens.card,
        border: `1px solid ${tokens.border}`,
        color: tokens.foreground,
        boxShadow: "none",
      },
      ".Tab:hover": {
        color: tokens.foreground,
      },
      ".Tab--selected": {
        backgroundColor: tokens.accent,
        borderColor: tokens.primary,
        color: tokens.foreground,
        boxShadow: "none",
      },
      ".AccordionItem": {
        backgroundColor: tokens.card,
        border: `1px solid ${tokens.border}`,
        boxShadow: "none",
      },
      ".Error": {
        color: tokens.destructive,
      },
    },
  };
}

function readCheckoutTheme() {
  if (typeof window === "undefined") {
    return {
      mode: "light",
      stripeAppearance: buildStripeAppearance(FALLBACK_TOKENS, false),
    };
  }

  const root = document.documentElement;
  const styles = window.getComputedStyle(root);
  const tokens = {
    fontFamily: readToken(styles, "--font-sans", FALLBACK_TOKENS.fontFamily),
    primary: readToken(styles, "--primary", FALLBACK_TOKENS.primary),
    primaryForeground: readToken(
      styles,
      "--primary-foreground",
      FALLBACK_TOKENS.primaryForeground,
    ),
    card: readToken(styles, "--card", FALLBACK_TOKENS.card),
    foreground: readToken(styles, "--foreground", FALLBACK_TOKENS.foreground),
    mutedForeground: readToken(
      styles,
      "--muted-foreground",
      FALLBACK_TOKENS.mutedForeground,
    ),
    input: readToken(styles, "--input", FALLBACK_TOKENS.input),
    border: readToken(styles, "--border", FALLBACK_TOKENS.border),
    ring: readToken(styles, "--ring", FALLBACK_TOKENS.ring),
    destructive: readToken(
      styles,
      "--destructive",
      FALLBACK_TOKENS.destructive,
    ),
    accent: readToken(styles, "--accent", FALLBACK_TOKENS.accent),
  };
  const isDark = root.classList.contains("dark");

  return {
    mode: isDark ? "dark" : "light",
    stripeAppearance: buildStripeAppearance(tokens, isDark),
  };
}

export function useCheckoutTheme() {
  const [theme, setTheme] = useState(() => readCheckoutTheme());

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const root = document.documentElement;
    const syncTheme = () => setTheme(readCheckoutTheme());
    const observer = new MutationObserver(syncTheme);

    syncTheme();
    observer.observe(root, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  return theme;
}
