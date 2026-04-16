// js/assistant.js

// --- Pre-carga de voces para reducir latencia del TTS ---
let _ttsVoice = null;
function _loadVoices() {
    const voices = window.speechSynthesis.getVoices();
    // Prioridad: español de Venezuela > España > cualquier español
    _ttsVoice = voices.find(v => v.lang === 'es-VE') ||
                voices.find(v => v.lang === 'es-ES') ||
                voices.find(v => v.lang.startsWith('es')) ||
                null;
}
// Cargar voces al inicio (se necesita evento porque Chrome las carga asíncronamente)
if (window.speechSynthesis) {
    _loadVoices();
    window.speechSynthesis.onvoiceschanged = _loadVoices;
}

function speak(text) {
    if (!state.voiceEnabled) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'es-ES';
    u.rate = 1.05;   // Ligeramente más rápido → reduce latencia percibida
    u.pitch = 1.0;
    if (_ttsVoice) u.voice = _ttsVoice; // Usa la voz precargada
    window.speechSynthesis.speak(u);
}

function addChatMessage(text, sender, showCategories = false) {
    const container = document.getElementById('chat-container');
    const msg = document.createElement('div');
    msg.className = `chat-message ${sender}`;
    let content = `<div class="message-bubble">${text}</div>`;

    if (showCategories) {
        const defaultCats = [
            { n: "Comida",           i: "utensils" },
            { n: "Transporte",       i: "car" },
            { n: "Ocio",             i: "clapperboard" },
            { n: "Salud",            i: "heart-pulse" },
            { n: "Hogar",            i: "home" },
            { n: "Celular",          i: "smartphone" },
            { n: "Personal",         i: "user" },
            { n: "Tarjeta Credito",  i: "credit-card" },
            { n: "Cashea",           i: "scan-qr-code" },
            { n: "Servicios",        i: "zap" },
            { n: "Educacion",        i: "book-open" },
            { n: "Varios",           i: "plus-circle" }
        ];
        // Agregar categorías personalizadas persistidas
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
    }

    msg.innerHTML = content;
    container.appendChild(msg);
    container.scrollTop = container.scrollHeight;
    if (window.lucide) window.lucide.createIcons();
    
    if (sender === 'bot' && state.voiceEnabled) {
        const plainText = text
            .replace(/<small[^>]*>.*?<\/small>/gis, '') // Quitar texto de ayuda dentro de <small>
            .replace(/<br\s*\/?>/gi, '. ')               // <br> → pausa natural
            .replace(/<[^>]+>/g, '')                     // Quitar todas las etiquetas HTML
            .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '') // Quitar emojis
            .replace(/\s+/g, ' ')                        // Normalizar espacios
            .trim();
        speak(plainText);
    }
}

function showIncomeDestTypes() {
    const text = "¿Dónde registro este ingreso? Selecciona una categoría:";
    const container = document.getElementById('chat-container');
    const msg = document.createElement('div');
    msg.className = `chat-message bot`;
    
    let content = `<div class="message-bubble">${text}</div>`;
    content += `<div class="category-chip-list">
        <button class="cat-chip" onclick="document.getElementById('assistant-input').value='bancos'; document.getElementById('send-btn').click();">
            <i data-lucide="building-2"></i><span>Banco</span>
        </button>
        <button class="cat-chip" onclick="document.getElementById('assistant-input').value='inversiones'; document.getElementById('send-btn').click();">
            <i data-lucide="trending-up"></i><span>Inversión</span>
        </button>
        <button class="cat-chip" onclick="document.getElementById('assistant-input').value='divisas'; document.getElementById('send-btn').click();">
            <i data-lucide="wallet"></i><span>Divisas</span>
        </button>
    </div>`;

    msg.innerHTML = content;
    container.appendChild(msg);
    container.scrollTop = container.scrollHeight;
    if (window.lucide) window.lucide.createIcons();
    speak(text);
}

