// js/state.js
let state = {
    balance: 0,
    income: 0,
    expenses: 0,
    transactions: [],
    voiceEnabled: true,
    userName: null,
    email: null,
    phone: null,
    bcvRate: null,
    lastRateUpdate: null,
    isAwaitingName: false,
    isAwaitingCategory: false,
    isAwaitingMoreInfo: false,
    isAwaitingRate: false,
    isAwaitingNewCategory: false,
    isAwaitingNewCategoryConfirm: false,
    isAwaitingIncomeDestType: false,
    isAwaitingIncomeSubDest: false,
    isAwaitingPaymentType: false,        // Flujo: elegir fuente de pago (Bancos...)
    isAwaitingBalanceCategory: false,    // Flujo: elegir categoría para ver saldos
    isAwaitingTransferAmount: false,     // Nuevo: Flujo Traspaso
    isAwaitingTransferFromType: false,
    isAwaitingTransferFromAccount: false,
    isAwaitingTransferToType: false,
    isAwaitingTransferToAccount: false,
    isAwaitingConfirmation: false,
    tempIncomeGroup: null,               // Para ingresos
    tempSourceGroup: null,               // Para gastos / Origen traspaso
    tempSourceAccount: null,             // Para gastos / Origen traspaso
    tempDestGroup: null,                 // Destino traspaso
    tempDestAccount: null,               // Destino traspaso
    tempNewCategoryName: null,
    tempAmount: 0,
    tempType: null,
    tempCurrency: 'USD',
    pin: null,
    securityMode: 'none', 
    theme: 'dark',
    customCategories: [],                // Categorías creadas por el usuario
    incomeCategories: {                  // Estructura para ingresos/inversiones
        bancos: [],
        inversiones: [],
        divisas: []
    }
};

const STORAGE_KEY = 'finance_data';

function loadData() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        state = { ...state, ...JSON.parse(saved) };
        // Ensure incomeCategories exists and has all keys
        if (!state.incomeCategories) state.incomeCategories = { bancos: [], inversiones: [], divisas: [] };
        if (!state.incomeCategories.bancos) state.incomeCategories.bancos = [];
        if (!state.incomeCategories.inversiones) state.incomeCategories.inversiones = [];
        if (!state.incomeCategories.divisas) state.incomeCategories.divisas = [];
    }
    return state;
}

function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function addTransaction(amount, type, category, currency = 'USD', subCategoryType = null, sourceAccount = null) {
    let usdAmount = amount;
    if (currency === 'VES' && state.bcvRate) {
        usdAmount = amount / state.bcvRate;
    }

    const transaction = {
        id: Date.now(),
        amount: usdAmount,
        originalAmount: amount,
        currency: currency,
        type: type,
        category: category,
        subCategoryType: subCategoryType, // Se usa para 'bancos', 'inversiones', 'divisas'
        sourceAccount: sourceAccount,     // El nombre de la cuenta (ej: Banesco)
        date: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
        timestamp: Date.now()
    };
    state.transactions.push(transaction);
    if (type === 'income') { state.income += usdAmount; state.balance += usdAmount; }
    else { state.expenses += usdAmount; state.balance -= usdAmount; }
    saveData();
    return transaction;
}

function getBalanceByCategoryType(type) {
    return state.transactions
        .filter(t => t.subCategoryType === type)
        .reduce((sum, t) => {
            if (t.type === 'income' || t.type === 'transfer_in') return sum + t.amount;
            if (t.type === 'expense' || t.type === 'transfer_out') return sum - t.amount;
            return sum;
        }, 0);
}

function getBalanceByAccount(name) {
    return state.transactions.reduce((sum, t) => {
        // En ingresos y entrada de traspaso, o bien category es el nombre o bien sourceAccount
        if (t.type === 'income' && t.category === name) return sum + t.amount;
        if (t.type === 'transfer_in' && t.category === name) return sum + t.amount;
        // En gastos y salida de traspaso
        if (t.type === 'expense' && t.sourceAccount === name) return sum - t.amount;
        if (t.type === 'transfer_out' && t.sourceAccount === name) return sum - t.amount;
        return sum;
    }, 0);
}

function recalcTotals() {
    state.income = 0;
    state.expenses = 0;
    state.balance = 0;
    
    // Para las estadísticas del dashboard (Mes Actual)
    state.monthlyIncome = 0;
    state.monthlyExpenses = 0;
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    state.transactions.forEach(t => {
        const tDate = new Date(t.timestamp);
        const isCurrentMonth = tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;

        if (t.type === 'income') {
            state.income += t.amount;
            state.balance += t.amount;
            if (isCurrentMonth) state.monthlyIncome += t.amount;
        } else if (t.type === 'expense') {
            state.expenses += t.amount;
            state.balance -= t.amount;
            if (isCurrentMonth) state.monthlyExpenses += t.amount;
        } else if (t.type === 'transfer_in') {
            state.balance += t.amount;
        } else if (t.type === 'transfer_out') {
            state.balance -= t.amount;
        }
    });
}

function consolidateHistory() {
    // 1. Calcular balances finales por cuenta antes de limpiar
    const accountBalances = {};
    const groups = ['bancos', 'inversiones', 'divisas'];
    groups.forEach(g => {
        (state.incomeCategories[g] || []).forEach(acc => {
            accountBalances[acc] = { bal: getBalanceByAccount(acc), group: g };
        });
    });

    // 2. Limpiar transacciones
    state.transactions = [];

    // 3. Re-crear saldos iniciales
    Object.keys(accountBalances).forEach(name => {
        const data = accountBalances[name];
        if (data.bal !== 0) {
            addTransaction(data.bal, 'income', name, 'USD', data.group, null);
        }
    });

    recalcTotals();
    saveData();
}

function deleteTransaction(id) {
    state.transactions = state.transactions.filter(t => t.id !== id);
    recalcTotals();
    saveData();
}

function editTransaction(id, newAmount, newType, newCategory, newCurrency) {
    const idx = state.transactions.findIndex(t => t.id === id);
    if (idx === -1) return false;
    let usdAmount = newAmount;
    if (newCurrency === 'VES' && state.bcvRate) usdAmount = newAmount / state.bcvRate;
    state.transactions[idx] = {
        ...state.transactions[idx],
        amount: usdAmount,
        originalAmount: newAmount,
        currency: newCurrency,
        type: newType,
        category: newCategory
    };
    recalcTotals();
    saveData();
    return true;
}
