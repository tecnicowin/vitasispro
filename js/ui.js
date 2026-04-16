// js/ui.js
let activeFilter = 'mes'; // 'hoy' | 'semana' | 'mes'

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

function getFilteredTransactions() {
    const now = new Date();
    return state.transactions.filter(t => {
        // Legacy: si no tiene timestamp, usar la fecha mostrada (fallback: siempre mostrar)
        const ts = t.timestamp ? new Date(t.timestamp) : null;
        if (!ts) return true;
        if (activeFilter === 'hoy') {
            return ts.toDateString() === now.toDateString();
        } else if (activeFilter === 'semana') {
            const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7);
            return ts >= weekAgo;
        } else { // mes
            return ts.getMonth() === now.getMonth() && ts.getFullYear() === now.getFullYear();
        }
    });
}

function updateUI() {
    const nameDisplay = document.querySelector('.user-name');
    const welcomeLabel = document.querySelector('.welcome');
    if (nameDisplay) nameDisplay.textContent = state.userName || 'Usuario';
    if (welcomeLabel) welcomeLabel.textContent = `${getGreeting()},`;

    const mainBal = document.getElementById('main-balance');
    const secBal = document.getElementById('secondary-balance');
    if (mainBal) mainBal.textContent = formatCurrency(state.balance);
    if (secBal) secBal.textContent = formatVES(state.balance);

    const balanceCard = document.querySelector('.balance-card');
    if (balanceCard) {
        balanceCard.classList.toggle('negative', state.balance < 0);
        balanceCard.classList.toggle('low-funds', state.balance >= 0 && state.balance < 20);
    }

    const tIncVal = document.getElementById('total-income');
    const tIncBs = document.getElementById('total-income-bs');
    const tExpVal = document.getElementById('total-expense');
    const tExpBs = document.getElementById('total-expense-bs');

    if (tIncVal) tIncVal.textContent = formatCurrency(state.income);
    if (tIncBs) tIncBs.textContent = formatVES(state.income);
    if (tExpVal) tExpVal.textContent = formatCurrency(state.expenses);
    if (tExpBs) tExpBs.textContent = formatVES(state.expenses);

    const editName = document.getElementById('edit-name');
    const editEmail = document.getElementById('edit-email');
    const editPhone = document.getElementById('edit-phone');
    const bcvDisp = document.getElementById('bcv-display-val');

    if (editName && !editName.matches(':focus')) editName.value = state.userName || '';
    if (editEmail && !editEmail.matches(':focus')) editEmail.value = state.email || '';
    if (editPhone && !editPhone.matches(':focus')) editPhone.value = state.phone || '';
    if (bcvDisp) bcvDisp.textContent = state.bcvRate || '--';

    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) themeToggle.checked = state.theme === 'light';
    
    if (state.securityMode) {
        const rad = document.getElementById(state.securityMode === 'biometric' ? 'sec-biometric' : `sec-${state.securityMode}`);
        if (rad) rad.checked = true;
        document.getElementById('pin-setup')?.classList.toggle('hidden', state.securityMode !== 'pin');
    }

    renderTransactions();
    renderCategories();
    renderIncomeCategories();
    updateDistributionBalances();
    if (window.lucide) window.lucide.createIcons();
}

function updateDistributionBalances() {
    // Calculamos balances por tipo (sumando todos los ingresos de esa subcategoría)
    const bBalance = getBalanceByCategoryType('bancos');
    const iBalance = getBalanceByCategoryType('inversiones');
    const dBalance = getBalanceByCategoryType('divisas'); // Aunque no esté en el dashboard principal, se puede usar
    
    const distBancos = document.getElementById('dist-bancos');
    const distBancosBs = document.getElementById('dist-bancos-bs');
    const distInversiones = document.getElementById('dist-inversiones');
    const distInversionesBs = document.getElementById('dist-inversiones-bs');
    
    if (distBancos) distBancos.textContent = formatCurrency(bBalance);
    if (distBancosBs) distBancosBs.textContent = formatVES(bBalance);
    if (distInversiones) distInversiones.textContent = formatCurrency(iBalance);
    if (distInversionesBs) distInversionesBs.textContent = formatVES(iBalance);
}

