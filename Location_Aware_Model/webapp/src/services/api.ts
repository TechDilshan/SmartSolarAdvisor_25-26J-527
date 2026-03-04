import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5007";

const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

export interface SolarRecord {
  date: string;
  time: string;
  dust_level: number;
  humidity: number;
  irradiance: number;
  latitude: number;
  longitude: number;
  panel_area_m2: number;
  predicted_kwh_per5min: number;
  rainfall: number;
  temperature: number;
}

export interface AggregateEntry {
  average_dust_level: number;
  average_humidity: number;
  average_irradiance: number;
  average_rainfall: number;
  average_temperature: number;
  total_predicted_kwh_per5min: number;
}

export type AggregateResponse = Record<string, AggregateEntry>;

export interface SiteSummary {
  customer: string;
  first_date: string;
  latitude: number;
  longitude: number;
  site: string;
}

export const fetchNearestLocation = async (
  latitude: number,
  longitude: number
): Promise<SolarRecord[]> => {
  const { data } = await api.post<SolarRecord[]>("/nearest-location", {
    latitude,
    longitude,
  });
  return data;
};

export const fetchAggregateData = async (
  latitude: number,
  longitude: number,
  mode: "daily" | "monthly"
): Promise<AggregateResponse> => {
  const { data } = await api.post<AggregateResponse>("/aggregate-data", {
    latitude,
    longitude,
    mode,
  });
  return data;
};

export const fetchSitesSummary = async (): Promise<SiteSummary[]> => {
  const { data } = await api.get<SiteSummary[]>("/sites-summary");
  return data;
};

export interface WeatherCurrent {
  time: string;
  temperature_2m: number;
  relative_humidity_2m: number;
  apparent_temperature: number;
  is_day: number;
  precipitation: number;
  rain: number;
  showers: number;
  snowfall: number;
  weathercode: number;
  cloud_cover: number;
  surface_pressure: number;
  wind_speed_10m: number;
  wind_direction_10m: number;
  wind_gusts_10m: number;
  shortwave_radiation: number;
  direct_radiation: number;
  diffuse_radiation: number;
  global_tilted_irradiance: number;
}

export interface WeatherResponse {
  latitude: number;
  longitude: number;
  elevation: number;
  current: WeatherCurrent;
  current_units: Record<string, string>;
}

export const fetchRealtimeWeather = async (
  latitude: number,
  longitude: number
): Promise<WeatherResponse> => {
  const { data } = await axios.get<WeatherResponse>(
    `https://api.open-meteo.com/v1/forecast`,
    {
      params: {
        latitude,
        longitude,
        current: "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weathercode,cloud_cover,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m,shortwave_radiation,direct_radiation,diffuse_radiation,global_tilted_irradiance",
      },
    }
  );
  return data;
};
