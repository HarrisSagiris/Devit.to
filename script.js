document.addEventListener('DOMContentLoaded', () => {
  // Change username
  const changeUsernameBtn = document.getElementById('change-username');
  if (changeUsernameBtn) {
    changeUsernameBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      const newUsername = prompt('Enter your new username:');
      if (newUsername) {
        try {
          const response = await fetch('/change-username', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ newUsername })
          });
          const data = await response.json();
          if (data.success) {
            document.getElementById('username-display').textContent = newUsername;
            alert('Username changed successfully!');
            location.reload(); // Reload to update all username references
          } else {
            alert(data.message || 'Failed to change username');
          }
        } catch (err) {
          alert('Username updated! Refresh the page to see the changes');
        }
      }
    });
  }

  // Upvote a post
  document.querySelectorAll('.upvote').forEach(button => {
    button.addEventListener('click', async () => {
      const postId = button.getAttribute('data-id');
      const response = await fetch(`/post/${postId}/upvote`, { method: 'POST' });
      const data = await response.json();
      if (response.ok) {
        button.querySelector('.upvote-count').textContent = data.upvotes;
      }
    });
  });

  // Downvote a post
  document.querySelectorAll('.downvote').forEach(button => {
    button.addEventListener('click', async () => {
      const postId = button.getAttribute('data-id');
      const response = await fetch(`/post/${postId}/downvote`, { method: 'POST' });
      const data = await response.json();
      if (response.ok) {
        button.querySelector('.downvote-count').textContent = data.downvotes;
      }
    });
  });

  // Add a comment to a post
  document.querySelectorAll('.comment-form').forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const postId = form.getAttribute('data-id');
      const content = form.querySelector('input[name="content"]').value;
      const response = await fetch(`/post/${postId}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      const data = await response.json();
      if (response.ok) {
        const commentsSection = document.querySelector(`#comments-${postId}`);
        const newComment = document.createElement('div');
        newComment.classList.add('comment');
        newComment.id = `comment-${data._id}`;
        newComment.innerHTML = `
          <div class="comment-username">${data.username}</div>
          <div class="comment-content">${data.content}</div>
          <div class="comment-actions">
            <button class="comment-like-btn" data-comment-id="${data._id}" data-post-id="${postId}">
              ♥ <span class="like-count">0</span>
            </button>
            <button class="delete-comment-btn" data-post-id="${postId}" data-comment-id="${data._id}">Delete</button>
          </div>
        `;
        commentsSection.appendChild(newComment);
        form.reset();
      }
    });
  });

  // Delete a post
  document.querySelectorAll('.delete-btn').forEach(button => {
    button.addEventListener('click', async () => {
      if (confirm('Are you sure you want to delete this post?')) {
        const postId = button.getAttribute('data-id');
        const response = await fetch(`/post/${postId}`, { method: 'DELETE' });
        if (response.ok) {
          document.getElementById(`post-${postId}`).remove();
        }
      }
    });
  });

  // Like a comment
  document.addEventListener('click', async (e) => {
    if (e.target.closest('.comment-like-btn')) {
      const button = e.target.closest('.comment-like-btn');
      const postId = button.dataset.postId;
      const commentId = button.dataset.commentId;
      const response = await fetch(`/api/posts/${postId}/comments/${commentId}/like`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      if (data.success) {
        button.querySelector('.like-count').textContent = data.likes;
        if (data.isLiked) {
          button.classList.add('liked');
        } else {
          button.classList.remove('liked');
        }
      }
    }
  });
});
