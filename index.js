var express =  require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

users = [];
connections = [];

// rooms which are currently available in chat
var rooms = ['room1','room2','room3'];

server.listen(3000, function(){
  console.log('listening on *:3000');
});

io.sockets.on('connection', function(socket){
  connections.push(socket);
  console.log('Connections: %s sockets connected',connections.length);
  //Disconnect
  socket.on('disconnect', function(data){

    if(socket.username){
      users.splice(users.indexOf(socket.username),1);
      updateUsernames();
    }
    connections.splice(connections.indexOf(socket),1);
    console.log('Disconnected: %s sockets connected',connections.length);

    socket.broadcast.emit('new message',{msg: socket.username+' has disconnected', user: 'SERVER'});
    socket.leave(socket.room);
  });

  //send messages
  socket.on('send message',function(data){
    io.sockets.in(socket.room).emit('new message',{msg: data, user: socket.username});
  });

  //send username
  socket.on('new user',function(data, callback){
    callback(true);
    socket.username = data;
    users.push(socket.username);
    updateUsernames();

    socket.room = 'room1';
    socket.join('room1');
    socket.emit('updatechat', 'SERVER', 'connected to room1');
    socket.broadcast.to('room1').emit('updatechat', 'SERVER', username + ' has connected to this room');
    socket.emit('updaterooms', rooms, 'room1');
  });

  socket.on('switchRoom', function(newroom){
    socket.leave(socket.room);
    socket.join(newroom);
    socket.emit('updatechat', 'SERVER', 'connected to '+ newroom);
    // sent message to OLD room
    socket.broadcast.to(socket.room).emit('new message',{msg: socket.username+' has left this room', user: 'SERVER'});
    // update socket session room title
    socket.room = newroom;
    socket.broadcast.to(newroom).emit('new message',{msg: socket.username+' has joined this room', user: 'SERVER'});
    socket.emit('updaterooms', rooms, newroom);
  });

});

function updateUsernames(){
  io.sockets.emit('get users',users);
}
