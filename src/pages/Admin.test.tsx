import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import Admin from './Admin';
import { mockSupabaseClient } from '@/test/mocks/supabase';

// Mock the useIsAdmin hook
vi.mock('@/hooks/useIsAdmin', () => ({
  useIsAdmin: vi.fn(),
}));

// Mock the child components
vi.mock('@/components/admin/AdminClinicList', () => ({
  default: () => <div data-testid="admin-clinic-list">Admin Clinic List</div>,
}));

vi.mock('@/components/admin/AdminClinicCreation', () => ({
  default: () => <div data-testid="admin-clinic-creation">Admin Clinic Creation</div>,
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Admin Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
  });

  it('shows loading state while checking admin status', () => {
    const { useIsAdmin } = require('@/hooks/useIsAdmin');
    useIsAdmin.mockReturnValue({ isAdmin: false, loading: true });

    render(
      <BrowserRouter>
        <Admin />
      </BrowserRouter>
    );

    expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument();
  });

  it('redirects non-admin users to home page', async () => {
    const { useIsAdmin } = require('@/hooks/useIsAdmin');
    useIsAdmin.mockReturnValue({ isAdmin: false, loading: false });

    render(
      <BrowserRouter>
        <Admin />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('renders admin panel for admin users', async () => {
    const { useIsAdmin } = require('@/hooks/useIsAdmin');
    useIsAdmin.mockReturnValue({ isAdmin: true, loading: false });

    render(
      <BrowserRouter>
        <Admin />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Go Front Office Admin')).toBeInTheDocument();
    });

    expect(screen.getByText('Manage clinics and onboard new clients')).toBeInTheDocument();
  });

  it('displays tabs for clinics and create clinic', async () => {
    const { useIsAdmin } = require('@/hooks/useIsAdmin');
    useIsAdmin.mockReturnValue({ isAdmin: true, loading: false });

    render(
      <BrowserRouter>
        <Admin />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('All Clinics')).toBeInTheDocument();
    });

    expect(screen.getByText('Create Clinic')).toBeInTheDocument();
  });

  it('renders AdminClinicList component in clinics tab', async () => {
    const { useIsAdmin } = require('@/hooks/useIsAdmin');
    useIsAdmin.mockReturnValue({ isAdmin: true, loading: false });

    render(
      <BrowserRouter>
        <Admin />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('admin-clinic-list')).toBeInTheDocument();
    });
  });

  it('renders AdminClinicCreation component in create tab', async () => {
    const { useIsAdmin } = require('@/hooks/useIsAdmin');
    useIsAdmin.mockReturnValue({ isAdmin: true, loading: false });

    render(
      <BrowserRouter>
        <Admin />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('admin-clinic-creation')).toBeInTheDocument();
    });
  });

  it('displays shield icon in header', async () => {
    const { useIsAdmin } = require('@/hooks/useIsAdmin');
    useIsAdmin.mockReturnValue({ isAdmin: true, loading: false });

    render(
      <BrowserRouter>
        <Admin />
      </BrowserRouter>
    );

    await waitFor(() => {
      const shieldIcon = document.querySelector('.lucide-shield');
      expect(shieldIcon).toBeInTheDocument();
    });
  });
});
