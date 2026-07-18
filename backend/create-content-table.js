const { Client } = require('pg');
const connectionString = 'postgresql://neondb_owner:npg_bdBCjvnx4gk2@ep-little-thunder-at81mbhn-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function run() {
  const client = new Client({ connectionString });
  await client.connect();
  console.log('✅ Conectado');

  await client.query(`
    CREATE TABLE IF NOT EXISTS site_content (
      id SERIAL PRIMARY KEY,
      key VARCHAR(100) NOT NULL UNIQUE,
      data JSONB NOT NULL DEFAULT '{}',
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log('✅ Tabla site_content creada');

  await client.query(`INSERT INTO site_content (key, data) VALUES ('live', '{}') ON CONFLICT (key) DO NOTHING`);
  console.log('✅ Fila default insertada');

  await client.end();
}
run().catch(e => console.error('❌', e.message));