function renderIncomeCategories() {
    const list = document.getElementById('income-categories-list');
    if (!list) return;

    if (!state.incomeCategories) {
        state.incomeCategories = { bancos: [], inversiones: [], divisas: [] };
    }

    const types = [
        { id: 'bancos', label: 'Bancos' },
        { id: 'inversiones', label: 'Inversiones' },
        { id: 'divisas', label: 'Divisas' }
    ];

    let hasData = false;
    list.innerHTML = types.map(type => {
        const cats = state.incomeCategories[type.id] || [];
        if (cats.length === 0) return '';
        hasData = true;
        return `
            <div class="income-cat-group" style="margin-bottom:10px">
                <div class="income-cat-group-title">${type.label}</div>
                ${cats.map((cat, idx) => `
                    <div class="income-subcat-item">
                        <span class="income-subcat-name">${cat}</span>
                        <button onclick="removeIncomeCategory('${type.id}', ${idx})" class="remove-cat-btn">
                            <i data-lucide="x"></i>
                        </button>
                    </div>
                `).join('')}
            </div>
        `;
    }).join('');

    if (!hasData) {
        list.innerHTML = '<p class="settings-hint">No hay cuentas de ingresos/inversiones registradas</p>';
    }
    
    if (window.lucide) window.lucide.createIcons();
}

function removeIncomeCategory(type, index) {
    const catName = state.incomeCategories[type][index];
    if (confirm(`¿Estás seguro de eliminar "${catName}"?`)) {
        state.incomeCategories[type].splice(index, 1);
        saveData();
        renderIncomeCategories();
        showToast("Cuenta eliminada");
    }
}

function renderCategories() {
    const customList = document.getElementById('custom-cats-list');
    if (!customList) return;

    if (!state.customCategories || state.customCategories.length === 0) {
        customList.innerHTML = '<p style="font-size:0.75rem; color:var(--text-dim); padding:5px;">Sin categorías personalizadas</p>';
    } else {
        customList.innerHTML = state.customCategories.map((cat, index) => `
            <div class="cat-tag custom-tag">
                <span>${cat}</span>
                <button onclick="removeCategory(${index})" class="remove-cat-btn">
                    <i data-lucide="x"></i>
                </button>
            </div>
        `).join('');
    }
    if (window.lucide) window.lucide.createIcons();
}

function removeCategory(index) {
    if (confirm(`¿Estás seguro de eliminar la categoría "${state.customCategories[index]}"?`)) {
        state.customCategories.splice(index, 1);
        saveData();
        renderCategories();
        showToast("Categoría eliminada");
    }
}

function renderTransactions(searchQuery = '') {
    const listElement = document.getElementById('transaction-list');
    if (!listElement) return;
    
    let filtered = getFilteredTransactions();
    
    if (searchQuery) {
        const q = normalize(searchQuery);
        filtered = filtered.filter(t => normalize(t.category).includes(q) || t.date.toLowerCase().includes(q));
    }
    
    filtered = filtered.slice().reverse();
    
    if (filtered.length === 0) {
        const labels = { hoy: 'hoy', semana: 'esta semana', mes: 'este mes' };
        const msg = searchQuery ? `Sin resultados para "${searchQuery}"` : `Sin movimientos ${labels[activeFilter]}`;
        listElement.innerHTML = `<div class="empty-state"><i data-lucide="receipt"></i><p>${msg}</p></div>`;
    } else {
        try {
            listElement.innerHTML = filtered.map(t => createTransactionHTML(t)).join('');
        } catch (e) {
            console.error("Error rendering transactions:", e);
            listElement.innerHTML = `<div class="empty-state"><p>Error al cargar movimientos</p></div>`;
        }
    }
    if (window.lucide) window.lucide.createIcons();
    // Attach tap listeners
    listElement.querySelectorAll('.transaction-item').forEach(el => {
        el.addEventListener('click', () => {
            const id = Number(el.dataset.id);
            const t = state.transactions.find(x => x.id === id);
            if (t) openTransactionSheet(t);
        });
    });
}

