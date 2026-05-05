import { useEffect, useRef, useState } from 'react';
import type { WeatherData } from '../api/weatherApi';
import { fetchWeather } from '../api/weatherApi';

const ICON_BASE = 'https://openweathermap.org/img/wn/';

interface Props {
  city?: string;
}

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: WeatherData }
  | { status: 'error'; message: string }
  | { status: 'unavailable' };

/** Map OWM icon code prefix to gradient for the card background */
function weatherGradient(icon: string): string {
  const safeIcon = typeof icon === 'string' ? icon : '';
  const code = safeIcon.length >= 2 ? safeIcon.slice(0, 2) : '';
  const gradients: Record<string, string> = {
    '01': 'linear-gradient(135deg, #74b9ff 0%, #0984e3 100%)',
    '02': 'linear-gradient(135deg, #a29bfe 0%, #74b9ff 100%)',
    '03': 'linear-gradient(135deg, #b2bec3 0%, #636e72 100%)',
    '04': 'linear-gradient(135deg, #808e9b 0%, #485460 100%)',
    '09': 'linear-gradient(135deg, #6c5ce7 0%, #74b9ff 100%)',
    '10': 'linear-gradient(135deg, #4a90e2 0%, #6c5ce7 100%)',
    '11': 'linear-gradient(135deg, #2d3436 0%, #6c5ce7 100%)',
    '13': 'linear-gradient(135deg, #dfe6e9 0%, #b2bec3 100%)',
    '50': 'linear-gradient(135deg, #b2bec3 0%, #dfe6e9 100%)',
  };
  return gradients[code] ?? 'linear-gradient(135deg, #74b9ff 0%, #0984e3 100%)';
}

const FeelsIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
    />
  </svg>
);

const HumidityIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 3c0 0-6 6.5-6 10.5a6 6 0 0012 0C18 9.5 12 3 12 3z"
    />
  </svg>
);

const WindIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M17.7 7.7a2.5 2.5 0 111.8 4.3H2m9.3 4.4a2 2 0 101.4 3.4H2"
    />
  </svg>
);

