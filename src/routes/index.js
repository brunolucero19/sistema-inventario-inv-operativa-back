import express from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
const router = express.Router()

// __dirname equivalente en ES Modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const PATH_ROUTES = __dirname

const removeExtension = (fileName) => {
  return fileName.split('.').shift() // split separa el nombre del archivo por el punto y shift devuelve el primer elemento del array
}

// Cargar todas las rutas dinámicamente excepto "index.js"
const files = fs.readdirSync(PATH_ROUTES)

for (const file of files) {
  const name = removeExtension(file)

  if (name !== 'index') {
    const modulePath = path.join(PATH_ROUTES, file)

    const routeModule = await import(`file://${modulePath}`)
    router.use(`/${name}`, routeModule.default)
  }
}

export default router
