var keyboard = new THREEx.KeyboardState();

function Input(stateCallback) {
    this.stateCallback = stateCallback;
    this.state = 0;
}

Input.prototype.update = function() {
    this.lastState = this.state;
    this.state = this.stateCallback();
    this.pressed = this.state > this.lastState;
    this.released = this.state < this.lastState;
}

Input.getAxisInputFromKeyboard = function(positive, negative) {
    return new Input(function() {return (keyboard.pressed(positive) ? 1.0 : 0.0) - (keyboard.pressed(negative) ? 1.0 : 0.0)});
}

function KeyboardController(left, right, up, down, shoot) {
    if(typeof(left) == 'undefined') {
        left = "left";
        right = "right";
        up = "up";
        down = "down";
        shoot = "a";
    }
    this.moveX = Input.getAxisInputFromKeyboard(left, right);
    this.moveY = Input.getAxisInputFromKeyboard(up, down);
    this.shoot = new Input(function() {return keyboard.pressed(shoot) ? 1.0 : 0.0});
    this.accelerate = Input.getAxisInputFromKeyboard("d", "f");
}

KeyboardController.prototype.update = function() {
    this.moveX.update();
    this.moveY.update();
    this.shoot.update();
    this.accelerate.update();
}

function FaceController(left, right, up, down, shoot) {
    this.moveX = new Input(function() {return 0});
    this.moveY = new Input(function() {return 0});
    this.shoot = new Input(function() {return keyboard.pressed(left) ? 1.0 : 0.0});
    // this.shoot = new Input(function() {return 1});
    this.accelerate = new Input(function() {return 0});
}

FaceController.prototype.update = function() {
    // this.moveX.update();
    // this.moveY.update();
    this.shoot.update();
    this.accelerate.update();
}

function DummyController() {
    this.moveX = new Input(function(){return 0;});
    this.moveY = new Input(function(){return 0;});
    this.shoot = new Input(function(){return 0;});
    this.accelerate = new Input(function(){return 0;});
}

DummyController.prototype.update = function() {}

function GamepadController(gamepad) {
    this.moveX = new Input(function(){return -gamepad.axes[0]});
    this.moveY = new Input(function(){return gamepad.axes[1]});
    this.shoot = new Input(function(){return gamepad.buttons[0].pressed;});
    this.accelerate = new Input(function(){return 0;});
}

GamepadController.prototype.update = function() {
    this.moveX.update();
    this.moveY.update();
    this.shoot.update();
    this.accelerate.update();
}

//game pad registration, etc.

var haveEvents = 'ongamepadconnected' in window;
console.log(haveEvents);
var connectedGamepads = {};

function connecthandler(e) {
    addgamepad(e.gamepad);
}

function updatePlayerControllers(){
    var curPlayerId = 0;
    for (i in connectedGamepads) {
        var gamepad = connectedGamepads[i];
        if (curPlayerId >= players.length)
            break;
        players[curPlayerId].controller = new GamepadController(gamepad);
        curPlayerId++;
    }
}

function addgamepad(gamepad) {
    connectedGamepads[gamepad.index] = gamepad;
    updatePlayerControllers();
    console.log("gamepad " + gamepad.index + " connected")
}

function disconnecthandler(e) {
    removegamepad(e.gamepad);
}

function removegamepad(gamepad) {
    delete connectedGamepads[gamepad.index];
    console.log("gamepad " + gamepad.index + " disconnected")
    //updatePlayerCotrollers(); do this ?
}


function scangamepads() {
    //console.log("scan");
    var gamepads = navigator.getGamepads ? navigator.getGamepads() : (navigator.webkitGetGamepads ? navigator.webkitGetGamepads() : []);
    for (var i = 0; i < gamepads.length; i++) {
        if (gamepads[i]) {
            if (gamepads[i].index in connectedGamepads) {
                connectedGamepads[gamepads[i].index] = gamepads[i];
            } else {
                addgamepad(gamepads[i]);
            }
        }
    }
}


window.addEventListener("gamepadconnected", connecthandler);
window.addEventListener("gamepaddisconnected", disconnecthandler);

/*
if (!haveEvents) {
    setInterval(scangamepads, 500);
}*/

