'use-strict';

function popupMessage(type, message, timer = 3000) {
    switch (type) {
        case 'info':
        case 'success':
        case 'warning':
        case 'error':
            Swal.fire({
                allowOutsideClick: false,
                allowEscapeKey: false,
                position: 'center',
                icon: type,
                title: type,
                html: message,
                showClass: {
                    popup: 'animate__animated animate__fadeInDown',
                },
                hideClass: {
                    popup: 'animate__animated animate__fadeOutUp',
                },
            });
            break;
        case 'toast':
            const Toast = Swal.mixin({
                toast: true,
                position: 'top-end',
                icon: 'info',
                showConfirmButton: false,
                timerProgressBar: true,
                timer: timer,
            });
            Toast.fire({
                icon: 'info',
                title: message,
            });
            break;
        default:
            alert(message);
    }
}
