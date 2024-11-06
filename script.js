document.addEventListener('DOMContentLoaded', () => {
    // JavaScript code from previous message
  });
document.addEventListener('DOMContentLoaded', () => {
    // Upvote a post
    document.querySelectorAll('.upvote').forEach(button => {
      button.addEventListener('click', async () => {
        const postId = button.getAttribute('data-id');
        const response = await fetch(`/post/${postId}/upvote`, { method: 'POST' });
        const data = await response.json();
        if (response.ok) {
          button.nextElementSibling.textContent = data.upvotes;
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
          button.previousElementSibling.textContent = data.downvotes;
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
          const commentContainer = form.previousElementSibling;
          const newComment = document.createElement('div');
          newComment.classList.add('comment');
          newComment.innerHTML = `<strong>${data.username}:</strong> ${data.content}`;
          commentContainer.appendChild(newComment);
          form.reset();
        }
      });
    });
  
    // Delete a post
    document.querySelectorAll('.delete-post').forEach(button => {
      button.addEventListener('click', async () => {
        const postId = button.getAttribute('data-id');
        const response = await fetch(`/post/${postId}`, { method: 'DELETE' });
        if (response.ok) {
          document.getElementById(`post-${postId}`).remove();
        }
      });
    });
  });
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.upvote').forEach(button => {
      button.addEventListener('click', async () => {
        const postId = button.dataset.id;
        const response = await fetch(`/post/${postId}/upvote`, { method: 'POST' });
        const data = await response.json();
        document.querySelector(`#post-${postId} p`).textContent = `Upvotes: ${data.upvotes}`;
      });
    });
  
    document.querySelectorAll('.downvote').forEach(button => {
      button.addEventListener('click', async () => {
        const postId = button.dataset.id;
        const response = await fetch(`/post/${postId}/downvote`, { method: 'POST' });
        const data = await response.json();
        document.querySelector(`#post-${postId} p`).textContent = `Downvotes: ${data.downvotes}`;
      });
    });
  
    document.querySelectorAll('.comment-form').forEach(form => {
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const postId = form.dataset.id;
        const content = form.querySelector('input[name="content"]').value;
        const response = await fetch(`/post/${postId}/comment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content })
        });
        const comment = await response.json();
        const commentDiv = document.createElement('div');
        commentDiv.className = 'comment';
        commentDiv.innerHTML = `<strong>${comment.username}:</strong> ${comment.content} <p>Upvotes: ${comment.upvotes}</p>`;
        document.querySelector(`#post-${postId}`).appendChild(commentDiv);
      });
    });
  
    document.querySelectorAll('.upvote-comment').forEach(button => {
      button.addEventListener('click', async () => {
        const postId = button.dataset.postId;
        const commentId = button.dataset.commentId;
        const response = await fetch(`/post/${postId}/comment/${commentId}/upvote`, { method: 'POST' });
        const data = await response.json();
        document.querySelector(`#comment-${commentId} p`).textContent = `Upvotes: ${data.upvotes}`;
      });
    });
  });
