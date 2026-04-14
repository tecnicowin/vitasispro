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
    isAwaitingNewCategory: false,       // Flujo: crear nueva categoría
    isAwaitingNewCategoryConfirm: false, // Flujo: confirmar nombre
    tempNewCategoryName: null,           // Nombre temporal de la nueva cat.
    tempAmount: 0,
    tempType: null,
    tempCurrency: 'USD',
    pin: null,
    securityMode: 'none', 
    theme: 'dark',
    customCategories: []                 // Categorías creadas por el usuario
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
        amount: usdAmount,
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
