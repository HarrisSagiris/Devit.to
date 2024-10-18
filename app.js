const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const Review = require('./models/review');  // Import the review model

dotenv.config();

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');

// Connect to MongoDB
mongoose.connect('mongodb+srv://appleidmusic960:Dataking8@tapsidecluster.oeofi.mongodb.net/', { useNewUrlParser: true });
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => console.log('Connected to MongoDB'));

// Routes

// Home page with reviews feed
app.get('/', async (req, res) => {
    try {
        const reviews = await Review.find();  // Fetch all reviews
        res.render('index', { reviews });
    } catch (err) {
        res.status(500).send('Error loading reviews.');
    }
});

// Post a new review
app.post('/reviews', async (req, res) => {
    const { title, content, category } = req.body;
    try {
        const review = new Review({ title, content, category });
        await review.save();  // Save review to database
        res.redirect('/');
    } catch (err) {
        res.status(500).send('Error saving the review.');
    }
});

// Filter reviews by category
app.get('/reviews/category/:category', async (req, res) => {
    const category = req.params.category;
    try {
        const reviews = await Review.find({ category });  // Fetch reviews for the category
        res.render('index', { reviews });
    } catch (err) {
        res.status(500).send('Error loading category reviews.');
    }
});

// Start the server
app.listen(3000, () => {
    console.log('ReviewIt server started on port 3000');
});
