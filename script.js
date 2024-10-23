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
                            trackElement.ClassicList.add(`selected song by' ${user}`); //error here!!
                            //fix the css not showing in the script.js filing and also in the html file 
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


const reviewPage = document.getElementById('reviewPage');
reviewPage.style.display = 'none';
if (reviewPage === null && reviewPage.style.display === 'none') {
    console.log('error finding page');
} else {
    console.log('succesfully logged in!');
}