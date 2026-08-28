import db from '../config/db.js';

const queryPromise = (sql, params) => {
    return new Promise((resolve, reject) => {
        db.query(sql, params, (err, results) => {
            if (err) reject(err);
            else resolve(results);
        });
    });
};

const validarDatosCliente = (cedula, nombre, telefono) => {
    if (!cedula || cedula.trim().length < 6 || cedula.trim().length > 10 || !/^\d+$/.test(cedula)) return 'La Cédula/RIF debe tener entre 6 y 10 números.';
    if (!nombre || nombre.trim().length < 3 || !/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(nombre)) return 'El nombre debe tener al menos 3 caracteres.';
    if (telefono && (telefono.trim().length !== 7 || !/^\d+$/.test(telefono))) return 'El teléfono debe tener exactamente 7 dígitos numéricos.';
    return null;
};

export const obtenerClientes = async (req, res) => {
    const sql = `
        SELECT 
            c.id_cli, c.ced_rif_cli, c.ra_soc_cli, c.num_tlf_cli,
            c.tipo_doc_cli, c.pref_tlf_cli, n.letra_tipo, p.pref_tlf
        FROM clientes c
        LEFT JOIN tipos_documento n ON c.tipo_doc_cli = n.id_tipo
        LEFT JOIN prefijos_telefono p ON c.pref_tlf_cli = p.id_pref
        WHERE c.id_cli != 1
        ORDER BY c.id_cli DESC
    `;

    try {
        const results = await queryPromise(sql, []);
        res.status(200).json(results);
    } catch (err) {
        console.error('Error al consultar clientes:', err);
        res.status(500).json({ message: 'Error en la base de datos.' });
    }
};

export const crearCliente = async (req, res) => {
    const { nacionalidad_cli, ced_rif_cli, ra_soc_cli, prefijo_tlf_cli, num_tlf_cli } = req.body;

    const errorValidacion = validarDatosCliente(ced_rif_cli, ra_soc_cli, num_tlf_cli);
    if (errorValidacion) {
        return res.status(400).json({ message: errorValidacion });
    }

    const sql = `
        INSERT INTO clientes (tipo_doc_cli, ced_rif_cli, ra_soc_cli, pref_tlf_cli, num_tlf_cli) 
        VALUES (?, ?, ?, ?, ?)
    `;

    try {
        const result = await queryPromise(sql, [nacionalidad_cli, ced_rif_cli, ra_soc_cli, prefijo_tlf_cli, num_tlf_cli]);

        res.status(201).json({
            message: 'Cliente registrado exitosamente.',
            id_cli: result.insertId,
            tipo_doc_cli: nacionalidad_cli,
            ced_rif_cli,
            ra_soc_cli,
            pref_tlf_cli: prefijo_tlf_cli,
            num_tlf_cli
        });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Ya existe un cliente con esta Cédula o RIF.' });
        }
        res.status(500).json({ message: 'Error en la base de datos al crear cliente.' });
    }
};

export const actualizarCliente = async (req, res) => {
    const { id } = req.params;
    const { nacionalidad_cli, ced_rif_cli, ra_soc_cli, prefijo_tlf_cli, num_tlf_cli } = req.body;

    if (id == 1) {
        return res.status(403).json({ message: 'Acceso denegado: No se puede editar el cliente interno.' });
    }

    const errorValidacion = validarDatosCliente(ced_rif_cli, ra_soc_cli, num_tlf_cli);
    if (errorValidacion) {
        return res.status(400).json({ message: errorValidacion });
    }

    const sql = `
        UPDATE clientes
        SET tipo_doc_cli = ?, ced_rif_cli = ?, ra_soc_cli = ?, pref_tlf_cli = ?, num_tlf_cli = ?
        WHERE id_cli = ?
    `;

    try {
        const result = await queryPromise(sql, [nacionalidad_cli, ced_rif_cli, ra_soc_cli, prefijo_tlf_cli, num_tlf_cli, id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Cliente no encontrado.' });
        }
        res.status(200).json({ message: 'Cliente actualizado exitosamente.' });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Ya existe otro cliente con esta Cédula o RIF.' });
        }
        res.status(500).json({ message: 'Error en la base de datos al actualizar cliente.' });
    }
};

export const eliminarCliente = async (req, res) => {
    const { id } = req.params;

    if (id == 1) {
        return res.status(403).json({ message: 'Acceso denegado: No se puede eliminar el cliente de uso interno.' });
    }

    try {
        await queryPromise('DELETE FROM clientes WHERE id_cli = ?', [id]);
        res.status(200).json({ message: 'Cliente eliminado exitosamente.' });
    } catch (err) {
        if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.errno === 1451) {
            return res.status(400).json({
                message: 'No puedes eliminar este cliente porque tiene documentos registrados en el sistema.'
            });
        }
        res.status(500).json({ message: 'Error en la base de datos al eliminar cliente.' });
    }
};

export const obtenerSaldoFavor = async (req, res) => {
    const { id } = req.params;
const sql = `SELECT SUM(saldo_restante_usd) as saldo FROM notas_credito WHERE id_cliente = ? AND estado = 'DISPONIBLE'`;
    try {
        const results = await queryPromise(sql, [id]);
        res.status(200).json({ saldo: results[0]?.saldo || 0 });
        
    } catch (err) {
        console.error('Error al obtener saldo a favor:', err);
        res.status(500).json({ message: 'Error en la base de datos al obtener el saldo.' });
    }
};