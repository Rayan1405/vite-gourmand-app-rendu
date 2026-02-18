import nodemailer from 'nodemailer';

let transporter = null;
let fromAddress = 'no-reply@vitegourmand.fr';

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function layout(title, intro, contentHtml) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:18px;border:1px solid #e6dccf;border-radius:12px;background:#fffaf5;color:#2c2017">
      <h2 style="margin:0 0 10px;color:#b84a2f">${escapeHtml(title)}</h2>
      <p style="margin:0 0 14px;line-height:1.45">${escapeHtml(intro)}</p>
      <div style="line-height:1.5">${contentHtml}</div>
      <hr style="margin:16px 0;border:none;border-top:1px solid #ead8c8" />
      <p style="margin:0;color:#6f6257;font-size:12px">Vite & Gourmand - Notification automatique</p>
    </div>
  `;
}

export function initMailer({ host, port, secure, user, pass, from }) {
  if (!host || !user || !pass) {
    console.warn('SMTP non configure. Aucun email reel ne sera envoye.');
    return null;
  }

  fromAddress = from || user;
  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass }
  });

  return transporter;
}

export async function verifyMailer() {
  if (!transporter) return false;
  await transporter.verify();
  return true;
}

export async function sendMail(to, { subject, text, html }) {
  if (!transporter) {
    console.warn(`[MAIL SKIP] ${subject} -> ${to}`);
    return false;
  }

  try {
    await transporter.sendMail({
      from: fromAddress,
      to,
      subject,
      text,
      html
    });
    return true;
  } catch (error) {
    console.error('Erreur envoi mail:', error.message);
    return false;
  }
}

export function welcomeMail(firstName) {
  const title = 'Bienvenue chez Vite & Gourmand';
  const intro = `Bonjour ${firstName}, votre compte est bien cree.`;
  return {
    subject: title,
    text: `${intro} Vous pouvez maintenant vous connecter et passer commande.`,
    html: layout(title, intro, '<p>Vous pouvez maintenant vous connecter, consulter nos menus et commander en ligne.</p>')
  };
}

export function resetPasswordMail() {
  const title = 'Reinitialisation du mot de passe';
  const intro = 'Une demande de reinitialisation a ete recue.';
  return {
    subject: title,
    text: `${intro} Merci d'utiliser le lien de reinitialisation configure dans votre application.`,
    html: layout(title, intro, '<p>Merci de cliquer sur le lien de reinitialisation configure dans votre application de production.</p>')
  };
}

export function orderConfirmationMail({ orderId, menuTitle, totalPrice, deliveryPrice, menuPrice, eventDate, deliveryTime }) {
  const title = `Confirmation de commande #${orderId}`;
  const intro = 'Votre commande a bien ete enregistree.';
  return {
    subject: title,
    text: `Commande #${orderId} confirmee. Menu: ${menuTitle}. Total: ${totalPrice} EUR.`,
    html: layout(
      title,
      intro,
      `<ul style="padding-left:18px;margin:0">
        <li><strong>Menu:</strong> ${escapeHtml(menuTitle)}</li>
        <li><strong>Date:</strong> ${escapeHtml(eventDate)} a ${escapeHtml(deliveryTime)}</li>
        <li><strong>Prix menu:</strong> ${menuPrice} EUR</li>
        <li><strong>Livraison:</strong> ${deliveryPrice} EUR</li>
        <li><strong>Total:</strong> ${totalPrice} EUR</li>
      </ul>`
    )
  };
}

export function orderStatusMail(status, orderId) {
  const title = `Mise a jour commande #${orderId}`;
  const intro = `Le statut de votre commande est maintenant: ${status}.`;
  return {
    subject: title,
    text: intro,
    html: layout(title, intro, '<p>Connectez-vous a votre espace client pour consulter le suivi detaille.</p>')
  };
}

export function materialReturnMail(orderId) {
  const title = `Commande #${orderId}: retour de materiel`;
  const intro = 'Le retour du materiel est en attente.';
  return {
    subject: title,
    text: `${intro} Delai maximum: 10 jours ouvres, sinon 600 EUR de frais.`,
    html: layout(
      title,
      intro,
      '<p>Si le materiel n\'est pas restitue sous 10 jours ouvres, des frais de 600 EUR seront appliques selon les CGV.</p>'
    )
  };
}

export function employeeCreatedMail() {
  const title = 'Creation de votre compte employe';
  const intro = 'Un compte employe a ete cree pour vous.';
  return {
    subject: title,
    text: `${intro} Votre mot de passe vous sera communique par l'administrateur.`,
    html: layout(title, intro, '<p>Votre identifiant est votre email. Le mot de passe vous sera communique par l\'administrateur.</p>')
  };
}

export function contactReceivedMail({ title, description, email }) {
  const cleanTitle = escapeHtml(title);
  const cleanDescription = escapeHtml(description).replace(/\n/g, '<br />');
  const cleanEmail = escapeHtml(email);

  return {
    subject: `Nouveau message contact: ${title}`,
    text: `Message recu de ${email} - ${title}\n\n${description}`,
    html: layout(
      'Nouveau message de contact',
      `Expediteur: ${email}`,
      `<p><strong>Titre:</strong> ${cleanTitle}</p><p><strong>Description:</strong><br />${cleanDescription}</p><p><strong>Email:</strong> ${cleanEmail}</p>`
    )
  };
}
