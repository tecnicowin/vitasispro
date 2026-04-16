// js/assistant.js

// --- Pre-carga de voces para reducir latencia del TTS ---
let _ttsVoice = null;
function _loadVoices() {
    const voices = window.speechSynthesis.getVoices();
    _ttsVoice = voices.find(v => v.lang === 'es-VE') ||
                voices.find(v => v.lang === 'es-ES') ||
                voices.find(v => v.lang.startsWith('es')) ||
                null;
}
if (window.speechSynthesis) {
    _loadVoices();
    window.speechSynthesis.onvoiceschanged = _loadVoices;
}

function speak(text) {
    if (!state.voiceEnabled) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'es-ES';
    u.rate = 1.05;
    u.pitch = 1.0;
    if (_ttsVoice) u.voice = _ttsVoice;
    window.speechSynthesis.speak(u);
}

function addChatMessage(text, sender, showCategories = false, customChips = null) {
    const container = document.getElementById('chat-container');
    const msg = document.createElement('div');
    msg.className = `chat-message ${sender}`;
    let content = `<div class="message-bubble">${text}</div>`;

    if (showCategories) {
        const defaultCats = [
            { n: "Comida", i: "utensils" }, { n: "Transporte", i: "car" },
            { n: "Ocio", i: "clapperboard" }, { n: "Salud", i: "heart-pulse" },
            { n: "Hogar", i: "home" }, { n: "Celular", i: "smartphone" },
            { n: "Personal", i: "user" }, { n: "Tarjeta Credito", i: "credit-card" },
            { n: "Cashea", i: "scan-qr-code" }, { n: "Servicios", i: "zap" },
            { n: "Educacion", i: "book-open" }, { n: "Varios", i: "plus-circle" }
        ];
        const customCats = (state.customCategories || []).map(n => ({ n, i: 'tag' }));
        const allCats = [...defaultCats, ...customCats];

        content += `<div class="category-chip-list">
            ${allCats.map(c => `
            <button class="cat-chip" onclick="document.getElementById('assistant-input').value='${c.n}'; document.getElementById('send-btn').click();">
                <i data-lucide="${c.i}"></i><span>${c.n}</span>
            </button>`).join('')}
            <button class="cat-chip cat-chip-new" onclick="requestNewCategory()">
                <i data-lucide="plus"></i><span>Nueva</span>
            </button>
        </div>`;
    } else if (customChips) {
        content += `<div class="category-chip-list">
            ${customChips.map(c => `
            <button class="cat-chip" onclick="document.getElementById('assistant-input').value='${c.val}'; document.getElementById('send-btn').click();">
                ${c.icon ? `<i data-lucide="${c.icon}"></i>` : ''}<span>${c.label}</span>
            </button>`).join('')}
        </div>`;
    }

    msg.innerHTML = content;
    container.appendChild(msg);
    container.scrollTop = container.scrollHeight;
    if (window.lucide) window.lucide.createIcons();
    
    if (sender === 'bot' && state.voiceEnabled) {
        const plainText = text.replace(/<[^>]+>/g, '').replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}]/gu, '').trim();
        speak(plainText);
    }
}

function showIncomeDestTypes() {
    addChatMessage("¿Dónde registro este ingreso? Selecciona una categoría:", 'bot', false, [
        { label: 'Banco', val: 'bancos', icon: 'building-2' },
        { label: 'Inversión', val: 'inversiones', icon: 'trending-up' },
        { label: 'Divisas', val: 'divisas', icon: 'wallet' }
    ]);
}

function showIncomeSubDest(group) {
    const labels = { bancos: 'los Bancos', inversiones: 'las Inversiones', divisas: 'las Divisas' };
    const subcats = (state.incomeCategories && state.incomeCategories[group]) ? state.incomeCategories[group] : [];
    const chips = subcats.map(s => ({ label: s, val: s, icon: 'tag' }));
    chips.push({ label: 'Nueva', val: 'nueva', icon: 'plus' });
    addChatMessage(`Selecciona una subcategoría para ${labels[group]}:`, 'bot', false, chips);
}

