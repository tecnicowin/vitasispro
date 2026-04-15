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
    
    // Obtener transacciones según el filtro activo
    const filtered = getFilteredTransactions();
    
    // 1. Gráfico de Categorías (Gastos)
    const exps = filtered.filter(t => t.type === 'expense');
    const cats = {};
    exps.forEach(e => cats[e.category] = (cats[e.category] || 0) + e.amount);
    
    categoryChart.data.labels = Object.keys(cats);
    categoryChart.data.datasets[0].data = Object.values(cats);
    categoryChart.update();

    // 2. Gráfico de Salud (Ingresos vs Gastos del período)
    if (trendChart) {
        let periodIncome = 0;
        let periodExpenses = 0;
        
        filtered.forEach(t => {
            if (t.type === 'income') periodIncome += t.amount;
            else periodExpenses += t.amount;
        });

        trendChart.data.datasets[0].data = [periodIncome, periodExpenses];
        trendChart.update();

        const healthMsgDiv = document.getElementById('health-message');
        if (healthMsgDiv) {
            let msg = "", cls = "health-msg";
            const periodBalance = periodIncome - periodExpenses;

            if (periodBalance < 0) { 
                msg = "Gasto superior a ingresos ⚠️"; cls = "health-msg bad"; 
            } else if (periodBalance === 0 && periodIncome === 0) {
                msg = "Sin actividad en este período"; cls = "health-msg";
            } else { 
                msg = "Balance positivo este período ✨"; cls = "health-msg good"; 
            }
            
            healthMsgDiv.innerHTML = `<span>${msg}</span>`; healthMsgDiv.className = cls;
        }
    }
}
