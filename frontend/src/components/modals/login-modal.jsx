import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRightToBracket, faXmark, faSpinner } from '@fortawesome/free-solid-svg-icons';
import Alert from 'react-bootstrap/Alert';
import BootstrapModal from 'react-bootstrap/Modal';
import BootstrapForm from 'react-bootstrap/Form';

import { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

import Loader from '@/components/loader/loader.jsx';

export default function LoginModal(props) {
  const userRef = useRef();
  const errRef = useRef();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [enviando, setEnviando] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    setErrorMessage('');
  }, [username, password]);

  useEffect(() => {
    if (props.show) {
      setTimeout(() => {
        userRef.current?.focus();
      }, 100);
    }
  }, [props.show]);

  const handleChange = (e) => {
    const { id, value } = e.target;

    if (id === 'username' && value.length > 10) return;
    if (id === 'password' && value.length > 15) return;

    if (id === 'username') {
      const valorProcesado = value.replace(/[^a-zA-Z0-9]/g, '');
      setUsername(valorProcesado);
      if (formErrors.username) setFormErrors(prev => ({ ...prev, username: null }));
    }

    if (id === 'password') {
      const valorProcesado = value.replace(/\s+/g, '');
      setPassword(valorProcesado);
      if (formErrors.password) setFormErrors(prev => ({ ...prev, password: null }));
    }
  };

  const validarFormulario = () => {
    const errores = {};

    if (!username || username.trim().length < 3 || username.length > 10) {
      errores.username = 'El nombre de usuario debe tener entre 3 y 10 caracteres alfanuméricos.';
    }

    if (!password || password.trim().length < 4 || password.length > 15) {
      errores.password = 'La contraseña es obligatoria (entre 4 y 15 caracteres).';
    }

    setFormErrors(errores);
    return Object.keys(errores).length === 0;
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validarFormulario()) return;

    setEnviando(true);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

      const response = await axios.post(`${apiUrl}/api/auth/login`, {
        usuario: username,
        contrasena: password
      });

      if (response.status === 200) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('usuario', JSON.stringify(response.data.usuario));
        localStorage.setItem('permisos', JSON.stringify(response.data.permisos));

        props.onHide();
        navigate('/inicio');
      }
    } catch (error) {
      console.error('Error:', error);

      if (error.response && error.response.data && error.response.data.message) {
        setErrorMessage(error.response.data.message);
      } else {
        setErrorMessage('Error de servidor o conexión.');
      }

      errRef.current?.focus();
    } finally {
      setEnviando(false);
    }
  };

  return (
    <>
      {enviando && <Loader texto="Iniciando sesión..." pantallaCompleta={true} />}
      <BootstrapModal {...props} centered backdrop="static">
        <BootstrapModal.Header closeButton className="bg-primary text-white">
          <BootstrapModal.Title>
            Inicio de sesión
          </BootstrapModal.Title>
        </BootstrapModal.Header>
        <BootstrapModal.Body>
          {errorMessage && (
            <Alert
              variant="danger"
              onClose={() => setErrorMessage('')}
            >
              <div ref={errRef} tabIndex="-1">{errorMessage}</div>
            </Alert>
          )}

          <BootstrapForm id="login-form" onSubmit={handleSubmit} noValidate>
            <BootstrapForm.Group className="mb-3">
              <BootstrapForm.Label className="fw-bold">Usuario</BootstrapForm.Label>
              <BootstrapForm.Control
                required
                type="text"
                id="username"
                value={username}
                onChange={handleChange}
                ref={userRef}
                isInvalid={!!formErrors.username}
                placeholder="Ingrese su usuario"
                onPaste={(e) => e.preventDefault()}
                onCopy={(e) => e.preventDefault()}
                onCut={(e) => e.preventDefault()}
                autoComplete="off"
              />
              <BootstrapForm.Control.Feedback type="invalid">
                {formErrors.username}
              </BootstrapForm.Control.Feedback>
            </BootstrapForm.Group>

            <BootstrapForm.Group className="mb-3">
              <BootstrapForm.Label className="fw-bold">Contraseña</BootstrapForm.Label>
              <BootstrapForm.Control
                required
                type="password"
                id="password"
                value={password}
                onChange={handleChange}
                isInvalid={!!formErrors.password}
                placeholder="Ingrese contraseña"
                onPaste={(e) => e.preventDefault()}
                onCopy={(e) => e.preventDefault()}
                onCut={(e) => e.preventDefault()}
              />
              <BootstrapForm.Control.Feedback type="invalid">
                {formErrors.password}
              </BootstrapForm.Control.Feedback>
            </BootstrapForm.Group>

          </BootstrapForm>
        </BootstrapModal.Body>

        <BootstrapModal.Footer>
          <button
            className="btn btn-secondary"
            onClick={props.onHide} disabled={enviando}>
            <FontAwesomeIcon icon={faXmark} className="me-2" /> Cancelar
          </button>
          <button className="btn btn-primary" type="submit" form="login-form" disabled={enviando}>
            {enviando ? (
              <><FontAwesomeIcon icon={faSpinner} spin className="me-2" /> Ingresando...</>
            ) : (
              <><FontAwesomeIcon icon={faRightToBracket} className="me-2" /> Ingresar</>
            )}
          </button>
        </BootstrapModal.Footer>
      </BootstrapModal>
    </>
  );
}