import { networkInterfaces } from 'os';
import express from 'express'
import {createServer} from 'http'
import { Server as SocketIOServer} from 'socket.io'
import {existsSync, readFileSync, writeFile, writeFileSync} from 'fs'



const port = 3000;
const address  = networkInterfaces()['en1'][1].address

const serverExpress = express();
const httpServer = createServer(serverExpress);
const socketServer = new SocketIOServer(httpServer);

serverExpress.use(express.static('public'))

if (!existsSync('./messages.json')){
    writeFileSync('./messages.json', '[]')
}

const messages = JSON.parse(readFileSync('./messages.json'));

function sendMessage(socket, message){
    socket.emit('message',{
        ...message,
        isMine:(socket.conn.remoteAddress.replace('::ffff:', '') == message.author)
    })
}

async function broadcastMessage(message){
    const sockets = await socketServer.fetchSockets()

    for(let sock of sockets){
        sendMessage(sock, message)
    }

}

function prettyTime(){
    const time = new Date()

    const hours = time.getHours().toString().padStart(2, '0')
    const minutes = time.getMinutes().toString().padStart(2, '0')
    const seconds = time.getSeconds().toString().padStart(2, '0')

    return `${hours}:${minutes}:${seconds}`;
}

socketServer.on('connection', (socket) =>{
    console.log('Coucou oh une nouvelle personne' + socket.conn.remoteAddress)

    for(let msg of messages){
        sendMessage(socket, msg)
    }

    socket.on('message', (msge)=>{
        console.log('Nouveau message: ' +msge)

        let message ={
            content: msge,
            time: prettyTime(),
            author: socket.conn.remoteAddress.replace('::ffff:', '')
        }
        messages.push(message)
        broadcastMessage(message)
    })
})

httpServer.listen(port, () => {
    console.log(`Listening on ${address}:${port}`);
})


process.on('SIGINT', () =>{
    socketServer.disconnectSockets()
    socketServer.close()
    console.log(messages)
    writeFileSync('./messages.json', JSON.stringify(messages))
    process.exit()
})