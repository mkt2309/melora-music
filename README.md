# Melora — Frontend mẫu cho hệ thống nghe nhạc

Đây là bản frontend học tập được viết từ bộ khung `MusicApp` mà nhóm cung cấp. Giao diện dùng tông trắng – cam, HTML/CSS/JavaScript thuần và chia module ES.

## 1. Chạy thử

Không mở `index.html` bằng cách nhấp đúp vì trình duyệt có thể chặn JavaScript module khi dùng `file://`.

Mở Terminal tại thư mục `music-streaming-frontend`, chạy một trong các lệnh:

```bash
# Python
python -m http.server 5500
```

Sau đó mở `http://localhost:5500`.

Hoặc dùng extension Live Server trong VS Code.

## 2. Các chức năng trong bản demo

- Hiển thị danh sách bài hát, album và nghệ sĩ.
- Tìm kiếm bài hát theo tên, nghệ sĩ hoặc album.
- Phát, tạm dừng, chuyển bài, tua và chỉnh âm lượng.
- Bật phát ngẫu nhiên và lặp lại bài hiện tại.
- Thêm/bỏ bài hát yêu thích.
- Tạo playlist, thêm bài hát vào playlist và xóa bài hát khỏi playlist.
- Lưu playlist, yêu thích và lịch sử nghe trong `localStorage` của trình duyệt.
- Giao diện responsive cho desktop và điện thoại.

Dữ liệu demo nằm trong `js/demo-data.js`; bìa nhạc SVG nằm trong `assets/covers/`. URL âm thanh mẫu đang trỏ tới các file SoundHelix công khai trên Internet. Khi dùng dữ liệu của nhóm, hãy thay bằng URL do backend trả về từ Object Storage/CDN.

## 3. Kết nối backend Node.js

Mở `js/config.js`:

```js
export const CONFIG = Object.freeze({
  DEMO_MODE: false,
  API_BASE_URL: 'http://localhost:3000/api',
  REQUEST_TIMEOUT_MS: 12000
});
```

Frontend đang giả định backend cung cấp các API sau:

| Method | Endpoint | Ý nghĩa |
|---|---|---|
| GET | `/api/songs?q=` | Danh sách/tìm kiếm bài hát |
| GET | `/api/albums` | Danh sách album |
| GET | `/api/artists` | Danh sách nghệ sĩ |
| GET | `/api/playlists` | Playlist của người dùng |
| GET | `/api/favorites` | Danh sách bài hát yêu thích |
| POST | `/api/favorites` | Thêm yêu thích, body `{ "song_id": "..." }` |
| DELETE | `/api/favorites/:songId` | Bỏ yêu thích |
| GET | `/api/history` | Lịch sử nghe |
| POST | `/api/history` | Ghi nhận lượt nghe, body `{ "song_id": "..." }` |
| POST | `/api/playlists` | Tạo playlist, body `{ "name": "..." }` |
| POST | `/api/playlists/:id/songs` | Thêm bài hát, body `{ "song_id": "..." }` |
| DELETE | `/api/playlists/:id/songs/:songId` | Xóa bài khỏi playlist |
| GET | `/api/stream/:songId` | Trả JSON có trường `url` chứa signed URL âm thanh |

Đây là **API contract dự kiến của frontend**, không phải khẳng định backend của nhóm đã có các endpoint này. Khi trưởng nhóm cung cấp API thật, cần đối chiếu và sửa `js/db.js` cho khớp request, response, tên trường và cơ chế xác thực.

Nếu backend yêu cầu đăng nhập, cần bổ sung token vào header `Authorization` trong `MusicDB.request()`; không đặt Supabase `service_role` key hoặc bí mật máy chủ trong mã frontend.

## 4. Cấu trúc thư mục

```text
music-streaming-frontend/
├── index.html
├── README.md
├── css/
│   └── style.css
├── assets/
│   └── covers/
│       ├── cover-01.svg ... cover-06.svg
└── js/
    ├── config.js
    ├── demo-data.js
    ├── db.js
    ├── audio-engine.js
    ├── helpers.js
    ├── player.js
    └── music-app.js
```

## 5. Lưu ý khi ghép code nhóm

- `music-app.js` là điểm khởi chạy và điều phối UI.
- `db.js` hiện có hai chế độ: dữ liệu demo (`localStorage`) và gọi REST API.
- `audio-engine.js` quản lý phần tử HTML Audio ở trình duyệt.
- `player.js` gắn sự kiện cho thanh phát nhạc.
- Frontend chỉ nhận URL âm thanh đã được backend cho phép; không nên nhúng thông tin bí mật của kho lưu trữ vào JS.
- Bản hiện tại chưa triển khai đăng ký/đăng nhập, phân quyền RLS, upload file, thanh toán Premium hoặc trang quản trị.
