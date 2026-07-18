// Script para crear las tablas en Neon PostgreSQL
const { Client } = require('pg');

const connectionString = 'postgresql://neondb_owner:npg_bdBCjvnx4gk2@ep-little-thunder-at81mbhn-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function createTables() {
  const client = new Client({ connectionString });

  try {
    console.log('🔄 Conectando a Neon PostgreSQL...');
    await client.connect();
    console.log('✅ Conectado!\n');

    // Crear tabla de reservas
    console.log('📋 Creando tabla reservations...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS reservations (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        telefono VARCHAR(50),
        fecha VARCHAR(50) NOT NULL,
        hora VARCHAR(20) NOT NULL,
        personas INTEGER NOT NULL,
        mensaje TEXT,
        estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'confirmada', 'cancelada')),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ Tabla reservations creada');

    // Crear tabla de newsletter
    console.log('📋 Creando tabla newsletter...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS newsletter (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ Tabla newsletter creada');

    // Verificar
    const tablesRes = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    console.log('\n📋 Tablas en la base de datos:');
    tablesRes.rows.forEach(r => console.log(`   ✅ ${r.table_name}`));

    console.log('\n🎉 Migración de schema completada!');

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await client.end();
  }
}

createTables();
