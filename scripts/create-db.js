const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const dbName = process.env.DB_NAME;
const dbUser = process.env.DB_USER;
const dbPassword = process.env.DB_PASSWORD;
const dbHost = process.env.DB_HOST;
const dbPort = process.env.DB_PORT;

const client = new Client({
    host: dbHost,
    port: dbPort,
    user: dbUser,
    password: dbPassword,
    database: 'postgres'
});

async function createDatabase() {
    try {
        await client.connect();
        
        // Check if database exists
        const res = await client.query(
            `SELECT 1 FROM pg_database WHERE datname = $1`,
            [dbName]
        );
        
        if (res.rowCount === 0) {
            await client.query(`CREATE DATABASE ${dbName}`);
            console.log(`✅ Database "${dbName}" created successfully`);
        } else {
            console.log(`ℹ️ Database "${dbName}" already exists`);
        }
        
        await client.end();
    } catch (error) {
        console.error('❌ Error creating database:', error);
        process.exit(1);
    }
}

createDatabase();