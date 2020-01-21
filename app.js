let express = require("express");
let app = express();
let server = require("http").createServer(app);

let io = require("socket.io")(server);
let redis = require("redis");
let redisClient = redis.createClient(
  process.env.REDIS_PORT,
  process.env.REDIS_HOST
);

var storeMessage = (name, data) => {
  let message = JSON.stringify({ name: name, data: data });
  redisClient.lpush("messageData", message, (err, response) => {
    redisClient.ltrim("messageData", 0, 19);
  });
  /* messagesData.push({ name: name, data: data });
  if (messagesData.length > 20) {
    messagesData.shift();} */
};

//listening to connections
io.sockets.on("connection", function(client) {
  client.on("join", function(name) {
    //set the nickname associated with this client
    client.nickname = name;
    if (name != null) {
      console.log(name + " joined the chat");
      client.broadcast.emit("chat", name + " joined the chat");
    }
    redisClient.lrange("messageData", 0, -1, (err, messages) => {
      messages = messages.reverse();
      messages.map(v => {
        v = JSON.parse(v);
        client.emit("messages", v.name + " : " + v.data);
      });
    });
  });

  client.on("messages", function(data) {
    //GET the nickname of this client before broadcasting message
    var nickname = client.nickname;
    console.log(nickname);
    //broadcasting 'messages' event to all client EXCEPT our client
    client.broadcast.emit("messages", nickname + ": " + data);
    //emit 'messages' event to our client only
    client.emit("messages", nickname + ": " + data);
    console.log(nickname + " said: " + data);
    storeMessage(nickname, data);
  });
});

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});
var Port = process.env.PORT || 8000;

server.listen(Port, () => {
  console.log("Server listening on " + Port);
});
