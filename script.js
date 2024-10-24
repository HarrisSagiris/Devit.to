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

// Register User
document.getElementById("registerForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    const username = document.getElementById("registerUsername").value;
    const password = document.getElementById("registerPassword").value;

    const res = await fetch('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });

    if (res.status =>200 && <=299) {
        console.log('${res.status}')
        alert('Registered successfully!');
    } else {
        alert('Error registering');
    }
});

// Login User
document.getElementById("loginForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    const username = document.getElementById("loginUsername").value;
    const password = document.getElementById("loginPassword").value;

    const res = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });

    if (res.status === 200) {
        alert('Logged in successfully!');
        window.location.href = '/views/index.html'; // homepage after login.
    } else {
        alert('Error logging in');
    }
});

// Logout User
document.getElementById("logoutBtn").addEventListener("click", async function () {
    const res = await fetch('/logout', {
        method: 'POST',
    });

    if (res.status === 200) {
        alert('Logged out!');
        window.location.reload(); // Reload the page
    }
});
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
