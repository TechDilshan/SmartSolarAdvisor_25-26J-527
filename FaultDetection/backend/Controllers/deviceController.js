const Device = require('../Models/Device');
const axios = require('axios');

// Helper function to fetch real-time data from Solar API
const fetchDeviceData = async (apiUrl, tokenId, wifiSN) => {
  try {
    const response = await axios.post(
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

    if (response.data.success && response.data.result) {
      return {
        success: true,
        data: response.data.result
      };
    } else {
      return {
        success: false,
        error: response.data.exception || 'Failed to fetch device data'
      };
    }
  } catch (error) {
    console.error('Error fetching device data:', error.message);
    return {
      success: false,
      error: error.message || 'API request failed'
    };
  }
};

// Add new device
exports.addDevice = async (req, res) => {
  try {
    const { deviceName, apiUrl, wifiSN, tokenId } = req.body;
    const userId = req.user.id; // From auth middleware

    // Validate required fields
    if (!deviceName || !apiUrl || !wifiSN || !tokenId) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required (deviceName, apiUrl, wifiSN, tokenId)'
      });
    }

    // Check if device already exists for this user
    const existingDevice = await Device.findOne({ wifiSN, userId });
    if (existingDevice) {
      return res.status(400).json({
        success: false,
        message: 'Device with this WiFi SN already exists'
      });
    }

    // Test API connection and fetch initial data
    const apiResult = await fetchDeviceData(apiUrl, tokenId, wifiSN);
    
    if (!apiResult.success) {
      return res.status(400).json({
        success: false,
        message: `Failed to connect to device: ${apiResult.error}`
      });
    }

    // Create new device with initial data
    const newDevice = new Device({
      userId,
      deviceName,
      apiUrl,
      wifiSN,
      tokenId,
      latestData: {
        ...apiResult.data,
        lastFetched: new Date()
      },
      status: 'active'
    });

    await newDevice.save();

    res.status(201).json({
      success: true,
      message: 'Device added successfully',
      device: newDevice
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

    const devices = await Device.find({ userId })
      .sort({ createdAt: -1 })
      .select('-__v');

    res.status(200).json({
      success: true,
      count: devices.length,
      devices
    });
  } catch (error) {
    console.error('Get devices error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching devices'
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