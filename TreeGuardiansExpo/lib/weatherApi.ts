export type WeatherData = {
  temperature: number;
  humidity: number;
  chanceOfRain: number;
  time?: string;
  condition: string;
  weatherCode: number;
  forecast: DailyForecast[];
};

export type DailyForecast = {
  date: string;
  dayLabel: string;
  weatherCode: number;
  condition: string;
  tempHigh: number;
  tempLow: number;
  rainChance: number;
};

const CHARLTON_KINGS_LAT = 51.883;
const CHARLTON_KINGS_LON = -2.043;

function wmoCondition(code: number): string {
  if (code === 0) return 'Clear sky';
  if (code === 1) return 'Mainly clear';
  if (code === 2) return 'Partly cloudy';
  if (code === 3) return 'Overcast';
  if (code === 45 || code === 48) return 'Foggy';
  if (code >= 51 && code <= 57) return 'Drizzle';
  if (code >= 61 && code <= 67) return 'Rain';
  if (code >= 71 && code <= 77) return 'Snow';
  if (code >= 80 && code <= 82) return 'Rain showers';
  if (code === 85 || code === 86) return 'Snow showers';
  if (code >= 95 && code <= 99) return 'Thunderstorm';
  return 'Unknown';
}

function formatDayLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';

  return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

export async function fetchCharltonKingsWeather(): Promise<WeatherData> {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${CHARLTON_KINGS_LAT}` +
    `&longitude=${CHARLTON_KINGS_LON}` +
    `&current=temperature_2m,relative_humidity_2m,weather_code` +
    `&hourly=precipitation_probability` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
    `&timezone=Europe%2FLondon` +
    `&forecast_days=4`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Failed to fetch weather data.');
  }

  const data = await response.json();
  const current = data?.current;

  const currentTime = current?.time;
  const timeIndex = data?.hourly?.time?.findIndex((t: string) => t === currentTime);

  const chanceOfRain =
    timeIndex !== -1
      ? data?.hourly?.precipitation_probability?.[timeIndex]
      : 0;

  const currentCode = Number(current?.weather_code ?? 0);

  const dailyDates: string[] = data?.daily?.time ?? [];
  const dailyCodes: number[] = data?.daily?.weather_code ?? [];
  const dailyHigh: number[] = data?.daily?.temperature_2m_max ?? [];
  const dailyLow: number[] = data?.daily?.temperature_2m_min ?? [];
  const dailyRain: number[] = data?.daily?.precipitation_probability_max ?? [];

  const forecast: DailyForecast[] = dailyDates.slice(0, 4).map((date, i) => ({
    date,
    dayLabel: formatDayLabel(date),
    weatherCode: Number(dailyCodes[i] ?? 0),
    condition: wmoCondition(Number(dailyCodes[i] ?? 0)),
    tempHigh: Math.round(Number(dailyHigh[i] ?? 0)),
    tempLow: Math.round(Number(dailyLow[i] ?? 0)),
    rainChance: Number(dailyRain[i] ?? 0),
  }));

  return {
    temperature: Number(current?.temperature_2m ?? 0),
    humidity: Number(current?.relative_humidity_2m ?? 0),
    chanceOfRain: Number(chanceOfRain ?? 0),
    time: current?.time ?? '',
    condition: wmoCondition(currentCode),
    weatherCode: currentCode,
    forecast,
  };
}
