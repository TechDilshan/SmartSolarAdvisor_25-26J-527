import { Platform } from 'react-native';

// API Base URL - Use 10.0.2.2 for Android emulator, localhost for iOS
export const API_BASE_URL = __DEV__
  ? Platform.OS === 'android'
    ? 'http://10.0.2.2:5001/api'
    : 'http://localhost:5001/api'
  : 'https://your-production-api.com/api';

