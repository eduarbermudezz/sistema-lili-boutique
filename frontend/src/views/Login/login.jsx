import styles from '@/views/Login/login.module.css';
import Modal from '@/components/modals/login-modal.jsx';
import Footer from '@/components/footer/footer.jsx';
import Button from '@/components/buttons/button.jsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStore, faCartShopping, faBasketShopping, faTags, faCashRegister, faBarcode, faBoxesStacked } from '@fortawesome/free-solid-svg-icons';
import { useState } from 'react';
import logoEmpresa from '@/assets/logo.png'; 

export default function Login() {
    const [show, setShow] = useState(false);
    const handleClose = () => setShow(false);
    const handleShow = () => setShow(true);

    return (
        <div className={styles.pantallaCompleta}>
            <main className={styles.contenedorLogin}>
                <div className={styles.backgroundAnimation}>
                    <FontAwesomeIcon icon={faStore} className={styles.floatingIcon} />
                    <FontAwesomeIcon icon={faCartShopping} className={styles.floatingIcon} />
                    <FontAwesomeIcon icon={faBasketShopping} className={styles.floatingIcon} />
                    <FontAwesomeIcon icon={faTags} className={styles.floatingIcon} />
                    <FontAwesomeIcon icon={faCashRegister} className={styles.floatingIcon} />
                    <FontAwesomeIcon icon={faBarcode} className={styles.floatingIcon} />
                    <FontAwesomeIcon icon={faBoxesStacked} className={styles.floatingIcon} />
                    <FontAwesomeIcon icon={faCartShopping} className={styles.floatingIcon} />
                </div>
                <div className={styles.tarjetaLogin}>
                    <div className={styles.headerTarjeta}>
                        <img 
                            src={logoEmpresa} 
                            alt="Logo de la Empresa" 
                            className="mb-3" 
                            style={{ maxWidth: '180px', height: 'auto' }} 
                        />
                        
                        <h1 className={styles.tituloBienvenida}>Bienvenido</h1>
                        <p className={styles.subtituloBienvenida}>Sistema de Gestión y Ventas</p>
                    </div>

                    <div className="w-100 px-3 px-sm-5 mt-2">
                        <Button
                            variant="primary"
                            onClick={handleShow}
                            label="Iniciar sesión"
                            className="w-100 py-3 fs-5 fw-bold shadow-sm"
                        />
                    </div>
                </div>

                <Modal show={show} onHide={handleClose} />
            </main>
            
            <Footer />
        </div>
    );
}