const Device = require('../Models/Device');
const axios = require('axios');
const mongoose = require('mongoose');
const { normalizeUserId, buildUserIdQuery, testConnection } = require('../utils/dbHelper');

// Helper function to fetch real-time data from Solar API
const fetchDeviceData = async (apiUrl, tokenId, wifiSN) => {
  try {
    // Check if URL contains 'get' - likely a GET endpoint
    const isGetEndpoint = apiUrl.toLowerCase().includes('/get') || 
                         apiUrl.toLowerCase().includes('realtimeinfo') ||
                         apiUrl.toLowerCase().includes('solaxcloud.dynac');
    
    let response;
    let lastError;
    
    if (isGetEndpoint) {
      // Try GET first for weather/realtime APIs (no auth headers needed for public APIs)
      try {
        console.log('Trying GET request for:', apiUrl);
        response = await axios.get(
          apiUrl,
          {
            headers: {
              'Content-Type': 'application/json'
            },
            timeout: 10000 
          }
        );
        console.log('GET request successful');
      } catch (getError) {
        console.log('GET failed, trying with auth headers:', getError.response?.status);
        lastError = getError;
        // Try GET with auth headers
        try {
          response = await axios.get(
            apiUrl,
            {
              headers: {
                'Content-Type': 'application/json',
                ...(tokenId && { 'tokenId': tokenId })
              },
              timeout: 10000 
            }
          );
          console.log('GET with auth successful');
        } catch (getAuthError) {
          console.log('GET with auth also failed, trying POST:', getAuthError.response?.status);
          lastError = getAuthError;
          // If GET fails, try POST
          if (getAuthError.response?.status === 405 || getAuthError.response?.status === 404) {
            try {
              response = await axios.post(
                apiUrl,
                wifiSN ? { wifiSn: wifiSN } : {},
                {
                  headers: {
                    'tokenId': tokenId,
                    'Content-Type': 'application/json'
                  },
                  timeout: 10000 
                }
              );
              console.log('POST request successful');
            } catch (postError) {
              throw postError;
            }
          } else {
            throw getAuthError;
          }
        }
      }
    } else {
      // Try POST first (for SolaX API)
      try {
        console.log('Trying POST request for:', apiUrl);
        response = await axios.post(
          apiUrl,
          { wifiSn: wifiSN },
          {
            headers: {
              'tokenId': tokenId,
              'Content-Type': 'application/json'
            },
            timeout: 10000 
          }
        );
        console.log('POST request successful');
      } catch (postError) {
        console.log('POST failed, trying GET:', postError.response?.status);
        lastError = postError;
        // If POST fails with 405, try GET
        if (postError.response?.status === 405 || postError.code === 'ERR_BAD_REQUEST') {
          try {
            response = await axios.get(
              apiUrl,
              {
                headers: {
                  'Content-Type': 'application/json',
                  ...(tokenId && { 'tokenId': tokenId })
                },
                timeout: 10000 
              }
            );
            console.log('GET fallback successful');
          } catch (getError) {
            throw getError;
          }
        } else {
          throw postError;
        }
      }
    }

    // Handle different response formats
    if (response.data) {
      // SolaX API format: { success: true, result: {...} }
      if (response.data.success && response.data.result) {
        return {
          success: true,
          data: response.data.result
        };
      }
      
      // Weather API format: direct data object
      if (response.data.month !== undefined || response.data.airTemperature !== undefined || 
          response.data.windSpeed !== undefined) {
        return {
          success: true,
          data: response.data
        };
      }
      
      // Any other data format
      if (response.data && typeof response.data === 'object') {
        return {
          success: true,
          data: response.data
        };
      }
    }

    return {
      success: false,
      error: response.data?.exception || response.data?.message || 'Invalid API response format'
    };
  } catch (error) {
    console.error('Error fetching device data:', error.message);
    console.error('Error status:', error.response?.status);
    console.error('Error details:', error.response?.data || error.message);
    
    // Return more specific error messages
    if (error.response?.status === 405) {
      return {
        success: false,
        error: 'API endpoint does not support this HTTP method. Please check the API URL.'
      };
    }
    
    if (error.response?.status === 401 || error.response?.status === 403) {
      return {
        success: false,
        error: 'Authentication failed. Please check your Token ID.'
      };
    }
    
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return {
        success: false,
        error: 'Cannot connect to API. Please check the API URL and network connection.'
      };
    }
    
    return {
      success: false,
      error: error.response?.data?.message || error.response?.data?.error || error.message || 'API request failed'
    };
  }
};

