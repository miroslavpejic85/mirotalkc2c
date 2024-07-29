'use strict';

const trScript = document.createElement('script');
trScript.setAttribute('async', '');
trScript.setAttribute('src', 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit');
document.head.appendChild(trScript);

function googleTranslateElementInit() {
    new google.translate.TranslateElement({ pageLanguage: 'en' }, 'google_translate_element');
}
