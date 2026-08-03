import {
  DarkTheme,
  DefaultTheme,
  Theme,
  ThemeProvider,
} from "@react-navigation/native";
import { PortalHost } from "@rn-primitives/portal";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import ToastManager from "expo-react-native-toastify";
import { LucideIcon } from "lucide-react-native";
import { cssInterop } from "nativewind";
import * as React from "react";
import { I18nextProvider } from "react-i18next";
import { Appearance, Platform, StatusBar, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import Stacks from "~/components/Stacks";
import { AbilityProvider } from "~/context/AbilityContext";
import { ChatProvider } from "~/context/ChatContext";
import { MachineProvider } from "~/context/MachineContext";
import { SocketContextProvider } from "~/context/Socket";
import { UserProvider, useUser } from "~/context/UserContext";
import "~/global.css";
import { setAndroidNavigationBar } from "~/lib/android-navigation-bar";
import { NAV_THEME } from "~/lib/constants";
import i18n from "~/lib/i18n";
import { useColorScheme } from "~/lib/useColorScheme";
import StaffStacks from "~/components/staff/Stacks";
import MainStacks from "~/components/MainStacks";

cssInterop(LinearGradient, {
  className: "style",
});

// Create QueryClient with default options to prevent initialization errors
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
const LIGHT_THEME: Theme = {
  ...DefaultTheme,
  colors: NAV_THEME.light,
};
const DARK_THEME: Theme = {
  ...DarkTheme,
  colors: NAV_THEME.dark,
};

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from "expo-router";

const usePlatformSpecificSetup = Platform.select({
  web: useSetWebBackgroundClassName,
  android: useSetAndroidNavigationBar,
  default: noop,
});

export default function RootLayout() {
  usePlatformSpecificSetup();
  const { isDarkColorScheme } = useColorScheme();

  return (
    <ThemeProvider value={isDarkColorScheme ? DARK_THEME : LIGHT_THEME}>
      <StatusBar
        barStyle={isDarkColorScheme ? "light-content" : "dark-content"}
        backgroundColor={isDarkColorScheme ? "black" : "white"}
      />
      <I18nextProvider i18n={i18n}>
        <QueryClientProvider client={queryClient}>
          <UserProvider>
            <AbilityProvider>
              <MachineProvider>
                <SocketContextProvider>
                  {/* Above both shells: the chat socket is app-wide, so the
                      unread badge stays correct on every tab and in /staff. */}
                  <ChatProvider>
                    <MainStacks />
                  </ChatProvider>
                </SocketContextProvider>
              </MachineProvider>
            </AbilityProvider>
          </UserProvider>
        </QueryClientProvider>
      </I18nextProvider>
      <PortalHost />
      <ToastManager />
    </ThemeProvider>
  );
}

const useIsomorphicLayoutEffect =
  Platform.OS === "web" && typeof window === "undefined"
    ? React.useEffect
    : React.useLayoutEffect;

function useSetWebBackgroundClassName() {
  useIsomorphicLayoutEffect(() => {
    // Adds the background color to the html element to prevent white background on overscroll.
    document.documentElement.classList.add("bg-background");
  }, []);
}

function useSetAndroidNavigationBar() {
  React.useLayoutEffect(() => {
    setAndroidNavigationBar(Appearance.getColorScheme() ?? "light");
  }, []);
}

function noop() {}
