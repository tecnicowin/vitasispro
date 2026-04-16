// js/main.js

if ('serviceWorker' in navigator) {
    // Recargar cuando el nuevo SW tome el control
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
    });

    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').then(reg => {
            reg.addEventListener('updatefound', () => {
                const newWorker = reg.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        showUpdateToast(reg);
                    }
                });
            });
        });
    });
}

function showUpdateToast(reg) {
    const toast = document.createElement('div');
    toast.className = 'toast update-toast active';
    toast.style.bottom = '85px';
    toast.style.background = 'var(--primary)';
    toast.innerHTML = `<div style="display:flex; align-items:center; gap:10px;"><i data-lucide="refresh-cw" style="width:16px;"></i><span>Actualización disponible. <b>Toca para aplicar</b></span></div>`;
    document.body.appendChild(toast);
    if (window.lucide) window.lucide.createIcons();
    toast.onclick = () => { if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' }); };
}

function initEventListeners() {
    // Navegación
    document.querySelectorAll('[data-screen]').forEach(btn => {
        btn.addEventListener('click', () => {
            const screenId = btn.getAttribute('data-screen');
            switchScreen(screenId);
            if (btn.classList.contains('nav-item')) {
                document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
                btn.classList.add('active');
            }
        });
    });

    // Filtros
    document.getElementById('tx-search-input')?.addEventListener('input', (e) => renderTransactions(e.target.value));
    document.querySelectorAll('.filter-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            activeFilter = chip.dataset.filter;
            document.querySelectorAll(`.filter-chip`).forEach(c => c.classList.toggle('active', c.dataset.filter === activeFilter));
            renderTransactions();
            updateCharts();
        });
    });

    // Exportar
    document.getElementById('export-csv-btn')?.addEventListener('click', exportTransactionsToCSV);

    // Asistente
    document.getElementById('ask-assistant-btn')?.addEventListener('click', () => {
        document.getElementById('assistant-panel').classList.add('active');
        if (!state.userName) { 
            addChatMessage("¡Hola! ¿Cómo te llamas?", 'bot'); 
            state.isAwaitingName = true; 
        } else if (document.getElementById('chat-container').children.length === 0) {
            addChatMessage(`${getGreeting()}, ${state.userName}. ¿En qué te ayudo?`, 'bot');
        }
    });

    document.getElementById('close-assistant')?.addEventListener('click', () => document.getElementById('assistant-panel').classList.remove('active'));

    const input = document.getElementById('assistant-input');
    const handleSend = () => {
        const text = input.value.trim();
        if (!text) return;
        addChatMessage(text, 'user');
        input.value = '';
        setTimeout(() => processCommand(text), 300);
    };

    document.getElementById('send-btn')?.addEventListener('click', handleSend);
    input?.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleSend(); });

    // Ajustes Listeners
    initSettingsEventListeners();
}

function initSettingsEventListeners() {
    const settingsBtn = document.getElementById('settings-btn');
    const overlay = document.getElementById('menu-overlay');

    if (settingsBtn) settingsBtn.onclick = toggleMenu;
    if (overlay) overlay.onclick = toggleMenu;
    document.querySelector('.close-menu').onclick = toggleMenu;

    // Theme & Security
    const themeToggle = document.getElementById('theme-toggle');
    const secRadios = document.querySelectorAll('input[name="security-mode"]');
    
    document.getElementById('save-settings-btn')?.addEventListener('click', () => {
        state.userName = document.getElementById('edit-name')?.value || state.userName;
        state.email = document.getElementById('edit-email')?.value || state.email;
        state.phone = document.getElementById('edit-phone')?.value || state.phone;
        state.securityMode = Array.from(secRadios).find(r => r.checked)?.value;
        state.theme = themeToggle?.checked ? 'light' : 'dark';
        applyTheme(state.theme);
        saveData();
        updateUI();
        showToast("Ajustes guardados");
        toggleMenu();
    });

    // Categorías Gastos
    document.getElementById('add-cat-btn')?.addEventListener('click', () => {
        const input = document.getElementById('new-cat-input');
        const name = input.value.trim();
        if (!name) return;
        if (!state.customCategories) state.customCategories = [];
        if (state.customCategories.includes(name)) return showToast("Ya existe");
        state.customCategories.push(name);
        input.value = '';
        saveData(); renderCategories(); showToast("Categoría agregada");
    });

    // Categorías Ingresos
    const typeSelect = document.getElementById('income-cat-type-select');
    const addRow = document.getElementById('income-cat-add-row');
    const subcatInput = document.getElementById('new-income-subcat-input');
    const addBtn = document.getElementById('add-income-subcat-btn');

    typeSelect?.addEventListener('change', () => {
        addRow.style.display = typeSelect.value ? 'flex' : 'none';
    });

    addBtn?.addEventListener('click', () => {
        const type = typeSelect.value;
        const name = subcatInput.value.trim();
        if (!type || !name) return;
        if (!state.incomeCategories[type]) state.incomeCategories[type] = [];
        if (state.incomeCategories[type].includes(name)) return showToast("Ya existe");
        state.incomeCategories[type].push(name);
        subcatInput.value = '';
        saveData(); renderIncomeCategories(); showToast("Cuenta agregada");
    });
}

function boot() {
    loadData();
    resetAssistantStates(); // Limpiar estados stuck
    applyTheme(state.theme);
    initCharts();
    
    // UI Inicial
    if (state.securityMode !== 'none') {
        switchScreen('login-screen');
        initLoginFlow();
    } else {
        switchScreen('dashboard');
        updateUI();
    }

    setTimeout(() => {
        document.getElementById('splash')?.classList.remove('active');
    }, 1500);
}

// Inicialización
initEventListeners();
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
} else {
    boot();
}

// Biometría y PIN
function initLoginFlow() {
    if (state.securityMode === 'biometric' && state.biometricCredId) {
        document.getElementById('biometric-login-btn').classList.remove('hidden');
        initBiometric();
    }
    initPinScreen();
}

async function initBiometric() {
    try {
        const credId = Uint8Array.from(atob(state.biometricCredId), c => c.charCodeAt(0));
        await navigator.credentials.get({ publicKey: { challenge: new Uint8Array(32), allowCredentials: [{ id: credId, type: 'public-key' }], userVerification: 'required' } });
        switchScreen('dashboard'); updateUI(); showToast('Acceso concedido');
    } catch (e) { console.warn("Bio fail"); }
}

function initPinScreen() {
    let pin = '';
    const dots = document.querySelectorAll('#login-screen .dot');
    document.querySelectorAll('#login-screen .pin-btn').forEach(btn => {
        btn.onclick = () => {
            const val = btn.textContent.trim();
            if (val === 'C') pin = pin.slice(0, -1);
            else if (!isNaN(val) && pin.length < 4) pin += val;
            dots.forEach((d, i) => d.classList.toggle('filled', i < pin.length));
            if (pin.length === 4 && pin === String(state.pin)) { switchScreen('dashboard'); updateUI(); }
            else if (pin.length === 4) { pin = ''; setTimeout(() => dots.forEach(d => d.classList.remove('filled')), 500); }
        };
    });
}
