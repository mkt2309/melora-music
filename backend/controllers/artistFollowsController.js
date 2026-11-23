const supabasePublic = require('../config/supabasePublic');
const createUserClient = require('../config/supabaseUser');

// Lấy danh sách lượt theo dõi nghệ sĩ
const getArtistFollows = async (req, res) => {
    try {
        let supabase;

        if (req.accessToken) {
            supabase = createUserClient(req.accessToken);
        } else {
            supabase = supabasePublic;
        }

        const { data, error } = await supabase
            .from('artist_follows')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Get artist follows error:', error.message);

            return res.status(500).json({
                message: 'Failed to retrieve artist follows.'
            });
        }

        res.json({
            message: 'Artist follows retrieved successfully.',
            count: data.length,
            artist_follows: data
        });
    } catch (error) {
        console.error('Get artist follows error:', error.message);

        res.status(500).json({
            message: 'Failed to retrieve artist follows.'
        });
    }
};

// Theo dõi nghệ sĩ
const followArtist = async (req, res) => {
    try {
        const supabase = createUserClient(req.accessToken);
        const artistId = Number(req.body.artist_id);

        if (!Number.isInteger(artistId) || artistId <= 0) {
            return res.status(400).json({
                message: 'A valid artist_id is required.'
            });
        }

        const { data, error } = await supabase
            .from('artist_follows')
            .insert({
                user_id: req.user.id,
                artist_id: artistId
            })
            .select()
            .single();

        if (error) {
            console.error('Follow artist error:', error.message);

            return res.status(500).json({
                message: 'Failed to follow artist.'
            });
        }

        res.status(201).json({
            message: 'Artist followed successfully.',
            artist_follow: data
        });
    } catch (error) {
        console.error('Follow artist error:', error.message);

        res.status(500).json({
            message: 'Failed to follow artist.'
        });
    }
};

// Bỏ theo dõi nghệ sĩ
const unfollowArtist = async (req, res) => {
    try {
        const supabase = createUserClient(req.accessToken);
        const artistId = Number(req.params.artistId);

        if (!Number.isInteger(artistId) || artistId <= 0) {
            return res.status(400).json({
                message: 'A valid artistId is required.'
            });
        }

        const { error } = await supabase
            .from('artist_follows')
            .delete()
            .eq('user_id', req.user.id)
            .eq('artist_id', artistId);

        if (error) {
            console.error('Unfollow artist error:', error.message);

            return res.status(500).json({
                message: 'Failed to unfollow artist.'
            });
        }

        res.json({
            message: 'Artist unfollowed successfully.'
        });
    } catch (error) {
        console.error('Unfollow artist error:', error.message);

        res.status(500).json({
            message: 'Failed to unfollow artist.'
        });
    }
};

module.exports = {
    getArtistFollows,
    followArtist,
    unfollowArtist
};