function showIncomeSubDest(group) {
    const labels = { bancos: 'los Bancos', inversiones: 'las Inversiones', divisas: 'las Divisas' };
    const text = `Selecciona una subcategoría para ${labels[group]}:`;
    const container = document.getElementById('chat-container');
    const msg = document.createElement('div');
    msg.className = `chat-message bot`;
    
    const subcats = (state.incomeCategories && state.incomeCategories[group]) ? state.incomeCategories[group] : [];
    
    let content = `<div class="message-bubble">${text}</div>`;
    content += `<div class="category-chip-list">
        ${subcats.map(s => `
            <button class="cat-chip" onclick="document.getElementById('assistant-input').value='${s}'; document.getElementById('send-btn').click();">
                <i data-lucide="tag"></i><span>${s}</span>
            </button>
        `).join('')}
        <button class="cat-chip cat-chip-new" onclick="document.getElementById('assistant-input').value='nueva'; document.getElementById('send-btn').click();">
            <i data-lucide="plus"></i><span>Nueva</span>
        </button>
    </div>`;

    msg.innerHTML = content;
    container.appendChild(msg);
    container.scrollTop = container.scrollHeight;
    if (window.lucide) window.lucide.createIcons();
    speak(text);
}

function clearChat() {
    const container = document.getElementById('chat-container');
    if (container) container.innerHTML = '';
}

async function fetchBCVRate() {
    const manualRate = prompt("Por favor, ingresa la tasa oficial del BCV:");
    if (manualRate && !isNaN(manualRate)) {
        state.bcvRate = parseFloat(manualRate);
        state.lastRateUpdate = new Date().toLocaleDateString();
        saveData();
        updateUI();
        showToast("Tasa BCV actualizada exitosamente");
    }
}

// Lanzar flujo de nueva categoría SIN pasar por el input (evita que aparezca en chat o TTS)
function requestNewCategory() {
    if (!state.isAwaitingCategory && !state.isAwaitingNewCategory) return;
    state.isAwaitingCategory = false;
    state.isAwaitingNewCategory = true;
    state.isAwaitingNewCategoryConfirm = false;
    addChatMessage('🏷️ ¿Cómo quieres llamar a la nueva categoría? Escríbela a continuación.', 'bot');
}


