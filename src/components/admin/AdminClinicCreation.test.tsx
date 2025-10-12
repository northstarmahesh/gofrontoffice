import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AdminClinicCreation from './AdminClinicCreation';
import { mockSupabaseClient } from '@/test/mocks/supabase';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('AdminClinicCreation Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the create clinic form', () => {
    renderWithProviders(<AdminClinicCreation />);

    expect(screen.getByText('Create New Clinic')).toBeInTheDocument();
    expect(screen.getByLabelText(/clinic name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create clinic/i })).toBeInTheDocument();
  });

  it('shows validation errors for empty required fields', async () => {
    renderWithProviders(<AdminClinicCreation />);

    const submitButton = screen.getByRole('button', { name: /create clinic/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      const errorMessages = screen.getAllByText(/required/i);
      expect(errorMessages.length).toBeGreaterThan(0);
    });
  });

  it('successfully creates a clinic with valid data', async () => {
    mockSupabaseClient.from.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'new-clinic-id',
          name: 'Test Clinic',
          email: 'test@clinic.com',
          phone: '+46701234567',
        },
        error: null,
      }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    });

    renderWithProviders(<AdminClinicCreation />);

    const nameInput = screen.getByLabelText(/clinic name/i);
    const emailInput = screen.getByLabelText(/email/i);
    const phoneInput = screen.getByLabelText(/phone/i);
    const submitButton = screen.getByRole('button', { name: /create clinic/i });

    fireEvent.change(nameInput, { target: { value: 'Test Clinic' } });
    fireEvent.change(emailInput, { target: { value: 'test@clinic.com' } });
    fireEvent.change(phoneInput, { target: { value: '+46701234567' } });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('clinics');
    });
  });

  it('handles clinic creation errors', async () => {
    mockSupabaseClient.from.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Failed to create clinic', code: '500' },
      }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    });

    renderWithProviders(<AdminClinicCreation />);

    const nameInput = screen.getByLabelText(/clinic name/i);
    const emailInput = screen.getByLabelText(/email/i);
    const phoneInput = screen.getByLabelText(/phone/i);
    const submitButton = screen.getByRole('button', { name: /create clinic/i });

    fireEvent.change(nameInput, { target: { value: 'Test Clinic' } });
    fireEvent.change(emailInput, { target: { value: 'test@clinic.com' } });
    fireEvent.change(phoneInput, { target: { value: '+46701234567' } });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/failed to create clinic/i)).toBeInTheDocument();
    });
  });

  it('validates email format', async () => {
    renderWithProviders(<AdminClinicCreation />);

    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByRole('button', { name: /create clinic/i });

    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
    });
  });

  it('disables submit button while creating clinic', async () => {
    mockSupabaseClient.from.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ data: {}, error: null }), 100))
      ),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    });

    renderWithProviders(<AdminClinicCreation />);

    const nameInput = screen.getByLabelText(/clinic name/i);
    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByRole('button', { name: /create clinic/i });

    fireEvent.change(nameInput, { target: { value: 'Test Clinic' } });
    fireEvent.change(emailInput, { target: { value: 'test@clinic.com' } });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(submitButton).toBeDisabled();
    });
  });
});
