const supabasePublic = require('../config/supabasePublic');
const createUserClient = require('../config/supabaseUser');

// Lấy danh sách playlist mà người dùng hiện tại được phép xem
const getPlaylists = async (req, res) => {
    try {
        const supabase = req.accessToken
            ? createUserClient(req.accessToken)
            : supabasePublic;

        const { data, error } = await supabase
            .from('playlists')
            .select(`
                playlist_id,
                user_id,
                name,
                description,
                is_public,
                created_at,
                playlist_items (
                    song_id,
                    position
                )
            `)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Get playlists error:', error.message);
            return res.status(500).json({
                message: 'Failed to retrieve playlists.'
            });
        }

        const playlists = data.map((playlist) => ({
            id: playlist.playlist_id,
            user_id: playlist.user_id,
            name: playlist.name,
            description: playlist.description,
            is_public: playlist.is_public,
            created_at: playlist.created_at,
            track_ids: (playlist.playlist_items || [])
                .slice()
                .sort((a, b) => a.position - b.position)
                .map((item) => item.song_id),
            cover_url: null
        }));

        return res.json({
            message: 'Playlists retrieved successfully.',
            count: playlists.length,
            playlists
        });
    } catch (error) {
        console.error('Get playlists error:', error.message);
        return res.status(500).json({
            message: 'Failed to retrieve playlists.'
        });
    }
};

// Tạo playlist cho người dùng đang đăng nhập
const createPlaylist = async (req, res) => {
    try {
        const name = typeof req.body.name === 'string'
            ? req.body.name.trim()
            : '';
        const description = typeof req.body.description === 'string'
            ? req.body.description.trim()
            : null;

        if (!name || name.length > 150) {
            return res.status(400).json({
                message: 'Playlist name is required and must not exceed 150 characters.'
            });
        }

        if (description && description.length > 1000) {
            return res.status(400).json({
                message: 'Playlist description must not exceed 1000 characters.'
            });
        }

        const supabase = createUserClient(req.accessToken);
        const { data, error } = await supabase
            .from('playlists')
            .insert({
                user_id: req.user.id,
                name,
                description: description || null
            })
            .select('playlist_id, user_id, name, description, is_public, created_at')
            .single();

        if (error) {
            console.error('Create playlist error:', error.message);
            return res.status(500).json({
                message: 'Failed to create playlist.'
            });
        }

        return res.status(201).json({
            message: 'Playlist created successfully.',
            playlist: {
                id: data.playlist_id,
                user_id: data.user_id,
                name: data.name,
                description: data.description,
                is_public: data.is_public,
                created_at: data.created_at,
                track_ids: [],
                cover_url: null
            }
        });
    } catch (error) {
        console.error('Create playlist error:', error.message);
        return res.status(500).json({
            message: 'Failed to create playlist.'
        });
    }
};

 
// Xóa playlist thuộc quyền sở hữu của người dùng đang đăng nhập
const deletePlaylist = async (req, res) => {
    try {
        const playlistId = Number(req.params.id);

        if (!Number.isSafeInteger(playlistId) || playlistId <= 0) {
            return res.status(400).json({
                message: 'Invalid playlist ID.'
            });
        }

        const supabase = createUserClient(req.accessToken);
        const { data, error } = await supabase
            .from('playlists')
            .delete()
            .eq('playlist_id', playlistId)
            .eq('user_id', req.user.id)
            .select('playlist_id')
            .maybeSingle();

        if (error) {
            console.error('Delete playlist error:', error.message);
            return res.status(500).json({
                message: 'Failed to delete playlist.'
            });
        }

        if (!data) {
            return res.status(404).json({
                message: 'Playlist not found or you do not have permission to delete it.'
            });
        }

        return res.json({
            message: 'Playlist deleted successfully.',
            playlist_id: data.playlist_id
        });
    } catch (error) {
        console.error('Delete playlist error:', error.message);
        return res.status(500).json({
            message: 'Failed to delete playlist.'
        });
    }
};

module.exports = {
    getPlaylists,
    createPlaylist,
    deletePlaylist
};
