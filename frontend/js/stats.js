'use strict';

// https://github.com/mikecao/umami

const umami = true;

if (!umami) {
    console.warn('Umami is disabled');
    return;
}

const script = document.createElement('script');
script.setAttribute('async', '');
script.setAttribute('src', 'https://stats.mirotalk.com/script.js');
script.setAttribute('data-website-id', '5624a0f0-8c0c-499f-92be-0fac9d653a77');
document.head.appendChild(script);
