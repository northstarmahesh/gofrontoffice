import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OnboardingNotifications } from './OnboardingNotifications';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(() => Promise.resolve({
        data: { user: { id: 'test-user-id' } },
        error: null
      }))
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve({
            data: [{ id: 'location-1' }],
            error: null
          })),
          maybeSingle: vi.fn(() => Promise.resolve({
            data: null,
            error: null
          }))
        }))
      })),
      upsert: vi.fn(() => Promise.resolve({ error: null }))
    }))
  }
}));

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

describe('OnboardingNotifications', () => {
  const mockOnComplete = vi.fn();
  const mockClinicId = 'test-clinic-id';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render notifications settings', () => {
    render(<OnboardingNotifications clinicId={mockClinicId} onComplete={mockOnComplete} />);
    
    expect(screen.getByText('Notifieringsinställningar')).toBeInTheDocument();
    expect(screen.getByText('E-postnotifieringar')).toBeInTheDocument();
  });

  it('should have email notifications enabled by default', () => {
    render(<OnboardingNotifications clinicId={mockClinicId} onComplete={mockOnComplete} />);
    
    const emailSwitch = screen.getByLabelText('E-postnotifieringar');
    expect(emailSwitch).toBeChecked();
  });

  it('should show daily task summary time selector', () => {
    render(<OnboardingNotifications clinicId={mockClinicId} onComplete={mockOnComplete} />);
    
    expect(screen.getByText('Daglig uppgiftssammanfattning')).toBeInTheDocument();
  });

  it('should show analytics frequency selector', () => {
    render(<OnboardingNotifications clinicId={mockClinicId} onComplete={mockOnComplete} />);
    
    expect(screen.getByText('Analysrapporter')).toBeInTheDocument();
  });

  it('should show credit alerts toggle', () => {
    render(<OnboardingNotifications clinicId={mockClinicId} onComplete={mockOnComplete} />);
    
    expect(screen.getByText('Kreditvarningar')).toBeInTheDocument();
    const creditSwitch = screen.getByLabelText('Kreditvarningar');
    expect(creditSwitch).toBeInTheDocument();
  });

  it('should show credit threshold selector when alerts enabled', () => {
    render(<OnboardingNotifications clinicId={mockClinicId} onComplete={mockOnComplete} />);
    
    // Credit alerts should be enabled by default
    expect(screen.getByText('Varningsgräns (%)')).toBeInTheDocument();
  });

  it('should allow toggling email notifications', async () => {
    render(<OnboardingNotifications clinicId={mockClinicId} onComplete={mockOnComplete} />);
    
    const emailSwitch = screen.getByLabelText('E-postnotifieringar');
    
    // Toggle off
    fireEvent.click(emailSwitch);
    
    await waitFor(() => {
      expect(emailSwitch).not.toBeChecked();
    });
  });

  it('should show save button', () => {
    render(<OnboardingNotifications clinicId={mockClinicId} onComplete={mockOnComplete} />);
    
    const saveButton = screen.getByText('Spara och fortsätt');
    expect(saveButton).toBeInTheDocument();
  });

  it('should show tip about keeping email notifications on', () => {
    render(<OnboardingNotifications clinicId={mockClinicId} onComplete={mockOnComplete} />);
    
    expect(screen.getByText(/Vi rekommenderar att hålla e-postnotifieringar påslagna/)).toBeInTheDocument();
  });
});
