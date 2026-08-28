import React, { createContext, useState, useContext } from 'react';
import { Toast, ToastContainer, Modal, Button } from 'react-bootstrap';

const MessageContext = createContext();

export const useMessage = () => {
    return useContext(MessageContext);
};

export const MessageProvider = ({ children }) => {
    const [showToast, setShowToast] = useState(false);
    const [message, setMessage] = useState('');
    const [variant, setVariant] = useState('success');

    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmConfig, setConfirmConfig] = useState({ title: '', message: '', onConfirm: null, onCancel: null });

    const showMessage = (msg, type = 'success') => {
        setMessage(msg);
        setVariant(type);
        setShowToast(true);
    };

    const showConfirm = (mensajePregunta, titulo = '⚠️ Confirmar Acción') => {
        return new Promise((resolve) => {
            setConfirmConfig({
                title: titulo,
                message: mensajePregunta,
                onConfirm: () => {
                    setShowConfirmModal(false);
                    resolve(true); 
                },
                onCancel: () => {
                    setShowConfirmModal(false);
                    resolve(false); 
                }
            });
            setShowConfirmModal(true);
        });
    };

    const getHeaderContent = () => {
        if (variant === 'success') return '✅ Éxito';
        if (variant === 'danger') return '❌ Error';
        if (variant === 'warning') return '⚠️ Atención';
        if (variant === 'info') return 'ℹ️ Información';
        return 'Mensaje';
    };

    const getBodyClass = () => {
        if (variant === 'warning' || variant === 'info' || variant === 'light') {
            return 'text-dark fw-bold';
        }
        return 'text-white fw-bold';
    };

    return (
        <MessageContext.Provider value={{ showMessage, showConfirm }}>
            {children}

            <ToastContainer position="top-end" className="p-3" style={{ position: 'fixed', zIndex: 9999 }}>
                <Toast
                    onClose={() => setShowToast(false)}
                    show={showToast}
                    delay={4000}
                    autohide
                    bg={variant}
                >
                    <Toast.Header closeButton={true} className="text-dark fw-bold">
                        <strong className="me-auto">
                            {getHeaderContent()}
                        </strong>
                    </Toast.Header>
                    <Toast.Body className={getBodyClass()}>
                        {message}
                    </Toast.Body>
                </Toast>
            </ToastContainer>
            <Modal show={showConfirmModal} onHide={confirmConfig.onCancel} centered backdrop="static" style={{ zIndex: 10000 }}>
                <Modal.Header closeButton className="bg-warning text-dark">
                    <Modal.Title className="fw-bold">{confirmConfig.title}</Modal.Title>
                </Modal.Header>
                <Modal.Body className="text-center py-4 fs-5 fw-bold text-secondary">
                    {confirmConfig.message}
                </Modal.Body>
                <Modal.Footer className="justify-content-center bg-light">
                    <Button variant="secondary" className="fw-bold px-4 shadow-sm" onClick={confirmConfig.onCancel}>
                        Cancelar
                    </Button>
                    <Button variant="danger" className="fw-bold px-4 shadow-sm" onClick={confirmConfig.onConfirm}>
                        Sí, continuar
                    </Button>
                </Modal.Footer>
            </Modal>

        </MessageContext.Provider>
    );
};