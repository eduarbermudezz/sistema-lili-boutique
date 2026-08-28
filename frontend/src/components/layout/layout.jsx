import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '@/components/navbar/navbar.jsx';
import Footer from '@/components/footer/footer.jsx';

export default function Layout() {
  return (
    <div className="d-flex flex-column vh-100 bg-light overflow-hidden">
      <Navbar />
      
      <main className="d-flex flex-column flex-grow-1 overflow-y-auto" style={{ minHeight: 0 }}>
        <Outlet />
      </main>
      
      <Footer />
    </div>
  );
}