import express from 'express'
import corsMiddleware from './middleware/corsMiddleware.js'
import dotenv from 'dotenv'
import router from './src/routes/index.js'
import morgan from 'morgan'
import './config/db.js'
import { iniciarCronIntervaloFijo } from './src/jobs/reponerInventarioJob.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

app.use(express.json())
app.use(morgan('dev'))
app.use(corsMiddleware)

// Ruta raíz
app.use('/api', router)

const revisionHora = process.env.REVISION_HORA_CRON || '0 4 * * *';

if (revisionHora) {
  iniciarCronIntervaloFijo(revisionHora);
}

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`)
})
