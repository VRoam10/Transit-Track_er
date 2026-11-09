/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

import Login from './login';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

async function fillAndSubmit(email = 'alice@example.com', password = 'secret') {
  const user = userEvent.setup();
  const [emailInput] = screen.getAllByRole('textbox');
  await user.type(emailInput, email);
  await user.type(document.querySelector('input[type="password"]')!, password);
  await user.click(screen.getByRole('button', { name: 'Login' }));
}

describe('Login form', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    push.mockReset();
    localStorage.clear();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.test');
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('posts the credentials, stores the token and goes to the dashboard', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: 'Login successful.', token: 'jwt-token' }));
    render(<Login />);

    await fillAndSubmit();

    await waitFor(() => expect(push).toHaveBeenCalledWith('/dashboard'));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.test/api/users/login');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ email: 'alice@example.com', password: 'secret' });
    expect(localStorage.getItem('token')).toBe('jwt-token');
  });

  it('shows an error and stays on the page when the login is rejected', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: 'Invalid email or password.' }, 401));
    render(<Login />);

    await fillAndSubmit();

    expect(await screen.findByText('Invalid email or password.')).toBeTruthy();
    expect(push).not.toHaveBeenCalled();
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('shows the API error, which is sent as { error }', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: 'Invalid email or password.' }, 401));
    render(<Login />);

    await fillAndSubmit();

    expect(await screen.findByText('Invalid email or password.')).toBeTruthy();
  });

  it('falls back to a generic message when the error has no message', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, 401));
    render(<Login />);

    await fillAndSubmit();

    expect(await screen.findByText('Login failed')).toBeTruthy();
  });

  it('shows a retry message on network errors', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    render(<Login />);

    await fillAndSubmit();

    expect(await screen.findByText('An error occurred. Please try again.')).toBeTruthy();
  });

  it('disables the form while the request is in flight', async () => {
    let resolve!: (r: Response) => void;
    fetchMock.mockReturnValue(new Promise<Response>((r) => { resolve = r; }));
    render(<Login />);

    await fillAndSubmit();

    const button = screen.getByRole('button', { name: 'Logging in...' }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    resolve(jsonResponse({ token: 't' }));
    await waitFor(() => expect(push).toHaveBeenCalled());
  });
});
