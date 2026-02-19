// // server.js
// const express = require('express');
// const mongoose = require('mongoose');
// const cors = require('cors');
// const dotenv = require('dotenv');
const axios = require('axios'); // Use require syntax for Node.js

// ...

// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => {
//   console.log(`Server is running on port: ${PORT}`);
// });

// module.exports = app;

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();

// Middleware
// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  next();
});

// Middleware
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // Check if origin is allowed
    const allowedOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000'];
    if (allowedOrigins.indexOf(origin) !== -1 || true) { // Temporarily allow all for debugging
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB connection
const connectDB = async () => {
  // try {
  //   await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI, {
  //     useNewUrlParser: true,
  //     useUnifiedTopology: true
  //   });
  //   console.log('MongoDB connected successfully');
  // } catch (err) {
  //   console.error('MongoDB connection failed:', err.message);
  //   process.exit(1);
  // }

  mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected successfully'))
    .catch(err => {
      console.error('MongoDB connection failed:', err.message);
      process.exit(1);
    });
};

// Connect to database (skip in test environment)
if (process.env.NODE_ENV !== 'test') {
  connectDB();
}

// Import Routes
const userRoutes = require('./Routes/userRoutes');
const deviceRoutes = require('./Routes/deviceRoutes');

// Register Routes
app.use('/api/auth', userRoutes);
app.use('/api/devices', deviceRoutes);

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

// Health check route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Backend API Running'
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date()
  });
});

// 404 handler - Must be after all routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handling middleware - Must be last
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server is running on port: ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;