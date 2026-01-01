// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios'); // Use require syntax for Node.js

dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: 'http://localhost:3000', // frontend URL
  credentials: true
}));
app.use(express.json());

// Routes
const UserRouter = require('./Routes/userRoutes');
const SolarRouter = require('./Routes/solarRoutes');

app.use('/api/auth', UserRouter);
app.use('/api/solar', SolarRouter);

// MongoDB connection
if (process.env.NODE_ENV !== 'test') {
  const connectDB = async () => {
    try {
      await mongoose.connect(process.env.MONGO_URI);
      console.log('MongoDB connected successfully');
    } catch (err) {
      console.error('MongoDB connection failed:', err.message);
      process.exit(1);
    }
  };
  connectDB();
}

// Test route
app.get('/', (req, res) => {
  res.send('Backend API Running');
});

// SolaX Proxy Route (avoids CORS issues)
app.get('/api/solax/realtime', async (req, res) => {
  try {
    const response = await axios.post(
      'https://global.solaxcloud.com/api/v2/dataAccess/realtimeInfo/get',
      { wifiSn: process.env.SOLAX_WIFI_SN },
      {
        headers: {
          tokenId: process.env.SOLAX_TOKEN,
          'Content-Type': 'application/json'
        }
      }
    );
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching SolaX API:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port: ${PORT}`);
});

module.exports = app;
