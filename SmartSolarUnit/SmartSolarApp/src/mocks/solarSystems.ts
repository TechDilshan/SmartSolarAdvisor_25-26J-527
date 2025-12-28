import { SolarSystem, SensorData, PredictionData, User } from '../types';

export const mockSolarSystems: SolarSystem[] = [
  {
    id: '1',
    siteName: 'Rooftop Installation A',
    systemCapacity: 10.5,
    panelCount: 28,
    inverterCapacity: 10,
    status: 'running',
    lastUpdated: new Date(),
  },
  {
    id: '2',
    siteName: 'Ground Mount B',
    systemCapacity: 25.2,
    panelCount: 64,
    inverterCapacity: 25,
    status: 'running',
    lastUpdated: new Date(),
  },
  {
    id: '3',
    siteName: 'Commercial Site C',
    systemCapacity: 50.0,
    panelCount: 128,
    inverterCapacity: 48,
    status: 'completed',
    lastUpdated: new Date(Date.now() - 3600000),
  },
];

export function generateMockSensorData(): SensorData {
  return {
    timestamp: new Date(),
    irradiance: Math.random() * 1000 + 200,
    temperature: Math.random() * 15 + 20,
    humidity: Math.random() * 30 + 40,
    dustLevel: Math.random() * 5 + 1,
    rainLevel: Math.random() * 10,
  };
}

export function generateMockPredictionData(): PredictionData {
  return {
    timestamp: new Date(),
    predictedEnergy: Math.random() * 5 + 1,
  };
}

export const mockUser: User = {
  email: 'owner@solar.com',
  customerName: 'John Anderson',
  assignedSites: 3,
};