function showPaymentTypes() {
    addChatMessage("¿Con qué pagaste este gasto? Selecciona el origen:", 'bot', false, [
        { label: 'Banco', val: 'bancos', icon: 'building-2' },
        { label: 'Inversión', val: 'inversiones', icon: 'trending-up' },
        { label: 'Divisas', val: 'divisas', icon: 'wallet' }
    ]);
}

function showPaymentAccounts(group) {
    const labels = { bancos: 'los Bancos', inversiones: 'las Inversiones', divisas: 'las Divisas' };
    const subcats = (state.incomeCategories && state.incomeCategories[group]) ? state.incomeCategories[group] : [];
    const chips = subcats.map(s => ({ label: s, val: s, icon: 'tag' }));
    addChatMessage(`¿Desde qué cuenta de ${labels[group]} salió el dinero?`, 'bot', false, chips);
}

function showBalanceCategoryOptions() {
    addChatMessage("¿De qué categoría quieres ver el saldo detallado?", 'bot', false, [
        { label: 'Bancos', val: 'bancos', icon: 'building-2' },
        { label: 'Inversiones', val: 'inversiones', icon: 'trending-up' },
        { label: 'Divisas', val: 'divisas', icon: 'wallet' }
    ]);
}

function showBalanceCategoryDetails(group) {
    const labels = { bancos: 'Bancos', inversiones: 'Inversiones', divisas: 'Divisas' };
    const subcats = (state.incomeCategories && state.incomeCategories[group]) ? state.incomeCategories[group] : [];
    
    let summary = `<b>Saldos en ${labels[group]}:</b><br>`;
    let total = 0;

    if (subcats.length === 0) {
        summary += "<i>No hay cuentas registradas en esta categoría.</i>";
    } else {
        subcats.forEach(s => {
            const bal = getBalanceByAccount(s);
            total += bal;
            summary += `• ${s}: ${formatCurrency(bal)} (${formatVES(bal)})<br>`;
        });
        summary += `<br><b>Total ${labels[group]}: ${formatCurrency(total)} (${formatVES(total)})</b>`;
    }
    
    addChatMessage(summary, 'bot');
    setTimeout(() => {
        addChatMessage("¿Deseas ver otra categoría?", 'bot', false, [{label:'Sí', val:'otro_saldo'}, {label:'No', val:'no'}]);
        state.isAwaitingMoreInfo = true;
    }, 800);
}

function requestNewCategory() {
    state.isAwaitingCategory = false;
    state.isAwaitingNewCategory = true;
    state.isAwaitingNewCategoryConfirm = false;
    addChatMessage('🏷️ ¿Cómo quieres llamar a la nueva categoría? Escríbela a continuación.', 'bot');
}

function completeTransaction(a, t, c, currency = "USD", subType = null, source = null) {
    addTransaction(a, t, c, currency, subType, source);
    updateUI();
    updateCharts();
}

function clearChat() {
    const container = document.getElementById('chat-container');
    if (container) container.innerHTML = '';
}

function resetAssistantStates() {
    state.isAwaitingCategory = false;
    state.isAwaitingMoreInfo = false;
    state.isAwaitingRate = false;
    state.isAwaitingNewCategory = false;
    state.isAwaitingNewCategoryConfirm = false;
    state.isAwaitingIncomeDestType = false;
    state.isAwaitingIncomeSubDest = false;
    state.isAwaitingPaymentType = false;
    state.isAwaitingPaymentAccount = false;
    state.isAwaitingBalanceCategory = false;
    state.isAwaitingConfirmation = false;
    state.tempNewCategoryName = null;
    state.tempSourceGroup = null;
    state.tempSourceAccount = null;
    state.tempIncomeGroup = null;
    state.tempAmount = 0;
}

