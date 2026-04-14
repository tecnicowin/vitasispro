// js/charts.js
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
