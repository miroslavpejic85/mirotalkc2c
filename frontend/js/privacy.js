'use strict';

const savedTheme = window.localStorage.getItem('home-theme');
const preferredTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
document.documentElement.dataset.theme = ['light', 'dark'].includes(savedTheme) ? savedTheme : preferredTheme;
