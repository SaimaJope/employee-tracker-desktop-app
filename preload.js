// preload.js -
// preload.js
window.addEventListener('DOMContentLoaded', () => {
    // === SPLASH SCREEN LOGIC ===
    const splashScreen = document.getElementById('splash-screen');
    const appContent = document.getElementById('app-content');
    setTimeout(() => {
        if (splashScreen) splashScreen.classList.add('hidden');
        if (appContent) appContent.classList.remove('hidden');
    }, 2500);
    // === END OF SPLASH SCREEN LOGIC ===

    // --- GLOBAL STATE ---
    let authToken = null;

    // --- ELEMENT REFERENCES ---
    const loginView = document.getElementById('login-view');
    const mainAppView = document.getElementById('main-app-view');
    const loginForm = document.getElementById('login-form');
    const registerModal = document.getElementById('register-modal');
    const deleteConfirmModal = document.getElementById('delete-confirm-modal');

    // --- HELPER FUNCTIONS ---
    async function apiFetch(url, options = {}) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        const fetchOptions = {
            method: 'GET',
            ...options,
            headers: { 'Content-Type': 'application/json', ...options.headers },
            signal: controller.signal,
        };
        if (authToken) fetchOptions.headers['Authorization'] = `Bearer ${authToken}`;
        try {
            const response = await fetch(`https://varah-8asg.onrender.com${url}`, fetchOptions);
            clearTimeout(timeoutId);
            if (response.status === 401) handleLogout();
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                const data = await response.json();
                if (!response.ok) throw new Error(data.message || `Server Error: ${response.status}`);
                return data;
            } else {
                if (!response.ok) throw new Error(`Server returned a non-JSON error page (Status: ${response.status})`);
            }
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }

    function showView(viewName) {
        loginView.style.display = 'none';
        mainAppView.style.display = 'none';
        if (viewName === 'login') loginView.style.display = 'flex';
        else if (viewName === 'main') {
            mainAppView.style.display = 'block';
            showSection('log');
        }
    }

    function showSection(sectionName) {
        document.getElementById('log-section').style.display = 'none';
        document.getElementById('manage-section').style.display = 'none';
        document.getElementById('kiosk-section').style.display = 'none';
        if (sectionName === 'log') {
            document.getElementById('log-section').style.display = 'block';
            fetchAndUpdateLogs();
        } else if (sectionName === 'manage') {
            document.getElementById('manage-section').style.display = 'block';
            fetchAndDisplayEmployees();
        } else if (sectionName === 'kiosk') {
            document.getElementById('kiosk-section').style.display = 'block';
        }
    }

    function handleLogout() {
        authToken = null;
        showView('login');
    }

    // --- DATA FETCHING & ACTION FUNCTIONS ---
    async function fetchAndDisplayEmployees() {
        const tableBody = document.getElementById('employee-table-body');
        if (!authToken || !tableBody) return;
        tableBody.closest('table').setAttribute('aria-busy', 'true');
        try {
            const employees = await apiFetch('/api/employees');
            tableBody.innerHTML = '';
            if (employees.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="3">No employees found.</td></tr>`;
            } else {
                employees.forEach(emp => {
                    const row = document.createElement('tr');
                    row.innerHTML = `<td>${emp.name}</td><td>${emp.nfc_card_id}</td><td><button class="outline contrast delete-employee-button" data-id="${emp.id}">Delete</button></td>`;
                    tableBody.appendChild(row);
                });
            }
        } catch (error) {
            tableBody.innerHTML = `<tr><td colspan="3">Error: ${error.message}</td></tr>`;
        } finally {
            tableBody.closest('table').setAttribute('aria-busy', 'false');
        }
    }

    function deleteEmployee(employeeId) {
        const manageContainer = document.getElementById('manage-section');
        if (manageContainer) manageContainer.setAttribute('aria-busy', 'true');
        setTimeout(async () => {
            try {
                await apiFetch(`/api/employees/${employeeId}`, { method: 'DELETE' });
            } catch (error) {
                document.getElementById('manage-status-message').textContent = `Error: ${error.message}`;
            } finally {
                if (manageContainer) manageContainer.setAttribute('aria-busy', 'false');
                fetchAndDisplayEmployees();
            }
        }, 0);
    }

    async function fetchAndUpdateLogs() {
        /* Not implemented yet */
    }

    // --- EVENT LISTENERS (ATTACHED AFTER EVERYTHING IS DEFINED) ---
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const loginButton = document.getElementById('login-button');
            const loginErrorMessage = document.getElementById('login-error-message');
            loginButton.setAttribute('aria-busy', 'true');
            loginErrorMessage.textContent = '';
            try {
                const data = await apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: document.getElementById('login-email').value, password: document.getElementById('login-password').value }) });
                authToken = data.token;
                showView('main');
            } catch (error) {
                loginErrorMessage.textContent = error.message;
            } finally {
                loginButton.setAttribute('aria-busy', 'false');
            }
        });
    }

    if (mainAppView) {
        mainAppView.addEventListener('click', (e) => {
            const target = e.target;
            const navLink = target.closest('a[role="button"], a#logout-button');
            const deleteButton = target.closest('button.delete-employee-button');
            if (deleteButton) {
                deleteConfirmModal.dataset.employeeId = deleteButton.dataset.id;
                deleteConfirmModal.showModal();
            } else if (navLink) {
                e.preventDefault();
                if (navLink.id === 'logout-button') handleLogout();
                else if (navLink.id === 'nav-logs') showSection('log');
                else if (navLink.id === 'nav-manage') showSection('manage');
                else if (navLink.id === 'nav-kiosks') showSection('kiosk');
            }
        });
    }

    // --- THIS IS THE FINAL, BULLETPROOF ADD EMPLOYEE FORM ---
    if (document.getElementById('add-employee-form')) {
        document.getElementById('add-employee-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const addEmployeeButton = e.target.querySelector('button[type="submit"]');

            // Hard lock: If the button is already disabled, do nothing.
            if (addEmployeeButton.disabled) {
                return;
            }

            // Physically disable the button and set busy state
            addEmployeeButton.disabled = true;
            addEmployeeButton.setAttribute('aria-busy', 'true');
            const manageStatusMessage = document.getElementById('manage-status-message');
            manageStatusMessage.textContent = '';

            const name = document.getElementById('new-employee-name').value.trim();
            const cardId = document.getElementById('new-employee-card-id').value.trim();

            try {
                const data = await apiFetch('/api/employees', { method: 'POST', body: JSON.stringify({ name, nfc_card_id: cardId }) });
                manageStatusMessage.textContent = data.message;
                e.target.reset();
            } catch (error) {
                manageStatusMessage.textContent = `Error: ${error.message}`;
            } finally {
                // ALWAYS re-enable the button and refresh the list
                addEmployeeButton.disabled = false;
                addEmployeeButton.setAttribute('aria-busy', 'false');
                fetchAndDisplayEmployees();
            }
        });
    }

    // --- REGISTRATION AND DELETE MODAL LISTENERS ---
    if (registerModal) {
        document.getElementById('show-register-modal').addEventListener('click', (e) => {
            e.preventDefault();
            registerModal.showModal();
        });
        document.getElementById('close-register-modal').addEventListener('click', (e) => {
            e.preventDefault();
            registerModal.close();
        });
        document.getElementById('register-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const regButton = document.getElementById('register-button');
            const regError = document.getElementById('register-error-message');
            const regSuccess = document.getElementById('register-success-message');
            regButton.setAttribute('aria-busy', 'true');
            regError.textContent = '';
            regSuccess.textContent = '';
            try {
                // Not using apiFetch here since it requires auth token which we don't have yet
                const response = await fetch('https://varah-8asg.onrender.com/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        companyName: document.getElementById('register-companyName').value,
                        email: document.getElementById('register-email').value,
                        password: document.getElementById('register-password').value
                    })
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.message);
                regSuccess.textContent = 'Success! You can now close this and log in.';
                e.target.reset();
            } catch (error) {
                regError.textContent = error.message;
            } finally {
                regButton.setAttribute('aria-busy', 'false');
            }
        });
    }

    if (deleteConfirmModal) {
        document.getElementById('confirm-delete-btn').addEventListener('click', () => {
            const idToDelete = deleteConfirmModal.dataset.employeeId;
            if (idToDelete) deleteEmployee(idToDelete);
            deleteConfirmModal.close();
        });
        document.getElementById('cancel-delete-btn').addEventListener('click', () => deleteConfirmModal.close());
        document.getElementById('cancel-delete-btn-x').addEventListener('click', () => deleteConfirmModal.close());
    }

    // --- INITIALIZATION ---
    showView('login');
});