export default function WeatherWidget({ city = 'Москва' }: Props) {
  const [state, setState] = useState<State>({ status: 'idle' });
  const [inputCity, setInputCity] = useState(city);
  const [searchCity, setSearchCity] = useState(city);
  const [focused, setFocused] = useState(false);
  const prevCityRef = useRef(city);

  // Sync только когда city prop реально меняется (не при mount)
  useEffect(() => {
    if (city !== prevCityRef.current) {
      prevCityRef.current = city;
      setInputCity(city);
      setSearchCity(city);
    }
  }, [city]);

  useEffect(() => {
    setState({ status: 'loading' });
    fetchWeather(searchCity)
      .then((data: WeatherData) => setState({ status: 'success', data }))
      .catch(
        (err: { response?: { status?: number; data?: { error?: string } }; message?: string }) => {
          const msg: string = err?.response?.data?.error ?? err?.message ?? 'Ошибка загрузки';
          if (err?.response?.status === 503) {
            setState({ status: 'unavailable' });
          } else {
            setState({ status: 'error', message: msg });
          }
        }
      );
  }, [searchCity]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputCity.trim();
    if (trimmed) setSearchCity(trimmed);
  };

  const gradient =
    state.status === 'success'
      ? weatherGradient((state.data as WeatherData | undefined)?.icon ?? '')
      : 'linear-gradient(135deg, #74b9ff 0%, #0984e3 100%)';

  return (
    <section
      aria-label="Виджет погоды"
      className="flex flex-col gap-0 rounded-2xl overflow-hidden"
      style={{ boxShadow: 'var(--glass-shadow)', border: '1px solid var(--glass-border)' }}
    >
      {/* Colour header band */}
      <div
        className="relative px-5 pt-5 pb-6 overflow-hidden"
        style={{ background: gradient, transition: 'background 0.6s ease' }}
      >
        <div
          className="absolute -top-6 -right-6 w-32 h-32 rounded-full opacity-20 blur-2xl"
          style={{ background: '#fff' }}
          aria-hidden="true"
        />

        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-semibold tracking-widest uppercase opacity-80 text-white">
            Погода
          </span>
          {state.status === 'success' && (
            <span className="text-xs opacity-75 text-white">
              {state.data.city}, {state.data.country}
            </span>
          )}
        </div>

        {(state.status === 'loading' || state.status === 'idle') && (
          <div className="animate-pulse space-y-2 py-2">
            <div className="h-12 w-1/2 rounded-xl bg-white/20" />
            <div className="h-4 w-1/3 rounded bg-white/15" />
          </div>
        )}

        {state.status === 'success' && (
          <div className="flex items-end justify-between">
            <div>
              <p className="text-6xl font-black leading-none text-white drop-shadow">
                {state.data.temperature}°
              </p>
              <p className="text-sm mt-1 capitalize text-white/80">{state.data.description}</p>
            </div>
            <img
              src={
                ICON_BASE +
                (((state.data as WeatherData | undefined)?.icon ?? '01d') || '01d') +
                '@2x.png'
              }
              alt={state.data.description}
              width={72}
              height={72}
              loading="lazy"
              className="drop-shadow-lg -mb-1"
            />
          </div>
        )}

        {(state.status === 'error' || state.status === 'unavailable') && (
          <div className="py-3 text-white/80 text-sm">
            {state.status === 'unavailable'
              ? 'Данные временно недоступны'
              : '⚠ ' + (state as { status: 'error'; message: string }).message}
          </div>
        )}
      </div>

      {/* Bottom panel */}
      <div
        className="px-4 pt-4 pb-4"
        style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(var(--glass-blur))' }}
      >
        {state.status === 'success' && (
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { Icon: FeelsIcon, label: 'Ощущается', value: state.data.feels_like + '°C' },
              { Icon: HumidityIcon, label: 'Влажность', value: state.data.humidity + '%' },
              { Icon: WindIcon, label: 'Ветер', value: state.data.wind_speed + ' м/с' },
            ].map(({ Icon, label, value }) => (
              <div
                key={label}
                className="flex flex-col items-center gap-1 py-2.5 rounded-xl text-center"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
              >
                <span style={{ color: 'var(--accent)' }}>
                  <Icon />
                </span>
                <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                  {value}
                </span>
                <span className="text-[10px] leading-none" style={{ color: 'var(--text-muted)' }}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleSearch} className="flex gap-2">
          <label
            className="flex-1 flex items-center gap-2 px-3 rounded-xl cursor-text"
            style={{
              background: 'var(--bg-surface)',
              border: focused ? '1px solid var(--accent)' : '1px solid var(--border)',
              boxShadow: focused ? '0 0 0 3px var(--accent-soft)' : 'none',
              transition: 'border-color 0.2s, box-shadow 0.2s',
            }}
          >
            <svg
              className="w-3.5 h-3.5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              style={{ color: 'var(--text-muted)' }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <input
              type="text"
              value={inputCity}
              onChange={(e) => setInputCity(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Введите город..."
              aria-label="Город для погоды"
              className="flex-1 bg-transparent py-2 text-sm appearance-none"
              style={{
                color: 'var(--text-primary)',
                outline: 'none',
                border: 'none',
                boxShadow: 'none',
              }}
            />
          </label>
          <button
            type="submit"
            aria-label="Найти погоду"
            className="w-9 h-9 flex items-center justify-center rounded-xl flex-shrink-0 active:scale-95"
            style={{
              background: 'var(--accent)',
              color: '#fff',
              boxShadow: '0 2px 8px var(--accent-glow)',
              transition: 'transform 0.1s',
            }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z"
              />
            </svg>
          </button>
        </form>
      </div>
    </section>
  );
}
