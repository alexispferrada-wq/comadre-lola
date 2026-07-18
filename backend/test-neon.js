// Script de prueba de conexión a Neon PostgreSQL
const { Client } = require('pg');

const connectionString = 'postgresql://neondb_owner:npg_bdBCjvnx4gk2@ep-little-thunder-at81mbhn-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function testConnection() {
  const client = new Client({ connectionString });
  
  try {
    console.log('🔄 Conectando a Neon PostgreSQL...');
    await client.connect();
    console.log('✅ Conexión exitosa!\n');

    // Info del servidor
    const versionRes = await client.query('SELECT version()');
    console.log('📦 Versión:', versionRes.rows[0].version);

    // Base de datos actual
    const dbRes = await client.query('SELECT current_database(), current_user');
    console.log('🗄️  Base de datos:', dbRes.rows[0].current_database);
    console.log('👤 Usuario:', dbRes.rows[0].current_user);

    // Listar tablas existentes
    const tablesRes = await client.query(`
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
      ORDER BY table_schema, table_name
    `);
    
    console.log(`\n📋 Tablas encontradas (${tablesRes.rows.length}):`);
    if (tablesRes.rows.length === 0) {
      console.log('   (ninguna — base de datos vacía)');
    } else {
      tablesRes.rows.forEach(row => {
        console.log(`   ${row.table_schema}.${row.table_name}`);
      });
    }

    // Si hay tablas, mostrar estructura de cada una
    for (const row of tablesRes.rows) {
      const colsRes = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = $1 AND table_name = $2
        ORDER BY ordinal_position
      `, [row.table_schema, row.table_name]);
      
      console.log(`\n🔍 Estructura de ${row.table_schema}.${row.table_name}:`);
      colsRes.rows.forEach(col => {
        const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
        const def = col.column_default ? ` DEFAULT ${col.column_default}` : '';
        console.log(`   ${col.column_name} (${col.data_type}) ${nullable}${def}`);
      });

      // Contar registros
      const countRes = await client.query(`SELECT COUNT(*) FROM "${row.table_schema}"."${row.table_name}"`);
      console.log(`   → ${countRes.rows[0].count} registros`);
    }

  } catch (err) {
    console.error('❌ Error de conexión:', err.message);
  } finally {
    await client.end();
    console.log('\n🔌 Conexión cerrada.');
  }
}

testConnection();
