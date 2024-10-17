require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const bodyParser = require('body-parser');
const querystring = require('querystring');
const Review = require('./models/review');

const app = express();
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));

// MongoDB connection
mongoose.connect('mongodb+srv://appleidmusic960:Dataking8@tapsidecluster.oeofi.mongodb.net/', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.log(err));

// Home route
app.get('/', async (req, res) => {
    const reviews = await Review.find();
    res.render('index', { reviews });
});

// Search route
app.post('/search', async (req, res) => {
    const query = req.body.query;
    const apiKey = process.env.OMDB_API_KEY;  // OMDb API Key
    const spotifyClientId = process.env.SPOTIFY_CLIENT_ID;  // Spotify Client ID
    const spotifyClientSecret = process.env.SPOTIFY_CLIENT_SECRET;  // Spotify Client Secret

    try {
        // Fetch movies from OMDb API
        const movieResponse = await axios.get(`http://www.omdbapi.com/?s=${query}&apikey=${apiKey}`);
        const movies = movieResponse.data.Search || [];

        // Fetch books from Open Library API
        const bookResponse = await axios.get(`http://openlibrary.org/search.json?q=${query}`);
        const books = bookResponse.data.docs || [];

        // Fetch music from Spotify API
        const spotifyToken = await getSpotifyToken(spotifyClientId, spotifyClientSecret);
        const musicResponse = await axios.get(`https://api.spotify.com/v1/search?q=${query}&type=track`, {
            headers: {
                'Authorization': `Bearer ${spotifyToken}`
            }
        });
        const tracks = musicResponse.data.tracks.items || [];

        // Render search results
        res.render('search', { query, movies, books, tracks });
    } catch (error) {
        console.error(error);
        res.send("Error fetching results");
    }
});

// Add a review
app.post('/reviews', async (req, res) => {
    const { title, content } = req.body;
    const review = new Review({ title, content });
    await review.save();
    res.redirect('/');
});

// Function to get Spotify access token
async function getSpotifyToken(clientId, clientSecret) {
    const tokenResponse = await axios.post('https://accounts.spotify.com/api/token', querystring.stringify({
        grant_type: 'client_credentials'
    }), {
        headers: {
            'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    });
    return tokenResponse.data.access_token;
}

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`ReviewIt server started on port ${PORT}`));
