/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/**
 * Uniwash brand palette (teal) — ใช้ร่วมกันทุกหน้าในแอป
 * ดึงโทนจากม็อกอัปดีไซน์ฝั่งลูกค้า
 */
export const Brand = {
  primary:       '#1C8A99', // teal หลัก (ปุ่ม, ไอคอน, ลิงก์)
  primaryDark:   '#15707D', // teal เข้ม (กดปุ่ม, header เข้ม)
  primaryLight:  '#E3F1F3', // teal อ่อน (พื้นการ์ดที่เลือก)
  dark:          '#16161F', // header ดำเข้ม (หน้า Location/Status)
  bg:            '#F3F5F7', // พื้นหลังหน้าจอ
  card:          '#FFFFFF',
  text:          '#1B1C2A',
  textSecondary: '#8A8F98',
  border:        '#E6E8EB',
  inputBg:       '#EEF1F4',
  danger:        '#E2574C',
  success:       '#1C8A99',
  warning:       '#F5A623',
  gold:          '#F4B400', // เหรียญ coins
  white:         '#FFFFFF',
} as const;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
