const supabase = require('../config/supabase');
const supabasePublic = require('../config/supabasePublic');

// Tạo URL có thời hạn cho tệp âm thanh thuộc một bài hát trong thư viện.
const getStreamUrl = async (req, res) => {
    try {
        const songId = req.params.songId;

        if (!/^[1-9]\d*$/.test(songId)) {
            return res.status(400).json({
                message: 'A valid songId is required.'
            });
        }

        const { data: song, error: songError } = await supabasePublic
            .from('songs')
            .select('song_id, title, audio_path')
            .eq('song_id', songId)
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
                message: 'Audio file is not available for this song yet.'
            });
        }

        const { data, error } = await supabase.storage
            .from('audio')
            .createSignedUrl(song.audio_path, 3600);

        if (error || !data?.signedUrl) {
            console.error('Create audio signed URL error:', error?.message);
            return res.status(500).json({
                message: 'Unable to create an audio stream URL.'
            });
        }

        return res.json({
            message: 'Audio stream URL created successfully.',
            song_id: song.song_id,
            url: data.signedUrl,
            expires_in: 3600
        });
    } catch (error) {
        console.error('Get stream URL error:', error.message);
        return res.status(500).json({
            message: 'Failed to create audio stream URL.'
        });
    }
};

module.exports = {
    getStreamUrl
};
