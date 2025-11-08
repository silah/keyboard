import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const DATA_DIR = path.join(__dirname, '../../data')
const DB_PATH = path.join(DATA_DIR, 'keyboard.db')
const SCHEMA_PATH = path.join(__dirname, 'schema.sql')

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

// Initialize database
const db: Database.Database = new Database(DB_PATH)

// Enable foreign keys
db.pragma('foreign_keys = ON')

// Initialize schema
const schema = fs.readFileSync(SCHEMA_PATH, 'utf8')
db.exec(schema)

console.log('✅ Database initialized at:', DB_PATH)

export default db