// Add new device
exports.addDevice = async (req, res) => {
  try {
    const { deviceName, apiUrl, wifiSN, tokenId } = req.body;
    const userId = req.user.id; // From auth middleware

    console.log('Add device request - userId:', userId);
    console.log('Add device request - body:', { deviceName, apiUrl, wifiSN, tokenId: tokenId ? '***' : 'missing' });

    // Validate required fields
    if (!deviceName || !apiUrl || !wifiSN || !tokenId) {
      console.log('Validation failed - missing fields');
      return res.status(400).json({
        success: false,
        message: 'All fields are required (deviceName, apiUrl, wifiSN, tokenId)'
      });
    }

    // Normalize userId for consistent storage and querying
    const normalizedUserId = normalizeUserId(userId);
    console.log('🔄 Normalized userId for device creation:', normalizedUserId);

    // Check if device already exists using flexible query
    const existingDeviceQuery = {
      wifiSN: wifiSN.trim().toUpperCase(),
      ...buildUserIdQuery(userId)
    };
    
    const existingDevice = await Device.findOne(existingDeviceQuery);
    
    if (existingDevice) {
      console.log('Device already exists:', existingDevice._id);
      return res.status(400).json({
        success: false,
        message: 'Device with this WiFi SN already exists'
      });
    }

    // Test API connection and fetch initial data (non-blocking - always allow device creation)
    // Don't block device creation if API test fails - user can refresh later
    let apiResult = { success: false, error: null };
    try {
      console.log('Testing API connection for:', apiUrl);
      apiResult = await fetchDeviceData(apiUrl, tokenId, wifiSN);
      console.log('API test result:', apiResult.success ? 'Success' : 'Failed - ' + apiResult.error);
    } catch (apiError) {
      console.log('API test exception, but allowing device creation:', apiError.message);
      apiResult = { success: false, error: apiError.message || 'API test failed' };
    }
    
    // Always create device - don't block on API test failure
    // Ensure userId is properly formatted (use normalized ObjectId)
    const newDevice = new Device({
      userId: normalizedUserId || userId,
      deviceName: deviceName.trim(),
      apiUrl: apiUrl.trim(),
      wifiSN: wifiSN.trim().toUpperCase(),
      tokenId: tokenId.trim(),
      latestData: apiResult.success ? {
        ...apiResult.data,
        lastFetched: new Date()
      } : null,
      status: apiResult.success ? 'active' : 'error'
    });
    
    console.log('💾 Creating device with userId:', newDevice.userId);
    console.log('💾 Device userId type:', typeof newDevice.userId);

    await newDevice.save();

    console.log('Device saved successfully:', newDevice._id);

    // Always return success, but include warning if API test failed
    const message = apiResult.success 
      ? 'Device added successfully' 
      : `Device added successfully. Note: API connection test failed (${apiResult.error}). You can refresh data later or check your API URL and credentials.`;
    
    res.status(201).json({
      success: true,
      message: message,
      device: newDevice,
      apiTestPassed: apiResult.success
    });
  } catch (error) {
    console.error('Add device error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error while adding device'
    });
  }
};

// Get all devices for logged-in user
exports.getDevices = async (req, res) => {
  try {
    const userId = req.user.id;

    console.log('🔍 Fetching devices for user:', userId);
    console.log('📋 User ID type:', typeof userId);
    
    // Test database connection first
    const dbStatus = await testConnection();
    console.log('💾 Database status:', dbStatus);

    // Normalize userId for consistent querying
    const normalizedUserId = normalizeUserId(userId);
    console.log('🔄 Normalized userId:', normalizedUserId);
    console.log('🔄 Original userId string:', userId?.toString());

    // Use flexible query builder that handles all userId formats
    const userIdQuery = buildUserIdQuery(userId);
    console.log('🔎 Query object:', JSON.stringify(userIdQuery, null, 2));
    
    let devices = [];
    
    try {
      // Try the flexible query first
      devices = await Device.find(userIdQuery)
        .sort({ createdAt: -1 })
        .select('-__v')
        .lean(); // Use lean() for better performance
      
      console.log('✅ Found devices:', devices.length);
      
      // If no devices found, try individual methods for debugging
      if (devices.length === 0) {
        console.log('⚠️ No devices found with flexible query, trying individual methods...');
        
        // Try normalized ObjectId
        try {
          const test1 = await Device.find({ userId: normalizedUserId }).limit(1);
          console.log('  Method 1 (ObjectId):', test1.length);
        } catch (e) {
          console.log('  Method 1 error:', e.message);
        }
        
        // Try string
        try {
          const test2 = await Device.find({ userId: userId.toString() }).limit(1);
          console.log('  Method 2 (String):', test2.length);
        } catch (e) {
          console.log('  Method 2 error:', e.message);
        }
        
        // Try direct
        try {
          const test3 = await Device.find({ userId: userId }).limit(1);
          console.log('  Method 3 (Direct):', test3.length);
        } catch (e) {
          console.log('  Method 3 error:', e.message);
        }
        
        // Debug: Show sample devices
        try {
          const allDevices = await Device.find({}).limit(3).select('userId deviceName').lean();
          console.log('📊 Sample devices in DB:');
          allDevices.forEach((d, i) => {
            console.log(`  Device ${i + 1}:`, {
              id: d._id.toString(),
              userId: d.userId?.toString(),
              userIdType: d.userId?.constructor?.name,
              deviceName: d.deviceName,
              matches: d.userId?.toString() === userId.toString() ? '✅ MATCH' : '❌ NO MATCH'
            });
          });
          console.log('🔍 Searching for userId:', userId.toString());
        } catch (e) {
          console.log('  Error fetching samples:', e.message);
        }
      }
    } catch (queryError) {
      console.error('❌ Query error:', queryError);
      throw queryError;
    }

    console.log('Final device count:', devices.length);
    if (devices.length > 0) {
      console.log('First device userId:', devices[0].userId);
      console.log('First device userId type:', typeof devices[0].userId);
      console.log('First device userId toString:', devices[0].userId.toString());
    }

    res.status(200).json({
      success: true,
      count: devices.length,
      devices: devices || []
    });
  } catch (error) {
    console.error('Get devices error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching devices',
      error: error.message
    });
  }
};

