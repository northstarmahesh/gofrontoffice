# Testing Setup

## Overview
This project uses **Vitest** as the test runner and **React Testing Library** for component testing.

## Running Tests

Add the following scripts to your `package.json`:

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

Then run:
```bash
# Run tests in watch mode
npm run test

# Run tests once
npm run test:run

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

## Test Structure

```
src/
├── test/
│   ├── setup.ts          # Global test setup
│   ├── mocks/
│   │   └── supabase.ts   # Supabase client mock
│   └── README.md         # This file
├── pages/
│   ├── Auth.test.tsx     # Auth page component test
│   └── Admin.test.tsx    # Admin page access control test
├── hooks/
│   └── useIsAdmin.test.ts # Admin status hook test
└── components/
    └── admin/
        └── AdminClinicCreation.test.tsx # Clinic creation form test
supabase/
└── functions/
    ├── deduct-credits/
    │   └── index.test.ts # Credit deduction edge function test
    ├── vonage-voice-webhook/
    │   └── index.test.ts # Voice call handling tests
    ├── vonage-sms-webhook/
    │   └── index.test.ts # SMS processing tests
    └── vonage-voice-recording/
        └── index.test.ts # Call recording tests
```

## Test Coverage

### Frontend Tests
- `src/pages/Auth.tsx` - Component rendering and form interactions
- `src/pages/Admin.tsx` - Admin access control and component rendering
- `src/hooks/useIsAdmin.ts` - Admin role checking logic
- `src/components/admin/AdminClinicCreation.tsx` - Clinic creation form

### Backend Tests (Edge Functions)
- `supabase/functions/deduct-credits/index.ts` - Credit deduction and billing logic
- `supabase/functions/vonage-voice-webhook/index.ts` - Voice call handling, consent announcement, recording
- `supabase/functions/vonage-sms-webhook/index.ts` - SMS processing and AI response generation
- `supabase/functions/vonage-voice-recording/index.ts` - Call recording URL storage

## Writing Tests

### Component Tests
```typescript
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import MyComponent from './MyComponent';

describe('MyComponent', () => {
  it('should render successfully', () => {
    const { container } = render(<MyComponent />);
    expect(container).toBeInTheDocument();
  });
});
```

### Using Supabase Mock
The Supabase client is automatically mocked in all tests. You can customize mock behavior:

```typescript
import { mockSupabaseClient } from '@/test/mocks/supabase';

// Mock successful auth
mockSupabaseClient.auth.signIn.mockResolvedValue({
  data: { user: mockUser, session: mockSession },
  error: null,
});

// Mock auth error
mockSupabaseClient.auth.signIn.mockResolvedValue({
  data: { user: null, session: null },
  error: mockAuthError,
});
```

## CI/CD Integration

The GitHub Actions workflow (`.github/workflows/test.yml`) automatically runs tests on:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches

The pipeline will fail if tests don't pass, ensuring code quality.

## Coverage Reports

To generate coverage reports:
```bash
npm run test:coverage
```

Coverage reports are uploaded to Codecov in the CI/CD pipeline.

## Best Practices

1. **Test user interactions**, not implementation details
2. **Use container queries** for selecting elements
3. **Mock external dependencies** (API calls, Supabase, etc.)
4. **Test error states** as well as success states
5. **Keep tests focused** - one test per behavior
6. **Use descriptive test names** that explain what is being tested

## Troubleshooting

### Tests timing out
Increase the timeout in `vitest.config.ts`:
```typescript
export default defineConfig({
  test: {
    testTimeout: 10000,
  },
});
```

### Mock not working
Ensure the mock is imported before the component:
```typescript
import { mockSupabaseClient } from '@/test/mocks/supabase';
import MyComponent from './MyComponent'; // After the mock
```
