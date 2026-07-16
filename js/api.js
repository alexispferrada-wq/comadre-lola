/* =====================================================
   API.JS — La Comadre Lola
   ===================================================== */

const PROD_API_URL = 'https://lacomadrelola-api.onrender.com';
const DEV_API_URL  = 'http://localhost:3001';

export const API_BASE =
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1'
    ? DEV_API_URL
    : PROD_API_URL;

export async function submitReservation(data) {
  const res = await fetch(`${API_BASE}/api/reservations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function submitNewsletter(email) {
  const res = await fetch(`${API_BASE}/api/newsletter`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return res.json();
}
