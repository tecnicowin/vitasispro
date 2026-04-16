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
    isAwaitingConfirmation: false,       // Missing flag restored
    tempIncomeGroup: null,               // 'bancos', 'inversiones', 'divisas'
    tempNewCategoryName: null,           // Nombre temporal de la nueva cat.
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

function addTransaction(amount, type, category, currency = 'USD', subCategoryType = null) {
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
        subCategoryType: subCategoryType, // Bancos, Inversiones, Divisas (para ingresos)
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
        .filter(t => t.type === 'income' && t.subCategoryType === type)
        .reduce((sum, t) => sum + t.amount, 0);
}

function recalcTotals() {
    state.income = 0;
    state.expenses = 0;
    state.balance = 0;
    state.transactions.forEach(t => {
        if (t.type === 'income') { state.income += t.amount; state.balance += t.amount; }
        else { state.expenses += t.amount; state.balance -= t.amount; }
    });
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
