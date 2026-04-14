/**
 * Finance Assistant - Monolithic Logic for Offline Support (Double-click compatible)
 */

let state = {
    balance: 0,
    income: 0,
    expenses: 0,
    transactions: [],
    voiceEnabled: true,
    userName: null,
    email: null,
    phone: null,
    bcvRate: null, // Si es null, pedirá la tasa
    lastRateUpdate: null,
    isAwaitingName: false,
    isAwaitingCategory: false,
    isAwaitingMoreInfo: false,
    isAwaitingRate: false,
    tempAmount: 0,
    tempType: null,
    tempCurrency: 'USD',
    pin: null,
    securityMode: 'none', 
    theme: 'dark'
};

const STORAGE_KEY = 'finance_data';

function loadData() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        state = { ...state, ...JSON.parse(saved) };
    }
    return state;
}

function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function addTransaction(amount, type, category, currency = 'USD') {
    let usdAmount = amount;
    if (currency === 'VES' && state.bcvRate) {
        usdAmount = amount / state.bcvRate;
    }

    const transaction = {
        id: Date.now(),
        amount: usdAmount, // Todo se normaliza a USD internamente
        originalAmount: amount,
        currency: currency,
        type: type,
        category: category,
        date: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
    };
    state.transactions.push(transaction);
    if (type === 'income') { state.income += usdAmount; state.balance += usdAmount; }
    else { state.expenses += usdAmount; state.balance -= usdAmount; }
    saveData();
    return transaction;
}

// --- 2. UI Formatting & Utilities ---
function formatCurrency(num) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
}

function formatVES(num) {
    if (!state.bcvRate) return "Bs. --";
    const vesValue = num * state.bcvRate;
    return new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'VES' }).format(vesValue);
}

function getGreeting() {
    const h = new Date().getHours();
    return h < 12 ? "Buenos días" : (h < 18 ? "Buenas tardes" : "Buenas noches");
}

async function fetchBCVRate() {
    // Solicitud manual vía botón
    const manualRate = prompt("Por favor, ingresa la tasa oficial del BCV:");
    if (manualRate && !isNaN(manualRate)) {
        state.bcvRate = parseFloat(manualRate);
        state.lastRateUpdate = new Date().toLocaleDateString();
        saveData();
        updateUI();
        showToast("Tasa BCV actualizada exitosamente");
    }
}

function getBalanceFeedback(bal) {
    if (bal < 0) return "Tu saldo es negativo, ¡cuidado! 😰💸";
    if (bal < 20) return "Cuidado, fondos bajos 😟";
    if (bal >= 200 && bal <= 700) return "Tienes ingresos suficientes, ten cuidado 🙂";
    if (bal > 5000) return "¡Felicitaciones! Tus fondos están blindados 💰";
    return "Balance estable 😊📈";
}

function showToast(text) {
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.textContent = text;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function switchScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    if (id === 'analytics') setTimeout(() => updateCharts(), 100);
}

function applyTheme(theme) {
    document.body.className = theme === 'light' ? 'light-theme' : 'dark-theme';
}

