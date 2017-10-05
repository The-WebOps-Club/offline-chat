var express =  require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

users = [];
connections = [];
messages = ["Chat room Started"];
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

    if(socket.room){
      socket.broadcast.to(socket.room).emit('new message',{msg: socket.username+' has left the room', user: 'SERVER'});
      socket.leave(socket.room);
    }
    
  });

  //send messages
  socket.on('send message',function(data){
    if(socket.room){
      io.sockets.in(socket.room).emit('new message',{msg: data, user: socket.username});      
    }else{
      io.sockets.emit('new message',{msg: data, user: socket.username});
    }
 
  });

  //joining room entered by user
  socket.on('setRoom',function(data){
    socket.room = data;
    socket.join(data);
    console.log(socket.username+" joined " +data+" room");
    var joined = "'"+socket.username+"'" + ' joined the room!';
    var members = io.sockets.adapter.rooms[data];
    console.log(members.length);
    var otherUsers = [];
    var room_members = [];

    // io.of('/').in(data).clients(function(error,clients){
    // var otherUsers = [];
    //             for(var i in clients){
    //                     if(socket.id != clients[i]) otherUsers.push(io.sockets.connected[clients[i]]);
    //             }
    //             console.log(otherUsers);
    //             // var userSummary = 'Users Currently in ' + room + ' are : ' + otherUsers.join(', ') + '.';
    //             // socket.emit('message',{text:userSummary});
    // });
    // members.forEach(function(client) {
    //   console.log('Username: ' + client.username);
    // });
    io.sockets.in(socket.room).emit('new message',{msg:joined,user: "SERVER"});
    socket.emit('connectToRoom', {msg:"You successfully joined: "+socket.room+"!", income_msg:"Hey, Welcome to "+socket.room+"!", user: "SERVER", room: socket.room, members: this.otherUsers});
  })
  
  //send username
  socket.on('new user',function(data, callback){
    callback(true);
    socket.username = data;
    users.push(socket.username);
    updateUsernames();
  });

  socket.on('switchRoom', function(newroom){
    socket.leave(socket.room);
    socket.join(newroom);
    // sent message to OLD room
    socket.broadcast.to(socket.room).emit('new message',{msg: socket.username+' has left this room', user: 'SERVER'});
    // update socket session room title
    socket.room = newroom;
    socket.broadcast.to(newroom).emit('new message',{msg: socket.username+' has joined this room', user: 'SERVER'});
    socket.emit('connectToRoom', {msg:"You successfully joined: "+socket.room+"!", income_msg:"Hey, Welcome to "+socket.room+"!", user: "SERVER", room: socket.room});
  });

});

function updateUsernames(){
  io.sockets.emit('get users',users);
}
