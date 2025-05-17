import express from 'express'
import corsMiddleware from './middleware/corsMiddleware.js'
import dotenv from 'dotenv'
import router from './src/routes/index.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

app.use(express.json())
app.use(corsMiddleware)

// Ruta raíz
app.use('/api', router)

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`)
})
