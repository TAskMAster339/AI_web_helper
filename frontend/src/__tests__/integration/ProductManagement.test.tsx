import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, expect } from 'vitest';

import ProductCreatePage from '../../components/products/ProductCreatePage';
import { useAuthStore } from '../../store/authStore';

function AppShell() {
  return (
    <MemoryRouter initialEntries={['/products/new']}>
      <Routes>
        <Route path="/products/new" element={<ProductCreatePage />} />
        <Route path="/products/:slug" element={<div>DETAIL</div>} />
        <Route path="/login" element={<div>LOGIN</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('Product management (integration)', () => {
  beforeEach(() => {
    // Logged-in user to avoid redirect
    useAuthStore.setState({
      user: {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        profile: {
          role: 'user',
          role_display: 'User',
          daily_requests_limit: 10,
          daily_requests_used: 0,
          can_make_request: true,
          requests_remaining: 10,
          available_models: 'all',
          avatar_url: null,
        },
      },
      access_token: 'test-access-token',
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });
  });

  it('validates required fields', async () => {
    const user = userEvent.setup();
    render(<AppShell />);

    await user.click(screen.getByRole('button', { name: /создать товар/i }));

    expect(await screen.findByText(/название обязательно/i)).toBeInTheDocument();
    expect(await screen.findByText(/описание обязательно/i)).toBeInTheDocument();
    expect(await screen.findByText(/выберите категорию/i)).toBeInTheDocument();
  });

  it('creates a product and navigates to details', async () => {
    const user = userEvent.setup();
    render(<AppShell />);

    await waitFor(() => expect(screen.getByText(/новый товар/i)).toBeInTheDocument());

    await user.type(screen.getByLabelText(/название/i), 'E2E Product');
    await user.type(screen.getByLabelText(/описание/i), 'Created from RTL');

    const price = screen.getByLabelText(/цена/i);
    await user.clear(price);
    await user.type(price, '100');

    await user.selectOptions(screen.getByLabelText(/категория/i), ['1']);

    await user.click(screen.getByRole('button', { name: /создать товар/i }));

    await waitFor(() => expect(screen.getByText('DETAIL')).toBeInTheDocument());
  });
});
