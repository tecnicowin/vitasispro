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
