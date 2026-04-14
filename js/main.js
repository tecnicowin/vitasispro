// js/main.js
function initEventListeners() {
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

    const micBtn = document.getElementById('mic-btn');
    const voiceToggleBtn = document.getElementById('voice-toggle');
    
    // Voice toggle 
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

    document.addEventListener('DOMContentLoaded', () => {
        loadData();
        if (window.lucide) window.lucide.createIcons();
        applyTheme(state.theme);
        initCharts();

        setTimeout(() => {
            const splash = document.getElementById('splash');
            if (splash) splash.classList.remove('active');

            // ─── VERIFICACIÓN DE SEGURIDAD ─────────────────────
            if (state.securityMode === 'pin' && state.pin) {
                switchScreen('login-screen');
                initPinScreen();
            } else if (state.securityMode === 'biometric') {
                switchScreen('login-screen');
                initBiometric();
            } else {
                switchScreen('dashboard');
                try { updateUI(); } catch(e) { console.error(e); }
            }
            // ───────────────────────────────────────────────────
        }, 1500);

        try { initSettingsListeners(); } catch(e) { console.error("InitSettings Error:", e); }
    });
}

function initSettingsListeners() {
    const settingsBtn = document.getElementById('settings-btn');
    const closeBtn = document.querySelector('.close-menu');
    const overlay = document.getElementById('menu-overlay');

    if (settingsBtn) {
        settingsBtn.onclick = (e) => { e.preventDefault(); toggleMenu(); };
    }
    if (closeBtn) closeBtn.onclick = (e) => { e.preventDefault(); toggleMenu(); };
    if (overlay) overlay.onclick = (e) => { e.preventDefault(); toggleMenu(); };

    const themeToggle = document.getElementById('theme-toggle');
    const secRadios = document.querySelectorAll('input[name="security-mode"]');
    const pinSetup = document.getElementById('pin-setup');
    const newPinInput = document.getElementById('new-pin');
    const editName = document.getElementById('edit-name');
    const editEmail = document.getElementById('edit-email');
    const editPhone = document.getElementById('edit-phone');
    const updateRateBtn = document.getElementById('update-rate-btn');
    const exitBtn = document.getElementById('exit-app-btn');

    if (themeToggle) themeToggle.checked = state.theme === 'light';
    if (editName) editName.value = state.userName || '';
    if (editEmail) editEmail.value = state.email || ''; 
    if (editPhone) editPhone.value = state.phone || '';
    
    if (state.securityMode) {
        const modeId = state.securityMode === 'biometric' ? 'sec-biometric' : `sec-${state.securityMode}`;
        const activeRadio = document.getElementById(modeId);
        if (activeRadio) activeRadio.checked = true;
        if (state.securityMode === 'pin') pinSetup?.classList.remove('hidden');
    }

    secRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            if (radio.value === 'pin') { 
                pinSetup.classList.remove('hidden'); 
            } else { 
                pinSetup.classList.add('hidden'); 
            }
        });
    });

    const saveBtn = document.getElementById('save-settings-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            if (confirm("¿Confirmas que deseas guardar todos los cambios en ajustes?")) {
                state.userName = editName?.value || state.userName;
                state.email = editEmail?.value || state.email;
                state.phone = editPhone?.value || state.phone;
                
                let selectedSec = Array.from(secRadios).find(r => r.checked)?.value;
                if (selectedSec) {
                    state.securityMode = selectedSec;
                    if (selectedSec === 'pin' && newPinInput?.value.length === 4) {
                        state.pin = newPinInput.value;
                        newPinInput.value = '';
                    } else if (selectedSec === 'none') {
                        state.pin = null;
                    }
                }

                state.theme = themeToggle?.checked ? 'light' : 'dark';
                applyTheme(state.theme);

                saveData();
                updateUI();
                showToast("Ajustes guardados correctamente");
                toggleMenu();
            }
        });
    }

    updateRateBtn?.addEventListener('click', fetchBCVRate);
    exitBtn?.addEventListener('click', () => { if (confirm("¿Estás seguro que deseas cerrar la sesión?")) { document.body.innerHTML = "<div style='display:flex; height:100vh; align-items:center; justify-content:center; background:#000; color:#fff;'>Aplicación cerrada localmente.</div>"; setTimeout(() => window.location.reload(), 3000); } });
}

