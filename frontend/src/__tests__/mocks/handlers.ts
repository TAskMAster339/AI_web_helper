import { http, HttpResponse } from 'msw';

// IMPORTANT: this handlers list is reused by the browser MSW worker for e2e.
// Keep it free from Node/Vitest-only globals and from fragile env access.
// The frontend axios default is `http://localhost:8000/api`.
const API_BASE = 'http://localhost:8000/api';

interface ProductData {
  title: string;
  slug: string;
  description: string;
  price: string;
  status: string;
  stock: number;
  category: number;
}

interface LoginData {
  login: string;
  password: string;
}

interface RegisterData {
  username: string;
  email: string;
  password: string;
  password2: string;
}

interface RefreshData {
  // Server reads refresh from cookie in real life; keep optional payload for compatibility.
  refresh?: string;
}

function mockUser(overrides: Partial<Record<string, unknown>> = {}) {
  return {
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
    ...overrides,
  };
}

export const handlers = [
  // ── Auth ────────────────────────────────────────────────────────────────

  http.post(`${API_BASE}/users/register/`, async ({ request }) => {
    const body = (await request.json()) as RegisterData;

    // Mirror backend behavior used by the app: register returns only `detail`.
    return HttpResponse.json(
      {
        detail: `Registration successful. Please check your email (mocked) for ${body.email}.`,
      },
      { status: 201 }
    );
  }),

  http.post(`${API_BASE}/users/login/`, async ({ request }) => {
    const body = (await request.json()) as LoginData;

    if (body.login === 'testuser' && body.password === 'testpass123') {
      // Real backend sets refresh token in cookie. MSW can't set httpOnly cookies,
      // but we can still set a regular cookie for the frontend refresh logic.
      const headers = new Headers();
      headers.append('Set-Cookie', 'refresh_token=valid-refresh-token; Path=/; SameSite=Lax');

      return HttpResponse.json(
        {
          access: 'test-access-token',
          user: mockUser(),
        },
        { headers }
      );
    }

    return HttpResponse.json({ detail: 'Ошибка входа' }, { status: 400 });
  }),

  http.post(`${API_BASE}/users/logout/`, () => {
    const headers = new Headers();
    headers.append('Set-Cookie', 'refresh_token=; Path=/; Max-Age=0');
    return HttpResponse.json({ detail: 'Successfully logged out' }, { headers });
  }),

  http.get(`${API_BASE}/users/me/`, ({ request }) => {
    const auth = request.headers.get('authorization') || '';
    const cookie = request.headers.get('cookie') || '';

    // Allow session restoration flow: after refresh, frontend may call /users/me/
    // with a new access token, but some browser contexts may not attach it yet.
    const hasBearer = auth.startsWith('Bearer ');
    const hasRefreshCookie = cookie.includes('refresh_token=valid-refresh-token');

    if (!hasBearer && !hasRefreshCookie) {
      return HttpResponse.json({ detail: 'Unauthorized' }, { status: 401 });
    }
    return HttpResponse.json(mockUser());
  }),

  http.post(`${API_BASE}/users/token/refresh/`, async ({ request }) => {
    // In real backend refresh token is read from cookie.
    // Here we accept either the cookie or optional JSON body.
    let body: RefreshData = {};
    try {
      body = (await request.json()) as RefreshData;
    } catch {
      body = {};
    }

    const cookie = request.headers.get('cookie') || '';
    const hasValidCookie = cookie.includes('refresh_token=valid-refresh-token');
    const hasValidBody = body.refresh === 'valid-refresh-token';

    if (hasValidCookie || hasValidBody) {
      const headers = new Headers();
      // Some browsers may drop non-httpOnly cookies between navigations in tests;
      // re-assert it on refresh to keep session persistence stable.
      headers.append('Set-Cookie', 'refresh_token=valid-refresh-token; Path=/; SameSite=Lax');
      return HttpResponse.json({ access: 'new-access-token' }, { headers });
    }

    return HttpResponse.json({ detail: 'Invalid token' }, { status: 401 });
  }),

  // ── Products ────────────────────────────────────────────────────────────

  http.get(`${API_BASE}/categories/`, () => {
    return HttpResponse.json([
      {
        id: 1,
        name: 'Electronics',
        description: 'Electronic devices',
        products_count: 1,
      },
      {
        id: 2,
        name: 'Books',
        description: 'Books and literature',
        products_count: 0,
      },
    ]);
  }),

  http.get(`${API_BASE}/products/`, ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? '1');

    const results = [
      {
        id: 1,
        title: 'Test Laptop',
        slug: 'test-laptop',
        description: 'A test laptop',
        price: '999.99',
        status: 'published',
        stock: 5,
        category: 1,
        category_name: 'Electronics',
        author: {
          id: 1,
          username: 'testuser',
          email: 'test@example.com',
          first_name: 'Test',
          last_name: 'User',
          full_name: 'Test User',
          avatar_url: null,
        },
        images: [],
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ];

    return HttpResponse.json({
      count: results.length,
      next: null,
      previous: page > 1 ? 'mock' : null,
      results,
    });
  }),

  http.get(`${API_BASE}/products/:slug/`, ({ params }) => {
    if (params.slug === 'test-laptop') {
      return HttpResponse.json({
        id: 1,
        title: 'Test Laptop',
        slug: 'test-laptop',
        description: 'A test laptop',
        price: '999.99',
        status: 'published',
        stock: 5,
        category: 1,
        category_name: 'Electronics',
        author: {
          id: 1,
          username: 'testuser',
          email: 'test@example.com',
          first_name: 'Test',
          last_name: 'User',
          full_name: 'Test User',
          avatar_url: null,
        },
        images: [],
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      });
    }

    // Support the create-product e2e flow which uses slug `e2e-product`.
    if (params.slug === 'e2e-product') {
      return HttpResponse.json({
        id: 2,
        title: 'E2E Product',
        slug: 'e2e-product',
        description: 'Created by Playwright',
        price: '100',
        status: 'draft',
        stock: 0,
        category: 1,
        category_name: 'Electronics',
        author: {
          id: 1,
          username: 'testuser',
          email: 'test@example.com',
          first_name: 'Test',
          last_name: 'User',
          full_name: 'Test User',
          avatar_url: null,
        },
        images: [],
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      });
    }

    return new HttpResponse(null, { status: 404 });
  }),

  http.post(`${API_BASE}/products/`, async ({ request }) => {
    const body = (await request.json()) as ProductData;
    return HttpResponse.json(
      {
        id: 2,
        title: body.title,
        slug: body.slug || 'e2e-product',
        description: body.description,
        price: body.price,
        status: body.status || 'draft',
        stock: body.stock ?? 0,
        category: body.category,
        category_name: body.category === 1 ? 'Electronics' : 'Books',
        author: {
          id: 1,
          username: 'testuser',
          email: 'test@example.com',
          first_name: 'Test',
          last_name: 'User',
          full_name: 'Test User',
          avatar_url: null,
        },
        images: [],
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
      { status: 201 }
    );
  }),

  // ── LLM / Weather (used on Home/Dashboard) ──────────────────────────────
  http.get(`${API_BASE}/llm/models/`, ({ request }) => {
    const url = new URL(request.url);
    const provider = url.searchParams.get('provider') ?? 'local';
    return HttpResponse.json({ provider, models: ['mock-model-1', 'mock-model-2'] });
  }),

  http.get(`${API_BASE}/weather/`, ({ request }) => {
    const url = new URL(request.url);
    const city = url.searchParams.get('city') ?? 'Unknown';

    // Match WeatherData expected by `src/api/weatherApi.ts` / WeatherWidget.
    return HttpResponse.json({
      city,
      country: 'RU',
      temperature: 20,
      feels_like: 18,
      humidity: 55,
      description: 'clear sky (mock)',
      icon: '01d',
      wind_speed: 3.4,
      source: 'msw',
    });
  }),
];
