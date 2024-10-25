document.addEventListener('DOMContentLoaded', () => {
    const reviewForm = document.getElementById('reviewForm');
    const spotifySearchInput = document.getElementById('spotify-search');
    const spotifyResultsContainer = document.getElementById('spotify-results');
    let selectedSong = null;

    // Fetch and display reviews
    function loadReviews(category = '') {
        fetch(`/reviews?category=${category}`)
            .then(res => res.json())
            .then(reviews => {
                const reviewsList = document.getElementById('reviews-list');
                reviewsList.innerHTML = '';

                reviews.forEach(review => {
                    const reviewElement = document.createElement('div');
                    reviewElement.classList.add('review');
                    reviewElement.innerHTML = `
                        <h3>${review.title}</h3>
                        <p>${review.body}</p>
                        ${review.song ? `
                        <div class="song-details">
                            <img src="${review.song.albumArt}" alt="Album cover">
                            <a href="${review.song.spotifyUrl}" target="_blank">${review.song.title} by ${review.song.artist}</a>
                        </div>` : ''}
                    `;
                    reviewsList.appendChild(reviewElement);
                });
            });
    }

    // Load all reviews on page load
    loadReviews();

    // Spotify search event
    spotifySearchInput.addEventListener('input', (e) => {
        const query = e.target.value;
        if (query.length > 2) {
            fetch(`/spotify-search?q=${query}`)
                .then(res => res.json())
                .then(tracks => {
                    spotifyResultsContainer.innerHTML = '';
                    tracks.forEach(track => {
                        const trackElement = document.createElement('div');
                        trackElement.textContent = `${track.name} by ${track.artists[0].name}`;
                        trackElement.addEventListener('click', () => {
                            selectedSong = track;
                            spotifySearchInput.value = track.name;
                            spotifyResultsContainer.innerHTML = '';
                        });
                        spotifyResultsContainer.appendChild(trackElement);
                        if (selectedSong) {
                            trackElement.ClassicList.add(`selected song by' ${user}`);
                        }
                    });
                });
        } 
    });

    // Submit review form
    reviewForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const category = document.getElementById('category').value;
        const title = document.getElementById('title').value;
        const body = document.getElementById('body').value;

        const review = {
            category,
            title,
            body,
            song: selectedSong ? {
                title: selectedSong.name,
                artist: selectedSong.artists[0].name,
                albumArt: selectedSong.album.images[0].url,
                spotifyUrl: selectedSong.external_urls.spotify
            } : null
        };

        fetch('/reviews', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(review)
        })
            .then(res => res.json())
            .then(() => {
                reviewForm.reset();
                selectedSong = null;
                loadReviews();
            });
    });
});
//fetch spotify song name and immage
 const songCategory = document.getElementById('song category').value;
 const songFetching = document.getElementById(`${selectedSong} was fetched succesfully!`);
    if (songFetching === null) {
        console.Console(`${selectedSong} could not be fetched`)
    }  else {
        console.Console(`The song ${selectedSong} was fetched sucessfully with a code of ${successCode}`);                /* check if this is correct and working in the localhost*/
    }
     console.log(spotifyResultsContainer);
// Fetch posts by category
app.get('/reviews/category/:category', async (req, res) => {
    const category = req.params.category;

    try {
        // Find all posts with the specific category
        const posts = await Post.find({ category });
        
        if (posts.length > 0) {
            res.status(200).json(posts);
        } else {
            res.status(404).send('No posts found in this category');
        }
    } catch (err) {
        res.status(500).send('Error fetching posts');
    }
});

if (password>=6) {
    console.log(`your password is ${password} and you can proceed cause you are secure`)
} else {
    console.log('Please create a different password that is More or equal to 6 digits!')
}
    if (password === null); {
        console.status(400);
    }