import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react-native';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock AsyncStorage
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
}));

// Mock expo-secure-store
vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
  deleteItemAsync: vi.fn(),
}));

// Mock react-native
vi.mock('react-native', async () => {
  const actual = await vi.importActual('react-native');
  return {
    ...actual,
    Platform: {
      OS: 'ios',
      select: (obj: any) => obj.ios,
    },
  };
});

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));
