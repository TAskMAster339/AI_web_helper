import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, expect } from 'vitest';

import Login from '../../components/login';
import { useAuthStore } from '../../store/authStore';

function AppShell() {
  return (
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<div>HOME</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('Authentication (integration)', () => {
  beforeEach(() => {
    // Ensure clean auth state between tests
    useAuthStore.setState({
      user: null,
      access_token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
    localStorage.clear();
  });

  it('logs in and redirects to home', async () => {
    const user = userEvent.setup();
    render(<AppShell />);

    await user.type(screen.getByPlaceholderText(/имя пользователя/i), 'testuser');
    await user.type(screen.getByPlaceholderText(/пароль/i), 'testpass123');
    await user.click(screen.getByRole('button', { name: /войти/i }));

    await waitFor(() => expect(screen.getByText('HOME')).toBeInTheDocument());
    expect(localStorage.getItem('access_token')).toBeTruthy();
  });

  it('shows error on invalid credentials', async () => {
    const user = userEvent.setup();
    render(<AppShell />);

    await user.type(screen.getByPlaceholderText(/имя пользователя/i), 'wrong');
    await user.type(screen.getByPlaceholderText(/пароль/i), 'wrong');
    await user.click(screen.getByRole('button', { name: /войти/i }));

    await waitFor(() => expect(screen.getByText(/ошибка входа/i)).toBeInTheDocument());
  });
});
