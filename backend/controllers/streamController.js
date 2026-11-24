const supabasePublic = require('../config/supabasePublic');

// Trả về URL HTTPS trực tiếp của bản nhạc mẫu SoundHelix.
const getStreamUrl = async (req, res) => {
    try {
        const songId = req.params.songId;
        const numericSongId = Number(songId);

        if (
            !Number.isSafeInteger(numericSongId) ||
            numericSongId < 1 ||
            String(numericSongId) !== songId
        ) {
            return res.status(400).json({
                message: 'A valid songId is required.'
            });
        }

        const { data: song, error: songError } = await supabasePublic
            .from('songs')
            .select('song_id, title, audio_path, mime_type')
            .eq('song_id', numericSongId)
            .maybeSingle();

        if (songError) {
            console.error('Get stream song error:', songError.message);
            return res.status(500).json({
                message: 'Failed to retrieve song information.'
            });
        }

        if (!song) {
            return res.status(404).json({
                message: 'Song not found.'
            });
        }

        if (!song.audio_path) {
            return res.status(404).json({
                message: 'Audio URL is not available for this song yet.'
            });
        }

        let audioUrl;

        try {
            audioUrl = new URL(song.audio_path);
        } catch {
            return res.status(500).json({
                message: 'The audio URL stored for this song is invalid.'
            });
        }

        // Mỗi bài trong bộ dữ liệu hiện tại được gán một bản mẫu SoundHelix tương ứng.
        const expectedPath = `/examples/mp3/SoundHelix-Song-${numericSongId - 8}.mp3`;

        if (
            numericSongId < 9 ||
            numericSongId > 16 ||
            audioUrl.protocol !== 'https:' ||
            audioUrl.hostname !== 'www.soundhelix.com' ||
            audioUrl.pathname !== expectedPath
        ) {
            return res.status(400).json({
                message: 'The audio URL is not an approved SoundHelix sample.'
            });
        }

        return res.json({
            message: 'Audio stream URL retrieved successfully.',
            song_id: song.song_id,
            url: audioUrl.href,
            mime_type: song.mime_type || 'audio/mpeg'
        });
    } catch (error) {
        console.error('Get stream URL error:', error.message);
        return res.status(500).json({
            message: 'Failed to retrieve audio stream URL.'
        });
    }
};

module.exports = {
    getStreamUrl
};
