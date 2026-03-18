import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

/**
 * Example test suite for a hypothetical ProductCard component.
 * This demonstrates the testing patterns to follow.
 */

interface ProductCardProps {
  title: string;
  price: string;
  onBuy: () => void;
  disabled?: boolean;
}

interface LoginFormProps {
  onSubmit: (e: React.FormEvent) => void;
}

interface DataComponentProps {
  isLoading: boolean;
  error: string | null;
  data: string | null;
}

interface FilterComponentProps {
  onFilterChange: (filters: { search?: string; category?: string }) => void;
}

describe('ProductCard Component', () => {
  // Mock component for demonstration
  const ProductCard = ({ title, price, onBuy, disabled }: ProductCardProps) => (
    <div>
      <h2>{title}</h2>
      <p>{price}</p>
      <button onClick={onBuy} disabled={disabled}>
        Buy Now
      </button>
    </div>
  );

  it('renders product title and price', () => {
    render(<ProductCard title="Laptop" price="$999.99" onBuy={() => {}} />);

    expect(screen.getByText('Laptop')).toBeInTheDocument();
    expect(screen.getByText('$999.99')).toBeInTheDocument();
  });

  it('calls onBuy handler when buy button is clicked', async () => {
    const handleBuy = vi.fn();
    const user = userEvent.setup();

    render(<ProductCard title="Laptop" price="$999.99" onBuy={handleBuy} />);

    const buyButton = screen.getByRole('button', { name: /buy now/i });
    await user.click(buyButton);

    expect(handleBuy).toHaveBeenCalledOnce();
  });
  it('renders disabled state when product is out of stock', () => {
    const OutOfStockCard = (props: ProductCardProps) => <ProductCard {...props} disabled={true} />;

    render(<OutOfStockCard title="Laptop" price="$999.99" onBuy={() => {}} />);

    const buyButton = screen.getByRole('button', { name: /buy now/i });
    expect(buyButton).toBeDisabled();
  });
});

describe('Login Form Component', () => {
  const LoginForm = ({ onSubmit }: LoginFormProps) => (
    <form onSubmit={onSubmit}>
      <input type="text" placeholder="Username" name="username" />
      <input type="password" placeholder="Password" name="password" />
      <button type="submit">Login</button>
    </form>
  );

  it('renders login form with username and password fields', () => {
    render(<LoginForm onSubmit={() => {}} />);

    expect(screen.getByPlaceholderText('Username')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    const handleSubmit = vi.fn();
    const user = userEvent.setup();

    render(<LoginForm onSubmit={handleSubmit} />);

    const submitButton = screen.getByRole('button', { name: /login/i });
    await user.click(submitButton);

    // In a real component, validation would prevent submission
    // This is a simplified example
  });

  it('submits form with username and password', async () => {
    const handleSubmit = vi.fn();
    const user = userEvent.setup();

    render(<LoginForm onSubmit={handleSubmit} />);

    const usernameInput = screen.getByPlaceholderText('Username');
    const passwordInput = screen.getByPlaceholderText('Password');
    const submitButton = screen.getByRole('button', { name: /login/i });

    await user.type(usernameInput, 'testuser');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);

    expect(handleSubmit).toHaveBeenCalled();
  });
});

describe('Loading and Error States', () => {
  const DataComponent = ({ isLoading, error, data }: DataComponentProps) => {
    if (isLoading) return <div>Loading...</div>;
    if (error) return <div>Error: {error}</div>;
    return <div>{data}</div>;
  };

  it('shows loading state', () => {
    render(<DataComponent isLoading={true} error={null} data={null} />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows error state', () => {
    render(<DataComponent isLoading={false} error="Failed to load data" data={null} />);

    expect(screen.getByText('Error: Failed to load data')).toBeInTheDocument();
  });

  it('shows data when loaded', () => {
    render(<DataComponent isLoading={false} error={null} data="Success!" />);

    expect(screen.getByText('Success!')).toBeInTheDocument();
  });
});

describe('Filter Component', () => {
  const FilterComponent = ({ onFilterChange }: FilterComponentProps) => (
    <div>
      <input
        type="text"
        placeholder="Search"
        onChange={(e) => onFilterChange({ search: e.target.value })}
      />
      <select onChange={(e) => onFilterChange({ category: e.target.value })}>
        <option value="">All Categories</option>
        <option value="electronics">Electronics</option>
        <option value="books">Books</option>
      </select>
    </div>
  );

  it('calls onFilterChange when search input changes', async () => {
    const handleFilterChange = vi.fn();
    const user = userEvent.setup();

    render(<FilterComponent onFilterChange={handleFilterChange} />);

    const searchInput = screen.getByPlaceholderText('Search');
    await user.type(searchInput, 'laptop');

    // Should be called for each character typed
    expect(handleFilterChange).toHaveBeenCalled();
  });

  it('calls onFilterChange when category select changes', async () => {
    const handleFilterChange = vi.fn();
    const user = userEvent.setup();

    render(<FilterComponent onFilterChange={handleFilterChange} />);

    const selectInput = screen.getByDisplayValue('All Categories');
    await user.selectOptions(selectInput, 'electronics');

    expect(handleFilterChange).toHaveBeenCalledWith({ category: 'electronics' });
  });
});