// --- 3. UI Rendering ---
function updateUI() {
    const nameDisplay = document.querySelector('.user-name');
    const welcomeLabel = document.querySelector('.welcome');
    if (nameDisplay) nameDisplay.textContent = state.userName || 'Usuario';
    if (welcomeLabel) welcomeLabel.textContent = `${getGreeting()},`;

    // Dual Balance Display
    const mainBal = document.getElementById('main-balance');
    const secBal = document.getElementById('secondary-balance');
    if (mainBal) mainBal.textContent = formatCurrency(state.balance);
    if (secBal) secBal.textContent = formatVES(state.balance);

    const balanceCard = document.querySelector('.balance-card');
    if (balanceCard) {
        balanceCard.classList.toggle('negative', state.balance < 0);
        balanceCard.classList.toggle('low-funds', state.balance >= 0 && state.balance < 20);
    }

    // Totals
    const tIncVal = document.getElementById('total-income');
    const tIncBs = document.getElementById('total-income-bs');
    const tExpVal = document.getElementById('total-expense');
    const tExpBs = document.getElementById('total-expense-bs');

    if (tIncVal) tIncVal.textContent = formatCurrency(state.income);
    if (tIncBs) tIncBs.textContent = formatVES(state.income);
    if (tExpVal) tExpVal.textContent = formatCurrency(state.expenses);
    if (tExpBs) tExpBs.textContent = formatVES(state.expenses);

    // Settings Fields
    const editEmail = document.getElementById('edit-email');
    const editPhone = document.getElementById('edit-phone');
    const bcvDisp = document.getElementById('bcv-display-val');

    if (editEmail && !editEmail.matches(':focus')) editEmail.value = state.email || '';
    if (editPhone && !editPhone.matches(':focus')) editPhone.value = state.phone || '';
    if (bcvDisp) bcvDisp.textContent = state.bcvRate || '--';

    const listElement = document.getElementById('transaction-list');
    if (!listElement) return;

    if (state.transactions.length === 0) {
        listElement.innerHTML = `<div class="empty-state"><i data-lucide="receipt"></i><p>No hay movimientos</p></div>`;
    } else {
        try {
            listElement.innerHTML = state.transactions.slice(-5).reverse().map(t => createTransactionHTML(t)).join('');
        } catch (e) {
            console.error("Error rendering transactions:", e);
            listElement.innerHTML = `<div class="empty-state"><p>Error al cargar movimientos</p></div>`;
        }
    }
    if (window.lucide) window.lucide.createIcons();
}

function createTransactionHTML(t) {
    const isExp = t.type === 'expense';
    const color = isExp ? 'rgba(239, 68, 68, 0.1); color: #ef4444;' : 'rgba(16, 185, 129, 0.1); color: #10b981;';
    
    // Fallback para transacciones viejas sin estos campos
    const cur = t.currency || 'USD';
    const origAmt = t.originalAmount !== undefined ? t.originalAmount : t.amount;

    const mainDisplay = cur === 'USD' ? formatCurrency(t.amount) : `${origAmt.toLocaleString('es-VE')} Bs.`;
    const secondaryDisplay = cur === 'USD' ? formatVES(t.amount) : formatCurrency(t.amount);

    return `
        <div class="transaction-item">
            <div class="item-icon" style="${color}"><i data-lucide="${isExp ? 'shopping-bag' : 'trending-up'}"></i></div>
            <div class="item-info">
                <div class="item-category">${t.category}</div>
                <div class="item-date">${t.date}</div>
            </div>
            <div class="item-amount-group" style="text-align: right">
                <div class="item-amount ${isExp ? 'amount-expense' : 'amount-income'}">${isExp ? '-' : '+'}${mainDisplay}</div>
                <div style="font-size: 0.75rem; opacity: 0.6">${secondaryDisplay}</div>
            </div>
        </div>`;
}

function addChatMessage(text, sender, showCategories = false) {
    const container = document.getElementById('chat-container');
    const msg = document.createElement('div');
    msg.className = `chat-message ${sender}`;
    let content = `<div class="message-bubble">${text}</div>`;

    if (showCategories) {
        const categories = [
            { n: "Comida", i: "utensils" },
            { n: "Transporte", i: "car" },
            { n: "Ocio", i: "clapperboard" },
            { n: "Salud", i: "heart-pulse" },
            { n: "Hogar", i: "home" },
            { n: "Celular", i: "phone" },
            { n: "Personal", i: "user" },
            { n: "Varios", i: "plus-circle" }
        ];
        content += `<div class="category-chip-list">${categories.map(c => `
            <button class="cat-chip" onclick="document.getElementById('assistant-input').value='${c.n}'; document.getElementById('send-btn').click();">
                <i data-lucide="${c.i}"></i><span>${c.n}</span>
            </button>`).join('')}</div>`;
    }

    msg.innerHTML = content;
    container.appendChild(msg);
    container.scrollTop = container.scrollHeight;
    if (window.lucide) window.lucide.createIcons();
    
    if (sender === 'bot' && state.voiceEnabled) {
        const plainText = text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');
        speak(plainText);
    }
}

