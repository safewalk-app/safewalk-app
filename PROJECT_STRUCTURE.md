# SafeWalk - Project Structure & Conventions Guide

## 📁 Directory Structure

```
safewalk-app/
├── app/                          # Expo Router screens
│   ├── _layout.tsx              # Root layout with providers
│   ├── index.tsx                # Home screen
│   ├── new-session.tsx          # Start session screen
│   ├── active-session.tsx       # Active session screen
│   ├── settings.tsx             # Settings screen
│   └── (tabs)/                  # Tab navigation group
│
├── components/                   # Reusable React components
│   ├── screen-container.tsx     # SafeArea wrapper for screens
│   ├── themed-view.tsx          # View with theme background
│   ├── haptic-tab.tsx           # Tab with haptic feedback
│   └── ui/                      # UI components
│       ├── icon-symbol.tsx      # Icon mapping (SF Symbols → Material Icons)
│       ├── loading-indicator.tsx # Loading indicator component
│       └── [other-ui-components]
│
├── hooks/                        # Custom React hooks
│   ├── use-auth.ts              # Authentication hook
│   ├── use-colors.ts            # Theme colors hook
│   ├── use-color-scheme.ts      # Dark/light mode detection
│   ├── use-loading-indicator.ts # Loading indicator hook
│   ├── index.ts                 # Lazy loading factory for heavy hooks
│   └── [other-hooks]
│
├── lib/                          # Core utilities and services
│   ├── _core/                   # Core functionality
│   │   ├── auth.ts              # Authentication logic
│   │   ├── api.ts               # API client setup
│   │   ├── theme.ts             # Theme configuration
│   │   └── index.ts             # Core exports
│   │
│   ├── context/                 # React Context providers
│   │   ├── loading-context.tsx  # Global loading state
│   │   ├── auth-context.tsx     # Auth state
│   │   └── [other-contexts]
│   │
│   ├── services/                # Business logic services
│   │   ├── certificate-pinning.service.ts    # SSL/TLS pinning
│   │   ├── biometric-auth.service.ts         # Face ID/Touch ID
│   │   ├── device-binding.service.ts         # Device binding
│   │   ├── token-rotation.service.ts         # Token refresh
│   │   ├── secure-token.service.ts           # Secure storage
│   │   ├── cache.service.ts                  # Redis cache
│   │   ├── redis.service.ts                  # Redis client
│   │   ├── otp-service.ts                    # OTP logic
│   │   ├── index.ts                          # Lazy loading factory
│   │   └── [other-services]
│   │
│   ├── utils/                   # Reusable utilities
│   │   ├── app-constants.ts     # App-wide constants
│   │   ├── validators.ts        # Validation functions
│   │   ├── error-handler.ts     # Error handling utilities
│   │   ├── async-utils.ts       # Async operations (cache, debounce, etc.)
│   │   └── [other-utils]
│   │
│   ├── theme-provider.tsx       # Theme context provider
│   ├── trpc.ts                  # tRPC client
│   ├── logger.ts                # Logging utility
│   └── utils.ts                 # General utilities (cn, etc.)
│
├── constants/                    # Constants
│   └── theme.ts                 # Theme color tokens
│
├── server/                       # Backend (Node.js + Express)
│   ├── _core/                   # Core server setup
│   │   └── index.ts             # Express app initialization
│   │
│   ├── routes/                  # API routes
│   │   ├── auth.ts              # Authentication endpoints
│   │   ├── trips.ts             # Trip management
│   │   └── [other-routes]
│   │
│   ├── services/                # Backend services
│   │   ├── redis.service.ts     # Redis client
│   │   ├── cache.service.ts     # Caching logic
│   │   └── [other-services]
│   │
│   ├── middleware/              # Express middleware
│   │   ├── auth.ts              # Authentication middleware
│   │   └── [other-middleware]
│   │
│   └── README.md                # Backend documentation
│
├── supabase/                     # Supabase configuration
│   ├── functions/               # Edge Functions
│   │   ├── send-otp/            # Send OTP via SMS
│   │   └── verify-otp/          # Verify OTP code
│   │
│   └── migrations/              # Database migrations
│       ├── 001_init.sql         # Initial schema
│       └── [other-migrations]
│
├── __tests__/                    # Test files
│   ├── utils.test.ts            # Utils tests
│   ├── async-utils.test.ts      # Async utils tests
│   ├── security-services.test.ts # Security services tests
│   ├── cache.service.test.ts    # Cache service tests
│   └── [other-tests]
│
├── assets/                       # Static assets
│   ├── images/                  # App icons, splash screens
│   │   ├── icon.png             # App icon
│   │   ├── splash-icon.png      # Splash screen
│   │   ├── favicon.png          # Web favicon
│   │   └── android-icon-*.png   # Android adaptive icons
│   │
│   └── fonts/                   # Custom fonts
│
├── app.config.ts                # Expo configuration
├── tailwind.config.js           # Tailwind CSS config
├── theme.config.js              # Theme tokens
├── tsconfig.json                # TypeScript config
├── vitest.config.ts             # Vitest config
├── package.json                 # Dependencies
├── README.md                     # Main documentation
└── todo.md                       # Project TODO list

```

