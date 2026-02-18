import * as weatherService from '../services/weather.service.js';

export const getCurrent = async (req, res) => {
  try {
    const { lat, lon } = req.query;
    const data = await weatherService.getCurrentWeather(lat, lon);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Weather getCurrent error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch current weather',
    });
  }
};

export const getForecast = async (req, res) => {
  try {
    const { lat, lon, days } = req.query;
    const data = await weatherService.getForecast(lat, lon, days ? parseInt(days, 10) : 7);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Weather getForecast error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch forecast',
    });
  }
};

export const getSeasonal = async (req, res) => {
  try {
    const { lat, lon } = req.query;
    const data = await weatherService.getSeasonalTrends(lat, lon);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Weather getSeasonal error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch seasonal trends',
    });
  }
};
