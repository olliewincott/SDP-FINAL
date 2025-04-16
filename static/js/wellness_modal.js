document.addEventListener('DOMContentLoaded', function () {
    const modalEl = document.getElementById('wellnessGoalsModal');
    const form = document.getElementById('wellnessGoalsForm');
    const editBtn = document.getElementById('editGoalsBtn');
  
    // Ensure Bootstrap modal is initialized
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
  
    if (editBtn) {
      editBtn.addEventListener('click', () => {
        modal.show();
      });
    }
  
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        const formData = new FormData(form);
  
        fetch(window.updateWellnessGoalsUrl, {
          method: 'POST',
          headers: {
            'X-CSRFToken': window.getCSRFToken()
          },
          body: formData
        })
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            console.log('✅ Goals updated');
            modal.hide();
            location.reload(); // Optional: force UI to refresh
          } else {
            alert(data.error || 'Failed to update goals.');
          }
        })
        .catch(() => {
          alert('❌ Server error while updating goals.');
        });
      });
    }
  
    window.getCSRFToken = function () {
      const name = 'csrftoken';
      const cookies = document.cookie.split(';');
      for (let cookie of cookies) {
        if (cookie.trim().startsWith(name + '=')) {
          return cookie.trim().substring(name.length + 1);
        }
      }
      return '';
    };
  });
  