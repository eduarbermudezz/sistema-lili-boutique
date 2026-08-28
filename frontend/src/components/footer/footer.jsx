import React from 'react';

export default function Footer() {
  return (
    <footer className="bg-dark text-white py-3 mt-auto shadow-lg">
      <p className="mb-0 text-center opacity-75 fw-bold" style={{ fontSize: '0.85rem' }}>
        © {new Date().getFullYear()} Lili Boutique. Todos los derechos reservados.
      </p>
    </footer>
  );
}