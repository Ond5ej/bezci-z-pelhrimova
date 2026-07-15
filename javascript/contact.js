/* =========================================================
   KONTAKTNÍ FORMULÁŘ
   ---------------------------------------------------------
   Zprávu odesílá EmailJS (nastavení v emailjs.js).

   Když EmailJS není vyplněné nebo se odeslání nepovede,
   formulář nabídne starou cestu – otevře poštovní program
   návštěvníka (mailto). Zpráva se tak neztratí ani při výpadku.
   ========================================================= */
import { getEmailjs, isConfigured, EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID } from './emailjs.js';

export function initContact(sel) {
  const form = document.querySelector(sel.form);
  if (!form) return;

  const status = form.querySelector('.form-status');
  const btn = form.querySelector('button[type="submit"]');
  const btnHtml = btn?.innerHTML;
  const to = sel.email || 'bezcizpelhrimova@seznam.cz';

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name  = form.querySelector('[name="name"]')?.value.trim() || '';
    const email = form.querySelector('[name="email"]')?.value.trim() || '';
    const msg   = form.querySelector('[name="message"]')?.value.trim() || '';
    const trap  = form.querySelector('[name="website"]')?.value.trim() || '';

    // Past na roboty: pole je pro člověka neviditelné, takže když
    // je vyplněné, píše nám robot. Tváříme se, že se odeslalo –
    // ať to nezkouší znovu jinak.
    if (trap) {
      setStatus('Díky, ozveme se!', 'ok');
      form.reset();
      return;
    }

    if (!name || !email || !msg) {
      setStatus('Vyplň prosím jméno, e-mail i zprávu.', 'err');
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setStatus('Zkontroluj prosím tvar e-mailu.', 'err');
      return;
    }

    // EmailJS ještě není nastavené → stará cesta
    if (!isConfigured()) return viaMailto(name, email, msg);

    const emailjs = await getEmailjs();
    if (!emailjs) return viaMailto(name, email, msg);

    busy(true);
    setStatus('Odesílám…');
    try {
      await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
        name,
        email,
        message: msg,
        // {{time}} používá výchozí šablona EmailJS – bez tohohle by zůstalo prázdné
        time: new Date().toLocaleString('cs-CZ'),
      });
      setStatus('Zpráva odeslána. Díky, ozveme se!', 'ok');
      form.reset();
    } catch (err) {
      console.error('EmailJS:', err);
      // 429 = moc rychlé opakované odeslání, hlídá si to knihovna sama
      if (err?.status === 429) {
        setStatus('Moment prosím – zkus to za chvíli znovu.', 'err');
      } else {
        setStatus(`Odeslání se nepovedlo. Napiš nám prosím přímo na ${to}.`, 'err');
      }
    } finally {
      busy(false);
    }
  });

  /** Záloha: otevře poštovní program s předvyplněnou zprávou. */
  function viaMailto(name, email, msg) {
    const subject = encodeURIComponent(`Zpráva z webu od ${name}`);
    const body = encodeURIComponent(`${msg}\n\n— ${name} (${email})`);
    window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
    setStatus('Otevírám e-mailového klienta… Díky, ozveme se!', 'ok');
    form.reset();
  }

  function busy(on) {
    if (!btn) return;
    btn.disabled = on;
    btn.innerHTML = on ? '<i class="bi bi-hourglass-split"></i> Odesílám…' : btnHtml;
  }

  function setStatus(text, kind = '') {
    if (!status) return;
    status.textContent = text;
    status.className = 'form-status ' + kind;
  }
}
