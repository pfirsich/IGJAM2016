var startingX, startingY;
var lastX = 0, lastY = 0;

var socket = io('http://127.0.0.1:9999');

$(window).keypress(function(e) {
  if (e.keyCode == 0 || e.keyCode == 32) {
    startingX = lastX;
    startingY = lastY;
  }
});

Number.prototype.map = function (in_min, in_max, out_min, out_max) {
  return (this - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}

socket.on('x', function (arr) {

  // console.log(arr.length)

  for (var i = 0; i < arr.length; i++) {

    var player = window.players[i];
    var split = arr[i].split(",");

    var rX = parseFloat(split[2])
    var rY = parseFloat(split[3])

    if (!player.initialFacePosition[0]) {
      player.initialFacePosition = [rX,rY];
    } else {
      player.maskMesh.rotation.y = (Math.PI/180) * 70 * rY;
      player.maskMesh.rotation.x = (Math.PI/180) * 70 * rX;

      // player.controller.moveY.state = rX.map(-0.3,0.1,1,-1)
      // player.controller.moveX.state = rY.map(-0.2,0.2,1,-1)

      // console.log(player.initialFacePosition[0])

      player.controller.moveY.state = rX.map(
        player.initialFacePosition[0] - 0.5,
        player.initialFacePosition[0] + 0.5,
        1,-1)
      player.controller.moveX.state = rY.map(
        player.initialFacePosition[1] - 0.5,
        player.initialFacePosition[1] + 0.5,
        1,-1)
    }

    player.maskMaterial.opacity = 1;


    // if (rX < -0.3) {
    //   console.log('up')
    //   player.controller.moveY.state = 1;
    // } else if (rX > 0.1) {
    //   console.log('down')
    //   player.controller.moveY.state = -1;
    // } else {
    //   // console.log('for up')
    //   player.controller.moveY.state = 0;
    // }

    // // console.log(rY)
    // if (rY < -0.2) {
    //   console.log('left')
    //   player.controller.moveX.state = 1.0;
    // } else if (rY > 0.2) {
    //   console.log('right')
    //   player.controller.moveX.state = -1.0;
    // } else {
    //   // console.log('for side')
    //   player.controller.moveX.state = 0;
    // }

  }

});
