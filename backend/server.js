const express = require('express');
const cors = require('cors');
require('dotenv').config();

const healthRoutes = require('./routes/healthRoutes');
const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');
const songsRoutes = require('./routes/songsRoutes');
const albumsRoutes = require('./routes/albumsRoutes');
const artistsRoutes = require('./routes/artistsRoutes');
const genresRoutes = require('./routes/genresRoutes');
const playlistsRoutes = require('./routes/playlistsRoutes');
const favoritesRoutes = require('./routes/favoritesRoutes');
const listeningHistoryRoutes = require('./routes/listeningHistoryRoutes');
const subscriptionPlansRoutes = require('./routes/subscriptionPlansRoutes');
const subscriptionsRoutes = require('./routes/subscriptionsRoutes');
const artistFollowsRoutes = require('./routes/artistFollowsRoutes');
const followsRoutes = require('./routes/followsRoutes');
const playlistItemsRoutes = require('./routes/playlistItemsRoutes');
const albumTracksRoutes = require('./routes/albumTracksRoutes');
const songArtistsRoutes = require('./routes/songArtistsRoutes');
const albumArtistsRoutes = require('./routes/albumArtistsRoutes');
const songGenresRoutes = require('./routes/songGenresRoutes');
const streamRoutes = require('./routes/streamRoutes');

const app = express();

app.use(cors({
    origin: process.env.FRONTEND_URL
}));

app.use(express.json());

app.use('/api/health', healthRoutes);
app.use('/api/stream', streamRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/songs', songsRoutes);
app.use('/api/albums', albumsRoutes);
app.use('/api/artists', artistsRoutes);
app.use('/api/genres', genresRoutes);
app.use('/api/playlists', playlistsRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/listening-history', listeningHistoryRoutes);
app.use('/api/subscription-plans', subscriptionPlansRoutes);
app.use('/api/subscriptions', subscriptionsRoutes);
app.use('/api/artist-follows', artistFollowsRoutes);
app.use('/api/follows', followsRoutes);
app.use('/api', playlistItemsRoutes);
app.use('/api', albumTracksRoutes);
app.use('/api', songArtistsRoutes);
app.use('/api', albumArtistsRoutes);
app.use('/api', songGenresRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log('Backend is running on port ' + PORT);
});
