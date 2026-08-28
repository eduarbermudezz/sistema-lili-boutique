import { Currency } from '@/utils/Currency.js';

// Variable para almacenar la instancia de QZ solo cuando sea necesario
let qzInstance = null;

const initQZ = async () => {
    // Si ya se descargó e inicializó, la reutilizamos
    if (qzInstance) return qzInstance;

    // IMPORTACIONES DINÁMICAS: Solo se descargan cuando se ejecuta esta función
    const qzModule = await import('qz-tray');
    const jsrsasignModule = await import('jsrsasign');
    
    const qz = qzModule.default || qzModule;
    const jsrsasign = jsrsasignModule.default || jsrsasignModule;

    qz.security.setCertificatePromise((resolve, reject) => {
        resolve(`-----BEGIN CERTIFICATE-----
MIIDfTCCAmWgAwIBAgIUJEdebN4sSZqF0zIVlpigVZ3wecUwDQYJKoZIhvcNAQEL
BQAwTjELMAkGA1UEBhMCQVUxEzARBgNVBAgMClNvbWUtU3RhdGUxFjAUBgNVBAoM
DUxpbGkgQm91dGlxdWUxEjAQBgNVBAMMCWxvY2FsaG9zdDAeFw0yNjA1MjEyMzMw
MDRaFw0zNjA1MTgyMzMwMDRaME4xCzAJBgNVBAYTAkFVMRMwEQYDVQQIDApTb21l
LVN0YXRlMRYwFAYDVQQKDA1MaWxpIEJvdXRpcXVlMRIwEAYDVQQDDAlsb2NhbGhv
c3QwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQCYhRQHiGrUiEvDmdN0
xWS4DU6km5fy6QnJpk5A3PpFQP+i+eu8MjG4dnVs9IM67QJTEBngHNIAD+qv0Vkq
8Ho4seblF3UZBHhPgvFlCasnxR1TBYDepXNODCXUh7GSIph7IYhLl02FRPfullbb
w51jhTQ8KavjMavs+YuLjB/0QPXy9vOvbNCyd657o3FemHddVe9+ibySsQccaUaC
NM16MSQZevc+DE8KN+zIEsFhBglOfTWjDer6wwCIpM8NddmMyizSysTxjChJKs6j
fkzRzp3Z4aSPA76e6lhPFs+TxelTlofl8Amp3PDTrR+5jAkbUsxwsEaQc1CZUnP+
vx51AgMBAAGjUzBRMB0GA1UdDgQWBBTkpKBLiy1jTgVcTwLRtZudDg6RVzAfBgNV
HSMEGDAWgBTkpKBLiy1jTgVcTwLRtZudDg6RVzAPBgNVHRMBAf8EBTADAQH/MA0G
CSqGSIb3DQEBCwUAA4IBAQAgDmCyEW+2xxucERm/4KmdGO55oyTAFEeGtKxKzBaW
PxyHU0SBXQgYUJP4Cw3BnfWXX9wzfqojXGt6cxmEopS+NFGIk6voSkgcgthXcyxG
ovqTTeOcrBBFgSFQlISpxFxDyCZmlikP2FXTdjgfQ5nI3W2jN5bMcnJ4DGBMYV8R
6RZk9i6ST8wUrJYCenfbqY//k7TSBsrCgJVd/2sVpPEOun5EnWtpZkMRBFbvHBJz
ddAwLK3Iva+g66vBYl5PEvv08xIwRI7HHr38XgyHDaiicKQVhQt1VMrf1PpsE8pI
gr8M8mTROFzFL1itdo09caiv7fMfaCEq3YR/HcGvofii
-----END CERTIFICATE-----
`);
    });

    qz.security.setSignatureAlgorithm("SHA512");

    qz.security.setSignaturePromise((toSign) => {
        return (resolve, reject) => {
            try {
                const privateKey = `-----BEGIN PRIVATE KEY-----
MIIEuwIBADANBgkqhkiG9w0BAQEFAASCBKUwggShAgEAAoIBAQCYhRQHiGrUiEvD
mdN0xWS4DU6km5fy6QnJpk5A3PpFQP+i+eu8MjG4dnVs9IM67QJTEBngHNIAD+qv
0Vkq8Ho4seblF3UZBHhPgvFlCasnxR1TBYDepXNODCXUh7GSIph7IYhLl02FRPfu
llbbw51jhTQ8KavjMavs+YuLjB/0QPXy9vOvbNCyd657o3FemHddVe9+ibySsQcc
aUaCNM16MSQZevc+DE8KN+zIEsFhBglOfTWjDer6wwCIpM8NddmMyizSysTxjChJ
Ks6jfkzRzp3Z4aSPA76e6lhPFs+TxelTlofl8Amp3PDTrR+5jAkbUsxwsEaQc1CZ
UnP+vx51AgMBAAECgf922z5AoI6gEZb5V2byGOHkjHo8zQQcyH5YJsHUymA+l+if
mSOcBYG5vpbD0chyo0Csel+vxsXgRocdfIeAbubQR9MntKAMXu9jBygXFPHMjE/N
4vwKheTVbaINfbFjsJIjYn5UahR/Rr/vrjkCCe8dHzEVsWPCKXNRuSaGGSzNqp3W
KV7b17waQmAVJozjBqVef+kSYuCBjTA9okCNY5Vi9YLqaACe85ZHrOaTdT5B4HK3
eaAGKN+tc51W3oYF9I+NSnQgHzUrtEmbLeohndmOUhqacln/ebSB4zToI4dN1Qz8
RsqyTqw3b5W2is2Q/nfYXq7+O8XuOfEFfuUAZgsCgYEAzKQOFEWSO/gAaeK64DCf
dZNqp8grOIabId90/1OkoH17D9XWKHR1+L6godIfM9M2kk5GSC+7fZOLpCiVo2QQ
BbCh+heixi+fiAALEgK5sbVd0glZlgW1F9MmYqsfKxLVQjOkU8/lhRP7e/1mHRhC
arjoVPhbRcbyxXl2TGFJUlsCgYEAvsxOnzoZ+tBJvhA2rBQ16tNbM7sfEA4aIxlA
o1WFGBorn6cytRaji0BY00y/0KVlVii78U0aGOucXAB7ItE0UPanOomn429FOJbM
8XuD0/4Q/fUJt/2o22348CFHSNPiuVLav/2IcKpFzS/wX4X1hjW2I5iEyB2Niio0
zctHi28CgYBBsdzvNxJl/Ayt8WKKvDFEvol7yW/Omq/MpP7bRM/R0dai08QHgrOo
ohHRQTJRIdogB87aN7CZ9LbcgUbgiCv4l6a4McRImVs+fr0PEB7q5M10sxm2Zqin
OFrXTBYabtZVhVyYp2IIYczXFhck+ffAaRH0zTIH6YFgUcjfZk/yhwKBgHVvp0zW
JDt+jIUR0bTk07Lv2Ijkud/V7jyARIrEDqGhKgygitNvVcZWGtYjvUSdKNx5QgTp
4hBIpPrzyNbLUZor1w5uwAl66W5FU2unDKMlFCxb8FlxJce5zqluskOfN0O+PapC
UQKXq1L6GMeS2mZ7FNqf+8p4di/+fnXUkvq9AoGBAK004UkoZh6gNxAXdknYBCtk
YvonWSNDlQENeuPsGcGjznSkqiQa7reFTDKIcTavG7IiODgKgnfVobw6QGv4LAo/
ZmvO8ma+Q22Gl/1Q5mfvH0sFMwtLnVIEV4DVXy7wMo5uNFowm2p7leSUSTZFHpBp
LDrXIRkWtmKTvdvl6Wen
-----END PRIVATE KEY-----`;

                const { KJUR, KEYUTIL, hex2b64 } = jsrsasign;

                const pk = KEYUTIL.getKey(privateKey);
                const sig = new KJUR.crypto.Signature({ alg: "SHA512withRSA" });
                sig.init(pk);
                sig.updateString(toSign);
                const hex = sig.sign();
                resolve(hex2b64(hex)); 
            } catch (err) {
                console.error("Error firmando:", err);
                reject(err);
            }
        };
    });

    qzInstance = qz;
    return qz;
};

