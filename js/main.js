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
        
        // Remove splash after load
        setTimeout(() => {
            const splash = document.getElementById('splash');
            if (splash) splash.classList.remove('active');
            switchScreen('dashboard');
        }, 1500);

        initCharts();
        
        try { updateUI(); } catch(e) { console.error("UpdateUI Error:", e); }
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
