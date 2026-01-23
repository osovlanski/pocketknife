/**
 * CompanySearchPanel Tests
 * 
 * Tests for the Company Search Panel component.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CompanySearchPanel from './CompanySearchPanel';

// Mock fetch
const mockFetch = vi.fn();
(globalThis as typeof globalThis & { fetch: typeof fetch }).fetch = mockFetch;

// Mock useTranslation
vi.mock('../i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => key
  })
}));

// Mock logger
vi.mock('../services/logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

// Mock VoiceInputButton
vi.mock('./common/VoiceInputButton', () => ({
  default: ({ onTranscript }: { onTranscript: (text: string) => void }) => (
    <button onClick={() => onTranscript('test voice')} data-testid="voice-button">
      Voice
    </button>
  )
}));

describe('CompanySearchPanel', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should render the search input and button', () => {
    render(<CompanySearchPanel />);

    expect(screen.getByPlaceholderText(/enter company name/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
  });

  it('should disable search button when company name is empty', () => {
    render(<CompanySearchPanel />);

    const searchButton = screen.getByRole('button', { name: /search/i });
    expect(searchButton).toBeDisabled();
  });

  it('should enable search button when company name is entered', () => {
    render(<CompanySearchPanel />);

    const input = screen.getByPlaceholderText(/enter company name/i);
    fireEvent.change(input, { target: { value: 'Wix' } });

    const searchButton = screen.getByRole('button', { name: /search/i });
    expect(searchButton).not.toBeDisabled();
  });

  it('should update input value when typing', () => {
    render(<CompanySearchPanel />);

    const input = screen.getByPlaceholderText(/enter company name/i);
    fireEvent.change(input, { target: { value: 'Wix' } });

    expect(input).toHaveValue('Wix');
  });

  it('should call API when searching for a company', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        company: {
          name: 'Wix',
          description: 'Website builder',
          industry: 'SaaS',
          size: 'enterprise'
        },
        jobs: []
      })
    });

    render(<CompanySearchPanel />);

    const input = screen.getByPlaceholderText(/enter company name/i);
    fireEvent.change(input, { target: { value: 'Wix' } });

    const searchButton = screen.getByRole('button', { name: /search/i });
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/jobs/company/search'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ companyName: 'Wix', includeJobs: true })
        })
      );
    });
  });

  it('should display company info after successful search', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        company: {
          name: 'Wix',
          description: 'Website builder and development platform',
          industry: 'SaaS',
          size: 'enterprise',
          employeeCount: '5000+',
          headquarters: 'Tel Aviv, Israel',
          founded: '2006'
        },
        jobs: []
      })
    });

    render(<CompanySearchPanel />);

    const input = screen.getByPlaceholderText(/enter company name/i);
    fireEvent.change(input, { target: { value: 'Wix' } });

    const searchButton = screen.getByRole('button', { name: /search/i });
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText('Wix')).toBeInTheDocument();
      expect(screen.getByText(/website builder/i)).toBeInTheDocument();
    });
  });

  it('should display jobs after search', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        company: {
          name: 'Wix',
          description: 'Website builder'
        },
        jobs: [
          {
            id: 'job-1',
            title: 'Senior Frontend Developer',
            company: 'Wix',
            location: 'Tel Aviv',
            remote: true,
            description: 'Build amazing web experiences',
            applyUrl: 'https://wix.com/jobs/1',
            source: 'Comeet',
            postedAt: new Date().toISOString()
          }
        ]
      })
    });

    render(<CompanySearchPanel />);

    const input = screen.getByPlaceholderText(/enter company name/i);
    fireEvent.change(input, { target: { value: 'Wix' } });

    const searchButton = screen.getByRole('button', { name: /search/i });
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText('Senior Frontend Developer')).toBeInTheDocument();
      expect(screen.getByText(/tel aviv/i)).toBeInTheDocument();
    });
  });

  it('should call onJobsFound callback when jobs are found', async () => {
    const mockOnJobsFound = vi.fn();
    const mockJobs = [
      { id: 'job-1', title: 'Developer', company: 'Test', location: 'Remote', remote: true, description: '', applyUrl: '', source: '', postedAt: '' }
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        company: { name: 'Test Company' },
        jobs: mockJobs
      })
    });

    render(<CompanySearchPanel onJobsFound={mockOnJobsFound} />);

    const input = screen.getByPlaceholderText(/enter company name/i);
    fireEvent.change(input, { target: { value: 'Test' } });

    const searchButton = screen.getByRole('button', { name: /search/i });
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(mockOnJobsFound).toHaveBeenCalledWith(mockJobs);
    });
  });

  it('should trigger search on Enter key press', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        company: { name: 'Google' },
        jobs: []
      })
    });

    render(<CompanySearchPanel />);

    const input = screen.getByPlaceholderText(/enter company name/i);
    fireEvent.change(input, { target: { value: 'Google' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  it('should show loading state during search', async () => {
    mockFetch.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => ({ success: true, company: {}, jobs: [] })
      }), 100))
    );

    render(<CompanySearchPanel />);

    const input = screen.getByPlaceholderText(/enter company name/i);
    fireEvent.change(input, { target: { value: 'Test' } });

    const searchButton = screen.getByRole('button', { name: /search/i });
    fireEvent.click(searchButton);

    // Should show loading state
    await waitFor(() => {
      expect(screen.getByText(/searching/i)).toBeInTheDocument();
    });
  });

  it('should fetch autocomplete suggestions when typing', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        companies: [
          { name: 'Wix', industry: 'SaaS', size: 'enterprise' },
          { name: 'Wix Answers', industry: 'SaaS', size: 'midsize' }
        ]
      })
    });

    render(<CompanySearchPanel />);

    const input = screen.getByPlaceholderText(/enter company name/i);
    fireEvent.change(input, { target: { value: 'Wi' } });
    fireEvent.focus(input);

    // Wait for debounce
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/jobs/companies/list?prefix=Wi')
      );
    }, { timeout: 500 });
  });

  it('should handle API error gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(<CompanySearchPanel />);

    const input = screen.getByPlaceholderText(/enter company name/i);
    fireEvent.change(input, { target: { value: 'Test' } });

    const searchButton = screen.getByRole('button', { name: /search/i });
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });
  });

  it('should display "no jobs found" message when company has no openings', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        company: { name: 'Small Startup' },
        jobs: []
      })
    });

    render(<CompanySearchPanel />);

    const input = screen.getByPlaceholderText(/enter company name/i);
    fireEvent.change(input, { target: { value: 'Small Startup' } });

    const searchButton = screen.getByRole('button', { name: /search/i });
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText(/no job openings found/i)).toBeInTheDocument();
    });
  });

  it('should display company score when available', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        company: {
          name: 'Top Company',
          companyScore: 85,
          growthScore: 9,
          heatScore: 8
        },
        jobs: []
      })
    });

    render(<CompanySearchPanel />);

    const input = screen.getByPlaceholderText(/enter company name/i);
    fireEvent.change(input, { target: { value: 'Top Company' } });

    const searchButton = screen.getByRole('button', { name: /search/i });
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText('85')).toBeInTheDocument();
      expect(screen.getByText(/company score/i)).toBeInTheDocument();
    });
  });
});
