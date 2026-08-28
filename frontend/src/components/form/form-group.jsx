import React from 'react';
import BootstrapForm from 'react-bootstrap/Form';

const FormGroup = React.forwardRef((props, ref) => {
    return (
        <BootstrapForm.Group className="mb-3" controlId={props.id}>
            <BootstrapForm.Label>{props.label}</BootstrapForm.Label>
            <BootstrapForm.Control 
                type={props.type} 
                placeholder={props.placeholder}
                value={props.value}
                onChange={props.onChange}
                autoComplete={props.autoComplete}
                required={props.required}
                ref={ref} 
            />
        </BootstrapForm.Group>
    );
});

export default FormGroup;