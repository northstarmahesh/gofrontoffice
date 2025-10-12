import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Auth from './Auth';
import { mockSupabaseClient, mockSession } from '@/test/mocks/supabase';

// Create a wrapper component with all necessary providers
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Auth Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset auth state
    mockSupabaseClient.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
  });

  it('should render the auth page with login form', () => {
    const { container } = render(<Auth />, { wrapper: createWrapper() });
    
    expect(container.querySelector('h1, h2')).toBeInTheDocument();
    expect(container.querySelector('input[type="email"]')).toBeInTheDocument();
    expect(container.querySelector('input[type="password"]')).toBeInTheDocument();
  });

  it('should display both login and signup tabs', () => {
    const { container } = render(<Auth />, { wrapper: createWrapper() });
    
    const tabs = container.querySelectorAll('[role="tab"]');
    expect(tabs.length).toBeGreaterThanOrEqual(2);
  });

  it('should handle email and password input', async () => {
    const user = userEvent.setup();
    const { container } = render(<Auth />, { wrapper: createWrapper() });
    
    const emailInput = container.querySelector('input[type="email"]') as HTMLInputElement;
    const passwordInput = container.querySelector('input[type="password"]') as HTMLInputElement;
    
    expect(emailInput).toBeInTheDocument();
    expect(passwordInput).toBeInTheDocument();
    
    if (emailInput && passwordInput) {
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      
      expect(emailInput).toHaveValue('test@example.com');
      expect(passwordInput).toHaveValue('password123');
    }
  });

  it('should call signInWithPassword when login form is submitted', async () => {
    const user = userEvent.setup();
    const { container } = render(<Auth />, { wrapper: createWrapper() });
    
    const emailInput = container.querySelector('input[type="email"]') as HTMLInputElement;
    const passwordInput = container.querySelector('input[type="password"]') as HTMLInputElement;
    const submitButton = container.querySelector('button[type="submit"]') as HTMLButtonElement;
    
    if (emailInput && passwordInput && submitButton) {
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);
      
      // Wait a bit for async operations
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    }
  });

  it('should display BankID login option', () => {
    const { container } = render(<Auth />, { wrapper: createWrapper() });
    
    const text = container.textContent || '';
    expect(text.toLowerCase()).toContain('bankid');
  });

  it('should handle existing session on mount', async () => {
    // Mock an existing session
    mockSupabaseClient.auth.getSession.mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });
    
    render(<Auth />, { wrapper: createWrapper() });
    
    // Component should check for session on mount
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(mockSupabaseClient.auth.getSession).toHaveBeenCalled();
  });

  it('should validate email format before submission', async () => {
    const user = userEvent.setup();
    const { container } = render(<Auth />, { wrapper: createWrapper() });
    
    const emailInput = container.querySelector('input[type="email"]') as HTMLInputElement;
    const passwordInput = container.querySelector('input[type="password"]') as HTMLInputElement;
    const submitButton = container.querySelector('button[type="submit"]') as HTMLButtonElement;
    
    if (emailInput && passwordInput && submitButton) {
      await user.type(emailInput, 'invalid-email');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Should not call signIn with invalid email due to Zod validation
      expect(mockSupabaseClient.auth.signInWithPassword).not.toHaveBeenCalled();
    }
  });
});
