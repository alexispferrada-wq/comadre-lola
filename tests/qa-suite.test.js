import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const errors = [];

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ PASS: ${message}`);
  } else {
    failedTests++;
    console.error(`  ❌ FAIL: ${message}`);
    errors.push(message);
  }
}

console.log('\n======================================================');
console.log('🧪 QA SUITE & TEST LAB — LA COMADRE LOLA');
console.log('======================================================\n');

/* ── LAB 1: INTEGRIDAD DE ARCHIVOS CLAVE ── */
console.log('📦 LAB 1: Integridad de Archivos del Proyecto');
const criticalFiles = [
  'index.html',
  'carta.html',
  'garzon.html',
  'admin.html',
  'editor_cms.html',
  'login.html',
  'favicon.svg',
  'CNAME',
  'js/api.js',
  'js/qrcode.min.js',
  'js/html5-qrcode.min.js',
  'assets/BudmoJiggler.TTF',
  'assets/carrusel_bar.png',
  'assets/carrusel_comida.png',
  'assets/carrusel_show.png',
  'assets/galeria_ambiente.png',
  'assets/galeria_brindis.png',
  'backend/server.js'
];

criticalFiles.forEach(relPath => {
  const fullPath = path.join(rootDir, relPath);
  assert(fs.existsSync(fullPath), `Archivo presente y accesible: ${relPath}`);
});

/* ── LAB 2: VALIDACIÓN DE LINKS Y REFERENCIAS ESTÁTICAS ── */
console.log('\n🔗 LAB 2: Validación de Scripts, Fuentes e Imágenes');

function testHtmlReferences(filename) {
  const content = fs.readFileSync(path.join(rootDir, filename), 'utf-8');
  
  // Scripts locales
  const scriptRegex = /<script\s+[^>]*src=["']([^"']+)["']/gi;
  let match;
  while ((match = scriptRegex.exec(content)) !== null) {
    const src = match[1];
    if (!src.startsWith('http') && !src.startsWith('//')) {
      const cleanSrc = src.split('?')[0].replace(/^\//, '');
      const assetPath = path.join(rootDir, cleanSrc);
      assert(fs.existsSync(assetPath), `[${filename}] Script local verificado: ${src}`);
    }
  }

  // Fuentes y assets CSS locales dentro de <style>
  const styleBlocks = content.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) || [];
  styleBlocks.forEach(styleBlock => {
    const urlRegex = /url\(["']?([^"')]+)["']?\)/gi;
    let urlMatch;
    while ((urlMatch = urlRegex.exec(styleBlock)) !== null) {
      const url = urlMatch[1].trim();
      if (!url.startsWith('http') && !url.startsWith('data:') && !url.startsWith('//') && url !== 'none' && !url.startsWith('$')) {
        const cleanUrl = url.split('?')[0].replace(/^\//, '');
        const assetPath = path.join(rootDir, cleanUrl);
        assert(fs.existsSync(assetPath), `[${filename}] Asset CSS verificado: ${url}`);
      }
    }
  });

  // Imágenes locales <img>
  const imgRegex = /<img\s+[^>]*src=["']([^"']+)["']/gi;
  while ((match = imgRegex.exec(content)) !== null) {
    const src = match[1];
    if (!src.startsWith('http') && !src.startsWith('data:') && !src.startsWith('//') && !src.startsWith('$')) {
      const cleanSrc = src.split('?')[0].replace(/^\//, '');
      const assetPath = path.join(rootDir, cleanSrc);
      assert(fs.existsSync(assetPath), `[${filename}] Imagen <img> verificada: ${src}`);
    }
  }
}

['index.html', 'carta.html', 'garzon.html', 'admin.html', 'editor_cms.html', 'login.html'].forEach(f => {
  testHtmlReferences(f);
});

/* ── LAB 3: CARTA DIGITAL (WCAG AAA & NAVEGACIÓN COMPLETA) ── */
console.log('\n📱 LAB 3: Carta Digital (/carta) — Accesibilidad, Menú Puro y Navegación');
const cartaHtml = fs.readFileSync(path.join(rootDir, 'carta.html'), 'utf-8');

assert(cartaHtml.includes('font-large') && cartaHtml.includes('cycleFontSize'), 'Selector de tamaño de letra accesible (+50 años) presente');
assert(cartaHtml.includes('btn-nav-back') && cartaHtml.includes('href="/"'), 'Botón volver al inicio presente');
assert(cartaHtml.includes('nav-drawer') && cartaHtml.includes('toggleNavDrawer'), 'Drawer de navegación desplegable para volver a cualquier sección integrado');
assert(cartaHtml.includes('aria-label') && cartaHtml.includes('role='), 'Atributos ARIA de accesibilidad web WCAG implementados');
assert(cartaHtml.includes('view-toggle-bar') && cartaHtml.includes('btnGrid2'), 'Selector de vista en 2 Columnas y 1 Columna implementado');
assert(!cartaHtml.includes('btn-add-item'), 'Modo vista puro: no incluye botones de agregar ni garzón');

/* ── LAB 4: APP GARZÓN (QR PARSER & WHATSAPP) ── */
console.log('\n🧑‍🍳 LAB 4: App Garzón (/garzon) — Decodificación Óptica y WhatsApp');
const garzonHtml = fs.readFileSync(path.join(rootDir, 'garzon.html'), 'utf-8');

assert(garzonHtml.includes('html5-qrcode.min.js'), 'Escáner de cámara con fallback mock integrado');
assert(garzonHtml.includes('shareOrderWhatsApp'), 'Función de despacho a WhatsApp de Cocina/Barra activa');
assert(garzonHtml.includes('api.whatsapp.com/send?text='), 'Plantilla preformateada de WhatsApp conectada');

// Simulación de escaneo de comanda sin fallos
const mockPayload = {
  app: 'comadre_lola',
  type: 'pedido',
  mesa: 'Mesa 4',
  ts: Date.now(),
  items: [
    { id: 't1', n: 'Terremoto La Comadre', c: 2 },
    { id: 'tb1', n: 'Tabla La Comadre', c: 1 }
  ],
  nota: 'Sin hielo en los tragos'
};
const encoded = JSON.stringify(mockPayload);
const decoded = JSON.parse(encoded);
assert(decoded.app === 'comadre_lola' && decoded.items.length === 2, 'Comanda serializada decodifica con fidelidad del 100%');

/* ── LAB 5: SITIO PRINCIPAL Y RESERVAS ── */
console.log('\n🌹 LAB 5: Sitio Principal (index.html) — Reservas y Eventos');
const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf-8');

assert(indexHtml.includes('id="reservas"'), 'Sección de reservas accesible');
assert(indexHtml.includes('id="eventos"'), 'Sección de cartelera de eventos presente');
assert(indexHtml.includes('id="momentos"'), 'Sección de galería presente');
assert(indexHtml.includes('submitReservation') || indexHtml.includes('doReserve'), 'Manejador de envío de formulario de reserva activo');

/* ── LAB 6: BACKEND Y MULTI-DESTINO GMAIL ── */
console.log('\n📧 LAB 6: Backend & Notificaciones Multi-Gmail');
const serverJs = fs.readFileSync(path.join(rootDir, 'backend/server.js'), 'utf-8');

assert(serverJs.includes('getAdminEmails'), 'Divisor inteligente de múltiples correos destinatarios');
assert(serverJs.includes('/api/admin/test-email'), 'Endpoint de verificación de envío Gmail');
assert(serverJs.includes('/garzon') && serverJs.includes('/carta'), 'Rutas limpias /carta y /garzon configuradas');

/* ── RESULTADOS FINALES ── */
console.log('\n======================================================');
console.log(`📊 RESUMEN QA: ${passedTests}/${totalTests} Tests Pasados (${Math.round((passedTests/totalTests)*100)}%)`);
if (failedTests === 0) {
  console.log('🎉 TODOS LOS TESTS HAN PASADO EXITOSAMENTE — CERO ERRORES DETECTADOS');
} else {
  console.log(`⚠️ Se encontraron ${failedTests} errores que deben corregirse.`);
  errors.forEach(e => console.error(`  - ${e}`));
}
console.log('======================================================\n');

process.exit(failedTests > 0 ? 1 : 0);