function fetchBCVRate() {
    const manualRate = prompt("Por favor, ingresa la tasa oficial del BCV:");
    if (manualRate && !isNaN(manualRate)) {
        state.bcvRate = parseFloat(manualRate);
        state.lastRateUpdate = new Date().toLocaleDateString();
        saveData(); updateUI();
        showToast("Tasa BCV actualizada exitosamente");
    }
}

function processCommand(text) {
    const lower = text.toLowerCase();
    const norm = normalize(text);

    // 1. Estados Críticos (Flujos activos)
    if (state.isAwaitingMoreInfo) {
        if (norm === 'no') { addChatMessage("Hasta pronto. 👋", 'bot'); state.isAwaitingMoreInfo = false; setTimeout(() => { clearChat(); document.getElementById('close-assistant')?.click(); }, 1500); return; }
        else if (norm === 'si') { addChatMessage("¿En qué te puedo servir?", 'bot'); state.isAwaitingMoreInfo = false; return; }
        else if (norm === 'otro_saldo') { state.isAwaitingMoreInfo = false; state.isAwaitingBalanceCategory = true; showBalanceCategoryOptions(); return; }
        state.isAwaitingMoreInfo = false;
    }

    if (state.isAwaitingBalanceCategory) {
        const mapping = { 'banco': 'bancos', 'bancos': 'bancos', 'inversion': 'inversiones', 'inversiones': 'inversiones', 'divisa': 'divisas', 'divisas': 'divisas' };
        const found = mapping[norm];
        if (found) {
            state.isAwaitingBalanceCategory = false;
            showBalanceCategoryDetails(found);
        } else if (norm === 'cancelar') { resetAssistantStates(); addChatMessage("Operación cancelada.", 'bot'); }
        else { addChatMessage("Por favor selecciona: Bancos, Inversiones o Divisas.", 'bot'); }
        return;
    }

    if (state.isAwaitingNewCategoryConfirm) {
        if (norm === 'si' || norm === 'confirmar' || norm === 'ok') {
            const newCat = state.tempNewCategoryName;
            if (state.tempType === 'income') {
                if (!state.incomeCategories) state.incomeCategories = { bancos: [], inversiones: [], divisas: [] };
                if (!state.incomeCategories[state.tempIncomeGroup].includes(newCat)) state.incomeCategories[state.tempIncomeGroup].push(newCat);
                state.tempCategory = newCat;
                state.isAwaitingConfirmation = true;
                state.isAwaitingNewCategoryConfirm = false;
                saveData();
                addChatMessage(`¿Confirmas el ingreso de ${state.tempCurrency === 'USD' ? formatCurrency(state.tempAmount) : state.tempAmount+' Bs.'} en <b>${newCat}</b>?`, 'bot', false, [
                    { label: 'Sí, confirmar', val: 'si', icon: 'check' },
                    { label: 'Cancelar', val: 'no', icon: 'x' }
                ]);
            } else {
                if (!state.customCategories) state.customCategories = [];
                if (!state.customCategories.includes(newCat)) state.customCategories.push(newCat);
                state.tempCategory = newCat;
                state.isAwaitingNewCategoryConfirm = false;
                state.isAwaitingPaymentType = true;
                saveData();
                addChatMessage(`✅ Categoría <b>${newCat}</b> creada.`, 'bot');
                showPaymentTypes();
            }
        } else if (norm === 'no' || norm === 'cancelar') {
            state.isAwaitingNewCategoryConfirm = false;
            addChatMessage('Entendido. ¿Qué nombre prefieres entonces?', 'bot');
        } else {
            state.tempNewCategoryName = text.trim();
            addChatMessage(`¿Confirmas el nombre: <b>${state.tempNewCategoryName}</b>?`, 'bot', false, [{label:'Sí', val:'si'}, {label:'No', val:'no'}]);
        }
        return;
    }

    if (state.isAwaitingIncomeDestType) {
        const mapping = { 'banco': 'bancos', 'bancos': 'bancos', 'inversion': 'inversiones', 'inversiones': 'inversiones', 'divisa': 'divisas', 'divisas': 'divisas' };
        const found = mapping[norm];
        if (found) {
            state.tempIncomeGroup = found;
            state.isAwaitingIncomeDestType = false;
            state.isAwaitingIncomeSubDest = true;
            showIncomeSubDest(found);
        } else if (norm === 'cancelar') { resetAssistantStates(); addChatMessage("Operación cancelada.", 'bot'); }
        else { addChatMessage("Por favor selecciona: Banco, Inversión o Divisas.", 'bot'); }
        return;
    }

    if (state.isAwaitingIncomeSubDest) {
        if (norm === 'nueva') {
            state.isAwaitingIncomeSubDest = false;
            state.isAwaitingNewCategory = true;
            addChatMessage(`🏷️ Nombre para el/la ${state.tempIncomeGroup.slice(0,-1)}:`, 'bot');
            return;
        }
        const subcats = state.incomeCategories[state.tempIncomeGroup] || [];
        const found = subcats.find(s => normalize(s) === norm);
        if (found) {
            state.tempCategory = found;
            state.isAwaitingIncomeSubDest = false;
            state.isAwaitingConfirmation = true;
            addChatMessage(`¿Confirmas el ingreso de ${state.tempCurrency === 'USD' ? formatCurrency(state.tempAmount) : state.tempAmount+' Bs.'} en <b>${found}</b>?`, 'bot', false, [{label:'Sí, confirmar', val:'si', icon:'check'}, {label:'Cancelar', val:'no', icon:'x'}]);
        } else { addChatMessage(`No encontré esa subcategoría. Prueba seleccionándola o escribe <b>Nueva</b>.`, 'bot'); }
        return;
    }

    if (state.isAwaitingPaymentType) {
        const mapping = { 'banco': 'bancos', 'bancos': 'bancos', 'inversion': 'inversiones', 'inversiones': 'inversiones', 'divisa': 'divisas', 'divisas': 'divisas' };
        const found = mapping[norm];
        if (found) {
            state.tempSourceGroup = found;
            state.isAwaitingPaymentType = false;
            state.isAwaitingPaymentAccount = true;
            showPaymentAccounts(found);
        } else if (norm === 'cancelar') { resetAssistantStates(); addChatMessage("Operación cancelada.", 'bot'); }
        else { addChatMessage("Por favor selecciona: Banco, Inversión o Divisas.", 'bot'); }
        return;
    }

    if (state.isAwaitingPaymentAccount) {
        const subcats = state.incomeCategories[state.tempSourceGroup] || [];
        const found = subcats.find(s => normalize(s) === norm);
        if (found) {
            state.tempSourceAccount = found;
            state.isAwaitingPaymentAccount = false;
            state.isAwaitingConfirmation = true;
            addChatMessage(`¿Confirmas el gasto de ${state.tempCurrency === 'USD' ? formatCurrency(state.tempAmount) : state.tempAmount+' Bs.'} en <b>${state.tempCategory}</b> pagado con <b>${found}</b>?`, 'bot', false, [
                { label: 'Sí, confirmar', val: 'si', icon: 'check' },
                { label: 'Cancelar', val: 'no', icon: 'x' }
            ]);
        } else { addChatMessage("Por favor selecciona una de tus cuentas registradas.", 'bot'); }
        return;
    }

    if (state.isAwaitingConfirmation) {
        if (norm === 'si' || norm === 'confirmar' || norm === 'ok') {
            const type = state.tempType;
            const cat = state.tempCategory;
            const amt = state.tempAmount;
            const cur = state.tempCurrency;
            const group = state.tempType === 'income' ? state.tempIncomeGroup : state.tempSourceGroup;
            const source = state.tempSourceAccount;
            
            resetAssistantStates();
            completeTransaction(amt, type, cat, cur, group, source);
            
            const accountBal = source ? getBalanceByAccount(source) : (type === 'income' ? getBalanceByAccount(cat) : null);
            let feedback = `✅ Registro confirmado en <b>${cat}</b>.`;
            if (accountBal !== null) feedback += `<br>Saldo actual en ${source || cat}: ${formatCurrency(accountBal)} (${formatVES(accountBal)})`;
            addChatMessage(feedback, 'bot');
        } else if (norm === 'no' || norm === 'cancelar') {
            resetAssistantStates();
            addChatMessage("Acción cancelada.", 'bot');
        } else {
            addChatMessage("¿Confirmas el registro?", 'bot', false, [{label:'Sí', val:'si'}, {label:'No', val:'no'}]);
        }
        return;
    }

    if (state.isAwaitingNewCategory) {
        const newName = text.trim();
        if (newName) { state.tempNewCategoryName = newName; state.isAwaitingNewCategory = false; state.isAwaitingNewCategoryConfirm = true; addChatMessage(`¿Confirmas el nombre <b>${newName}</b>?`, 'bot', false, [{label:'Sí', val:'si'}, {label:'No', val:'no'}]); }
        return;
    }

    if (state.isAwaitingRate) {
        let amt = extractAmount(lower);
        if (amt) { state.bcvRate = amt; state.lastRateUpdate = new Date().toLocaleDateString(); state.isAwaitingRate = false; saveData(); updateUI(); addChatMessage(`Tasa de ${amt} Bs/$ guardada.`, 'bot'); }
        return;
    }

    // 2. Comandos Globales
    if (norm.includes('cancelar') || norm.includes('olvida')) { resetAssistantStates(); addChatMessage("Acción cancelada.", 'bot'); return; }

    const isVES = /\bbs\.?\b/.test(norm) || norm.includes('bolivar') || norm.includes('bs');
    let currentCurrency = isVES ? 'VES' : 'USD';

    if (norm.includes('solicito saldo') || norm.includes('ver saldos') || (norm.includes('detalle') && norm.includes('saldo'))) {
        state.isAwaitingBalanceCategory = true;
        showBalanceCategoryOptions();
        return;
    }

    if (norm.includes('balance') || norm.includes('saldo') || norm.includes('cuanto tengo')) {
        addChatMessage(`${state.userName || 'Usuario'}, tu balance es ${formatCurrency(state.balance)} (${formatVES(state.balance)}).`, 'bot');
        return;
    }

    if (norm.includes('cuanto') || norm.includes('total') || norm.includes('informe') || norm.includes('resumen')) {
        if (norm.includes('gasto') || norm.includes('gastado') || norm.includes('detallado')) {
            const exps = state.transactions.filter(t => t.type === 'expense');
            if (exps.length === 0) { addChatMessage("No tienes gastos registrados todavía.", 'bot'); }
            else {
                const cats = {}; exps.forEach(e => cats[e.category] = (cats[e.category] || 0) + e.amount);
                let summary = "<b>Resumen de tus gastos:</b><br>";
                Object.keys(cats).forEach(c => { summary += `• ${c}: ${formatCurrency(cats[c])} (${formatVES(cats[c])})<br>`; });
                summary += `<br>Total: ${formatCurrency(state.expenses)} (${formatVES(state.expenses)})`;
                addChatMessage(summary, 'bot');
                setTimeout(() => { addChatMessage("¿Deseas otra información?", 'bot', false, [{label:'Sí', val:'si'}, {label:'No', val:'no'}]); state.isAwaitingMoreInfo = true; }, 800);
                return;
            }
        } else if (norm.includes('ingreso') || norm.includes('ganado') || norm.includes('gane')) {
            const incs = state.transactions.filter(t => t.type === 'income');
            if (incs.length === 0) { addChatMessage(`No tienes ingresos registrados todavía.`, 'bot'); }
            else {
                const subcats = {}; incs.forEach(e => subcats[e.category] = (subcats[e.category] || 0) + e.amount);
                let summary = "<b>Resumen de tus ingresos:</b><br>";
                let hasPositive = false;
                Object.keys(subcats).forEach(c => { if (subcats[c] > 0) { summary += `• ${c}: ${formatCurrency(subcats[c])} (${formatVES(subcats[c])})<br>`; hasPositive = true; } });
                if (!hasPositive) { addChatMessage(`No tienes ingresos con saldo positivo.`, 'bot'); }
                else { summary += `<br>Total Ingresos: ${formatCurrency(state.income)} (${formatVES(state.income)})`; addChatMessage(summary, 'bot'); }
            }
            return;
        }
    }

    if (norm.includes('ver') || norm.includes('ir') || norm.includes('abrir') || norm.includes('mostrar')) {
        if (norm.includes('reporte') || norm.includes('analitica') || norm.includes('grafico')) { switchScreen('analytics'); addChatMessage("Abriendo reportes...", 'bot'); return; }
        if (norm.includes('ajuste') || norm.includes('configuracion')) { toggleMenu(); addChatMessage("Abriendo configuración...", 'bot'); return; }
        if (norm.includes('inicio') || norm.includes('dashboard')) { switchScreen('dashboard'); addChatMessage("Volviendo al inicio.", 'bot'); return; }
    }

    if (norm.includes('gasto') || norm.includes('gaste') || norm.includes('pague')) {
        const amount = extractAmount(lower);
        if (amount) {
            state.tempAmount = amount; state.tempCurrency = currentCurrency; state.tempType = 'expense';
            const categories = ["Comida", "Transporte", "Ocio", "Salud", "Hogar", "Celular", "Personal", "Tarjeta Credito", "Cashea", "Servicios", "Educacion", "Varios", ...(state.customCategories || [])];
            let found = categories.find(c => norm.includes(normalize(c)));
            if (found) { 
                state.tempCategory = found; 
                state.isAwaitingPaymentType = true;
                showPaymentTypes();
            } else {
                state.isAwaitingCategory = true;
                addChatMessage("¿En qué categoría lo registro?", 'bot', true);
            }
            return;
        }
    }

    if (norm.includes('ingreso') || norm.includes('gane') || norm.includes('recibi')) {
        const amount = extractAmount(lower);
        if (amount) {
            state.tempAmount = amount; state.tempType = 'income'; state.tempCurrency = currentCurrency;
            state.isAwaitingIncomeDestType = true;
            showIncomeDestTypes();
            return;
        }
    }

    if (state.isAwaitingCategory) {
        const categories = ["Comida", "Transporte", "Ocio", "Salud", "Hogar", "Celular", "Personal", "Tarjeta Credito", "Cashea", "Servicios", "Educacion", "Varios", ...(state.customCategories || [])];
        let found = categories.find(c => norm.includes(normalize(c)));
        if (found) { 
            state.tempCategory = found; 
            state.isAwaitingCategory = false; 
            state.isAwaitingPaymentType = true;
            showPaymentTypes();
        }
        else { addChatMessage("Por favor selecciona una categoría.", 'bot', true); }
        return;
    }

    if (state.isAwaitingName) { state.userName = text.trim(); state.isAwaitingName = false; saveData(); updateUI(); addChatMessage(`Gusto en conocerte, ${state.userName}.`, 'bot'); return; }

    if (norm.includes('ayuda')) { addChatMessage("Puedes decir: 'Gaste 50 en comida' o 'Gané 100'.", 'bot'); return; }

    addChatMessage("No entendí bien. Prueba con 'Gaste 50' o 'Ver reportes'.", 'bot');
}