---

## 🎯 Code Organization Principles

### 1. **Separation of Concerns**
- **Components**: UI rendering only
- **Hooks**: State management and side effects
- **Services**: Business logic
- **Utils**: Pure functions and helpers
- **Constants**: Static configuration

### 2. **Lazy Loading**
Services and hooks are split into:
- **Light** (imported directly): `useAuth`, `useColors`, `validatePhoneNumber`
- **Heavy** (lazy loaded): `getTripService()`, `getUseDeadlineTimer()`, `getSmsService()`

### 3. **Centralized Configuration**
- All constants in `lib/constants/app-constants.ts`
- All error messages in one place
- All validation rules in one place
- All timing values in one place

### 4. **Error Handling**
- Use `lib/utils/error-handler.ts` for all errors
- Never throw raw errors
- Always provide user-friendly messages
- Log errors for debugging

### 5. **Async Operations**
- Use `lib/utils/async-utils.ts` for:
  - Caching with TTL
  - Debouncing/throttling
  - Retries with exponential backoff
  - Concurrent operations
  - Timeouts

---

## 📝 Naming Conventions

### Files
```
// Components
MyComponent.tsx          # PascalCase
my-component.tsx        # kebab-case (preferred for Expo Router)

// Hooks
useMyHook.ts            # camelCase with 'use' prefix
use-my-hook.ts          # kebab-case (alternative)

// Services
myService.ts            # camelCase with 'Service' suffix
my-service.ts           # kebab-case (alternative)

// Utils
myUtil.ts               # camelCase
my-util.ts              # kebab-case (alternative)

// Tests
component.test.ts       # .test.ts suffix
```

### Variables & Functions
```typescript
// Constants
const MAX_RETRIES = 3;
const API_TIMEOUT = 5000;

// Variables
let currentUser: User;
const phoneNumber = '+33612345678';

// Functions
function validateEmail(email: string): boolean {}
const handleSubmit = async () => {};

// Private functions
function _internalHelper() {}
```

### React Components
```typescript
// Props interface
interface MyComponentProps {
  title: string;
  onPress?: () => void;
}

// Component
export function MyComponent({ title, onPress }: MyComponentProps) {
  return <View>{title}</View>;
}
```

---

## 🔐 Security Best Practices

### 1. **Sensitive Data Storage**
```typescript
// ✅ GOOD: Use SecureStore
import * as SecureStore from 'expo-secure-store';

await SecureStore.setItemAsync('auth_token', token);
const token = await SecureStore.getItemAsync('auth_token');

// ❌ BAD: Never use AsyncStorage for tokens
import AsyncStorage from '@react-native-async-storage/async-storage';
await AsyncStorage.setItem('auth_token', token); // NEVER!
```

### 2. **API Communication**
```typescript
// ✅ GOOD: Always use HTTPS
const API_URL = 'https://api.manus.im';

// ✅ GOOD: Use Certificate Pinning
const response = await certificatePinningService.fetch(url);

// ❌ BAD: Never use HTTP
const API_URL = 'http://api.manus.im'; // NEVER!
```

