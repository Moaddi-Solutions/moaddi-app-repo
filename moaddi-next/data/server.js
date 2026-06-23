const jsonServer = require('json-server')
const server = jsonServer.create()
server.use('/content', jsonServer.defaults({ static: 'data/public' }), jsonServer.router('data/db.json'));

server.listen(8000, () => {
    console.log('JSON Server is running')
})