// Load homes
function loadHomes() {
  fetch('/api/admin/homes')
    .then((response) => response.json())
    .then((data) => {
      const tbody = document.querySelector('#homes-table tbody');
      tbody.innerHTML = '';

      data.homes.forEach((home) => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${home.id}</td>
          <td>${home.name}</td>
          <td>${home.address || 'N/A'}</td>
          <td>${home.owner_id}</td>
          <td>${home.floors ? home.floors.length : 0}</td>
          <td>${home.total_rooms || 0}</td>
          <td>
            <button class="btn btn-sm btn-outline-primary edit-home" data-id="${home.id}">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger delete-home" data-id="${home.id}">
              <i class="bi bi-trash"></i>
            </button>
          </td>
        `;
        tbody.appendChild(row);
      });

      // Setup edit/delete handlers
      setupHomeButtons();
    })
    .catch((error) => console.error('Error loading homes:', error));
}

// Setup home buttons
function setupHomeButtons() {
  // Edit home button
  document.querySelectorAll('.edit-home').forEach((button) => {
    button.addEventListener('click', function () {
      const homeId = this.getAttribute('data-id');
      openHomeModal(homeId);
    });
  });

  // Delete home button
  document.querySelectorAll('.delete-home').forEach((button) => {
    button.addEventListener('click', function () {
      const homeId = this.getAttribute('data-id');
      if (confirm('Are you sure you want to delete this home?')) {
        deleteHome(homeId);
      }
    });
  });
}

// Open home modal for add/edit
function openHomeModal(homeId = null) {
  const modal = new bootstrap.Modal(document.getElementById('homeModal'));
  const modalTitle = document.getElementById('homeModalTitle');
  const homeIdInput = document.getElementById('homeId');
  const homeNameInput = document.getElementById('homeName');
  const homeAddressInput = document.getElementById('homeAddress');
  const homeOwnerSelect = document.getElementById('homeOwner');
  const homeDescriptionInput = document.getElementById('homeDescription');

  // Load users for owner select
  fetch('/api/admin/users')
    .then((response) => response.json())
    .then((data) => {
      homeOwnerSelect.innerHTML = '';
      data.users.forEach((user) => {
        const option = document.createElement('option');
        option.value = user.id;
        option.textContent = `${user.first_name} ${user.last_name} (${user.username})`;
        homeOwnerSelect.appendChild(option);
      });

      // If editing existing home
      if (homeId) {
        fetch(`/api/admin/homes/${homeId}`)
          .then((response) => response.json())
          .then((data) => {
            const home = data.home;
            homeIdInput.value = home.id;
            homeNameInput.value = home.name;
            homeAddressInput.value = home.address || '';
            homeOwnerSelect.value = home.owner_id;
            homeDescriptionInput.value = home.description || '';
            modalTitle.textContent = 'Edit Home';
          })
          .catch((error) => console.error('Error loading home details:', error));
      } else {
        // New home
        homeIdInput.value = '';
        homeNameInput.value = '';
        homeAddressInput.value = '';
        homeDescriptionInput.value = '';
        modalTitle.textContent = 'Add New Home';
      }
    })
    .catch((error) => console.error('Error loading users:', error));

  modal.show();
}

// Save home (create or update)
function saveHome() {
  const homeId = document.getElementById('homeId').value;
  const homeName = document.getElementById('homeName').value;
  const homeAddress = document.getElementById('homeAddress').value;
  const homeOwner = document.getElementById('homeOwner').value;
  const homeDescription = document.getElementById('homeDescription').value;

  const homeData = {
    name: homeName,
    address: homeAddress,
    owner_id: homeOwner,
    description: homeDescription,
  };

  const url = homeId ? `/api/admin/homes/${homeId}` : '/api/admin/homes';
  const method = homeId ? 'PUT' : 'POST';

  fetch(url, {
    method: method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(homeData),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        const modal = bootstrap.Modal.getInstance(document.getElementById('homeModal'));
        modal.hide();
        loadHomes();
      } else {
        alert('Error: ' + data.message);
      }
    })
    .catch((error) => {
      console.error('Error saving home:', error);
      alert('An error occurred while saving the home.');
    });
}

// Delete home
function deleteHome(homeId) {
  fetch(`/api/admin/homes/${homeId}`, {
    method: 'DELETE',
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        loadHomes();
      } else {
        alert('Error: ' + data.message);
      }
    })
    .catch((error) => {
      console.error('Error deleting home:', error);
      alert('An error occurred while deleting the home.');
    });
}

// Export functions to be used in main admin.js
window.HomeManagement = {
  loadHomes,
  openHomeModal,
  saveHome,
  setupHomeButtons
};
