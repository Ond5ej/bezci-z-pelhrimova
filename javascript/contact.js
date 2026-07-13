/* =========================================================
   KONTAKTNÍ FORMULÁŘ
   ---------------------------------------------------------
   Statická stránka nemá server, takže odeslání otevře
   e-mailového klienta (mailto). Pokud chceš odesílat přímo
   z webu, napoj službu jako Formspree / EmailJS – viz README.
   ========================================================= */
export function initContact(sel) {
  const form = document.querySelector(sel.form);
  if (!form) return;
  const status = form.querySelector('.form-status');
  const to = sel.email || 'bezcizpelhrimova@seznam.cz';

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = form.querySelector('[name="name"]')?.value.trim() || '';
    const email = form.querySelector('[name="email"]')?.value.trim() || '';
    const msg = form.querySelector('[name="message"]')?.value.trim() || '';

    if (!name || !email || !msg) {
      setStatus('Vyplň prosím jméno, e-mail i zprávu.', 'err');
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setStatus('Zkontroluj prosím tvar e-mailu.', 'err');
      return;
    }

    const subject = encodeURIComponent(`Zpráva z webu od ${name}`);
    const body = encodeURIComponent(`${msg}\n\n— ${name} (${email})`);
    window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
    setStatus('Otevírám e-mailového klienta… Díky, ozveme se!', 'ok');
    form.reset();
  });

  function setStatus(text, kind) {
    if (!status) return;
    status.textContent = text;
    status.className = 'form-status ' + kind;
  }
}
