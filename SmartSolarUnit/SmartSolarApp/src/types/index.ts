export interface SolarSystem {
    id: string;
    siteName: string;
    systemCapacity: number;
    panelCount: number;
    inverterCapacity: number;
    status: 'running' | 'completed';
    lastUpdated: Date;
  }
  
  export interface SensorData {
    timestamp: Date;
    irradiance: number;
    temperature: number;
    humidity: number;
    dustLevel: number;
    rainLevel: number;
  }
  
  export interface PredictionData {
    timestamp: Date;
    predictedEnergy: number;
  }
  
  export interface DailyData {
    date: string;
    totalEnergy: number;
    hourlyData: {
      hour: number;
      energy: number;
    }[];
  }
  
  export interface MonthlyData {
    month: string;
    totalEnergy: number;
    dailyData: {
      date: string;
      energy: number;
    }[];
  }
  
  export interface User {
    email: string;
    customerName: string;
    assignedSites: number;
  }