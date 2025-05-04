import pkg from 'pg'
const { Pool } = pkg

import dotenv from 'dotenv'
dotenv.config()

const { DATABASE_URL } = process.env

const pool = new Pool({
  connectionString: DATABASE_URL,
})

pool
  .connect()
  .then((client) => {
    console.log('Conectado a la base de datos PostgreSQL')
    client.release()
  })
  .catch((err) => {
    console.error('Error al conectar con la base de datos:', err.stack)
  })

export default pool
