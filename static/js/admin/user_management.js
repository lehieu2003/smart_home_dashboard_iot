// Load users
function loadUsers() {
  fetch('/api/admin/users')
    .then((response) => response.json())
    .then((data) => {
      const tbody = document.querySelector('#users-table tbody');
      tbody.innerHTML = '';

      data.users.forEach((user) => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${user.id}</td>
          <td>${user.username}</td>
          <td>${user.email}</td>
          <td>${user.first_name} ${user.last_name}</td>
          <td>${user.role}</td>
          <td>${user.is_admin ? 'Yes' : 'No'}</td>
          <td>${user.last_login || 'Never'}</td>
          <td>
              <button class="btn btn-sm btn-outline-primary edit-user" data-id="${user.id}">
                  <i class="bi bi-pencil"></i>
              </button>
              <button class="btn btn-sm btn-outline-danger delete-user" data-id="${user.id}">
                  <i class="bi bi-trash"></i>
              </button>
          </td>
        `;
        tbody.appendChild(row);
      });

      // Setup edit/delete handlers
      setupUserButtons();
    })
    .catch((error) => console.error('Error loading users:', error));
}

// Setup user buttons
function setupUserButtons() {
  // Edit user button
  document.querySelectorAll('.edit-user').forEach((button) => {
    button.addEventListener('click', function () {
      const userId = this.getAttribute('data-id');
      openUserModal(userId);
    });
  });

  // Delete user button
  document.querySelectorAll('.delete-user').forEach((button) => {
    button.addEventListener('click', function () {
      const userId = this.getAttribute('data-id');
      if (confirm('Are you sure you want to delete this user?')) {
        deleteUser(userId);
      }
    });
  });
}

// Open user modal for add/edit
function openUserModal(userId = null) {
  const modal = new bootstrap.Modal(document.getElementById('userModal'));
  const modalTitle = document.getElementById('userModalTitle');
  const userIdInput = document.getElementById('userId');
  const usernameInput = document.getElementById('username');
  const emailInput = document.getElementById('email');
  const firstNameInput = document.getElementById('firstName');
  const lastNameInput = document.getElementById('lastName');
  const passwordInput = document.getElementById('password');
  const passwordHint = document.getElementById('passwordHint');
  const roleSelect = document.getElementById('role');
  const isAdminCheckbox = document.getElementById('isAdmin');

  // If editing existing user
  if (userId) {
    fetch(`/api/admin/users/${userId}`)
      .then((response) => response.json())
      .then((data) => {
        const user = data.user;
        userIdInput.value = user.id;
        usernameInput.value = user.username;
        emailInput.value = user.email;
        firstNameInput.value = user.first_name || '';
        lastNameInput.value = user.last_name || '';
        passwordInput.value = '';
        passwordHint.classList.remove('d-none');
        roleSelect.value = user.role;
        isAdminCheckbox.checked = user.is_admin;
        modalTitle.textContent = 'Edit User';
      })
      .catch((error) => console.error('Error loading user details:', error));
  } else {
    // New user
    userIdInput.value = '';
    usernameInput.value = '';
    emailInput.value = '';
    firstNameInput.value = '';
    lastNameInput.value = '';
    passwordInput.value = '';
    passwordHint.classList.add('d-none');
    roleSelect.value = 'User';
    isAdminCheckbox.checked = false;
    modalTitle.textContent = 'Add New User';
  }

  modal.show();
}

// Save user (create or update)
function saveUser() {
  const userId = document.getElementById('userId').value;
  const username = document.getElementById('username').value;
  const email = document.getElementById('email').value;
  const firstName = document.getElementById('firstName').value;
  const lastName = document.getElementById('lastName').value;
  const password = document.getElementById('password').value;
  const role = document.getElementById('role').value;
  const isAdmin = document.getElementById('isAdmin').checked;

  if (!username || !email) {
    alert('Username and email are required!');
    return;
  }

  const userData = {
    username: username,
    email: email,
    first_name: firstName,
    last_name: lastName,
    role: role,
    is_admin: isAdmin,
  };

  // Only include password if provided (for edit) or required (for new user)
  if (password || !userId) {
    userData.password = password;
  }

  const url = userId ? `/api/admin/users/${userId}` : '/api/admin/users';
  const method = userId ? 'PUT' : 'POST';

  fetch(url, {
    method: method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        const modal = bootstrap.Modal.getInstance(document.getElementById('userModal'));
        modal.hide();
        loadUsers();
      } else {
        alert('Error: ' + data.message);
      }
    })
    .catch((error) => {
      console.error('Error saving user:', error);
      alert('An error occurred while saving the user.');
    });
}

// Delete user
function deleteUser(userId) {
  fetch(`/api/admin/users/${userId}`, {
    method: 'DELETE',
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        loadUsers();
      } else {
        alert('Error: ' + data.message);
      }
    })
    .catch((error) => {
      console.error('Error deleting user:', error);
      alert('An error occurred while deleting the user.');
    });
}

// Export functions to be used in main admin.js
window.UserManagement = {
  loadUsers,
  openUserModal,
  saveUser,
  setupUserButtons
};
