const { Client } = require('pg');
const fs = require('fs');

async function run() {
  const client = new Client({
    host: '127.0.0.1',
    port: 5439,
    user: 'postgres',
    password: 'postgrespassword',
    database: 'proregis',
  });

  const output = {};

  try {
    await client.connect();
    output.status = "CONNECTED";
    
    const res = await client.query('SELECT "itemCode", length("imageBase64") as img_len FROM products_metadata WHERE "imageBase64" IS NOT NULL AND "imageBase64" != \'\';');
    output.metadata_records = res.rows;

    const poRes = await client.query('SELECT "itemCode", "itemName", "docNum" FROM production_orders LIMIT 10;');
    output.po_sample = poRes.rows;

    const regRes = await client.query('SELECT "docNum", "phone" FROM registrations LIMIT 10;');
    output.registrations = regRes.rows;

  } catch (err) {
    output.error = err.message;
  } finally {
    await client.end();
    fs.writeFileSync('C:\\Users\\Chaiwat.N\\.gemini\\antigravity-ide\\brain\\79c3c519-8cd3-40bd-9598-573c45602d2a\\db_output.json', JSON.stringify(output, null, 2));
  }
}

run();
