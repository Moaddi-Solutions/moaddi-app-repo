import * as NavigationBar from 'expo-navigation-bar';
import { Platform } from 'react-native';
import { NAV_THEME } from '~/lib/constants';

function isEdgeToEdgeEnabled(): boolean {
  try {
    return require('react-native-is-edge-to-edge').isEdgeToEdge();
  } catch {
    return false;
  }
}

export async function setAndroidNavigationBar(theme: 'light' | 'dark') {
  if (Platform.OS !== 'android') return;
  await NavigationBar.setButtonStyleAsync(theme === 'dark' ? 'light' : 'dark');
  // setBackgroundColorAsync is not supported with edge-to-edge (it no-ops and logs a warning)
  if (!isEdgeToEdgeEnabled()) {
    await NavigationBar.setBackgroundColorAsync(
      theme === 'dark' ? NAV_THEME.dark.background : NAV_THEME.light.background
    );
  }
}
