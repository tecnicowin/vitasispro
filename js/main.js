// js/main.js

// Registrar Service Worker para PWA al inicio
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('PWA Service Worker registrado ✅', reg))
            .catch(err => console.log('Error registrando SW ❌', err));
    });
}

function initEventListeners() {
    // ── Navegación entre pantallas ─────────────────────────
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

    // ── Filtros (Search & Chips) ──────────────────────────
    const searchInput = document.getElementById('tx-search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            renderTransactions(e.target.value);
        });
    }

    document.querySelectorAll('.filter-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const filterValue = chip.dataset.filter;
            activeFilter = filterValue;
            document.querySelectorAll(`.filter-chip`).forEach(c => {
                c.classList.toggle('active', c.dataset.filter === filterValue);
            });
            renderTransactions(searchInput?.value || '');
            updateCharts();
        });
    });

    // ── Exportación CSV ────────────────────────────────────
    const exportBtn = document.getElementById('export-csv-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportTransactionsToCSV);
    }

    // ── Asistente Virtual ──────────────────────────────────
    const assistantBtn = document.getElementById('ask-assistant-btn');
    if (assistantBtn) {
        assistantBtn.addEventListener('click', () => {
            document.getElementById('assistant-panel').classList.add('active');
            if (!state.userName) { 
                addChatMessage("¡Hola! Soy tu asistente. ¿Cómo te llamas?", 'bot'); 
                state.isAwaitingName = true; 
            } else if (document.getElementById('chat-container').children.length <= 1) {
                addChatMessage(`${getGreeting()}, ${state.userName}. ¿En qué puedo ayudarte?`, 'bot');
            }
        });
    }

    const closeAssistant = document.getElementById('close-assistant');
    if (closeAssistant) closeAssistant.addEventListener('click', () => document.getElementById('assistant-panel').classList.remove('active'));

    const input = document.getElementById('assistant-input');
    const sendBtn = document.getElementById('send-btn');
    const handleSend = () => {
        const text = input.value.trim();
        if (!text) return;
        addChatMessage(text, 'user');
        input.value = '';
        setTimeout(() => processCommand(text), 300);
    };

    if (sendBtn) sendBtn.addEventListener('click', handleSend);
    if (input) input.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleSend(); });

    // ── Voz del Asistente ──────────────────────────────────
    const micBtn = document.getElementById('mic-btn');
    const voiceToggleBtn = document.getElementById('voice-toggle');
    if(voiceToggleBtn) {
        voiceToggleBtn.addEventListener('click', () => {
            state.voiceEnabled = !state.voiceEnabled;
            saveData();
            showToast(state.voiceEnabled ? "Voz del asistente activada" : "Voz del asistente silenciada");
            voiceToggleBtn.innerHTML = state.voiceEnabled ? '<i data-lucide="volume-2"></i>' : '<i data-lucide="volume-x"></i>';
            if (window.lucide) window.lucide.createIcons();
        });
    }

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (micBtn && SpeechRec) {
        const rec = new SpeechRec(); rec.lang = 'es-ES';
        micBtn.onclick = () => { if (micBtn.classList.contains('recording')) rec.stop(); else rec.start(); };
        rec.onstart = () => micBtn.classList.add('recording');
        rec.onend = () => micBtn.classList.remove('recording');
        rec.onresult = (e) => { input.value = e.results[0][0].transcript; handleSend(); };
    }

    // ── Transaction Action Sheet ──────────────────────────
    const txOverlay = document.getElementById('tx-sheet-overlay');
    if (txOverlay) txOverlay.addEventListener('click', closeTransactionSheet);

    document.getElementById('sheet-close-btn')?.addEventListener('click', closeTransactionSheet);
    document.getElementById('sheet-edit-btn')?.addEventListener('click', () => {
        document.getElementById('sheet-info-view').classList.add('hidden');
        document.getElementById('sheet-edit-view').classList.remove('hidden');
    });
    document.getElementById('edit-cancel-btn')?.addEventListener('click', () => {
        document.getElementById('sheet-info-view').classList.remove('hidden');
        document.getElementById('sheet-edit-view').classList.add('hidden');
    });

    document.getElementById('sheet-delete-btn')?.addEventListener('click', () => {
        const id = Number(document.getElementById('edit-tx-form').dataset.id);
        if (confirm('¿Eliminar este movimiento? Esta acción no se puede deshacer.')) {
            deleteTransaction(id);
            closeTransactionSheet();
            updateUI();
            showToast('Movimiento eliminado ✓');
        }
    });

    document.getElementById('edit-tx-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const f = e.target;
        const id = Number(f.dataset.id);
        const amount = parseFloat(document.getElementById('edit-tx-amount').value);
        const type = document.getElementById('edit-tx-type').value;
        const category = document.getElementById('edit-tx-category').value.trim();
        const currency = document.getElementById('edit-tx-currency').value;
        if (!amount || amount <= 0 || !category) {
            showToast('Completa todos los campos correctamente');
            return;
        }
        editTransaction(id, amount, type, category, currency);
        closeTransactionSheet();
        updateUI();
        showToast('Movimiento actualizado ✓');
    });

    // ── Boot sequence ────────────────────────────────────
    document.addEventListener('DOMContentLoaded', () => {
        loadData();
        if (window.lucide) window.lucide.createIcons();
        applyTheme(state.theme);
        initCharts();

        setTimeout(() => {
            const splash = document.getElementById('splash');
            if (splash) splash.classList.remove('active');

            if (state.securityMode !== 'none') {
                switchScreen('login-screen');
                initLoginFlow();
            } else {
                switchScreen('dashboard');
                try { updateUI(); } catch(e) { console.error(e); }
            }
        }, 1500);

        initSettingsListeners();
    });
}