const conectarQZ = async () => {
    const isWindows = navigator.userAgent.toLowerCase().includes('windows');
    if (!isWindows) {
        return Promise.reject(new Error("La función de impresión por ticket solo está disponible para Windows."));
    }

    // Inicializamos y obtenemos la librería de QZ de forma dinámica
    const qz = await initQZ();

    if (qz.websocket.isActive()) return qz;

    return new Promise((resolve, reject) => {
        qz.websocket.connect().then(() => {
            console.log("Conectado a QZ Tray");
            resolve(qz); // Retornamos la instancia conectada
        }).catch((err) => {
            reject(new Error("No se pudo conectar a QZ Tray."));
        });
    });
};

export const imprimirTicketDirecto = async (venta, tasaBcv) => {
    if (!venta) return false;
    
    const tasa = Number(tasaBcv) || 1;
    const nombreImpresora = localStorage.getItem('nombreImpresora') || 'POS-58'; 
    const tamanoPapel = localStorage.getItem('tamanoImpresora') || '58';
    
    const MAX_CHARS = tamanoPapel === '80' ? 48 : 32;

    const subtotalUsd = venta.items?.reduce((sum, item) => Currency.sumar(sum, item.subtotal), 0) || 0;
    const descuentoUsd = Number(venta.descuento_usd) || 0;
    const moraUsd = Number(venta.recargo_mora) || 0; 
    
    const totalConMoraUsd = Currency.sumar(Currency.restar(subtotalUsd, descuentoUsd), moraUsd);
    const totalPagadoUsd = Number(venta.total_pagado) || 0;
    let restaUsd = Currency.restar(totalConMoraUsd, totalPagadoUsd);
    if (restaUsd < 0) restaUsd = 0; 

    const subtotalBs = Currency.multiplicar(subtotalUsd, tasa);
    const descuentoBs = Currency.multiplicar(descuentoUsd, tasa);
    const moraBs = Currency.multiplicar(moraUsd, tasa);
    const totalConMoraBs = Currency.multiplicar(totalConMoraUsd, tasa);

    const formatMonto = (valor) => Currency.formatear(valor, '').trim();

    const rightAlign = (label, value) => {
        const spaces = Math.max(0, MAX_CHARS - label.length - value.length);
        return label + " ".repeat(spaces) + value + "\n";
    };

    let tituloVenta = 'COMPROBANTE VENTA';
    if (restaUsd > 0) {
        if (totalPagadoUsd === 0) {
            tituloVenta = 'COMPROBANTE DE FIADO';
        } else {
            tituloVenta = 'COMPROBANTE APARTADO';
        }
    }

    try {
        // Recibimos la librería QZ lista para usar
        const qz = await conectarQZ();

        const impresoras = await qz.printers.find();
        if (!impresoras.includes(nombreImpresora)) {
            throw new Error(`Impresora de tickets "${nombreImpresora}" NO hallada. Las conectadas son: ${impresoras.join(', ')}`);
        }

        const config = qz.configs.create(nombreImpresora, { encoding: 'ISO-8859-1' }); 

        const fechaFormateada = new Date(venta.fecha).toLocaleString('es-VE', { 
            day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' 
        });

        const separador = "-".repeat(MAX_CHARS) + "\n";

        let data = [
            '\x1B' + '\x40',          
            '\x1B' + '\x61' + '\x31', 
            '\x1B' + '\x45' + '\x0D', 
            "LILI BOUTIQUE\n",
            '\x1B' + '\x45' + '\x00', 
            "Cabimas, Zulia\n",
            "Tlf: 0424-6808632\n",
            separador,
            `${tituloVenta}\n`, 
            separador,
            '\x1B' + '\x61' + '\x30', 
            `Nro: ${String(venta.id_venta).padStart(6, '0')}\n`,
            `Fec: ${fechaFormateada}\n`,
            `Op:  ${venta.operador || 'N/A'}\n`,
            `Cli: ${venta.cliente || 'Consumidor Final'}\n`,
            `C.I: ${venta.ced_rif_cli || 'N/A'}\n`,
            separador,
            rightAlign("CANT DESCRIPCION", "TOTAL").replace("\n", "") + "\n",
            separador,
        ];

        venta.items?.forEach(item => {
            const subItemBs = formatMonto(Currency.multiplicar(item.subtotal, tasa));
            const cant = String(item.cantidad).padEnd(4, ' '); 
            const espacioDisp = MAX_CHARS - 4 - 1 - subItemBs.length;
            const desc = item.nombre_base.substring(0, espacioDisp).padEnd(espacioDisp, ' ');
            data.push(`${cant}${desc} ${subItemBs}\n`);
        });

        data.push(separador);
        data.push(rightAlign("Subtotal: Bs", formatMonto(subtotalBs)));
        
        if (descuentoBs > 0) data.push(rightAlign("Desc: -Bs", formatMonto(descuentoBs)));
        if (moraBs > 0) data.push(rightAlign("Mora: Bs", formatMonto(moraBs)));
        
        data.push('\x1B' + '\x45' + '\x0D'); 
        data.push(rightAlign("TOTAL: Bs", formatMonto(totalConMoraBs)));
        data.push('\x1B' + '\x45' + '\x00'); 
        
        data.push(separador);

        if (restaUsd > 0) {
            if (totalPagadoUsd === 0) {
                data.push(rightAlign("DEBE:", Currency.formatear(restaUsd, '$')));
            } else {
                data.push(rightAlign("ABONO:", Currency.formatear(totalPagadoUsd, '$')));
                data.push(rightAlign("RESTA:", Currency.formatear(restaUsd, '$')));
            }
        } else {
            data.push(rightAlign("PAGADO:", Currency.formatear(totalPagadoUsd, '$')));
        }

        data.push(separador);
        data.push('\x1B' + '\x61' + '\x31'); 
        data.push("*** Gracias por su compra ***\n");
        data.push("No fiscaliza\n\n\n\n\n"); 
        
        data.push('\x1D' + '\x56' + '\x41' + '\x10'); 

        await qz.print(config, data);
        return true;
        
    } catch (err) {
        console.error(err);
        throw typeof err === 'string' ? new Error(err) : err;
    }
};

