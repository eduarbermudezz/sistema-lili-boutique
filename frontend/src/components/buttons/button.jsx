import BootstrapButton from 'react-bootstrap/Button';

function Button({ label, children, ...props }) {
  return (
   <BootstrapButton {...props}>
      {children} 
      {children && <span className="ms-2"></span>}
      {label}</BootstrapButton>
  );
}

export default Button;