function createTransactionHTML(t) {
    const isExp = t.type === 'expense';
    const color = isExp ? 'rgba(239, 68, 68, 0.1); color: #ef4444;' : 'rgba(16, 185, 129, 0.1); color: #10b981;';
    const cur = t.currency || 'USD';
    const origAmt = t.originalAmount !== undefined ? t.originalAmount : t.amount;
    const mainDisplay = cur === 'USD' ? formatCurrency(t.amount) : `${origAmt.toLocaleString('es-VE')} Bs.`;
    const secondaryDisplay = cur === 'USD' ? formatVES(t.amount) : formatCurrency(t.amount);
    return `
        <div class="transaction-item ${isExp ? 'expense-item' : 'income-item'}" data-id="${t.id}">
            <div class="item-icon" style="${color}"><i data-lucide="${isExp ? 'shopping-bag' : 'trending-up'}"></i></div>
            <div class="item-info">
                <div class="item-category">${t.category}</div>
                <div class="item-date">${t.date}</div>
            </div>
            <div class="item-amount-group">
                <div class="item-amount ${isExp ? 'amount-expense' : 'amount-income'}">${isExp ? '-' : '+'}${mainDisplay}</div>
                <div style="font-size: 0.72rem; color: var(--text-secondary); margin-top: 2px">${secondaryDisplay}</div>
            </div>
            <div class="item-action-hint"><i data-lucide="chevron-right"></i></div>
        </div>`;
}

function openTransactionSheet(t) {
    const sheet = document.getElementById('tx-action-sheet');
    const overlay = document.getElementById('tx-sheet-overlay');
    if (!sheet || !overlay) return;
    const isExp = t.type === 'expense';
    const cur = t.currency || 'USD';
    const origAmt = t.originalAmount !== undefined ? t.originalAmount : t.amount;
    const mainDisplay = cur === 'USD' ? formatCurrency(t.amount) : `${origAmt.toLocaleString('es-VE')} Bs.`;
    document.getElementById('sheet-category').textContent = t.category;
    document.getElementById('sheet-type-badge').textContent = isExp ? 'Gasto' : 'Ingreso';
    document.getElementById('sheet-type-badge').className = 'sheet-type-badge ' + (isExp ? 'badge-expense' : 'badge-income');
    document.getElementById('sheet-amount').textContent = (isExp ? '-' : '+') + mainDisplay;
    document.getElementById('sheet-amount').className = 'sheet-display-amount ' + (isExp ? 'amount-expense' : 'amount-income');
    document.getElementById('sheet-date').textContent = t.date;
    // Edit form pre-fill
    document.getElementById('edit-tx-amount').value = origAmt;
    document.getElementById('edit-tx-category').value = t.category;
    document.getElementById('edit-tx-type').value = t.type;
    document.getElementById('edit-tx-currency').value = cur;
    document.getElementById('edit-tx-form').dataset.id = t.id;
    // Show info, hide form
    document.getElementById('sheet-info-view').classList.remove('hidden');
    document.getElementById('sheet-edit-view').classList.add('hidden');
    sheet.classList.add('active');
    overlay.classList.add('active');
}

function closeTransactionSheet() {
    document.getElementById('tx-action-sheet')?.classList.remove('active');
    document.getElementById('tx-sheet-overlay')?.classList.remove('active');
}

function toggleMenu() {
    const menu = document.getElementById('settings-menu');
    const overlay = document.getElementById('menu-overlay');
    if (menu) menu.classList.toggle('active');
    if (overlay) overlay.classList.toggle('active');
}