function initSettingsListeners() {
    const settingsBtn = document.getElementById('settings-btn');
    const closeBtn = document.querySelector('.close-menu');
    const overlay = document.getElementById('menu-overlay');

    if (settingsBtn) settingsBtn.onclick = (e) => { e.preventDefault(); toggleMenu(); };
    if (closeBtn) closeBtn.onclick = (e) => { e.preventDefault(); toggleMenu(); };
    if (overlay) overlay.onclick = (e) => { e.preventDefault(); toggleMenu(); };

    const themeToggle = document.getElementById('theme-toggle');
    const secRadios = document.querySelectorAll('input[name="security-mode"]');
    const pinSetup = document.getElementById('pin-setup');
    
    if (themeToggle) themeToggle.checked = state.theme === 'light';
    if (state.securityMode) {
        const activeRadio = document.getElementById(state.securityMode === 'biometric' ? 'sec-biometric' : `sec-${state.securityMode}`);
        if (activeRadio) activeRadio.checked = true;
        if (state.securityMode === 'pin') pinSetup?.classList.remove('hidden');
    }

    secRadios.forEach(radio => {
        radio.addEventListener('change', async () => {
            if (radio.value === 'pin') { 
                pinSetup.classList.remove('hidden'); 
            } else if (radio.value === 'biometric') {
                pinSetup.classList.add('hidden');
                if (!state.biometricCredId) {
                    if (confirm("¿Deseas registrar tu huella/rostro?")) await registerBiometric();
                    else { document.getElementById('sec-pin').checked = true; pinSetup.classList.remove('hidden'); }
                }
            } else { pinSetup.classList.add('hidden'); }
        });
    });

    document.getElementById('save-settings-btn')?.addEventListener('click', () => {
        if (confirm("¿Guardar cambios en ajustes?")) {
            state.userName = document.getElementById('edit-name')?.value || state.userName;
            state.email = document.getElementById('edit-email')?.value || state.email;
            state.phone = document.getElementById('edit-phone')?.value || state.phone;
            state.securityMode = Array.from(secRadios).find(r => r.checked)?.value;
            if (state.securityMode === 'pin' && document.getElementById('new-pin')?.value.length === 4) {
                state.pin = document.getElementById('new-pin').value;
            }
            state.theme = themeToggle?.checked ? 'light' : 'dark';
            applyTheme(state.theme);
            saveData();
            updateUI();
            showToast("Ajustes guardados correctamente");
            toggleMenu();
        }
    });

    document.getElementById('add-cat-btn')?.addEventListener('click', () => {
        const input = document.getElementById('new-cat-input');
        const name = input.value.trim();
        if (!name) return;
        if (!state.customCategories) state.customCategories = [];
        if (state.customCategories.includes(name)) return showToast("La categoría ya existe");
        state.customCategories.push(name);
        input.value = '';
        saveData();
        renderCategories();
        showToast("Categoría agregada");
    });

    document.getElementById('update-rate-btn')?.addEventListener('click', fetchBCVRate);
    document.getElementById('exit-app-btn')?.addEventListener('click', () => { 
        if (confirm("¿Cerrar sesión?")) { 
            document.body.innerHTML = "<div style='display:flex; height:100vh; align-items:center; justify-content:center; background:#000; color:#fff;'>Limpiando sesión...</div>"; 
            setTimeout(() => window.location.reload(), 2000); 
        } 
    });
}

