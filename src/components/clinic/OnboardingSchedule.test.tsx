import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OnboardingSchedule } from './OnboardingSchedule';

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
          }))
        }))
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null }))
      })),
      insert: vi.fn(() => Promise.resolve({ error: null }))
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

describe('OnboardingSchedule', () => {
  const mockOnComplete = vi.fn();
  const mockClinicId = 'test-clinic-id';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render schedule component with all days', () => {
    render(<OnboardingSchedule clinicId={mockClinicId} onComplete={mockOnComplete} />);
    
    expect(screen.getByText('Business Hours')).toBeInTheDocument();
    expect(screen.getByText('Måndag')).toBeInTheDocument();
    expect(screen.getByText('Tisdag')).toBeInTheDocument();
    expect(screen.getByText('Onsdag')).toBeInTheDocument();
    expect(screen.getByText('Torsdag')).toBeInTheDocument();
    expect(screen.getByText('Fredag')).toBeInTheDocument();
    expect(screen.getByText('Lördag')).toBeInTheDocument();
    expect(screen.getByText('Söndag')).toBeInTheDocument();
  });

  it('should have weekends disabled by default', () => {
    render(<OnboardingSchedule clinicId={mockClinicId} onComplete={mockOnComplete} />);
    
    // Check that Saturday and Sunday have "Stängd / Closed" badge
    const closedBadges = screen.getAllByText('Stängd / Closed');
    expect(closedBadges.length).toBe(2); // Saturday and Sunday
  });

  it('should show default business hours for weekdays', () => {
    render(<OnboardingSchedule clinicId={mockClinicId} onComplete={mockOnComplete} />);
    
    // Monday's time inputs should have default values
    const timeInputs = screen.getAllByRole('textbox');
    // There should be multiple time inputs for enabled days (start and end for each weekday)
    expect(timeInputs.length).toBeGreaterThan(0);
  });

  it('should allow toggling days on/off', async () => {
    render(<OnboardingSchedule clinicId={mockClinicId} onComplete={mockOnComplete} />);
    
    const switches = screen.getAllByRole('switch');
    const mondaySwitch = switches[0]; // First switch should be Monday
    
    // Monday should be enabled by default
    expect(mondaySwitch).toBeChecked();
    
    // Toggle it off
    fireEvent.click(mondaySwitch);
    
    await waitFor(() => {
      expect(mondaySwitch).not.toBeChecked();
    });
  });

  it('should have "Copy Monday to Weekdays" button', () => {
    render(<OnboardingSchedule clinicId={mockClinicId} onComplete={mockOnComplete} />);
    
    const copyButton = screen.getByText('Copy Monday to Weekdays');
    expect(copyButton).toBeInTheDocument();
  });

  it('should show save button', () => {
    render(<OnboardingSchedule clinicId={mockClinicId} onComplete={mockOnComplete} />);
    
    const saveButton = screen.getByText('Spara och fortsätt');
    expect(saveButton).toBeInTheDocument();
  });

  it('should show tip about closed hours message', () => {
    render(<OnboardingSchedule clinicId={mockClinicId} onComplete={mockOnComplete} />);
    
    expect(screen.getByText(/Your AI will automatically respond/)).toBeInTheDocument();
  });
});
