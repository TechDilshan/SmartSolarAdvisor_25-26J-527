import PredictionModel from '../models/prediction.model.js';

export const getAll = async (req, res) => {
  try {
    const { customerName, siteId } = req.params;
    const predictions = await PredictionModel.getPredictions(customerName, siteId);

    res.json({
      success: true,
      data: predictions,
      count: predictions.length
    });
  } catch (error) {
    console.error('Get predictions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch predictions'
    });
  }
};

export const getLatest = async (req, res) => {
  try {
    const { customerName, siteId } = req.params;
    const prediction = await PredictionModel.getLatestPrediction(customerName, siteId);

    if (!prediction) {
      return res.status(404).json({
        success: false,
        message: 'No predictions found'
      });
    }

    res.json({
      success: true,
      data: prediction
    });
  } catch (error) {
    console.error('Get latest prediction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch prediction'
    });
  }
};

export const getByRange = async (req, res) => {
  try {
    const { customerName, siteId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required'
      });
    }

    const predictions = await PredictionModel.getPredictionsInRange(
      customerName,
      siteId,
      startDate,
      endDate
    );

    res.json({
      success: true,
      data: predictions,
      count: predictions.length
    });
  } catch (error) {
    console.error('Get predictions by range error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch predictions'
    });
  }
};

export const getDailyTotal = async (req, res) => {
  try {
    const { customerName, siteId } = req.params;
    const { date } = req.query;

    if (!date) {
      // Default to today
      const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const result = await PredictionModel.getDailyTotal(customerName, siteId, today);
      return res.json({
        success: true,
        data: result
      });
    }

    const result = await PredictionModel.getDailyTotal(customerName, siteId, date);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Get daily total error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate daily total'
    });
  }
};

export const getMonthlyTotal = async (req, res) => {
  try {
    const { customerName, siteId } = req.params;
    const { yearMonth } = req.query;

    if (!yearMonth) {
      // Default to current month
      const now = new Date();
      const currentMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
      const result = await PredictionModel.getMonthlyTotal(customerName, siteId, currentMonth);
      return res.json({
        success: true,
        data: result
      });
    }

    const result = await PredictionModel.getMonthlyTotal(customerName, siteId, yearMonth);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Get monthly total error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate monthly total'
    });
  }
};

export const getSummary = async (req, res) => {
  try {
    const { customerName, siteId } = req.params;
    
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0].replace(/-/g, '');
    
    // Use last 30 days total instead of current calendar month
    // This handles year boundaries correctly (e.g., Jan 1st will include Dec data)
    const [dailyTotal, monthlyTotal, latestPrediction] = await Promise.all([
      PredictionModel.getDailyTotal(customerName, siteId, todayStr),
      PredictionModel.getLast30DaysTotal(customerName, siteId),
      PredictionModel.getLatestPrediction(customerName, siteId)
    ]);

    res.json({
      success: true,
      data: {
        daily: dailyTotal,
        monthly: monthlyTotal,
        latest: latestPrediction
      }
    });
  } catch (error) {
    console.error('Get summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch summary'
    });
  }
};