// ── Biometric & Auth Logic ────────────────────────────
function initLoginFlow() {
    const bioBtn = document.getElementById('biometric-login-btn');
    if (state.securityMode === 'biometric' && state.biometricCredId) {
        bioBtn?.classList.remove('hidden');
        document.getElementById('biometric-fallback-text')?.classList.remove('hidden');
        bioBtn.onclick = initBiometric;
        initBiometric();
    }
    initPinScreen();
}

async function registerBiometric() {
    try {
        const challenge = new Uint8Array(32); window.crypto.getRandomValues(challenge);
        const name = state.userName || 'Usuario';
        const cred = await navigator.credentials.create({
            publicKey: {
                challenge,rp: { name: "Finance App" },
                user: { id: new Uint8Array(16), name, displayName: name },
                pubKeyCredParams: [{ alg: -7, type: "public-key" }],
                timeout: 60000, authenticatorSelection: { userVerification: "required" }
            }
        });
        if (cred) {
            state.biometricCredId = btoa(String.fromCharCode(...new Uint8Array(cred.rawId)));
            state.securityMode = 'biometric';
            saveData();
            showToast("Biometría registrada ✅");
        }
    } catch (e) { showToast("Error biométrico ❌"); }
}

async function initBiometric() {
    try {
        const credId = Uint8Array.from(atob(state.biometricCredId), c => c.charCodeAt(0));
        await navigator.credentials.get({
            publicKey: { challenge: new Uint8Array(32), allowCredentials: [{ id: credId, type: 'public-key' }], userVerification: 'required' }
        });
        switchScreen('dashboard'); updateUI(); showToast('Acceso concedido ✅');
    } catch (e) { console.warn("Bio cancel"); }
}

function initPinScreen() {
    let enteredPin = '';
    const dots = document.querySelectorAll('#login-screen .dot');
    const pinBtns = document.querySelectorAll('#login-screen .pin-btn');
    
    pinBtns.forEach(btn => {
        btn.onclick = () => {
            const val = btn.textContent.trim();
            if (val === 'C') enteredPin = enteredPin.slice(0, -1);
            else if (val === 'OK' || btn.id === 'pin-ok') { if (enteredPin === String(state.pin)) unlock(); }
            else if (!isNaN(val) && enteredPin.length < 4) {
                enteredPin += val;
                if (enteredPin.length === 4) setTimeout(() => { if (enteredPin === String(state.pin)) unlock(); else { enteredPin = ''; updateDots(); } }, 200);
            }
            updateDots();
        };
    });
    const updateDots = () => dots.forEach((d, i) => d.classList.toggle('filled', i < enteredPin.length));
    const unlock = () => { switchScreen('dashboard'); updateUI(); showToast('Hola de nuevo 👋'); };
}

// ── Mobile History API ───────────────────────────────
window.addEventListener('popstate', () => {
    if (document.getElementById('settings-menu').classList.contains('active')) toggleMenu();
    else if (document.getElementById('assistant-panel').classList.contains('active')) document.getElementById('assistant-panel').classList.remove('active');
    window.history.pushState({ screen: 'dashboard' }, '');
});

window.history.pushState({ screen: 'dashboard' }, '');
initEventListeners();
