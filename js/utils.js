// js/utils.js
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

function getBalanceFeedback(bal) {
    if (bal < 0) return "Tu saldo es negativo, ¡cuidado! 😰💸";
    if (bal < 20) return "Cuidado, fondos bajos 😟";
    if (bal >= 200 && bal <= 700) return "Tienes ingresos suficientes, ten cuidado 🙂";
    if (bal > 5000) return "¡Felicitaciones! Tus fondos están blindados 💰";
    return "Balance estable 😊📈";
}

const extractAmount = (str) => {
    // Paso 1: Eliminar espacios entre dígitos que el STT inserta (ej: "50 000" → "50000")
    let cleanStr = str.replace(/(\d)\s+(?=\d)/g, '$1');

    let match = cleanStr.match(/[\d.,]+/);
    if (!match) return null;
    let val = match[0];

    if (val.includes('.') && val.includes(',')) {
        // Caso mixto con ambos separadores
        const lastDot = val.lastIndexOf('.');
        const lastComma = val.lastIndexOf(',');
        if (lastDot > lastComma) {
            // Formato inglés: "1,000.50" → punto es decimal, coma es miles
            val = val.replace(/,/g, ''); // quitar comas → "1000.50"
        } else {
            // Formato español: "1.000,50" → coma es decimal, punto es miles
            val = val.replace(/\./g, '').replace(',', '.'); // → "1000.50"
        }
    } else if (val.includes(',')) {
        const parts = val.split(',');
        if (parts.length === 2 && parts[1].length === 3) {
            // Coma como separador de MILES: "10,000" → eliminar coma → 10000
            val = val.replace(/,/g, '');
        } else {
            // Coma como separador DECIMAL: "10,50" → reemplazar por punto → 10.50
            val = val.replace(',', '.');
        }
    } else if (val.includes('.')) {
        const parts = val.split('.');
        if (parts.length > 2) {
            // Múltiples puntos = separadores de miles: "1.000.000" → 1000000
            val = val.replace(/\./g, '');
        } else if (parts.length === 2 && parts[1].length === 3) {
            // Un punto con exactamente 3 decimales = miles: "10.000" → 10000
            val = val.replace(/\./g, '');
        }
        // Si parts[1].length es 1 o 2 → es decimal: "10.50" → se deja como está ✓
    }

    const result = parseFloat(val);
    return isNaN(result) ? null : result;
};

const normalize = (str) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

