const createUserClient = require('../config/supabaseUser');
const {
    enqueueListeningHistory,
    requestLeaderboardRefresh
} = require('../services/rankingBuffer');

// Lấy lịch sử nghe nhạc
const getListeningHistory = async (req, res) => {
    try {
        const supabase = createUserClient(req.accessToken);

        const { data, error } = await supabase
            .from('listening_history')
            .select('*')
            .order('played_at', { ascending: false });

        if (error) {
            console.error('Get listening history error:', error.message);

            return res.status(500).json({
                message: 'Failed to retrieve listening history.'
            });
        }

        res.json({
            message: 'Listening history retrieved successfully.',
            count: data.length,
            history: data
        });
    } catch (error) {
        console.error('Get listening history error:', error.message);

        res.status(500).json({
            message: 'Failed to retrieve listening history.'
        });
    }
};

// Ghi nhận lượt nghe
const addListeningHistory = async (req, res) => {
    try {
        const supabase = createUserClient(req.accessToken);

        const { song_id, listened_seconds, completed } = req.body;

        if (!song_id || !Number.isInteger(Number(song_id)) || Number(song_id) <= 0) {
            return res.status(400).json({
                message: 'A valid song_id is required.'
            });
        }

        if (
            listened_seconds !== undefined &&
            (!Number.isInteger(listened_seconds) || listened_seconds < 0)
        ) {
            return res.status(400).json({
                message: 'listened_seconds must be a non-negative integer.'
            });
        }

        if (
            completed !== undefined &&
            typeof completed !== 'boolean'
        ) {
            return res.status(400).json({
                message: 'completed must be a boolean.'
            });
        }

        const { data, error } = await supabase
            .from('listening_history')
            .insert({
                user_id: req.user.id,
                song_id: Number(song_id),
                listened_seconds: listened_seconds ?? null,
                completed: completed ?? false
            })
            .select()
            .single();

        if (error) {
            console.error('Add listening history error:', error.message);

            return res.status(500).json({
                message: 'Failed to add listening history.'
            });
        }

        res.status(201).json({
            message: 'Listening history added successfully.',
            history: data
        });
    } catch (error) {
        console.error('Add listening history error:', error.message);

        res.status(500).json({
            message: 'Failed to add listening history.'
        });
    }
};

// Cập nhật tiến trình của một lượt nghe
const updateListeningHistory = async (req, res) => {
    try {
        const supabase = createUserClient(req.accessToken);
        const historyId = Number(req.params.historyId);
        const { listened_seconds, completed } = req.body;

        if (!Number.isInteger(historyId) || historyId <= 0) {
            return res.status(400).json({
                message: 'A valid historyId is required.'
            });
        }

        if (
            listened_seconds === undefined &&
            completed === undefined
        ) {
            return res.status(400).json({
                message: 'At least one listening progress field is required.'
            });
        }

        if (
            listened_seconds !== undefined &&
            (!Number.isInteger(listened_seconds) || listened_seconds < 0)
        ) {
            return res.status(400).json({
                message: 'listened_seconds must be a non-negative integer.'
            });
        }

        if (
            completed !== undefined &&
            typeof completed !== 'boolean'
        ) {
            return res.status(400).json({
                message: 'completed must be a boolean.'
            });
        }

        const updates = {};
        if (listened_seconds !== undefined) updates.listened_seconds = listened_seconds;
        if (completed !== undefined) updates.completed = completed;

        const { data, error } = await supabase
            .from('listening_history')
            .update(updates)
            .eq('history_id', historyId)
            .eq('user_id', req.user.id)
            .select()
            .maybeSingle();

        if (error) {
            console.error('Update listening history error:', error.message);
            return res.status(500).json({
                message: 'Failed to update listening history.'
            });
        }

        if (!data) {
            return res.status(404).json({
                message: 'Listening history record not found.'
            });
        }

        enqueueListeningHistory(data.history_id);

        res.json({
            message: 'Listening history updated successfully.',
            history: data
        });
    } catch (error) {
        console.error('Update listening history error:', error.message);
        res.status(500).json({
            message: 'Failed to update listening history.'
        });
    }
};

// Xóa một bản ghi lịch sử nghe
const deleteListeningHistory = async (req, res) => {
    try {
        const supabase = createUserClient(req.accessToken);
        const historyId = Number(req.params.historyId);

        if (!Number.isInteger(historyId) || historyId <= 0) {
            return res.status(400).json({
                message: 'A valid historyId is required.'
            });
        }

        const { error } = await supabase
            .from('listening_history')
            .delete()
            .eq('history_id', historyId)
            .eq('user_id', req.user.id);

        if (error) {
            console.error('Delete listening history error:', error.message);

            return res.status(500).json({
                message: 'Failed to delete listening history.'
            });
        }

        requestLeaderboardRefresh();

        res.json({
            message: 'Listening history deleted successfully.'
        });
    } catch (error) {
        console.error('Delete listening history error:', error.message);

        res.status(500).json({
            message: 'Failed to delete listening history.'
        });
    }
};

module.exports = {
    getListeningHistory,
    addListeningHistory,
    updateListeningHistory,
    deleteListeningHistory
};