import cors from 'cors'

const corsOptions = {
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  credentials: true,
}

const corsMiddleware = cors(corsOptions)

export default corsMiddleware