// History API For mobile
window.addEventListener('popstate', (event) => {
    // Cuando pulsen el botón físico de Android "Atras"
    const menu = document.getElementById('settings-menu');
    if (menu && menu.classList.contains('active')) {
        toggleMenu(); // Cierra el menu configuracion en vez de salir de la app
        window.history.pushState({ screen: 'dashboard' }, ''); // Evita salir de la app
        return;
    }
    
    const panel = document.getElementById('assistant-panel');
    if(panel && panel.classList.contains('active')) {
        panel.classList.remove('active');
        window.history.pushState({ screen: 'dashboard' }, '');
        return;
    }

    if (event.state && event.state.screen) {
        switchScreen(event.state.screen);
    }
});

// Initial boot
window.history.pushState({ screen: 'dashboard' }, '');
initEventListeners();

// =============================================
// PIN LOGIN SCREEN
// =============================================
function initPinScreen() {
    let enteredPin = '';
    let attempts = 0;
    const MAX_ATTEMPTS = 3;
    const dots = document.querySelectorAll('#login-screen .dot');
    const pinBtns = document.querySelectorAll('#login-screen .pin-btn');
    const title = document.querySelector('#login-screen h3');

    function updateDots() {
        dots.forEach((d, i) => d.classList.toggle('filled', i < enteredPin.length));
    }

    function onUnlock() {
        switchScreen('dashboard');
        try { updateUI(); } catch(e) { console.error(e); }
        showToast('Bienvenido de nuevo, ' + (state.userName || '') + ' 👋');
    }

    function checkPin() {
        if (enteredPin === String(state.pin)) {
            onUnlock();
        } else {
            attempts++;
            enteredPin = '';
            updateDots();
            // Animación de error
            const loginContent = document.querySelector('.login-content');
            loginContent.style.animation = 'shake 0.4s ease';
            setTimeout(() => loginContent.style.animation = '', 400);

            if (attempts >= MAX_ATTEMPTS) {
                title.textContent = '🔒 App bloqueada. Recarga para intentar.';
                pinBtns.forEach(b => b.disabled = true);
            } else {
                title.textContent = `PIN incorrecto (${MAX_ATTEMPTS - attempts} intentos restantes)`;
                setTimeout(() => title.textContent = 'Ingresa tu PIN', 2000);
            }
        }
    }

    pinBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const val = btn.textContent.trim();
            if (val === 'C') {
                enteredPin = enteredPin.slice(0, -1);
                updateDots();
            } else if (val === 'OK' || btn.id === 'pin-ok') {
                if (enteredPin.length === 4) checkPin();
            } else if (!isNaN(val) && enteredPin.length < 4) {
                enteredPin += val;
                updateDots();
                if (enteredPin.length === 4) setTimeout(checkPin, 200);
            }
        });
    });

    // CSS shake animation
    if (!document.getElementById('shake-style')) {
        const s = document.createElement('style');
        s.id = 'shake-style';
        s.textContent = `@keyframes shake {
            0%,100%{transform:translateX(0)}
            20%{transform:translateX(-10px)}
            40%{transform:translateX(10px)}
            60%{transform:translateX(-8px)}
            80%{transform:translateX(8px)}
        }`;
        document.head.appendChild(s);
    }

    if (window.lucide) window.lucide.createIcons();
}

// =============================================
// BIOMETRIC (WebAuthn) CON FALLBACK A PIN
// =============================================
async function initBiometric() {
    const title = document.querySelector('#login-screen h3');

    // Cambiar texto para indicar autenticación biométrica
    if (title) title.textContent = 'Autenticando con huella...';

    try {
        if (!window.PublicKeyCredential) throw new Error('WebAuthn no soportado');

        // Intentar autenticación con credencial almacenada o creación simple
        const credId = state.biometricCredId
            ? Uint8Array.from(atob(state.biometricCredId), c => c.charCodeAt(0))
            : null;

        if (credId) {
            await navigator.credentials.get({
                publicKey: {
                    challenge: new Uint8Array(32),
                    timeout: 60000,
                    allowCredentials: [{ id: credId, type: 'public-key' }],
                    userVerification: 'required'
                }
            });
            // Autenticación exitosa
            switchScreen('dashboard');
            try { updateUI(); } catch(e) {}
            showToast('Acceso biométrico verificado ✅');
        } else {
            // Sin credencial registrada → fallback a PIN si hay uno
            throw new Error('Sin credencial biométrica registrada');
        }
    } catch (err) {
        if (title) title.textContent = state.pin ? 'Ingresa tu PIN' : 'Ingresa tu PIN de seguridad';
        // Fallback a PIN
        if (state.pin) {
            initPinScreen();
        } else {
            // Sin PIN ni biometría configurada correctamente → ir al dashboard
            if (title) title.textContent = 'Sin seguridad configurada';
            setTimeout(() => {
                switchScreen('dashboard');
                try { updateUI(); } catch(e) {}
            }, 1500);
        }
    }
}
