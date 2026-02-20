const FaultHistory = require('../Models/FaultHistory');
const Device = require('../Models/Device');
const axios = require('axios');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5002';
const WEATHER_API_URL = process.env.WEATHER_API_URL || 'https://solaxcloud.dynac.space/api/v2/dataAccess/realtimeInfo/get';

// Fetch weather data from the real-time API
const fetchWeatherData = async () => {
  try {
    const response = await axios.get(WEATHER_API_URL, {
      timeout: 10000
    });
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('Error fetching weather data:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

// Call ML service for fault detection
const detectFaultWithML = async (weatherData, actualProduction) => {
  try {
    const mlPayload = {
      Hour: weatherData.hour,
      Day: weatherData.day,
      Month: weatherData.month,
      WindSpeed: weatherData.windSpeed,
      Sunshine: weatherData.sunshine,
      AirPressure: weatherData.airPressure,
      Radiation: weatherData.radiation,
      AirTemperature: weatherData.airTemperature,
      RelativeAirHumidity: weatherData.relativeAirHumidity,
      actualProduction: actualProduction
    };

    const response = await axios.post(`${ML_SERVICE_URL}/detect-fault`, mlPayload, {
      timeout: 15000
    });

    if (response.data.success) {
      return {
        success: true,
        prediction: response.data.prediction
      };
    } else {
      return {
        success: false,
        error: response.data.error || 'ML service error'
      };
    }
  } catch (error) {
    console.error('Error calling ML service:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

// Detect fault for a device
exports.detectFault = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const userId = req.user.id;

    // Verify device belongs to user
    const device = await Device.findOne({ _id: deviceId, userId });
    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }

    // Fetch weather data
    const weatherResult = await fetchWeatherData();
    if (!weatherResult.success) {
      return res.status(500).json({
        success: false,
        message: `Failed to fetch weather data: ${weatherResult.error}`
      });
    }

    const weatherData = weatherResult.data;
    const actualProduction = device.latestData?.acpower || 0;

    // Map weather data to ML service format (handle different API response structures)
    const mappedWeatherData = {
      hour: weatherData.hour || new Date().getHours(),
      day: weatherData.day || new Date().getDate(),
      month: weatherData.month || new Date().getMonth() + 1,
      windSpeed: weatherData.windSpeed || 0,
      sunshine: weatherData.sunshine || 0,
      airPressure: weatherData.airPressure || 1010,
      radiation: weatherData.radiation || 0,
      airTemperature: weatherData.airTemperature || 25,
      relativeAirHumidity: weatherData.relativeAirHumidity || 60
    };

    // Call ML service for fault detection
    const mlResult = await detectFaultWithML(mappedWeatherData, actualProduction);
    if (!mlResult.success) {
      return res.status(500).json({
        success: false,
        message: `ML service error: ${mlResult.error}`
      });
    }

      // Save to history
      const faultRecord = new FaultHistory({
        deviceId,
        userId,
        timestamp: new Date(),
        weatherData: {
          month: mappedWeatherData.month,
          day: mappedWeatherData.day,
          hour: mappedWeatherData.hour,
          minute: weatherData.minute || new Date().getMinutes(),
          windSpeed: mappedWeatherData.windSpeed,
          sunshine: mappedWeatherData.sunshine,
          airPressure: mappedWeatherData.airPressure,
          radiation: mappedWeatherData.radiation,
          airTemperature: mappedWeatherData.airTemperature,
          relativeAirHumidity: mappedWeatherData.relativeAirHumidity,
          last_updated: weatherData.last_updated || new Date().toISOString()
        },
      solarData: {
        acpower: device.latestData?.acpower || 0,
        yieldtoday: device.latestData?.yieldtoday || 0,
        yieldtotal: device.latestData?.yieldtotal || 0,
        consumeenergy: device.latestData?.consumeenergy || 0,
        inverterSN: device.latestData?.inverterSN || '',
        inverterType: device.latestData?.inverterType || '',
        inverterStatus: device.latestData?.inverterStatus || '',
        batPower: device.latestData?.batPower || 0,
        soc: device.latestData?.soc || 0
      },
      prediction: mlResult.prediction
    });

    await faultRecord.save();

    res.status(200).json({
      success: true,
      faultDetection: mlResult.prediction,
      weatherData: {
        ...mappedWeatherData,
        minute: weatherData.minute || new Date().getMinutes(),
        last_updated: weatherData.last_updated || new Date().toISOString()
      },
      timestamp: faultRecord.timestamp
    });
  } catch (error) {
    console.error('Fault detection error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error during fault detection'
    });
  }
};

// Get fault history for a device
exports.getFaultHistory = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { date } = req.query; // Format: YYYY-MM-DD
    const userId = req.user.id;

    // Verify device belongs to user
    const device = await Device.findOne({ _id: deviceId, userId });
    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }

    let query = { deviceId, userId };

    // Filter by date if provided
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);

      query.timestamp = {
        $gte: startDate,
        $lte: endDate
      };
    }

    const history = await FaultHistory.find(query)
      .sort({ timestamp: -1 })
      .limit(288); // Max 288 records (5 min intervals for 24 hours)

    res.status(200).json({
      success: true,
      count: history.length,
      history
    });
  } catch (error) {
    console.error('Get fault history error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching fault history'
    });
  }
};

