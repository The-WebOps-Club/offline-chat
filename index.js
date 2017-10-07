var express =  require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

queue = [];
users = [];
TempUsers = [];
connections = [];
messages = ["Chat room Started"];
var private_chat="private_chat";
var group_chat = "group_chat";
var gen = "gen";
// rooms which are currently available in chat

server.listen(3000, function(){
  console.log('listening on *:3000');
});

io.sockets.on('connection', function(socket){
  queue.push(socket);
  connections.push(socket);
  console.log('Connections: %s sockets connected',connections.length);
  //Disconnect
  socket.on('disconnect', function(data){

    if(socket.username){
      users[socket.id]=null;
      TempUsers.splice(TempUsers.indexOf(socket.username),1);
      updateUsernames(socket.room);
    }
    
    if(socket.room!=null){
        if(socket.chatStatus===private_chat){
            if(socket.room!=null){
              socket.leave(socket.room);
              var oldroom = socket.room;
              var members=["You"];
              socket.broadcast.to(oldroom).emit('get users',members);
              socket.broadcast.to(oldroom).emit('new message',{msg:"stranger left the chat", user:"SERVER"});
              socket.broadcast.to(oldroom).emit('ChatEnded',{msg: "stranger Ended the chat",user: "SERVER"});
            }
        }else{
            socket.broadcast.to(socket.room).emit('new message',{msg: socket.username+' has left the room', user: 'SERVER'});
            var oldroom = socket.room;
            socket.leave(socket.room);
            io.of('/').in(oldroom).clients(function(error,clients){
                  var room_members = [];
                        for(var i in clients){
                              if(users[clients[i]]!=null)
                                room_members.push(users[clients[i]]);
                        }
                  console.log(room_members+"After left");      
                  socket.broadcast.to(oldroom).emit('get users',room_members);
            });
        }
    }

    connections.splice(connections.indexOf(socket),1);
    queue.splice(connections.indexOf(socket),1);
    console.log('Disconnected: %s sockets connected',connections.length);

  });

  //send messages
  socket.on('send message',function(data){
    if(socket.room){
      if(socket.chatStatus===private_chat)
        io.sockets.in(socket.room).emit('new message',{msg: data, user: socket.username, status: private_chat});  
      else
        io.sockets.in(socket.room).emit('new message',{msg: data, user: socket.username, status: group_chat});  
    }else{
      // alert('Not connected to anyone yet!,please wait');
      // io.sockets.emit('new message',{msg: data, user: socket.username});
    }
  });

  //joining room entered by user
  socket.on('setRoom',function(data){
    
    socket.chatStatus = group_chat;
    queue.splice(queue.indexOf(socket),1,socket);         
    socket.room = data;
    socket.join(data);
    console.log(socket.username+" joined " +data+" room");
    updateRooms(socket,socket.username,socket.room);
  })
  
  //send username
  socket.on('new user',function(data, callback){
    if(data in TempUsers){
      callback(false);
      socket.emit('same username',"**Username already taken");
    }
    else
      callback(true);
    socket.username = data;
    socket.chatStatus = gen;
    users[socket.id] = (socket.username);
    TempUsers.push(socket.username);
    updateUsernames(socket.room);
    // findPeerForLoneSocket(socket);
  });

  socket.on('start chat',function(data){
    if(data){
      socket.chatStatus = private_chat;
      queue.splice(queue.indexOf(socket),1);
      queue.push(socket);     
      findPeerForLoneSocket(socket);
    }
  });

  socket.on('leave chat',function(data){
    if(data){
      socket.chatStatus = gen;      
      if(socket.room!=null){
        socket.leave(socket.room);
        var oldroom = socket.room;
        var members=["You"];
        socket.broadcast.to(oldroom).emit('get users',members);
        socket.broadcast.to(oldroom).emit('new message',{msg:"stranger left the chat", user:"SERVER"});
        socket.broadcast.to(oldroom).emit('ChatEnded',{msg: "stranger Ended the chat",user: "SERVER"});
      }
      queue.push(socket);
    }
  });

  socket.on('LeaveRoom',function(data){
    if(data){
      socket.leave(socket.room);
      var oldroom = socket.room;
      socket.chatStatus = gen;
      // queue.splice(queue.indexOf(socket),1);
      // queue.push(socket);       
      socket.broadcast.to(oldroom).emit('new message',{msg: socket.username+' has left this room', user: 'SERVER', status: group_chat});
      io.of('/').in(oldroom).clients(function(error,clients){
            var room_members = [];
                  for(var i in clients){
                        if(users[clients[i]]!=null)
                          room_members.push(users[clients[i]]);
                  }
            console.log(room_members+"After left");      
            socket.broadcast.to(oldroom).emit('get users',room_members);
      });
    }
  });


  socket.on('switchRoom', function(newroom){
    socket.leave(socket.room);
    var oldroom = socket.room;
    socket.chatStatus = gen;
    socket.join(newroom);
    socket.chatStatus = group_chat;
    // queue.splice(queue.indexOf(socket),1);
    // queue.push(socket); 
    // sent message to OLD room
    socket.broadcast.to(oldroom).emit('new message',{msg: socket.username+' has left this room', user: 'SERVER', status: group_chat});
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

function findPeerForLoneSocket(socket) {
    // this is place for possibly some extensive logic
    // which can involve preventing two people pairing multiple times
    queue.splice(queue.indexOf(socket),1);
    console.log(queue);
    if (queue.length!=0) {
        // somebody is in queue, pair them!
          var peer = queue.pop();

          if(peer.chatStatus===private_chat){
            console.log("pairing");
            if(peer.id!=null){
              var room = socket.id + '#' + peer.id;
              // join them both
              peer.join(room);
              socket.join(room);
              socket.room = room;
              peer.room = room;        
              var Invite_msg = "Hey ,You are connected to a stranger!";
              // start the chat
              io.sockets.in(room).emit('new message',{msg: Invite_msg, user: "SERVER",status: gen });      

              // var members = [users[socket.id],users[peer.id]];
              var members = ["You",'stranger'];
              console.log(members+"Connected stranger");
              // peer.emit('new message',{msg: Invite_msg, user: "SERVER"} );
              // socket.emit('new message', {name: users[peer.id], msg: Invite_msg, room:room});
              io.sockets.in(room).emit('get users',members);
            }
          }else{
            console.log("No users online "+queue.length);
            var members = ["You"];
            socket.emit('get users',members);
            socket.emit('new message',{msg:"Sorry, there are no users online now!,Please wait", user:"SERVER", status: gen});
            queue.push(socket);
          }

    }else {
        // queue is empty, add our lone socket
        console.log("No users online");
        var members = ["You"];
        socket.emit('get users',members);
        socket.emit('new message',{msg:"Sorry, there are no users online now!,Please wait", user:"SERVER", status: gen});
        queue.push(socket);
    }
}

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
          socket.broadcast.to(room).emit('new message',{msg: "'"+username+"'" + ' joined the room!',user: "SERVER", status: group_chat});
          socket.emit('connectToRoom', {msg:"You successfully joined: "+room+"!", income_msg:"Hey, Welcome to "+room+"!", user: "SERVER", room: room });
          io.sockets.in(room).emit('get users',room_members);
    });
}

function updateUsernames(room){
  if(room!=null)
    io.sockets.in(room).emit('get users',TempUsers);
}
