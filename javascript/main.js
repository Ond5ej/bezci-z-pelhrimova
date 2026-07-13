/* =========================================================
   HLAVNÍ VSTUPNÍ BOD – Běžci z Pelhřimova
   ========================================================= */
import { initHeader } from './header.js';
import { initMenu } from './menu.js';
import { initReveal } from './reveal.js';
import { initRoutes } from './routes.js';
import { initGallery } from './gallery.js';
import { initContact } from './contact.js';

document.addEventListener('DOMContentLoaded', () => {
  initHeader({ header: 'header' });

  initMenu({
    toggle: '.navbar-toggle',
    nav: '.nav-desktop',
    backdrop: '.menu-backdrop',
  });

  // Trasy vykreslíme dřív, aby je stihl zachytit reveal observer
  initRoutes({ grid: '#routes-grid' });

  initGallery({
    grid: '#gallery-grid',
    addTile: '#gallery-add',
    fileInput: '#gallery-file',
    lightbox: '#lightbox',
  });

  initContact({
    form: '#contact-form',
    email: 'ahoj@bezcizpelhrimova.cz',
  });

  initReveal('.reveal');

  // aktuální rok v patičce
  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
});
