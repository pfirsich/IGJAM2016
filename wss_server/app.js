// Load the TCP Library
net = require('net');

var io = require('socket.io')(9999);

var clients = [];

// Start a TCP on 127.0.0.1:9999 to receive messages from C++
net.createServer(function (socket) {

  console.log("TCP receiver started")

  // Start a socket.io server (127.0.0.1:8888) to push messages to Three.js
  io.on('connection', function (iosocket) {

      console.log("THREE.js connected")

      // Identify this client
      socket.name = socket.remoteAddress + ":" + socket.remotePort

      // Put this new client in the list
      clients.push(socket);

      console.log(socket.name);

      // Handle incoming messages from clients.
      socket.on('data', function (data) {

        // split received data, remove empty elements in aray, order based on X coordinates
        var arr = data.toString('utf8').split("|").filter(function(e){return e}).sort().reverse();
        // console.log(arr);

        // push formatted array to THREE.js
        io.emit('x', arr);
      });

      // Remove the client from the list when it leaves
      socket.on('end', function () {
        clients.splice(clients.indexOf(socket), 1);
      });

  });
}).listen(8888);


// Put a friendly message on the terminal of the server.
console.log("Socket server running on port 8888\n");
