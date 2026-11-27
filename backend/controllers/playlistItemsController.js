const supabasePublic = require('../config/supabasePublic');
const createUserClient = require('../config/supabaseUser');

// Lấy danh sách bài hát trong playlist
const getPlaylistItems = async (req, res) => {
    try {
        const playlistId = req.params.playlistId;

        if (!/^[1-9]\d*$/.test(playlistId)) {
            return res.status(400).json({
                message: 'A valid playlistId is required.'
            });
        }

        let supabase;

        if (req.accessToken) {
            supabase = createUserClient(req.accessToken);
        } else {
            supabase = supabasePublic;
        }

        const { data, error } = await supabase
            .from('playlist_items')
            .select('*')
            .eq('playlist_id', playlistId)
            .order('position', { ascending: true });

        if (error) {
            console.error('Get playlist items error:', error.message);

            return res.status(500).json({
                message: 'Failed to retrieve playlist items.'
            });
        }

        res.json({
            message: 'Playlist items retrieved successfully.',
            count: data.length,
            items: data
        });
    } catch (error) {
        console.error('Get playlist items error:', error.message);

        res.status(500).json({
            message: 'Failed to retrieve playlist items.'
        });
    }
};

// Thêm bài hát vào cuối playlist
const addPlaylistItem = async (req, res) => {
    try {
        const supabase = createUserClient(req.accessToken);
        const playlistId = req.params.playlistId;
        const songId = req.body.song_id;

        if (!/^[1-9]\d*$/.test(playlistId)) {
            return res.status(400).json({
                message: 'A valid playlistId is required.'
            });
        }

        if (!Number.isSafeInteger(songId) || songId <= 0) {
            return res.status(400).json({
                message: 'A valid song_id is required.'
            });
        }

        const { data: existingItems, error: fetchError } = await supabase
            .from('playlist_items')
            .select('position')
            .eq('playlist_id', playlistId)
            .order('position', { ascending: false })
            .limit(1);

        if (fetchError) {
            console.error('Get last playlist position error:', fetchError.message);

            return res.status(500).json({
                message: 'Failed to determine playlist position.'
            });
        }

        const nextPosition = existingItems.length > 0
            ? existingItems[0].position + 1
            : 1;

        const { data, error } = await supabase
            .from('playlist_items')
            .insert({
                playlist_id: playlistId,
                song_id: songId,
                position: nextPosition
            })
            .select()
            .single();

        if (error) {
            console.error('Add playlist item error:', error.message);

            return res.status(500).json({
                message: 'Failed to add song to playlist.'
            });
        }

        res.status(201).json({
            message: 'Song added to playlist successfully.',
            item: data
        });
    } catch (error) {
        console.error('Add playlist item error:', error.message);

        res.status(500).json({
            message: 'Failed to add song to playlist.'
        });
    }
};

// Cập nhật vị trí bài hát trong playlist
const updatePlaylistItem = async (req, res) => {
    try {
        const supabase = createUserClient(req.accessToken);
        const itemId = req.params.itemId;
        const position = req.body.position;

        if (!/^[1-9]\d*$/.test(itemId)) {
            return res.status(400).json({
                message: 'A valid itemId is required.'
            });
        }

        if (!Number.isSafeInteger(position) || position <= 0) {
            return res.status(400).json({
                message: 'A valid position is required.'
            });
        }

        const { data, error } = await supabase
            .from('playlist_items')
            .update({ position })
            .eq('playlist_item_id', itemId)
            .select()
            .maybeSingle();

        if (error) {
            console.error('Update playlist item error:', error.message);

            return res.status(500).json({
                message: 'Failed to update playlist item.'
            });
        }

        if (!data) {
            return res.status(404).json({
                message: 'Playlist item not found or access denied.'
            });
        }

        res.json({
            message: 'Playlist item updated successfully.',
            item: data
        });
    } catch (error) {
        console.error('Update playlist item error:', error.message);

        res.status(500).json({
            message: 'Failed to update playlist item.'
        });
    }
};

// Xóa bài hát khỏi playlist
const deletePlaylistItem = async (req, res) => {
    try {
        const supabase = createUserClient(req.accessToken);
        const itemId = req.params.itemId;

        if (!/^[1-9]\d*$/.test(itemId)) {
            return res.status(400).json({
                message: 'A valid itemId is required.'
            });
        }

        const { data, error } = await supabase
            .from('playlist_items')
            .delete()
            .eq('playlist_item_id', itemId)
            .select()
            .maybeSingle();

        if (error) {
            console.error('Delete playlist item error:', error.message);

            return res.status(500).json({
                message: 'Failed to delete playlist item.'
            });
        }

        if (!data) {
            return res.status(404).json({
                message: 'Playlist item not found or access denied.'
            });
        }

        res.json({
            message: 'Playlist item deleted successfully.'
        });
    } catch (error) {
        console.error('Delete playlist item error:', error.message);

        res.status(500).json({
            message: 'Failed to delete playlist item.'
        });
    }
};

module.exports = {
    getPlaylistItems,
    addPlaylistItem,
    updatePlaylistItem,
    deletePlaylistItem
};