function clearChat() {
    const container = document.getElementById('chat-container');
    if (container) container.innerHTML = '';
}

// --- 4. Charts Logic ---
let categoryChart = null;
let trendChart = null;

function initCharts() {
    const ctxCat = document.getElementById('categoryChart')?.getContext('2d');
    if (ctxCat) {
        categoryChart = new Chart(ctxCat, {
            type: 'doughnut',
            data: { labels: [], datasets: [{ data: [], backgroundColor: ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'], borderWidth: 0 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: '#94a3b8', font: { size: 10 } } } } }
        });
    }
    const ctxTrnd = document.getElementById('trendChart')?.getContext('2d');
    if (ctxTrnd) {
        trendChart = new Chart(ctxTrnd, {
            type: 'doughnut',
            data: { labels: ['Ingresos', 'Gastos'], datasets: [{ data: [0, 0], backgroundColor: ['#10b981', '#ef4444'], borderWidth: 0 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: '#94a3b8', font: { size: 10 } } } }, cutout: '70%' }
        });
    }
}

function updateCharts() {
    if (!categoryChart) return;
    const exps = state.transactions.filter(t => t.type === 'expense');
    const cats = {};
    exps.forEach(e => cats[e.category] = (cats[e.category] || 0) + e.amount);
    categoryChart.data.labels = Object.keys(cats);
    categoryChart.data.datasets[0].data = Object.values(cats);
    categoryChart.update();

    if (trendChart) {
        trendChart.data.datasets[0].data = [state.income, state.expenses];
        trendChart.update();
        const healthMsgDiv = document.getElementById('health-message');
        if (healthMsgDiv) {
            let msg = "", cls = "health-msg";
            if (state.balance < 20) { msg = "Fondos bajos 😟"; cls = "health-msg bad"; }
            else if (state.balance >= 200 && state.balance <= 700) { msg = "Ingresos suficientes 🙂"; cls = "health-msg"; }
            else if (state.balance > 5000) { msg = "Fondos blindados 💰"; cls = "health-msg good"; }
            else if (state.expenses > state.income) { msg = "Gastos elevados ⚠️"; cls = "health-msg bad"; }
            else { msg = "Salud estable ✨"; cls = "health-msg good"; }
            healthMsgDiv.innerHTML = `<span>${msg}</span>`; healthMsgDiv.className = cls;
        }
    }
}

// --- 5. Assistant & Voice Logic ---
function speak(text) {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'es-ES';
    window.speechSynthesis.speak(u);
}

// Helper for amount extraction with thousand separators and decimals
const extractAmount = (str) => {
    let match = str.match(/[\d.,]+/);
    if (!match) return null;
    let val = match[0];
    if (val.includes('.') && val.includes(',')) {
        const lastDot = val.lastIndexOf('.'); const lastComma = val.lastIndexOf(',');
        if (lastDot > lastComma) val = val.replace(/,/g, '');
        else val = val.replace(/\./g, '').replace(',', '.');
    } else if (val.includes(',')) {
        const parts = val.split(',');
        if (parts.length === 2 && parts[1].length === 3 && parseInt(parts[0]) < 1000) val = val.replace(',', '.');
        else val = val.replace(',', '.');
    } else if (val.includes('.')) {
        const parts = val.split('.');
        if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) val = val.replace(/\./g, '');
    }
    return parseFloat(val);
};

const normalize = (str) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

function processCommand(text) {
    const lower = text.toLowerCase();
    const norm = normalize(text);

    // Flow for Rate Request
    if (state.isAwaitingRate) {
        let amt = extractAmount(lower);
        if (amt) {
            state.bcvRate = amt;
            state.lastRateUpdate = new Date().toLocaleDateString();
            state.isAwaitingRate = false;
            saveData();
            updateUI();
            addChatMessage(`Tasa de ${amt} Bs/$ guardada. Ahora, ¿qué reporte necesitas o qué quieres registrar?`, 'bot');
            return;
        } else if (norm === 'no' || norm === 'cancelar') {
            state.isAwaitingRate = false;
            addChatMessage("Entendido. ¿En qué más puedo ayudarte?", 'bot');
            return;
        }
    }

    if (norm.includes('cancelar') || norm.includes('olvida') || norm.includes('nada') || norm.includes('detener')) {
        state.isAwaitingName = false; state.isAwaitingCategory = false; state.isAwaitingMoreInfo = false; state.isAwaitingRate = false; state.tempAmount = 0;
        addChatMessage("Acción cancelada. ¿En qué más puedo ayudarte?", 'bot'); return;
    }

    // Check for stale rate before reports or Bs transactions
    if (norm.includes('resumen') || norm.includes('informe') || norm.includes('multimoneda') || norm.includes('bolivares') || norm.includes(' bs')) {
        const today = new Date().toLocaleDateString();
        if (state.lastRateUpdate !== today || !state.bcvRate) {
            state.isAwaitingRate = true;
            addChatMessage("¿Cuál es la tasa del BCV hoy para hacer la conversión?", 'bot');
            return;
        }
    }

    if (norm.includes('balance') || norm.includes('saldo') || norm.includes('estado financiero') || norm.includes('cuanto tengo')) {
        addChatMessage(`${state.userName || 'Usuario'}, tu balance es ${formatCurrency(state.balance)} (${formatVES(state.balance)}). ${getBalanceFeedback(state.balance)}`, 'bot');
        if (!state.isAwaitingCategory) return;
    }

    // Totals / Reports
    if (norm.includes('cuanto') || norm.includes('total') || norm.includes('informe') || norm.includes('resumen')) {
        if (norm.includes('gasto') || norm.includes('gastado') || norm.includes('detallado')) {
            const exps = state.transactions.filter(t => t.type === 'expense');
            if (exps.length === 0) {
                addChatMessage("No tienes gastos registrados todavía.", 'bot');
            } else {
                const cats = {};
                exps.forEach(e => cats[e.category] = (cats[e.category] || 0) + e.amount);
                let summary = "<b>Resumen de tus gastos:</b><br>";
                Object.keys(cats).forEach(c => {
                    summary += `• ${c}: ${formatCurrency(cats[c])} (${formatVES(cats[c])})<br>`;
                });
                summary += `<br>Total: ${formatCurrency(state.expenses)} (${formatVES(state.expenses)})`;
                addChatMessage(summary, 'bot');
                
                setTimeout(() => {
                    addChatMessage("¿Deseas otra información?", 'bot');
                    state.isAwaitingMoreInfo = true;
                }, 800);
                return;
            }
        } else if (norm.includes('ingreso') || norm.includes('ganado') || norm.includes('gane')) {
            addChatMessage(`El total de tus ingresos es ${formatCurrency(state.income)} (${formatVES(state.income)}).`, 'bot');
            if (!state.isAwaitingCategory) return;
        }
    }

    // Follow-up for summary
    if (state.isAwaitingMoreInfo) {
        if (norm === 'no') {
            addChatMessage("Hasta pronto. 👋", 'bot');
            state.isAwaitingMoreInfo = false;
            setTimeout(() => { clearChat(); document.getElementById('close-assistant')?.click(); }, 1500);
            return;
        } else if (norm === 'si') {
            addChatMessage("¿En qué te puedo servir?", 'bot');
            state.isAwaitingMoreInfo = false;
            return;
        }
        // If it's something else, we reset and process as normal command (below)
        state.isAwaitingMoreInfo = false;
    }

    if (norm.includes('ver') || norm.includes('ir') || norm.includes('abrir') || norm.includes('mostrar')) {
        if (norm.includes('reporte') || norm.includes('analitica') || norm.includes('grafico')) { switchScreen('analytics'); addChatMessage("Abriendo tus reportes...", 'bot'); return; }
        if (norm.includes('ajuste') || norm.includes('configuracion')) { toggleMenu(); addChatMessage("Abriendo configuración...", 'bot'); return; }
        if (norm.includes('inicio') || norm.includes('dashboard')) { switchScreen('dashboard'); addChatMessage("Volviendo al inicio.", 'bot'); return; }
    }

    if (norm.includes('ayuda') || norm.includes('comando')) {
        addChatMessage("Puedo ayudarte a:<br>• <b>Gasto:</b> 'Gaste 50 en comida'<br>• <b>Ingreso:</b> 'Gané 100'<br>• <b>Saldo:</b> 'Estado financiero'", 'bot'); return;
    }

    if (state.isAwaitingName) {
        state.userName = text.trim(); state.isAwaitingName = false;
        saveData(); updateUI(); addChatMessage(`Gusto en conocerte, ${state.userName}. ¿Qué quieres registrar hoy?`, 'bot'); return;
    }

    const categories = ["Comida", "Transporte", "Ocio", "Salud", "Hogar", "Varios", "Restaurant", "Medicinas", "Consulta Medica", "Celular", "Personal"];
    if (state.isAwaitingCategory) {
        let found = categories.find(c => norm.includes(normalize(c)));
        if (found) {
            completeTransaction(state.tempAmount, 'expense', found, state.tempCurrency);
            addChatMessage(`Registré el gasto de ${state.tempCurrency === 'USD' ? formatCurrency(state.tempAmount) : state.tempAmount+' Bs.'} en ${found}. ${getBalanceFeedback(state.balance)}`, 'bot');
            state.isAwaitingCategory = false; state.tempAmount = 0; return;
        }
    }

    // Currency Detection for current command
    let currentCurrency = 'USD';
    if (norm.includes(' bs') || norm.includes('bolivares') || norm.includes('vef')) {
        currentCurrency = 'VES';
        const today = new Date().toLocaleDateString();
        if (state.lastRateUpdate !== today || !state.bcvRate) {
            state.isAwaitingRate = true;
            addChatMessage("¿Cuál es la tasa del BCV hoy para poder registrarlo en bolívares?", 'bot');
            return;
        }
    }

    // Expense detection
    if (norm.includes('gasto') || norm.includes('gaste') || norm.includes('pague') || norm.includes('compre') || norm.includes('hice un pago') || norm.includes('cancele')) {
        const amount = extractAmount(lower);
        if (amount) {
            let found = categories.find(c => norm.includes(normalize(c)));
            if (found) { completeTransaction(amount, 'expense', found, currentCurrency); addChatMessage(`Gasto de ${currentCurrency === 'USD' ? formatCurrency(amount) : amount+' Bs.'} en ${found} guardado.`, 'bot'); }
            else { state.tempAmount = amount; state.tempCurrency = currentCurrency; state.isAwaitingCategory = true; addChatMessage("¿En qué categoría lo registro?", 'bot', true); }
            return;
        }
    }

    // Income detection
    if (norm.includes('ingreso') || norm.includes('gane') || norm.includes('recibi') || norm.includes('entro') || norm.includes('pago') || norm.includes('cobre') || norm.includes('pagaron') || norm.includes('transfirieron') || norm.includes('cancelaron')) {
        const amount = extractAmount(lower);
        if (amount) {
            state.isAwaitingCategory = false;
            completeTransaction(amount, 'income', 'Ingreso', currentCurrency);
            addChatMessage(`¡Excelente! Ingreso de ${currentCurrency === 'USD' ? formatCurrency(amount) : amount+' Bs.'} guardado. ${getBalanceFeedback(state.balance)}`, 'bot');
        } else {
            addChatMessage("Dime la cantidad del ingreso, por favor.", 'bot');
        }
        return;
    }

    if (norm.includes('adios') || norm.includes('gracias') || norm.includes('es todo') || norm.includes('hasta luego')) {
        addChatMessage(`¡Con gusto ${state.userName || ''}! Hasta pronto 👋✨`, 'bot');
        setTimeout(() => { clearChat(); document.getElementById('close-assistant')?.click(); }, 1500); return;
    }

    if (state.isAwaitingCategory) { addChatMessage("Por favor, selecciona una categoría o di 'cancelar'.", 'bot', true); return; }
    addChatMessage("No entendí bien. Prueba con 'Gaste 50' o 'Ver reportes'.", 'bot');
}

function completeTransaction(a, t, c) {
    addTransaction(a, t, c);
    updateUI();
    updateCharts();
}

// --- 6. Event Listeners ---
let currentPinInput = "";

function initEventListeners() {
    // Escuchar cambios en el DOM para manejar pantallas y navegación
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

    // Voice recognition
    const micBtn = document.getElementById('mic-btn');
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (micBtn && SpeechRec) {
        const rec = new SpeechRec(); rec.lang = 'es-ES';
        micBtn.onclick = () => { if (micBtn.classList.contains('recording')) rec.stop(); else rec.start(); };
        rec.onstart = () => micBtn.classList.add('recording');
        rec.onend = () => micBtn.classList.remove('recording');
        rec.onresult = (e) => { input.value = e.results[0][0].transcript; handleSend(); };
    }

    // Inicialización al cargar la página
    document.addEventListener('DOMContentLoaded', () => {
        loadData();
        if (window.lucide) window.lucide.createIcons();
        applyTheme(state.theme);
        initSecurity();
        initCharts();
        
        // Ejecutar funciones de UI con seguridad
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

    themeToggle?.addEventListener('change', () => { 
        state.theme = themeToggle.checked ? 'light' : 'dark'; 
        applyTheme(state.theme); 
        saveData(); 
        showToast(`Modo ${state.theme === 'light' ? 'Claro' : 'Oscuro'} activado`); 
    });

    secRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            state.securityMode = radio.value;
            if (state.securityMode === 'pin') { pinSetup.classList.remove('hidden'); showToast("Configura tu nuevo PIN"); }
            else { pinSetup.classList.add('hidden'); state.pin = state.securityMode === 'none' ? null : state.pin; showToast(state.securityMode === 'none' ? "Seguridad desactivada" : "Biometría activa"); }
            saveData();
        });
    });

    newPinInput?.addEventListener('input', () => { if (newPinInput.value.length === 4) { state.pin = newPinInput.value; saveData(); showToast("PIN guardado correctamente"); newPinInput.blur(); } });
    editName?.addEventListener('change', () => { state.userName = editName.value; saveData(); updateUI(); showToast("Nombre actualizado"); });
    editEmail?.addEventListener('change', () => { state.email = editEmail.value; saveData(); showToast("Correo guardado"); });
    editPhone?.addEventListener('change', () => { state.phone = editPhone.value; saveData(); showToast("Teléfono guardado"); });
    updateRateBtn?.addEventListener('click', fetchBCVRate);
    exitBtn?.addEventListener('click', () => { if (confirm("¿Estás seguro que deseas cerrar la sesión?")) { document.body.innerHTML = "<div style='display:flex; height:100vh; align-items:center; justify-content:center; background:#000; color:#fff;'>Aplicación cerrada localmente.</div>"; setTimeout(() => window.location.reload(), 3000); } });
}

// Iniciar aplicación
initEventListeners();
