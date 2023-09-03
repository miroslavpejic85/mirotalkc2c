'use-strict';

function popupMessage(icon, title, message, position = 'center', timer = 3000) {
    switch (icon) {
        case 'info':
        case 'success':
        case 'warning':
        case 'error':
            Swal.fire({
                allowOutsideClick: false,
                allowEscapeKey: false,
                position: position,
                icon: icon,
                title: title,
                html: message,
                showClass: { popup: 'animate__animated animate__fadeInDown' },
                hideClass: { popup: 'animate__animated animate__fadeOutUp' },
            });
            break;
        case 'clean':
            Swal.fire({
                allowOutsideClick: false,
                allowEscapeKey: false,
                position: position,
                title: title,
                html: message,
                showClass: { popup: 'animate__animated animate__fadeInDown' },
                hideClass: { popup: 'animate__animated animate__fadeOutUp' },
            });
            break;
        case 'toast':
            const Toast = Swal.mixin({
                toast: true,
                position: position,
                icon: 'info',
                showConfirmButton: false,
                timerProgressBar: true,
                timer: timer,
            });
            Toast.fire({
                icon: 'info',
                title: message,
                showClass: { popup: 'animate__animated animate__fadeInDown' },
                hideClass: { popup: 'animate__animated animate__fadeOutUp' },
            });
            break;
        default:
            alert(message);
    }
}
