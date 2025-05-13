document.addEventListener('DOMContentLoaded', function () {
  // Navigation
  function setupNavigation() {
    document
      .querySelectorAll('.nav-link[data-section]')
      .forEach((navLink) => {
        navLink.addEventListener('click', function (e) {
          e.preventDefault();

          // Update active nav link
          document.querySelectorAll('.nav-link').forEach((link) => {
            link.classList.remove('active');
          });
          this.classList.add('active');

          // Show target section, hide others
          const targetSection = this.getAttribute('data-section');
          document.querySelectorAll('.section').forEach((section) => {
            section.classList.add('d-none');
          });
          document.getElementById(targetSection).classList.remove('d-none');
        });
      });
  }

  // Load dashboard statistics
  function loadStats() {
    fetch('/api/admin/statistics')
      .then((response) => response.json())
      .then((data) => {
        document.getElementById('total-users').textContent = data.user_count;
        document.getElementById('total-devices').textContent = data.device_count;
        document.getElementById('active-users').textContent = data.active_users;
        document.getElementById('user-actions').textContent = data.actions_count;
      })
      .catch((error) => console.error('Error loading statistics:', error));
  }

  // Initialize all event listeners
  function initEventListeners() {
    document.getElementById('refresh-stats').addEventListener('click', loadStats);

    // User management event listeners
    document.getElementById('create-user-btn').addEventListener('click', () => 
      window.UserManagement.openUserModal());
    document.getElementById('add-user-btn').addEventListener('click', () => {
      document.querySelector('.nav-link[data-section="users-section"]').click();
      setTimeout(() => window.UserManagement.openUserModal(), 300);
    });
    document.getElementById('saveUserBtn').addEventListener('click', 
      window.UserManagement.saveUser);

    // Home management event listeners
    document.getElementById('create-home-btn').addEventListener('click', () => 
      window.HomeManagement.openHomeModal());
    document.getElementById('add-home-btn').addEventListener('click', () => {
      document.querySelector('.nav-link[data-section="homes-section"]').click();
      setTimeout(() => window.HomeManagement.openHomeModal(), 300);
    });
    document.getElementById('saveHomeBtn').addEventListener('click', 
      window.HomeManagement.saveHome);
      
    // Device management event listeners
    document.getElementById('create-device-btn').addEventListener('click', () => 
      window.DeviceManagement.openDeviceModal());
    document.getElementById('add-device-btn').addEventListener('click', () => {
      document.querySelector('.nav-link[data-section="devices-section"]').click();
      setTimeout(() => window.DeviceManagement.openDeviceModal(), 300);
    });
  }

  // Initialize the application
  function init() {
    setupNavigation();
    loadStats();
    
    // Load data from all modules
    window.UserManagement.loadUsers();
    window.DeviceManagement.loadDevices();
    window.HomeManagement.loadHomes();
    
    // Setup event listeners
    initEventListeners();
  }

  // Start the application
  init();
});
