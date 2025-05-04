import express from 'express'
import pool from './config/db.js'
import corsMiddleware from './middleware/corsMiddleware.js'
import dotenv from 'dotenv'
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

app.use(express.json())
app.use(corsMiddleware)

// Ruta raíz
app.get('/', (req, res) => {
  res.send({ message: 'Conexión exitosa a la API' })
})

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`)
})