function completeTransaction(a, t, c, currency = "USD", subType = null) {
    addTransaction(a, t, c, currency, subType);
    updateUI();
    updateCharts();
}
function processCommand(text) {
    const lower = text.toLowerCase();
    const norm = normalize(text);

    if (state.isAwaitingNewCategoryConfirm) {
        if (norm === 'si' || norm === 'confirmar' || norm === 'ok' || norm === 'listo') {
            const newCat = state.tempNewCategoryName;
            
            if (state.tempType === 'income') {
                if (!state.incomeCategories) state.incomeCategories = { bancos: [], inversiones: [], divisas: [] };
                if (!state.incomeCategories[state.tempIncomeGroup].includes(newCat)) {
                    state.incomeCategories[state.tempIncomeGroup].push(newCat);
                }
                state.isAwaitingNewCategoryConfirm = false;
                state.tempCategory = newCat;
                state.isAwaitingConfirmation = true;
                saveData();
                
                const text = `¿Confirmas el ingreso de ${state.tempCurrency === 'USD' ? formatCurrency(state.tempAmount) : state.tempAmount+' Bs.'} en <b>${newCat}</b>?`;
                const container = document.getElementById('chat-container');
                const msg = document.createElement('div');
                msg.className = `chat-message bot`;
                
                let content = `<div class="message-bubble">${text}</div>`;
                content += `<div class="category-chip-list">
                    <button class="cat-chip" onclick="document.getElementById('assistant-input').value='si'; document.getElementById('send-btn').click();">
                        <i data-lucide="check"></i><span>Sí, confirmar</span>
                    </button>
                    <button class="cat-chip" onclick="document.getElementById('assistant-input').value='no'; document.getElementById('send-btn').click();">
                        <i data-lucide="x"></i><span>Cancelar</span>
                    </button>
                </div>`;

                msg.innerHTML = content;
                container.appendChild(msg);
                container.scrollTop = container.scrollHeight;
                if (window.lucide) window.lucide.createIcons();
                speak(text.replace(/<[^>]+>/g, ''));
                return;
            } else {
                if (!state.customCategories) state.customCategories = [];
                if (!state.customCategories.includes(newCat)) {
                    state.customCategories.push(newCat);
                }
                state.isAwaitingNewCategoryConfirm = false;
                state.isAwaitingCategory = false;
                state.tempNewCategoryName = null;
                completeTransaction(state.tempAmount, 'expense', newCat, state.tempCurrency);
                addChatMessage(`✅ Categoría <b>${newCat}</b> creada y gasto de ${state.tempCurrency === 'USD' ? formatCurrency(state.tempAmount) : state.tempAmount + ' Bs.'} registrado. ${getBalanceFeedback(state.balance)}`, 'bot');
                state.tempAmount = 0;
            }
        } else if (norm === 'no' || norm === 'cancelar') {
            state.isAwaitingNewCategoryConfirm = false;
            state.tempNewCategoryName = null;
            addChatMessage('¿Cuál prefieres entonces?', 'bot', true);
        } else {
            state.tempNewCategoryName = text.trim();
            addChatMessage(`¿Confirmas el nombre: <b>${state.tempNewCategoryName}</b>?<br><small style="opacity:0.6">Responde <b>Sí</b> para guardar o escribe otro nombre.</small>`, 'bot');
        }
        return;
    }

    if (state.isAwaitingIncomeDestType) {
        const categories = { 
            'banco': 'bancos', 'bancos': 'bancos', 
            'inversion': 'inversiones', 'inversiones': 'inversiones', 
            'divisa': 'divisas', 'divisas': 'divisas' 
        };
        const found = categories[norm];
        if (found) {
            state.tempIncomeGroup = found;
            state.isAwaitingIncomeDestType = false;
            state.isAwaitingIncomeSubDest = true;
            showIncomeSubDest(found);
        } else if (norm === 'cancelar') {
            state.isAwaitingIncomeDestType = false;
            addChatMessage("Operación cancelada.", 'bot');
        } else {
            addChatMessage("Por favor selecciona una opción: Banco, Inversión o Divisas.", 'bot');
        }
        return;
    }

    if (state.isAwaitingIncomeSubDest) {
        if (norm === 'nueva') {
            state.isAwaitingIncomeSubDest = false;
            state.isAwaitingNewCategory = true;
            addChatMessage(`🏷️ ¿Cuál es el nombre del nuevo/a ${state.tempIncomeGroup.slice(0,-1)}?`, 'bot');
            return;
        }
        
        // Verificar si es una existente
        const group = state.tempIncomeGroup;
        const subcats = state.incomeCategories[group] || [];
        const found = subcats.find(s => normalize(s) === norm);
        
        if (found) {
            state.tempCategory = found;
            state.isAwaitingIncomeSubDest = false;
            state.isAwaitingConfirmation = true;
            
            const text = `¿Confirmas el ingreso de ${state.tempCurrency === 'USD' ? formatCurrency(state.tempAmount) : state.tempAmount+' Bs.'} en <b>${found}</b>?`;
            const container = document.getElementById('chat-container');
            const msg = document.createElement('div');
            msg.className = `chat-message bot`;
            
            let content = `<div class="message-bubble">${text}</div>`;
            content += `<div class="category-chip-list">
                <button class="cat-chip" onclick="document.getElementById('assistant-input').value='si'; document.getElementById('send-btn').click();">
                    <i data-lucide="check"></i><span>Sí, confirmar</span>
                </button>
                <button class="cat-chip" onclick="document.getElementById('assistant-input').value='no'; document.getElementById('send-btn').click();">
                    <i data-lucide="x"></i><span>Cancelar</span>
                </button>
            </div>`;

            msg.innerHTML = content;
            container.appendChild(msg);
            container.scrollTop = container.scrollHeight;
            if (window.lucide) window.lucide.createIcons();
            speak(text.replace(/<[^>]+>/g, ''));
        } else {
            addChatMessage(`No encontré esa subcategoría. Prueba seleccionándola o escribe <b>Nueva</b>.`, 'bot');
        }
        return;
    }

    if (state.isAwaitingConfirmation) {
        if (norm === 'si' || norm === 'confirmar' || norm === 'ok' || norm === 'listo') {
            state.isAwaitingConfirmation = false;
            completeTransaction(state.tempAmount, state.tempType, state.tempCategory, state.tempCurrency, state.tempIncomeGroup);
            
            // Resultado detallado según solicitud
            const catBalance = state.transactions
                .filter(t => t.type === 'income' && t.category === state.tempCategory)
                .reduce((sum, t) => sum + t.amount, 0);

            addChatMessage(`✅ Registro confirmado: ${state.tempType === 'income' ? 'Ingreso' : 'Gasto'} de ${state.tempCurrency === 'USD' ? formatCurrency(state.tempAmount) : state.tempAmount + ' Bs.'} en <b>${state.tempCategory}</b>.
            <br><small>Saldo en ${state.tempCategory}: ${formatCurrency(catBalance)} (${formatVES(catBalance)})</small>
            <br><small>Total Ingresos: ${formatCurrency(state.income)} (${formatVES(state.income)})</small>`, 'bot');
            
            state.tempAmount = 0;
            state.tempCategory = null;
            state.tempType = null;
            state.tempIncomeGroup = null;
        } else if (norm === 'no' || norm === 'cancelar') {
            state.isAwaitingConfirmation = false;
            state.tempAmount = 0;
            state.tempCategory = null;
            state.tempType = null;
            addChatMessage("Acción cancelada. ¿En qué más puedo ayudarte?", 'bot');
        } else {
            addChatMessage("¿Confirmas el registro? Responde <b>Sí</b> para guardar o <b>No</b> para cancelar.", 'bot');
        }
        return;
    }

    if (state.isAwaitingNewCategory) {
        const newName = text.trim();
        if (!newName) {
            addChatMessage('Por favor escribe el nombre.', 'bot');
            return;
        }
        state.tempNewCategoryName = newName;
        state.isAwaitingNewCategory = false;
        state.isAwaitingNewCategoryConfirm = true;
        addChatMessage(`¿Confirmas el registro de <b>${newName}</b>?<br><small style="opacity:0.6">Responde <b>Sí</b> para guardar o escribe otro nombre.</small>`, 'bot');
        return;
    }

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
        state.isAwaitingName = false;
        state.isAwaitingCategory = false;
        state.isAwaitingMoreInfo = false;
        state.isAwaitingRate = false;
        state.isAwaitingNewCategory = false;
        state.isAwaitingNewCategoryConfirm = false;
        state.isAwaitingIncomeDestType = false;
        state.isAwaitingIncomeSubDest = false;
        state.tempNewCategoryName = null;
        state.tempAmount = 0;
        addChatMessage("Acción cancelada. ¿En qué más puedo ayudarte?", 'bot');
        return;
    }

    // Detección ampliada: cubre variaciones fonéticas del STT para "bolívares"
    // Usa regex con límite de palabra (\b) para que "bs" se detecte solo,
    // sin importar si va al inicio, con espacio, punto o pegado a otro carácter.
    const isVES = /\bbs\.?\b/.test(norm) ||          // "bs", "bs.", "BS"
                  norm.includes('bolivar') ||          // "bolivar", "bolivares"
                  norm.includes('bolibares') ||         // variante fonética STT
                  norm.includes('venezolano') ||        // "pesos venezolanos"
                  norm.includes('vef') ||               // código viejo
                  /\bves\b/.test(norm);                 // código nuevo ISO

    if (norm.includes('resumen') || norm.includes('informe') || norm.includes('multimoneda') || isVES) {
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
            const incs = state.transactions.filter(t => t.type === 'income');
            if (incs.length === 0) {
                addChatMessage(`No tienes ingresos registrados todavía.`, 'bot');
            } else {
                const subcats = {};
                incs.forEach(e => subcats[e.category] = (subcats[e.category] || 0) + e.amount);
                
                let summary = "<b>Resumen de tus ingresos:</b><br>";
                let hasPositive = false;
                Object.keys(subcats).forEach(c => {
                    if (subcats[c] > 0) {
                        summary += `• ${c}: ${formatCurrency(subcats[c])} (${formatVES(subcats[c])})<br>`;
                        hasPositive = true;
                    }
                });
                
                if (!hasPositive) {
                    addChatMessage(`No tienes ingresos con saldo positivo actualmente.`, 'bot');
                } else {
                    summary += `<br>Total Ingresos: ${formatCurrency(state.income)} (${formatVES(state.income)})`;
                    addChatMessage(summary, 'bot');
                }
            }
            if (!state.isAwaitingCategory) return;
        }
    }

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

    const categories = [
        "Comida", "Transporte", "Ocio", "Salud", "Hogar",
        "Varios", "Restaurant", "Medicinas", "Consulta Medica",
        "Celular", "Personal", "Tarjeta Credito", "Tarjeta de Credito",
        "Cashea", "Servicios", "Educacion",
        ...(state.customCategories || [])  // Incluir las personalizadas
    ];
    if (state.isAwaitingCategory) {
        // Detectar si el usuario presionó el botón "Nueva"
        if (norm === '__nueva__' || norm.includes('nueva categoria') || norm.includes('agregar categoria')) {
            state.isAwaitingCategory = false;
            state.isAwaitingNewCategory = true;
            addChatMessage('🏷️ ¿Cómo quieres llamar a la nueva categoría?', 'bot');
            return;
        }
        let found = categories.find(c => norm.includes(normalize(c)));
        if (found) {
            state.tempCategory = found;
            state.tempType = 'expense';
            state.isAwaitingCategory = false;
            state.isAwaitingConfirmation = true;
            addChatMessage(`¿Confirmas el gasto de ${state.tempCurrency === 'USD' ? formatCurrency(state.tempAmount) : state.tempAmount+' Bs.'} en <b>${found}</b>?`, 'bot');
            return;
        }
    }

    let currentCurrency = 'USD';
    if (isVES) {
        currentCurrency = 'VES';
        const today = new Date().toLocaleDateString();
        if (state.lastRateUpdate !== today || !state.bcvRate) {
            state.isAwaitingRate = true;
            addChatMessage("¿Cuál es la tasa del BCV hoy para poder registrarlo en bolívares?", 'bot');
            return;
        }
    }

    if (norm.includes('gasto') || norm.includes('gaste') || norm.includes('pague') || norm.includes('compre') || norm.includes('hice un pago') || norm.includes('cancele')) {
        const amount = extractAmount(lower);
        if (amount) {
            let found = categories.find(c => norm.includes(normalize(c)));
            if (found) { completeTransaction(amount, 'expense', found, currentCurrency); addChatMessage(`Gasto de ${currentCurrency === 'USD' ? formatCurrency(amount) : amount+' Bs.'} en ${found} guardado.`, 'bot'); }
            else { state.tempAmount = amount; state.tempCurrency = currentCurrency; state.isAwaitingCategory = true; addChatMessage("¿En qué categoría lo registro?", 'bot', true); }
            return;
        }
    }

    if (norm.includes('ingreso') || norm.includes('gane') || norm.includes('recibi') || norm.includes('entro') || norm.includes('pago') || norm.includes('cobre') || norm.includes('pagaron') || norm.includes('transfirieron') || norm.includes('cancelaron')) {
        const amount = extractAmount(lower);
        if (amount) {
            state.tempAmount = amount;
            state.tempType = 'income';
            state.tempCurrency = currentCurrency;
            state.isAwaitingIncomeDestType = true;
            showIncomeDestTypes();
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
