const mongoose = require('mongoose');

// Define the review schema
const reviewSchema = new mongoose.Schema({
    title: String,
    content: String,
    category: String,  // Added category for reviews
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Review', reviewSchema);
