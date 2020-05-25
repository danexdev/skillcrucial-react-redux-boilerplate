/* eslint-disable import/no-duplicates */
import express from 'express'
import path from 'path'
import axios from 'axios'

import cors from 'cors'
import bodyParser from 'body-parser'
import sockjs from 'sockjs'

import cookieParser from 'cookie-parser'
import Html from '../client/html'

let connections = []

const port = process.env.PORT || 3000
const server = express()
const { readFile, writeFile, unlink } = require('fs').promises

server.use(cors())

// Nav --- Adding customm header :)
server.use((req, res, next) => {
  res.set('x-skillcrucial-user', 'cddecdd3-7a43-480a-a9d7-118968c97894')
  res.set('Access-Control-Expose-Headers', 'X-SKILLCRUCIAL-USER')
  next()
})

server.use(express.static(path.resolve(__dirname, '../dist/assets')))
server.use(bodyParser.urlencoded({ limit: '50mb', extended: true, parameterLimit: 50000 }))
server.use(bodyParser.json({ limit: '50mb', extended: true }))

server.use(cookieParser())

// Nav --- My block
const readUsersFromFile = async () => {
  return readFile(`${__dirname}/../users.json`, {
    encoding: 'utf8'
  }).then((data) => JSON.parse(data))
}

const writeUsersToFile = async (userData) => {
  writeFile(`${__dirname}/../users.json`, JSON.stringify(userData), { encoding: 'utf8' })
}

server.get('/api/v1/users', async (req, res) => {
  const usersList = await readUsersFromFile()
    .then((users) => users)
    .catch(async () => {
      const { data } = await axios('https://jsonplaceholder.typicode.com/users')
      await writeUsersToFile(data)
      return data
    })
  res.json(usersList)
})

server.post('/api/v1/users/', async (req, res) => {
  // const newUser = req.body
  let usersTmp = await readUsersFromFile()
    .then((users) => users)
    .catch(() => {
      return res.status(404).json('some shit happened...')
    })
  usersTmp = [...usersTmp, { id: usersTmp[usersTmp.length - 1].id + 1, ...req.body }]
  await writeUsersToFile(usersTmp)
  res.json({ status: 'success', id: usersTmp[usersTmp.length - 1].id })
})

server.patch('/api/v1/users/:userId', async (req, res) => {
  const { userId } = req.params
  let usersTmp = await readUsersFromFile()
    .then((users) => users)
    .catch(() => {
      return res.status(404).json('some shit happened...')
    })
  usersTmp = usersTmp.map((it) => {
    return it.id === +userId ? { ...it, ...req.body } : it
  })
  await writeUsersToFile(usersTmp)
  res.json({ status: 'success', id: userId })
})

server.delete('/api/v1/users/:userId', async (req, res) => {
  const { userId } = req.params
  let usersTmp = await readUsersFromFile()
    .then((users) => users)
    .catch(() => {
      return res.status(404).json('some shit')
    })

  const index = usersTmp.findIndex((usersArray) => usersArray.id === +userId)
  usersTmp = usersTmp.filter((item, ind) => ind !== index)
  await writeUsersToFile(usersTmp)
  res.json({ status: 'success', id: userId })
})

server.delete('/api/v1/users/', async (req, res) => {
  unlink(`${__dirname}/../users.json`)
  res.json('---* file deleted *---')
})

// server.get('/api/v1/users', async (req, res) => {
//   const { data: users } = await axios('http://jsonplaceholder.typicode.com/users')
//   res.json(users)
// })

// server.get('/api/v1/users/take/:number', async (req, res) => {
//   const { number } = req.params
//   const { data: users } = await axios('http://jsonplaceholder.typicode.com/users')
//   res.json(users.slice(0, +number))
// })

// server.get('/api/v1/users/:id', async (req, res) => {
//   const { id } = req.params
//   const { data: users } = await axios('http://jsonplaceholder.typicode.com/users')
//   res.json(users[id - 1])
// })

// server.get('/api/v1/users/:name', (req, res) => {
//   const { name } = req.params
//   res.json({ name })
// })

// Nav --- end of my block

server.use('/api/', (req, res) => {
  res.status(404)
  res.end()
})

const echo = sockjs.createServer()
echo.on('connection', (conn) => {
  connections.push(conn)
  conn.on('data', async () => {})

  conn.on('close', () => {
    connections = connections.filter((c) => c.readyState !== 3)
  })
})

server.get('/', (req, res) => {
  // const body = renderToString(<Root />);
  const title = 'Server side Rendering'
  res.send(
    Html({
      body: '',
      title
    })
  )
})

server.get('/*', (req, res) => {
  const initialState = {
    location: req.url
  }

  return res.send(
    Html({
      body: '',
      initialState
    })
  )
})

const app = server.listen(port)

echo.installHandlers(app, { prefix: '/ws' })

// eslint-disable-next-line no-console
console.log(`Serving at http://localhost:${port}`)
