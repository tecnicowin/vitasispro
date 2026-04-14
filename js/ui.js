// js/ui.js
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
    
    const cur = t.currency || 'USD';
    const origAmt = t.originalAmount !== undefined ? t.originalAmount : t.amount;

    const mainDisplay = cur === 'USD' ? formatCurrency(t.amount) : `${origAmt.toLocaleString('es-VE')} Bs.`;
    const secondaryDisplay = cur === 'USD' ? formatVES(t.amount) : formatCurrency(t.amount);

    return `
        <div class="transaction-item ${isExp ? 'expense-item' : 'income-item'}">
            <div class="item-icon" style="${color}"><i data-lucide="${isExp ? 'shopping-bag' : 'trending-up'}"></i></div>
            <div class="item-info">
                <div class="item-category">${t.category}</div>
                <div class="item-date">${t.date}</div>
            </div>
            <div class="item-amount-group">
                <div class="item-amount ${isExp ? 'amount-expense' : 'amount-income'}">${isExp ? '-' : '+'}${mainDisplay}</div>
                <div style="font-size: 0.72rem; color: var(--text-secondary); margin-top: 2px">${secondaryDisplay}</div>
            </div>
        </div>`;
}

function toggleMenu() {
    const menu = document.getElementById('settings-menu');
    const overlay = document.getElementById('menu-overlay');
    if (menu) menu.classList.toggle('active');
    if (overlay) overlay.classList.toggle('active');
}
