import api from './axios';

export interface WeatherData {
  city: string;
  country: string;
  temperature: number;
  feels_like: number;
  humidity: number;
  description: string;
  icon: string;
  wind_speed: number;
  source: string;
}

export interface WeatherError {
  error: string;
  available: false;
}

export async function fetchWeather(city: string): Promise<WeatherData> {
  const { data } = await api.get<WeatherData>('/weather/', { params: { city } });
  return data;
}
