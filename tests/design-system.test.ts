import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Design System Consistency Tests
 * Validates that all screens follow the same design patterns:
 * - Padding and insets (16px horizontal, proper top/bottom)
 * - Typography (text-4xl or text-5xl headers, text-base body, text-sm labels)
 * - Spacing (mb-3, mb-4, gap-2, gap-3)
 * - Animations (ScreenTransition component)
 * - Colors (theme tokens)
 */

const SCREEN_FILES = [
  'app/index.tsx',
  'app/home.tsx',
  'app/new-session.tsx',
  'app/active-session.tsx',
  'app/settings.tsx',
  'app/alert-sent.tsx',
  'app/history.tsx',
];

const PROJECT_ROOT = path.resolve(__dirname, '..');

function readScreenFile(filename: string): string {
  const filePath = path.join(PROJECT_ROOT, filename);
  return fs.readFileSync(filePath, 'utf-8');
}

describe('Design System Consistency', () => {
  describe('Padding and Insets', () => {
    it('should have consistent horizontal padding (16px)', () => {
      SCREEN_FILES.forEach((file) => {
        const content = readScreenFile(file);
        // Check for paddingHorizontal: 16
        expect(
          content.includes('paddingHorizontal: 16') || content.includes('paddingHorizontal: 16,'),
          `${file} should have paddingHorizontal: 16`,
        ).toBe(true);
      });
    });

    it('should use SafeAreaInsets for top and bottom padding', () => {
      SCREEN_FILES.forEach((file) => {
        const content = readScreenFile(file);
        // Check for insets usage
        expect(
          content.includes('useSafeAreaInsets') || content.includes('ScreenContainer'),
          `${file} should use SafeAreaInsets or ScreenContainer`,
        ).toBe(true);
      });
    });
  });

  describe('Typography', () => {
    it('should use large font sizes for main headers (text-4xl or text-5xl)', () => {
      SCREEN_FILES.forEach((file) => {
        const content = readScreenFile(file);
        // Check for text-4xl or text-5xl in headers
        expect(
          (content.includes('text-4xl') || content.includes('text-5xl')) &&
            content.includes('font-bold'),
          `${file} should have text-4xl/text-5xl and font-bold for headers`,
        ).toBe(true);
      });
    });

    it('should use text-base for body text', () => {
      SCREEN_FILES.forEach((file) => {
        const content = readScreenFile(file);
        // Check for text-base usage
        expect(content.includes('text-base'), `${file} should use text-base for body text`).toBe(
          true,
        );
      });
    });

    it('should use text-sm for labels and secondary text', () => {
      SCREEN_FILES.forEach((file) => {
        const content = readScreenFile(file);
        // Check for text-sm usage
        expect(content.includes('text-sm'), `${file} should use text-sm for labels`).toBe(true);
      });
    });
  });

  describe('Spacing', () => {
    it('should use consistent margin-bottom (mb-3 or mb-4)', () => {
      SCREEN_FILES.forEach((file) => {
        const content = readScreenFile(file);
        // Check for mb-3 or mb-4 usage
        expect(
          content.includes('mb-3') || content.includes('mb-4'),
          `${file} should use mb-3 or mb-4 for spacing`,
        ).toBe(true);
      });
    });

    it('should use consistent gap (gap-2 or gap-3)', () => {
      SCREEN_FILES.forEach((file) => {
        const content = readScreenFile(file);
        // Check for gap usage
        expect(
          content.includes('gap-2') || content.includes('gap-3'),
          `${file} should use gap-2 or gap-3 for spacing`,
        ).toBe(true);
      });
    });
  });

  describe('Animations', () => {
    it('should use ScreenTransition for animated content', () => {
      SCREEN_FILES.forEach((file) => {
        const content = readScreenFile(file);
        // Check for ScreenTransition import and usage
        expect(
          content.includes('ScreenTransition'),
          `${file} should use ScreenTransition component`,
        ).toBe(true);
      });
    });

    it('should have proper animation delays (stagger)', () => {
      SCREEN_FILES.forEach((file) => {
        const content = readScreenFile(file);
        // Check for delay prop in ScreenTransition
        expect(content.includes('delay='), `${file} should have staggered animation delays`).toBe(
          true,
        );
      });
    });
  });

  describe('Colors and Theme', () => {
    it('should use theme color tokens (foreground, muted, etc)', () => {
      SCREEN_FILES.forEach((file) => {
        const content = readScreenFile(file);
        // Check for theme token usage
        expect(
          content.includes('text-foreground') ||
            content.includes('text-muted') ||
            content.includes('bg-background'),
          `${file} should use theme color tokens`,
        ).toBe(true);
      });
    });

    it('should not use excessive hardcoded colors', () => {
      SCREEN_FILES.forEach((file) => {
        const content = readScreenFile(file);
        // Check that hardcoded colors are minimal (only for icons)
        const colorMatches = content.match(/color=['"]#[0-9A-Fa-f]{6}['"]/g) || [];
        // Allow some hardcoded colors for Material Icons, but not excessive
        expect(
          colorMatches.length <= 15,
          `${file} should minimize hardcoded colors (found ${colorMatches.length})`,
        ).toBe(true);
      });
    });
  });

  describe('Layout Structure', () => {
    it('should use View + ScrollView pattern or be a non-scrolling screen', () => {
      SCREEN_FILES.forEach((file) => {
        const content = readScreenFile(file);
        // Check for View and ScrollView usage OR View without ScrollView (for settings)
        const hasViewWithBg = content.includes('flex-1 bg-background');
        const hasScrollView = content.includes('ScrollView');
        const hasViewLayout = content.includes('View className="flex-1');

        expect(
          hasViewWithBg && (hasScrollView || hasViewLayout),
          `${file} should use proper View layout pattern`,
        ).toBe(true);
      });
    });

    it('should include BubbleBackground component', () => {
      // Most screens include BubbleBackground, but not all (e.g., oauth/callback)
      const screensWithBackground = SCREEN_FILES.filter((f) => !f.includes('oauth'));
      screensWithBackground.forEach((file) => {
        const content = readScreenFile(file);
        // Check for BubbleBackground
        expect(
          content.includes('BubbleBackground'),
          `${file} should include BubbleBackground component`,
        ).toBe(true);
      });
    });
  });
});
