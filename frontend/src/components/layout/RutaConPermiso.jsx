import React from 'react';
import { Navigate } from 'react-router-dom';

export default function RutaConPermiso({ children, permisoRequerido }) {
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    const permisos = JSON.parse(localStorage.getItem('permisos') || '[]');

    if (!usuario.id_usu) {
        return <Navigate to="/" replace />;
    }

    if (parseInt(usuario.rol_usu) === 1) {
        return children;
    }

    if (permisoRequerido && !permisos.includes(permisoRequerido)) {
        return (
            <div className="d-flex flex-column align-items-center justify-content-center mt-5 text-center">
                <h1 className="text-danger" style={{ fontSize: '4rem' }}>🛑</h1>
                <h2 className="text-danger fw-bold mt-3">Acceso Denegado</h2>
                <p className="text-muted fs-5">No tienes los permisos necesarios para ver esta pantalla.</p>
            </div>
        );
    }

    return children;
}