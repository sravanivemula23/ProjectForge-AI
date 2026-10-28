import mongoose from 'mongoose'
import { env } from './env.js'

let memoryServer = null

export async function connectDb(uri = env.mongoUri) {
  mongoose.set('strictQuery', true)
  if (uri === 'memory') {
    const { MongoMemoryServer } = await import('mongodb-memory-server')
    memoryServer = await MongoMemoryServer.create()
    uri = memoryServer.getUri('projectforge')
    console.log('[db] using in-memory MongoDB (data is lost on exit; Vector Search unavailable)')
  }
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 })
  return mongoose.connection
}

export async function disconnectDb() {
  await mongoose.disconnect()
  if (memoryServer) await memoryServer.stop()
}
