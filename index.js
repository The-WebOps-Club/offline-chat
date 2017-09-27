var express =  require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

users = [];
connections = [];

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
  });

  //send messages
  socket.on('send message',function(data){
    io.sockets.emit('new message',{msg: data, user: socket.username});
  });

  //send username
  socket.on('new user',function(data, callback){
    callback(true);
    socket.username = data;
    users.push(socket.username);
    updateUsernames();

  });

});

function updateUsernames(){
  io.sockets.emit('get users',users);
}


