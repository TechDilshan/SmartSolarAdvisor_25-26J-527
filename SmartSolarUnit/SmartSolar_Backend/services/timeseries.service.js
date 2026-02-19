/**
 * Time-series forecast via Python ML engine (Prophet / SARIMA).
 */

const PYTHON_ML_ENGINE_URL = process.env.PYTHON_ML_ENGINE_URL || 'http://localhost:8000';

export async function getTimeSeriesForecast(dailyData, periods = 30, useSarima = false) {
  try {
    const body = {
      daily_data: dailyData.map((d) => ({
        date: d.date,
        value: d.totalKwh,
        totalKwh: d.totalKwh,
      })),
      periods,
      model: useSarima ? 'sarima' : 'prophet',
    };
    const response = await fetch(`${PYTHON_ML_ENGINE_URL}/api/timeseries/forecast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Python engine: ${response.status} ${text}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Time-series forecast error:', error);
    return {
      error: true,
      message: error.message || 'Time-series forecast unavailable. Is the Python engine running?',
      forecast: [],
      history: dailyData,
    };
  }
}