// Get all fault history for user
exports.getAllFaultHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate, limit = 100 } = req.query;

    let query = { userId };

    if (startDate && endDate) {
      query.timestamp = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const history = await FaultHistory.find(query)
      .populate('deviceId', 'deviceName wifiSN')
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: history.length,
      history
    });
  } catch (error) {
    console.error('Get all fault history error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching fault history'
    });
  }
};

// Get forecast
exports.getForecast = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { hoursAhead = 24 } = req.query;
    const userId = req.user.id;

    // Verify device belongs to user
    const device = await Device.findOne({ _id: deviceId, userId });
    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }

    // Fetch current weather data
    const weatherResult = await fetchWeatherData();
    if (!weatherResult.success) {
      return res.status(500).json({
        success: false,
        message: `Failed to fetch weather data: ${weatherResult.error}`
      });
    }

    const currentWeather = weatherResult.data;

    // Prepare forecast request
    const forecastPayload = {
      hoursAhead: parseInt(hoursAhead),
      currentWindSpeed: currentWeather.windSpeed,
      currentAirPressure: currentWeather.airPressure,
      currentHumidity: currentWeather.relativeAirHumidity,
      weatherForecast: [] // Can be extended with actual forecast API
    };

    // Call ML service for forecast
    const response = await axios.post(`${ML_SERVICE_URL}/forecast`, forecastPayload, {
      timeout: 30000
    });

    if (response.data.success) {
      res.status(200).json({
        success: true,
        forecasts: response.data.forecasts
      });
    } else {
      res.status(500).json({
        success: false,
        message: response.data.error || 'Forecast failed'
      });
    }
  } catch (error) {
    console.error('Forecast error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error during forecast'
    });
  }
};

// Get latest fault status for a device
exports.getLatestFaultStatus = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const userId = req.user.id;

    // Verify device belongs to user
    const device = await Device.findOne({ _id: deviceId, userId });
    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }

    const latestFault = await FaultHistory.findOne({ deviceId, userId })
      .sort({ timestamp: -1 });

    if (!latestFault) {
      return res.status(200).json({
        success: true,
        hasHistory: false,
        message: 'No fault history found'
      });
    }

    res.status(200).json({
      success: true,
      hasHistory: true,
      latestFault: {
        timestamp: latestFault.timestamp,
        faultDetected: latestFault.prediction.faultDetected,
        faultType: latestFault.prediction.faultType,
        faultSeverity: latestFault.prediction.faultSeverity,
        predictedProduction: latestFault.prediction.predictedProduction,
        actualProduction: latestFault.prediction.actualProduction,
        deviation: latestFault.prediction.deviation
      }
    });
  } catch (error) {
    console.error('Get latest fault status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching fault status'
    });
  }
};
