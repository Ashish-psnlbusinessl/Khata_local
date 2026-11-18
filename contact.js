import { fmt } from './money';

const digits = (p) => String(p || '').replace(/\D/g, '');

export const hasPhone = (phone) => digits(phone).length >= 10;

export const waLink = (phone, text) => {
  const d = digits(phone);
  const n = d.length === 10 ? '91' + d : d; // default country code: India
  return `https://wa.me/${n}?text=${encodeURIComponent(text)}`;
};

export const smsLink = (phone, text) => `sms:${digits(phone)}?body=${encodeURIComponent(text)}`;

export const telLink = (phone) => `tel:${digits(phone)}`;

export const reminderText = (name, balance) => {
  const shop = (typeof localStorage !== 'undefined' && localStorage.getItem('shopName')) || 'hamari dukan';
  return `Namaste ${name}, ${shop} mein aapka ${fmt(balance)} baaki hai. Kripya jald bhugtan karein. Dhanyavaad.`;
};
