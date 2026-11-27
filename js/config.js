// DEMO_MODE = true: sử dụng dữ liệu mẫu.
// DEMO_MODE = false: sử dụng dữ liệu từ Backend API.
const isLocalDevelopment = ['localhost', '127.0.0.1'].includes(window.location.hostname);

export const CONFIG = Object.freeze({
  DEMO_MODE: false,
  API_BASE_URL: isLocalDevelopment
    ? 'http://localhost:3000/api'
    : 'https://melora-backend-i280.onrender.com/api',
  REQUEST_TIMEOUT_MS: 12000
});
