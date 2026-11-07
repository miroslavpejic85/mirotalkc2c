'use strict';

const swalToastQueue = [];
let swalToastRetry = null;

/**
 * Queue a toast so it never dismisses an open dialog.
 * An immediate toast may only replace another toast.
 */
function showSwalToast(options, { immediate = false } = {}) {
    if (immediate && (!Swal.isVisible() || Swal.getPopup()?.classList.contains('swal2-toast'))) {
        return fireSwalToast(options);
    }
    return new Promise((resolve, reject) => {
        swalToastQueue.push({ options, resolve, reject });
        drainSwalToasts();
    });
}

function drainSwalToasts() {
    if (swalToastRetry !== null || !swalToastQueue.length) return;
    if (Swal.isVisible()) {
        swalToastRetry = setTimeout(() => {
            swalToastRetry = null;
            drainSwalToasts();
        }, 250);
        return;
    }

    const { options, resolve, reject } = swalToastQueue.shift();
    fireSwalToast(options).then(resolve, reject);
    drainSwalToasts();
}

function fireSwalToast(options) {
    // Warnings and errors stay longer; 0 keeps the toast until it is closed
    const duration = options.timer ?? (['warning', 'error'].includes(options.icon) ? 6000 : 4000);
    return Swal.fire({
        ...options,
        toast: true,
        position: options.position || 'top-end',
        showConfirmButton: false,
        showCloseButton: true,
        timer: duration === 0 ? 0 : Math.max(3000, duration),
        timerProgressBar: true,
        showClass: { popup: 'animate__animated animate__fadeInDown' },
        hideClass: { popup: 'animate__animated animate__fadeOutUp' },
        didOpen: (popup) => {
            // Pause the timer while the toast is hovered or focused
            const resume = () => {
                if (!popup.matches(':hover') && !popup.contains(document.activeElement)) Swal.resumeTimer();
            };
            popup.addEventListener('mouseenter', () => Swal.stopTimer());
            popup.addEventListener('mouseleave', resume);
            popup.addEventListener('focusin', () => Swal.stopTimer());
            popup.addEventListener('focusout', resume);
            if (typeof options.didOpen === 'function') options.didOpen(popup);
        },
    });
}

function popupMessage(icon, title, message, position = 'center', timer = null, toastIcon = 'info') {
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
                showClass: { popup: 'animate__animated animate__zoomIn animate__faster' },
                hideClass: { popup: 'animate__animated animate__zoomOut animate__faster' },
            });
            break;
        case 'html':
            Swal.fire({
                allowOutsideClick: false,
                allowEscapeKey: false,
                position: position,
                title: title,
                html: message,
                showClass: { popup: 'animate__animated animate__zoomIn animate__faster' },
                hideClass: { popup: 'animate__animated animate__zoomOut animate__faster' },
            });
            break;
        case 'toast':
            showSwalToast({
                icon: toastIcon,
                title: title,
                text: message,
                position: position,
                timer: timer ?? undefined,
            });
            break;
        default:
            alert(message);
    }
}

function popupHtmlMessage(icon, imageUrl, title, html, position, redirectURL = false) {
    Swal.fire({
        allowOutsideClick: false,
        allowEscapeKey: false,
        position: position,
        icon: icon,
        imageUrl: imageUrl,
        title: title,
        html: html,
        showClass: { popup: 'animate__animated animate__zoomIn animate__faster' },
        hideClass: { popup: 'animate__animated animate__zoomOut animate__faster' },
    }).then((result) => {
        if (result.isConfirmed && redirectURL) {
            openURL(redirectURL);
        }
    });
}
