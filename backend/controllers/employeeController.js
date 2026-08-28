import db from '../config/db.js';

const queryPromise = (sql, params) => {
    return new Promise((resolve, reject) => {
        db.query(sql, params, (err, results) => {
            if (err) reject(err);
            else resolve(results);
        });
    });
};

const validarDatosEmpleado = (cedula, nombre_empleado, apellido_empleado, telefono) => {
    if (!cedula || cedula.trim().length < 6 || cedula.trim().length > 10) return 'La Cédula debe tener entre 6 y 10 números.';
    if (!nombre_empleado || nombre_empleado.trim().length < 3) return 'El nombre debe tener al menos 3 caracteres.';
    if (!apellido_empleado || apellido_empleado.trim().length < 3) return 'El apellido debe tener al menos 3 caracteres.';
    if (telefono && (telefono.trim().length !== 7)) return 'El teléfono debe tener exactamente 7 dígitos numéricos.';

    return null;
};

export const obtenerEmpleados = async (req, res) => {
    const sql = `
        SELECT e.id_emp, e.ced_rif_emp, concat(e.nom_emp, ' ', e.ape_emp) as nombre_empleado, e.nom_emp, e.ape_emp, e.num_tlf_emp,
               e.tipo_doc_emp, e.pref_tlf_emp, n.letra_tipo, p.pref_tlf, e.email_emp
        FROM empleados e
        LEFT JOIN tipos_documento n ON e.tipo_doc_emp = n.id_tipo
        LEFT JOIN prefijos_telefono p ON e.pref_tlf_emp = p.id_pref
        ORDER BY e.id_emp DESC
    `;
    try {
        const results = await queryPromise(sql, []);
        res.status(200).json(results);
    } catch (err) {
        res.status(500).json({ message: 'Error en la base de datos al obtener empleados.' });
    }
};

export const registrarEmpleado = async (req, res) => {
    const { tipo_doc_emp, ced_rif_emp, nom_emp, ape_emp, pref_tlf_emp, num_tlf_emp, email_emp} = req.body;
    const errorValidacion = validarDatosEmpleado(ced_rif_emp, nom_emp, ape_emp, num_tlf_emp);
    if (errorValidacion) return res.status(400).json({ message: errorValidacion });

    const sql = `INSERT INTO empleados (tipo_doc_emp, ced_rif_emp, nom_emp, ape_emp, pref_tlf_emp, num_tlf_emp, email_emp) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    try {
        const result = await queryPromise(sql, [tipo_doc_emp, ced_rif_emp, nom_emp, ape_emp, pref_tlf_emp, num_tlf_emp, email_emp]);

        res.status(201).json({
            message: 'Empleado registrado exitosamente.',
            id_emp: result.insertId
        });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ message: 'Ya existe un empleado con esta Cédula.' });
        res.status(500).json({ message: 'Error en la base de datos al registrar empleado.' });
    }
};

export const actualizarEmpleado = async (req, res) => {
    const { id } = req.params;
    const { tipo_doc_emp, ced_rif_emp, nom_emp, ape_emp, pref_tlf_emp, num_tlf_emp, email_emp } = req.body;

    const errorValidacion = validarDatosEmpleado(ced_rif_emp, nom_emp, ape_emp, num_tlf_emp);
    if (errorValidacion) return res.status(400).json({ message: errorValidacion });

    try {
        const sql = `UPDATE empleados SET tipo_doc_emp = ?, ced_rif_emp = ?, nom_emp = ?, ape_emp = ?, pref_tlf_emp = ?, num_tlf_emp = ?, email_emp = ? WHERE id_emp = ?`;
        const result = await queryPromise(sql, [tipo_doc_emp, ced_rif_emp, nom_emp, ape_emp, pref_tlf_emp, num_tlf_emp, email_emp, id]);

        if (result.affectedRows === 0) return res.status(404).json({ message: 'Empleado no encontrado.' });

        res.status(200).json({ message: 'Empleado actualizado exitosamente.' });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ message: 'Ya existe otro empleado con esta Cédula.' });
        res.status(500).json({ message: 'Error en la base de datos al actualizar empleado.' });
    }
};

export const eliminarEmpleado = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await queryPromise('DELETE FROM empleados WHERE id_emp = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'El empleado no fue encontrado.' });
        }

        res.status(200).json({ message: 'Empleado eliminado exitosamente.' });
    } catch (err) {
        if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.errno === 1451) {
            return res.status(400).json({
                message: 'Tiene registros asociados en otras secciones del sistema.'
            });
        }
        console.error("Error eliminando empleado:", err);
        res.status(500).json({ message: 'Error en la base de datos al eliminar empleado.' });
    }
};