export const imprimirEtiquetaDirecta = async (producto, cantidad) => {
    if (!producto) return false;

    const nombreTickets = localStorage.getItem('nombreImpresora') || 'POS-58';
    const nombreEtiquetas = localStorage.getItem('nombreImpresoraEtiquetas');
    const nombreImpresora = (nombreEtiquetas && nombreEtiquetas.trim() !== '') ? nombreEtiquetas : nombreTickets;

    try {
        // Recibimos la librería QZ lista para usar
        const qz = await conectarQZ();
        
        const impresoras = await qz.printers.find();
        if (!impresoras.includes(nombreImpresora)) {
            throw new Error(`Impresora de etiquetas "${nombreImpresora}" NO hallada. Tu PC tiene: ${impresoras.join(', ')}`);
        }

        const config = qz.configs.create(nombreImpresora, { encoding: 'ISO-8859-1' }); 

        let data = [];

      for (let i = 0; i < cantidad; i++) {
            data.push('\x1B' + '\x40');        
            data.push('\x1B' + '\x61' + '\x31'); 
            
            data.push(producto.nombre_base + '\n');
            data.push(`Ref: $${Currency.formatear(producto.precio, '')}\n`);
            
            const codigo = String(producto.codigo || '000000');
            data.push('\x1D' + '\x68' + '\x32');  
            data.push('\x1D' + '\x77' + '\x02'); 
            data.push('\x1D' + '\x48' + '\x02'); 
            data.push('\x1D' + '\x6B' + '\x49' + String.fromCharCode(codigo.length) + codigo + '\n');
            
            data.push('\n\n\n'); 
        }

        data.push('\x1D' + '\x56' + '\x41' + '\x10');

        await qz.print(config, data);
        return true;

    } catch (err) {
        console.error(err);
        throw typeof err === 'string' ? new Error(err) : err;
    }
};