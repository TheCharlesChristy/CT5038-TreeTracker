export type WeatherData = {
  temperature: number;
  humidity: number;
  chanceOfRain: number;
  time?: string;
};

const CHARLTON_KINGS_LAT = 51.883;
const CHARLTON_KINGS_LON = -2.043;

export async function fetchCharltonKingsWeather(): Promise<WeatherData> {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${CHARLTON_KINGS_LAT}` +
    `&longitude=${CHARLTON_KINGS_LON}` +
    `&current=temperature_2m,relative_humidity_2m` +
    `&hourly=precipitation_probability` +
    `&timezone=Europe%2FLondon`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Failed to fetch weather data.');
  }

  const data = await response.json();
  const current = data?.current;

  // Find the closest hour index
  const currentTime = current?.time;
  const timeIndex = data?.hourly?.time?.findIndex((t: string) => t === currentTime);

  const chanceOfRain =
    timeIndex !== -1
      ? data?.hourly?.precipitation_probability?.[timeIndex]
      : 0;

  return {
    temperature: Number(current?.temperature_2m ?? 0),
    humidity: Number(current?.relative_humidity_2m ?? 0),
    chanceOfRain: Number(chanceOfRain ?? 0),
    time: current?.time ?? '',
  };
}