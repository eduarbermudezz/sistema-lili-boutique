import Decimal from 'decimal.js';

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export const Currency = {
    sumar: (a, b) => new Decimal(a || 0).plus(b || 0).toNumber(),
    restar: (a, b) => new Decimal(a || 0).minus(b || 0).toNumber(),
    multiplicar: (a, b) => new Decimal(a || 0).times(b || 0).toNumber(),
    dividir: (a, b) => {
        if (Number(b) === 0) return 0;
        return new Decimal(a || 0).dividedBy(b).toNumber();
    },
    
    redondear: (valor, decimales = 2) => {
        return new Decimal(valor || 0).toDecimalPlaces(decimales, Decimal.ROUND_HALF_UP).toNumber();
    },

    formatear: (valor, simbolo = '') => {
        const numero = new Decimal(valor || 0).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
        return `${simbolo} ${numero.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`.trim();
    }
};