// Get single device by ID
exports.getDeviceById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const device = await Device.findOne({ _id: id, userId });

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }

    res.status(200).json({
      success: true,
      device
    });
  } catch (error) {
    console.error('Get device error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching device'
    });
  }
};

// Refresh device data (fetch latest from API)
exports.refreshDeviceData = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const device = await Device.findOne({ _id: id, userId });

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }

    // Fetch fresh data from API
    const apiResult = await fetchDeviceData(
      device.apiUrl,
      device.tokenId,
      device.wifiSN
    );

    if (!apiResult.success) {
      device.status = 'error';
      await device.save();
      
      return res.status(400).json({
        success: false,
        message: `Failed to refresh device data: ${apiResult.error}`
      });
    }

    // Update device with fresh data
    device.latestData = {
      ...apiResult.data,
      lastFetched: new Date()
    };
    device.status = 'active';
    await device.save();

    res.status(200).json({
      success: true,
      message: 'Device data refreshed successfully',
      device
    });
  } catch (error) {
    console.error('Refresh device error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while refreshing device data'
    });
  }
};

// Update device details
exports.updateDevice = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { deviceName, apiUrl, tokenId } = req.body;

    const device = await Device.findOne({ _id: id, userId });

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }

    // Update fields
    if (deviceName) device.deviceName = deviceName;
    if (apiUrl) device.apiUrl = apiUrl;
    if (tokenId) device.tokenId = tokenId;

    await device.save();

    res.status(200).json({
      success: true,
      message: 'Device updated successfully',
      device
    });
  } catch (error) {
    console.error('Update device error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating device'
    });
  }
};

// Delete device
exports.deleteDevice = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const device = await Device.findOneAndDelete({ _id: id, userId });

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Device deleted successfully'
    });
  } catch (error) {
    console.error('Delete device error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting device'
    });
  }
};

// Batch refresh all devices for a user
exports.refreshAllDevices = async (req, res) => {
  try {
    const userId = req.user.id;

    const devices = await Device.find({ userId });

    if (devices.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No devices to refresh',
        results: []
      });
    }

    // Refresh all devices in parallel
    const refreshPromises = devices.map(async (device) => {
      try {
        const apiResult = await fetchDeviceData(
          device.apiUrl,
          device.tokenId,
          device.wifiSN
        );

        if (apiResult.success) {
          device.latestData = {
            ...apiResult.data,
            lastFetched: new Date()
          };
          device.status = 'active';
        } else {
          device.status = 'error';
        }

        await device.save();

        return {
          deviceId: device._id,
          deviceName: device.deviceName,
          success: apiResult.success,
          error: apiResult.error || null
        };
      } catch (error) {
        return {
          deviceId: device._id,
          deviceName: device.deviceName,
          success: false,
          error: error.message
        };
      }
    });

    const results = await Promise.all(refreshPromises);

    res.status(200).json({
      success: true,
      message: 'All devices refreshed',
      results
    });
  } catch (error) {
    console.error('Refresh all devices error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while refreshing devices'
    });
  }
};