const cover = (number) => `./assets/covers/cover-${String(number).padStart(2, '0')}.svg`;

export const demoArtists = [
  { id: 'ar-01', name: 'Linh Đan', image_url: cover(1), bio: 'Pop / Indie' },
  { id: 'ar-02', name: 'The Coastline', image_url: cover(2), bio: 'Indie Pop' },
  { id: 'ar-03', name: 'Minh Khuê', image_url: cover(3), bio: 'R&B / Soul' },
  { id: 'ar-04', name: 'June & July', image_url: cover(4), bio: 'Alternative' },
  { id: 'ar-05', name: 'An Nhiên', image_url: cover(5), bio: 'Acoustic' }
];

// URL âm thanh là file mẫu công khai để thử player.
// Khi tích hợp hệ thống thật, backend sẽ trả URL từ Object Storage/CDN.
export const demoTracks = [
  { id: 'song-01', title: 'Một ngày dịu êm', artist: 'Linh Đan', artist_id: 'ar-01', album: 'Nắng qua ô cửa', album_id: 'al-01', plays: 12840, cover_url: cover(1), audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
  { id: 'song-02', title: 'Đi qua mùa hạ', artist: 'The Coastline', artist_id: 'ar-02', album: 'Summer Notes', album_id: 'al-02', plays: 9620, cover_url: cover(2), audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
  { id: 'song-03', title: 'Chạm vào mây', artist: 'Minh Khuê', artist_id: 'ar-03', album: 'Blue Hour', album_id: 'al-03', plays: 7540, cover_url: cover(3), audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
  { id: 'song-04', title: 'Những ô cửa sáng đèn', artist: 'June & July', artist_id: 'ar-04', album: 'City Lights', album_id: 'al-04', plays: 6180, cover_url: cover(4), audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3' },
  { id: 'song-05', title: 'Thở cùng bình yên', artist: 'An Nhiên', artist_id: 'ar-05', album: 'Ở đây có nắng', album_id: 'al-05', plays: 5120, cover_url: cover(5), audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3' },
  { id: 'song-06', title: 'Phía cuối con đường', artist: 'Linh Đan', artist_id: 'ar-01', album: 'Nắng qua ô cửa', album_id: 'al-01', plays: 4870, cover_url: cover(1), audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3' },
  { id: 'song-07', title: 'Ngày không vội', artist: 'The Coastline', artist_id: 'ar-02', album: 'Summer Notes', album_id: 'al-02', plays: 4210, cover_url: cover(2), audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3' },
  { id: 'song-08', title: 'Sau cơn mưa', artist: 'Minh Khuê', artist_id: 'ar-03', album: 'Blue Hour', album_id: 'al-03', plays: 3960, cover_url: cover(3), audio_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3' }
];

export const demoAlbums = [
  { id: 'al-01', title: 'Nắng qua ô cửa', artist: 'Linh Đan', year: 2025, cover_url: cover(1), track_ids: ['song-01', 'song-06'] },
  { id: 'al-02', title: 'Summer Notes', artist: 'The Coastline', year: 2025, cover_url: cover(2), track_ids: ['song-02', 'song-07'] },
  { id: 'al-03', title: 'Blue Hour', artist: 'Minh Khuê', year: 2024, cover_url: cover(3), track_ids: ['song-03', 'song-08'] },
  { id: 'al-04', title: 'City Lights', artist: 'June & July', year: 2024, cover_url: cover(4), track_ids: ['song-04'] },
  { id: 'al-05', title: 'Ở đây có nắng', artist: 'An Nhiên', year: 2025, cover_url: cover(5), track_ids: ['song-05'] }
];

export const demoPlaylists = [
  { id: 'pl-01', name: 'Một chút chill', description: 'Những giai điệu nhẹ nhàng cho ngày dài.', track_ids: ['song-01', 'song-03', 'song-05'], cover_url: cover(3) },
  { id: 'pl-02', name: 'Đi đâu đó', description: 'Nhạc dành cho những chuyến đi.', track_ids: ['song-02', 'song-04'], cover_url: cover(2) }
];
