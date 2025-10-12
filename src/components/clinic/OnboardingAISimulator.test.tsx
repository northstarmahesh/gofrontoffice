import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OnboardingAISimulator } from './OnboardingAISimulator';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: {
              name: 'Test Clinic',
              assistant_prompt: 'Test prompt',
              clinic_type: 'medical'
            },
            error: null
          }))
        }))
      }))
    })),
    functions: {
      invoke: vi.fn(() => Promise.resolve({
        data: { response: 'Hej! Hur kan jag hjälpa dig?' },
        error: null
      }))
    }
  }
}));

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn()
  }
}));

describe('OnboardingAISimulator', () => {
  const mockOnComplete = vi.fn();
  const mockClinicId = 'test-clinic-id';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render AI simulator component', () => {
    render(<OnboardingAISimulator clinicId={mockClinicId} onComplete={mockOnComplete} />);
    
    expect(screen.getByText('Testa din AI-assistent')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Exempel: Hej, jag vill boka en tid/)).toBeInTheDocument();
  });

  it('should show example prompts when no messages', () => {
    render(<OnboardingAISimulator clinicId={mockClinicId} onComplete={mockOnComplete} />);
    
    expect(screen.getByText('Förslag på testmeddelanden:')).toBeInTheDocument();
    expect(screen.getByText(/Hej, jag vill boka en tid/)).toBeInTheDocument();
    expect(screen.getByText(/Vilka är era öppettider?/)).toBeInTheDocument();
  });

  it('should have send test button', () => {
    render(<OnboardingAISimulator clinicId={mockClinicId} onComplete={mockOnComplete} />);
    
    const sendButton = screen.getByText('Skicka testmeddelande');
    expect(sendButton).toBeInTheDocument();
    expect(sendButton).toBeDisabled(); // Disabled when no message
  });

  it('should enable send button when message is entered', async () => {
    render(<OnboardingAISimulator clinicId={mockClinicId} onComplete={mockOnComplete} />);
    
    const textarea = screen.getByPlaceholderText(/Exempel: Hej, jag vill boka en tid/);
    const sendButton = screen.getByText('Skicka testmeddelande');
    
    fireEvent.change(textarea, { target: { value: 'Test message' } });
    
    await waitFor(() => {
      expect(sendButton).not.toBeDisabled();
    });
  });

  it('should show two action buttons', () => {
    render(<OnboardingAISimulator clinicId={mockClinicId} onComplete={mockOnComplete} />);
    
    expect(screen.getByText('Hoppa över test')).toBeInTheDocument();
    expect(screen.getByText('Fortsätt till nästa steg')).toBeInTheDocument();
  });

  it('should have continue button disabled initially', () => {
    render(<OnboardingAISimulator clinicId={mockClinicId} onComplete={mockOnComplete} />);
    
    const continueButton = screen.getByText('Fortsätt till nästa steg');
    expect(continueButton).toBeDisabled();
  });

  it('should allow skipping without testing', () => {
    render(<OnboardingAISimulator clinicId={mockClinicId} onComplete={mockOnComplete} />);
    
    const skipButton = screen.getByText('Hoppa över test');
    fireEvent.click(skipButton);
    
    expect(mockOnComplete).toHaveBeenCalled();
  });

  it('should send test message when button clicked', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    
    render(<OnboardingAISimulator clinicId={mockClinicId} onComplete={mockOnComplete} />);
    
    const textarea = screen.getByPlaceholderText(/Exempel: Hej, jag vill boka en tid/);
    const sendButton = screen.getByText('Skicka testmeddelande');
    
    fireEvent.change(textarea, { target: { value: 'Test message' } });
    fireEvent.click(sendButton);
    
    await waitFor(() => {
      expect(supabase.functions.invoke).toHaveBeenCalledWith('test-ai-response', {
        body: expect.objectContaining({
          message: 'Test message'
        })
      });
    });
  });

  it('should display messages in chat after testing', async () => {
    render(<OnboardingAISimulator clinicId={mockClinicId} onComplete={mockOnComplete} />);
    
    const textarea = screen.getByPlaceholderText(/Exempel: Hej, jag vill boka en tid/);
    const sendButton = screen.getByText('Skicka testmeddelande');
    
    fireEvent.change(textarea, { target: { value: 'Test message' } });
    fireEvent.click(sendButton);
    
    await waitFor(() => {
      expect(screen.getByText('Test message')).toBeInTheDocument();
    });
  });

  it('should show success indicator after successful test', async () => {
    render(<OnboardingAISimulator clinicId={mockClinicId} onComplete={mockOnComplete} />);
    
    const textarea = screen.getByPlaceholderText(/Exempel: Hej, jag vill boka en tid/);
    const sendButton = screen.getByText('Skicka testmeddelande');
    
    fireEvent.change(textarea, { target: { value: 'Test message' } });
    fireEvent.click(sendButton);
    
    await waitFor(() => {
      expect(screen.getByText('Din AI fungerar perfekt!')).toBeInTheDocument();
    });
  });

  it('should enable continue button after successful test', async () => {
    render(<OnboardingAISimulator clinicId={mockClinicId} onComplete={mockOnComplete} />);
    
    const textarea = screen.getByPlaceholderText(/Exempel: Hej, jag vill boka en tid/);
    const sendButton = screen.getByText('Skicka testmeddelande');
    
    fireEvent.change(textarea, { target: { value: 'Test message' } });
    fireEvent.click(sendButton);
    
    await waitFor(() => {
      const continueButton = screen.getByText('Fortsätt till nästa steg');
      expect(continueButton).not.toBeDisabled();
    });
  });
});
