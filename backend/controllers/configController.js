import db from '../config/db.js';
import axios from 'axios';
import * as cheerio from 'cheerio';
import https from 'https';

const queryPromise = (sql, params) => {
    return new Promise((resolve, reject) => {
        db.query(sql, params, (err, results) => {
            if (err) reject(err);
            else resolve(results);
        });
    });
};

const httpsAgent = new https.Agent({  
    rejectUnauthorized: false
});

const obtenerTasasExternas = async () => {
    try {
        const urlBcv = process.env.API_BCV_URL;
        const bcvRes = await axios.get(urlBcv, { 
            httpsAgent, 
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        const $ = cheerio.load(bcvRes.data);
        const valorDolar = $("#dolar strong").text().replace(',', '.').trim();
        const bcv = parseFloat(valorDolar);

        if (isNaN(bcv)) throw new Error("No se pudo parsear el valor del BCV");

        const urlCop = process.env.API_EXCHANGE_URL;
        const copRes = await axios.get(urlCop);
        const cop = parseFloat(copRes.data.rates.COP);

        return { bcv, cop };
    } catch (error) {
        console.error("Error detallado al obtener tasas:", error.message);
        throw new Error("No se pudo conectar con los servicios de tasas externas (Error de Certificado/Red).");
    }
};

export const actualizarTodasLasTasas = async () => {
    try {
        const configRows = await queryPromise("SELECT tasa_bcv, tasa_cop FROM configuracion WHERE id_config = 1");
        
        if (!configRows || configRows.length === 0) {
            throw new Error("No se encontró la configuración en la base de datos.");
        }

        const tasaBcvActual = parseFloat(configRows[0].tasa_bcv);
        const tasaCopActual = parseFloat(configRows[0].tasa_cop);

        const nuevasTasas = await obtenerTasasExternas(); 

        const tasaBcvFinal = nuevasTasas.bcv > tasaBcvActual ? nuevasTasas.bcv : tasaBcvActual;
        const tasaCopFinal = nuevasTasas.cop > tasaCopActual ? nuevasTasas.cop : tasaCopActual;

        if (tasaBcvFinal > tasaBcvActual || tasaCopFinal > tasaCopActual) {
            await queryPromise(
                "UPDATE configuracion SET tasa_bcv = ?, tasa_cop = ? WHERE id_config = 1",
                [tasaBcvFinal, tasaCopFinal]
            );
            return { bcv: tasaBcvFinal, cop: tasaCopFinal, actualizado: true };
        }

        return { bcv: tasaBcvActual, cop: tasaCopActual, actualizado: false };
    } catch (error) {
        console.error("Error en actualizarTodasLasTasas:", error);
        throw error;
    }
};

export const obtenerConfiguracion = (req, res) => {
    const sql = 'SELECT tasa_bcv, tasa_cop, backup_activo, monto_mora FROM configuracion LIMIT 1';
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ message: 'Error al obtener la configuración' });
        res.json(results[0] || { tasa_bcv: 1, tasa_cop: 1, monto_mora: 3.00 });
    });
};

export const actualizarTasasManual = async (req, res) => {
    try {
        const resultado = await actualizarTodasLasTasas();
        if (resultado.actualizado) {
            res.json({ message: "Tasas incrementadas con éxito", data: resultado });
        } else {
            res.json({ message: "Las tasas externas no han superado a las actuales. No se realizaron cambios.", data: resultado });
        }
    } catch (error) {
        console.error("Error en sincronización manual:", error);
        res.status(500).json({ message: "Error al sincronizar tasas" });
    }
};

export const guardarTasasManuales = (req, res) => {
    const { tasa_bcv, tasa_cop } = req.body;
    
    const sql = 'UPDATE configuracion SET tasa_bcv = ?, tasa_cop = ?, ultima_actualizacion = NOW()';
    db.query(sql, [tasa_bcv, tasa_cop], (err, result) => {
        if (err) return res.status(500).json({ message: 'Error al guardar las tasas manualmente.' });
        res.status(200).json({ message: 'Tasas actualizadas correctamente.' });
    });
};

export const actualizarMora = (req, res) => {
    const { monto_mora } = req.body;

    db.getConnection(async (err, connection) => {
        if (err) return res.status(500).json({ message: 'Error de conexión.' });
        
        try {
            await new Promise((resolve, reject) => {
                connection.query('UPDATE configuracion SET monto_mora = ?, ultima_actualizacion = NOW() WHERE id_config = 1', [monto_mora], (e) => e ? reject(e) : resolve());
            });

            await new Promise((resolve, reject) => {
                connection.query('UPDATE ventas SET recargo_mora = ? WHERE recargo_mora > 0 AND aplica_mora = 1', [monto_mora], (e) => e ? reject(e) : resolve());
            });

            res.status(200).json({ message: 'Monto actualizado y aplicado a todas las deudas vigentes.' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error al actualizar la mora.' });
        } finally {
            connection.release();
        }
    });
};