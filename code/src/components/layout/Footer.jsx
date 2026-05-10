import { useEffect, useState } from 'react';
import { fetchAdminConfig } from '../../services/adminConfig';
import './Footer.css';

const InstagramIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5"/>
    <circle cx="12" cy="12" r="4"/>
    <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none"/>
  </svg>
);

const FacebookIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/>
  </svg>
);

const WhatsAppIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/>
  </svg>
);

const PhoneIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.0 1.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
  </svg>
);

const PinIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1118 0z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
);

export default function Footer() {
  const [cfg, setCfg] = useState(null);

  useEffect(() => {
    fetchAdminConfig().then(setCfg).catch(() => setCfg({}));
  }, []);

  if (!cfg) return null;

  const {
    store_name,
    store_logo,
    store_slogan,
    store_description,
    store_address,
    store_phone,
    social_instagram,
    social_facebook,
    social_whatsapp,
  } = cfg;

  const hasSocials = social_instagram || social_facebook || social_whatsapp;
  const hasContact = store_phone || store_address;

  const whatsappHref = social_whatsapp
    ? `https://wa.me/${social_whatsapp.replace(/\D/g, '').replace(/^(\d{8})$/, '506$1')}`
    : null;

  const instagramHref = social_instagram
    ? (social_instagram.startsWith('http') ? social_instagram : `https://instagram.com/${social_instagram.replace('@', '')}`)
    : null;

  const facebookHref = social_facebook
    ? (social_facebook.startsWith('http') ? social_facebook : `https://facebook.com/${social_facebook}`)
    : null;

  return (
    <footer className="footer">
      <div className="footer__inner">

        {/* ── Branding ── */}
        <div className="footer__brand">
          {store_logo && (
            <img src={store_logo} alt={store_name ?? 'Logo'} className="footer__logo" />
          )}
          {store_name && (
            <span className="footer__store-name">{store_name}</span>
          )}
          {store_slogan && (
            <span className="footer__slogan">{store_slogan}</span>
          )}
          {store_description && (
            <p className="footer__desc">{store_description}</p>
          )}
        </div>

        {/* ── Contacto ── */}
        {hasContact && (
          <div className="footer__section">
            <span className="footer__section-title">Contacto</span>
            {store_phone && (
              <a href={`tel:${store_phone}`} className="footer__contact-row">
                <PhoneIcon />
                <span>{store_phone}</span>
              </a>
            )}
            {store_address && (
              <div className="footer__contact-row">
                <PinIcon />
                <span>{store_address}</span>
              </div>
            )}
          </div>
        )}

        {/* ── Redes ── */}
        {hasSocials && (
          <div className="footer__section">
            <span className="footer__section-title">Síguenos</span>
            <div className="footer__socials">
              {instagramHref && (
                <a href={instagramHref} target="_blank" rel="noopener noreferrer" className="footer__social-btn" aria-label="Instagram">
                  <InstagramIcon />
                </a>
              )}
              {facebookHref && (
                <a href={facebookHref} target="_blank" rel="noopener noreferrer" className="footer__social-btn" aria-label="Facebook">
                  <FacebookIcon />
                </a>
              )}
              {whatsappHref && (
                <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="footer__social-btn" aria-label="WhatsApp">
                  <WhatsAppIcon />
                </a>
              )}
            </div>
          </div>
        )}

        {/* ── Copyright ── */}
        <div className="footer__bottom">
          <span className="footer__copy">
            © {new Date().getFullYear()}{store_name ? ` ${store_name}` : ''}. Todos los derechos reservados.
          </span>
        </div>

      </div>
    </footer>
  );
}
