var express =  require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

users = [];
TempUsers = [];
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
      users[socket.id]=null;
      TempUsers.splice(TempUsers.indexOf(socket.username),1);
      updateUsernames(socket.room);
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
      // io.sockets.emit('new message',{msg: data, user: socket.username});
    }
 
  });

  //joining room entered by user
  socket.on('setRoom',function(data){
    socket.room = data;
    socket.join(data);
    console.log(socket.username+" joined " +data+" room");
    updateRooms(socket,socket.username,socket.room);

  })
  
  //send username
  socket.on('new user',function(data, callback){
    callback(true);
    socket.username = data;
    users[socket.id] = (socket.username);
    TempUsers.push(socket.username);
    updateUsernames(socket.room);
  });

  socket.on('switchRoom', function(newroom){
    socket.leave(socket.room);
    var oldroom = socket.room;
    socket.join(newroom);
    // sent message to OLD room
    socket.broadcast.to(oldroom).emit('new message',{msg: socket.username+' has left this room', user: 'SERVER'});
    io.of('/').in(oldroom).clients(function(error,clients){
          var room_members = [];
                for(var i in clients){
                      if(users[clients[i]]!=null)
                        room_members.push(users[clients[i]]);
                }
          console.log(room_members+"After left");      
          socket.broadcast.to(oldroom).emit('get users',room_members);
    });
    // update socket session room title
    socket.room = newroom;
    updateRooms(socket,socket.username,newroom);
  });

});

function updateRooms(socket,username,room){
    var members = io.sockets.adapter.rooms[room];
    console.log(members.length+" members are in"+room);
    io.of('/').in(room).clients(function(error,clients){
          var room_members = [];
                for(var i in clients){
                      if(users[clients[i]]!=null)
                        room_members.push(users[clients[i]]);
                }
          console.log(room_members+" List of members in "+ room);
          socket.broadcast.to(room).emit('new message',{msg: "'"+username+"'" + ' joined the room!',user: "SERVER"});
          socket.emit('connectToRoom', {msg:"You successfully joined: "+room+"!", income_msg:"Hey, Welcome to "+room+"!", user: "SERVER", room: room });
          io.sockets.in(room).emit('get users',room_members);
    });
}

function updateUsernames(room){
  if(room!=null)
    io.sockets.in(room).emit('get users',TempUsers);
}
