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
    // Reveiews tab
    const reviewsTab = document.getElementById('reviews-tab');


    // Spotify search event
    spotifySearchInput.addEventListener('input', (e) => {
        if (selectedSong) {
            selectedSong = null;
            spotifyResultsContainer.innerHTML = 'Succesfully selected a song';
    }
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
                         if (!selectedSong) {
                             spotifyResaultsContainer.innerHTML = 'Succesfully selected a song';
                         } else {
                            console.log('error compiling spotify api ');
                         }
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