### 3. **Error Handling**
```typescript
// ✅ GOOD: Never log sensitive data
logger.error('Login failed', { userId: user.id });

// ❌ BAD: Never log tokens or passwords
logger.error('Login failed', { token, password }); // NEVER!
```

### 4. **Input Validation**
```typescript
// ✅ GOOD: Always validate user input
const { isValid, error } = validatePhoneNumber(userInput);
if (!isValid) {
  showError(error);
  return;
}

// ❌ BAD: Never trust user input
const result = await api.call(userInput); // NEVER!
```

---

## 🧪 Testing Guidelines

### 1. **Test File Location**
```
Feature: lib/services/my-service.ts
Test:    __tests__/my-service.test.ts
```

### 2. **Test Structure**
```typescript
import { describe, it, expect, beforeEach } from 'vitest';

describe('MyService', () => {
  let service: MyService;

  beforeEach(() => {
    service = new MyService();
  });

  describe('method', () => {
    it('should do something', () => {
      const result = service.method();
      expect(result).toBe(expected);
    });

    it('should handle error', () => {
      expect(() => service.method()).toThrow();
    });
  });
});
```

### 3. **Running Tests**
```bash
# Run all tests
npm run test

# Run specific test file
npm run test -- utils.test.ts

# Run with coverage
npm run test -- --coverage
```

---

## 🚀 Performance Optimization

### 1. **Bundle Size**
- Use lazy loading for heavy services/hooks
- Tree-shake unused code
- Minimize dependencies

### 2. **Caching**
```typescript
// ✅ GOOD: Cache API responses
const cache = new Cache<User>();
const user = cache.get('user:123') || await fetchUser(123);

// ✅ GOOD: Use memoization
const memoizedFn = memoize(expensiveFunction, 300); // 5 min TTL
```

### 3. **Async Operations**
```typescript
// ✅ GOOD: Use concurrency limits
await executeWithConcurrency(operations, 3); // Max 3 concurrent

// ✅ GOOD: Use debounce for frequent calls
const debouncedSearch = debounce(search, 300);
```

---

## 📚 Import Organization

### Order
1. React/React Native imports
2. Expo imports
3. Third-party imports
4. Local imports (absolute paths)
5. Local imports (relative paths)

### Example
```typescript
import { useState, useEffect } from 'react';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { validateEmail } from '@/lib/utils/validators';
import { MyComponent } from './my-component';
```

---

## 🔄 Development Workflow

### 1. **Creating a New Feature**
```bash
# 1. Add to todo.md
- [ ] Implement new feature

# 2. Create files
lib/services/new-service.ts
__tests__/new-service.test.ts
components/NewComponent.tsx

# 3. Write tests first (TDD)
npm run test -- new-service.test.ts

# 4. Implement feature
# 5. Run tests
npm run test

# 6. Update todo.md
- [x] Implement new feature

# 7. Create checkpoint
npm run checkpoint
```

### 2. **Debugging**
```typescript
// Use logger for debugging
import { logger } from '@/lib/logger';

logger.debug('Value:', value);
logger.info('Operation completed');
logger.warn('Potential issue:', warning);
logger.error('Error occurred:', error);
```

### 3. **Performance Profiling**
```typescript
// Use measurePerformance
const { result, durationMs } = await measurePerformance(
  async () => await fetchData(),
  'Fetch data operation'
);
console.log(`Operation took ${durationMs}ms`);
```

---

## 📖 Additional Resources

- **Expo Documentation**: https://docs.expo.dev
- **React Native Docs**: https://reactnative.dev
- **TypeScript Handbook**: https://www.typescriptlang.org/docs
- **Tailwind CSS**: https://tailwindcss.com/docs
- **Vitest**: https://vitest.dev

---

## ✅ Checklist Before Committing

- [ ] Code follows naming conventions
- [ ] No console.log() left in code
- [ ] No hardcoded values (use constants)
- [ ] No sensitive data in logs
- [ ] Tests written and passing
- [ ] No unused imports
- [ ] Code formatted with Prettier
- [ ] TypeScript has no errors
- [ ] Updated todo.md
- [ ] Created checkpoint if needed

---

**Last Updated:** February 27, 2026  
**Version:** 1.0
