/* =========================================================
   EMAILJS – odesílání kontaktního formuláře
   ---------------------------------------------------------
   Statická stránka nemá server, který by uměl poslat e-mail.
   EmailJS to udělá za nás: formulář pošle data jim a oni
   z nich podle šablony složí e-mail a doručí ho.

   JAK TO NASTAVIT (asi 10 minut):

   1) Účet na https://www.emailjs.com – zdarma, 200 e-mailů měsíčně.

   2) Email Services → Add New Service → vyber svého poskytovatele
      (Seznam jde přes "Other" / SMTP, Gmail má vlastní volbu).
      Vznikne SERVICE ID, vypadá jako  service_ab12cde

   3) Email Templates → Create New Template.
      V těle šablony použij tyhle proměnné – posílá je náš web:
          {{name}}      jméno odesílatele
          {{email}}     jeho e-mail
          {{message}}   text zprávy
      DŮLEŽITÉ v nastavení šablony:
          "To Email"   → adresa, kam mají zprávy chodit (tvoje)
          "Reply To"   → {{email}}   ← díky tomu můžeš v poště
                                       rovnou kliknout Odpovědět
      Vznikne TEMPLATE ID, vypadá jako  template_xy34fgh

   4) Account → General → zkopíruj PUBLIC KEY

   5) Vyplň všechny tři hodnoty níže a nasaď web.

   POZOR – ochrana proti zneužití:
   Public Key je VEŘEJNÝ, uvidí ho každý, kdo si zobrazí zdroj
   stránky. Tak je to myšlené, není to chyba. Aby ho ale nikdo
   nemohl použít ze svého webu a vyčerpat ti kvótu, jdi na
       Account → Security → Allow List
   a přidej  bezcizpelhrimova.cz.  Odjinud pak klíč neprojde.

   Dokud jsou hodnoty nevyplněné, formulář funguje po staru –
   otevře návštěvníkovi jeho poštovní program (mailto).
   ========================================================= */
export const EMAILJS_PUBLIC_KEY  = 'xGakMf7erbmCHBBEa';
export const EMAILJS_SERVICE_ID  = 'service_6vtzgwt';
export const EMAILJS_TEMPLATE_ID = 'template_j4bwkn4';

let _emailjs = null;

/** Je EmailJS vyplněné? Když ne, formulář spadne zpátky na mailto. */
export function isConfigured() {
  return ![EMAILJS_PUBLIC_KEY, EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID]
    .some(v => v.startsWith('TVUJ-'));
}

/**
 * Vrátí připravenou knihovnu EmailJS, nebo null.
 * Stahuje se až při prvním odeslání – web tím nezpomalíme.
 */
export async function getEmailjs() {
  if (!isConfigured()) return null;
  if (_emailjs) return _emailjs;
  try {
    const mod = await import('https://cdn.jsdelivr.net/npm/@emailjs/browser@4/+esm');
    const emailjs = mod.default || mod;
    emailjs.init({
      publicKey: EMAILJS_PUBLIC_KEY,
      // roboti jedoucí přes headless prohlížeč neprojdou
      blockHeadless: true,
      // nejvýš jedno odeslání za 10 s; hlídá to prohlížeč, takže
      // opakované klikání nežere kvótu účtu
      limitRate: { throttle: 10000 },
    });
    _emailjs = emailjs;
    return emailjs;
  } catch (e) {
    console.warn('EmailJS se nepodařilo načíst:', e);
    return null;
  }
}
