import nodemailer from 'nodemailer';
import net from 'node:net';
import tls from 'node:tls';
import { Resolver } from 'node:dns';

let transporter = null;
let fromAddress = 'no-reply@vitegourmand.fr';
let transportConfig = null;
let currentForceIpv4 = false;

const SMTP_RETRYABLE_ERROR = /(Greeting never received|Connection timeout|ETIMEDOUT|ECONNRESET|ENETUNREACH)/i;
const SMTP_CONNECTION_TIMEOUT = Number(process.env.SMTP_CONNECTION_TIMEOUT || 10000);
const SMTP_GREETING_TIMEOUT = Number(process.env.SMTP_GREETING_TIMEOUT || 10000);
const SMTP_SOCKET_TIMEOUT = Number(process.env.SMTP_SOCKET_TIMEOUT || 20000);

function createIpv4SocketProvider() {
  return (options, callback) => {
    if (!options?.host) {
      callback(null);
      return;
    }

    const resolver = new Resolver();
    resolver.resolve4(options.host, (error, addresses) => {
      if (error || !Array.isArray(addresses) || addresses.length === 0) {
        callback(null);
        return;
      }

      const ip = addresses[0];
      const connectOptions = {
        host: ip,
        port: options.port,
        family: 4,
        localAddress: options.localAddress
      };

      if (options.secure) {
        connectOptions.servername = options.servername || options.host;
        if (options.tls && typeof options.tls === 'object') {
          Object.assign(connectOptions, options.tls);
        }
      }

      try {
        const connection = options.secure ? tls.connect(connectOptions) : net.connect(connectOptions);
        let done = false;
        const finish = (err, result) => {
          if (done) return;
          done = true;
          connection.removeListener('connect', onConnect);
          connection.removeListener('secureConnect', onSecureConnect);
          connection.removeListener('error', onError);
          connection.setTimeout(0);
          callback(err, result);
        };
        const onError = () => {
          try {
            connection.destroy();
          } catch {
            // ignore
          }
          callback(null);
        };
        const onConnect = () => {
          finish(null, { connection, secured: false });
        };
        const onSecureConnect = () => {
          finish(null, { connection, secured: true });
        };

        connection.once('error', onError);
        connection.setTimeout(Number(options.connectionTimeout || 120000), () => {
          onError();
        });

        if (options.secure) {
          connection.once('secureConnect', onSecureConnect);
        } else {
          connection.once('connect', onConnect);
        }
      } catch {
        callback(null);
      }
    });
  };
}

function createTransporter(config, forceIpv4) {
  const transportOptions = {
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.pass },
    connectionTimeout: SMTP_CONNECTION_TIMEOUT,
    greetingTimeout: SMTP_GREETING_TIMEOUT,
    socketTimeout: SMTP_SOCKET_TIMEOUT
  };
  if (forceIpv4) {
    transportOptions.getSocket = createIpv4SocketProvider();
  }
  return nodemailer.createTransport(transportOptions);
}

function isRetryableSmtpError(error) {
  return SMTP_RETRYABLE_ERROR.test(String(error?.message || ''));
}

function switchTransport(forceIpv4) {
  if (!transportConfig) return false;
  transporter = createTransporter(transportConfig, forceIpv4);
  currentForceIpv4 = forceIpv4;
  return true;
}

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

export function initMailer({ host, port, secure, user, pass, from, forceIpv4 = false }) {
  if (!host || !user || !pass) {
    console.warn('SMTP non configure. Aucun email reel ne sera envoye.');
    return null;
  }

  fromAddress = from || user;
  transportConfig = {
    host,
    port,
    secure,
    user,
    pass
  };
  currentForceIpv4 = Boolean(forceIpv4);
  transporter = createTransporter(transportConfig, currentForceIpv4);

  return transporter;
}

export async function verifyMailer() {
  if (!transporter) return false;
  try {
    await transporter.verify();
    return true;
  } catch (error) {
    if (!transportConfig || !isRetryableSmtpError(error)) throw error;

    const fallbackMode = !currentForceIpv4;
    if (!switchTransport(fallbackMode)) throw error;

    await transporter.verify();
    console.warn(`SMTP: bascule automatique vers le mode ${fallbackMode ? 'IPv4 force' : 'standard'} apres erreur "${error.message}"`);
    return true;
  }
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
    if (transportConfig && isRetryableSmtpError(error)) {
      const fallbackMode = !currentForceIpv4;
      if (switchTransport(fallbackMode)) {
        try {
          await transporter.sendMail({
            from: fromAddress,
            to,
            subject,
            text,
            html
          });
          console.warn(`SMTP: envoi reussi apres bascule vers le mode ${fallbackMode ? 'IPv4 force' : 'standard'}.`);
          return true;
        } catch (fallbackError) {
          console.error('Erreur envoi mail:', fallbackError.message);
          return false;
        }
      }
    }
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
