// Cấu hình chạy frontend.
// DEMO_MODE = true: dùng dữ liệu mẫu trong trình duyệt.
// Khi backend Node.js đã có API tương ứng, đổi thành false và cập nhật API_BASE_URL.
export const CONFIG = Object.freeze({
  DEMO_MODE: true,
  API_BASE_URL: 'http://localhost:3000/api',
  REQUEST_TIMEOUT_MS: 12000
});