function generateFinancialReport(format = 'excel') {
    const now = new Date();
    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const month = monthNames[now.getMonth()];
    const year = now.getFullYear();
    const userName = state.userName || "Usuario";

    // 1. Recopilar datos
    const incomeGroups = {
        Bancos: { items: (state.incomeCategories?.bancos || []).map(name => ({ name, balance: getBalanceByAccount(name) })), total: getBalanceByCategoryType('bancos') },
        Inversiones: { items: (state.incomeCategories?.inversiones || []).map(name => ({ name, balance: getBalanceByAccount(name) })), total: getBalanceByCategoryType('inversiones') },
        Divisas: { items: (state.incomeCategories?.divisas || []).map(name => ({ name, balance: getBalanceByAccount(name) })), total: getBalanceByCategoryType('divisas') }
    };
    
    // Gastos por categoría personalizada
    const expenseCats = ["Comida", "Transporte", "Ocio", "Salud", "Hogar", "Celular", "Personal", "Tarjeta Credito", "Cashea", "Servicios", "Educacion", "Varios", ...(state.customCategories || [])];
    const expenseData = expenseCats.map(cat => {
        const total = state.transactions
            .filter(t => t.type === 'expense' && t.category === cat && new Date(t.timestamp).getMonth() === now.getMonth())
            .reduce((sum, t) => sum + t.amount, 0);
        return { name: cat, total };
    }).filter(e => e.total > 0);
    
    const totalExpenses = state.monthlyExpenses || 0;
    const totalIncome = state.monthlyIncome || 0;
    const prevBalance = state.balance - totalIncome + totalExpenses;

    if (format === 'excel') {
        let csv = `Relacion de Ingresos y Egresos - ${month} ${year}\n`;
        csv += `Usuario: ${userName}\n\n`;
        
        csv += `INGRESOS\n`;
        csv += `Categoria,Nombre Cuenta,Saldo\n`;
        Object.keys(incomeGroups).forEach(group => {
            incomeGroups[group].items.forEach(item => {
                csv += `${group},${item.name},${item.balance.toFixed(2)}\n`;
            });
            csv += `Total ${group},,${incomeGroups[group].total.toFixed(2)}\n`;
        });
        csv += `TOTAL INGRESOS,,${totalIncome.toFixed(2)}\n\n`;
        
        csv += `EGRESOS EL MES\n`;
        csv += `Categoria,,Monto Consumido\n`;
        expenseData.forEach(e => {
            csv += `${e.name},,${e.total.toFixed(2)}\n`;
        });
        csv += `TOTAL EGRESOS,,${totalExpenses.toFixed(2)}\n\n`;
        
        csv += `RESULTADO MENSUAL\n`;
        csv += `Saldo Anterior,,${prevBalance.toFixed(2)}\n`;
        csv += `(+) Ingresos Mes,,${totalIncome.toFixed(2)}\n`;
        csv += `(-) Egresos Mes,,${totalExpenses.toFixed(2)}\n`;
        csv += `Resultado Final,,${state.balance.toFixed(2)}\n`;

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `Relacion_Financiera_${month}_${year}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } else {
        // PDF (Printable view)
        const printWindow = window.open('', '_blank');
        let html = `
            <html>
            <head>
                <title>Relación de Ingresos y Egresos - ${month} ${year}</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #333; line-height: 1.6; }
                    .header { text-align: center; border-bottom: 2px solid #3b82f6; padding-bottom: 20px; margin-bottom: 30px; }
                    .header h1 { margin: 0; color: #1e40af; font-size: 24px; }
                    .header p { margin: 5px 0; color: #666; }
                    .section { margin-bottom: 30px; }
                    .section h2 { font-size: 18px; border-bottom: 1px solid #ddd; padding-bottom: 5px; color: #1e40af; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                    th, td { text-align: left; padding: 10px; border-bottom: 1px solid #eee; }
                    th { background: #f8fafc; font-size: 13px; text-transform: uppercase; color: #64748b; }
                    .total-row { font-weight: bold; background: #f1f5f9; }
                    .res-grid { display: grid; grid-template-columns: 1fr 150px; gap: 10px; margin-top: 20px; padding: 20px; background: #eff6ff; border-radius: 8px; }
                    .res-label { font-weight: 500; }
                    .res-val { text-align: right; font-weight: 700; }
                    @media print { .no-print { display: none; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Relación de Ingresos y Egresos</h1>
                    <p>Mes: ${month} ${year}</p>
                    <p>Titular: <strong>${userName}</strong></p>
                </div>

                <div class="section">
                    <h2>INGRESOS (Saldos al Cierre)</h2>
                    <table>
                        <thead><tr><th>Origen</th><th>Cuenta / Detalle</th><th>Saldo Atualizado</th></tr></thead>
                        <tbody>
                            ${Object.keys(incomeGroups).map(group => `
                                ${incomeGroups[group].items.map(item => `
                                    <tr><td>${group}</td><td>${item.name}</td><td>${formatCurrency(item.balance)}</td></tr>
                                `).join('')}
                                <tr class="total-row"><td colspan="2">Total ${group}</td><td>${formatCurrency(incomeGroups[group].total)}</td></tr>
                            `).join('')}
                            <tr class="total-row" style="background:#dcfce7;"><td colspan="2">TOTAL INGRESOS ACUMULADOS</td><td>${formatCurrency(totalIncome)}</td></tr>
                        </tbody>
                    </table>
                </div>

                <div class="section">
                    <h2>EGRESOS (Gastos del Mes)</h2>
                    <table>
                        <thead><tr><th>Categoría de Gasto</th><th></th><th>Monto Ejecutado</th></tr></thead>
                        <tbody>
                            ${expenseData.map(e => `
                                <tr><td>${e.name}</td><td></td><td>${formatCurrency(e.total)}</td></tr>
                            `).join('')}
                            <tr class="total-row" style="background:#fee2e2;"><td colspan="2">TOTAL EGRESOS DEL MES</td><td>${formatCurrency(totalExpenses)}</td></tr>
                        </tbody>
                    </table>
                </div>

                <div class="section">
                    <h2>RESULTADO MENSUAL</h2>
                    <div class="res-grid">
                        <div class="res-label">Saldo Inicial (Mes Anterior)</div><div class="res-val">${formatCurrency(prevBalance)}</div>
                        <div class="res-label">(+) Total Ingresos del Mes</div><div class="res-val" style="color:#10b981;">${formatCurrency(totalIncome)}</div>
                        <div class="res-label">(-) Total Egresos del Mes</div><div class="res-val" style="color:#ef4444;">${formatCurrency(totalExpenses)}</div>
                        <div class="res-label" style="font-size:1.2em; padding-top:10px; border-top:2px solid #3b82f6;">RESULTADO NETO AL CIERRE</div>
                        <div class="res-val" style="font-size:1.2em; padding-top:10px; border-top:2px solid #3b82f6;">${formatCurrency(state.balance)}</div>
                    </div>
                </div>

                <div class="no-print" style="margin-top: 50px; text-align: center;">
                    <button onclick="window.print()" style="padding: 12px 24px; background: #3b82f6; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px; font-weight: bold;">
                        🖨️ Mandar a Imprimir / Guardar como PDF
                    </button>
                    <p style="color: #666; font-size: 12px; margin-top: 10px;">Pulse el botón para generar el archivo final.</p>
                </div>
            </body>
            </html>
        `;
        printWindow.document.write(html);
        printWindow.document.close();
    }
}

function exportTransactionsToCSV() {
    if (state.transactions.length === 0) {
        showToast("No hay transacciones para exportar");
        return;
    }

    const headers = ["Fecha", "Categoría", "Tipo", "Monto (USD)", "Moneda Original", "Monto Original"];
    const rows = state.transactions.map(t => [
        t.date,
        t.category,
        t.type === 'income' ? 'Ingreso' : 'Gasto',
        t.amount.toFixed(2),
        t.currency || 'USD',
        t.originalAmount ? t.originalAmount.toFixed(2) : t.amount.toFixed(2)
    ]);

    let csvContent = "data:text/csv;charset=utf-8," 
        + headers.join(",") + "\n"
        + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `FinanceAssistant_Data_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("CSV descargado correctamente ✅");
}
