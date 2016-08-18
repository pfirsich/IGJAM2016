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

function KeyboardController(left, right, up, down) {
    this.moveX = Input.getAxisInputFromKeyboard(left, right);
    this.moveY = Input.getAxisInputFromKeyboard(up, down);
    this.shoot = new Input(function() {return keyboard.pressed("a") ? 1.0 : 0.0});
}

KeyboardController.prototype.update = function() {
    this.moveX.update();
    this.moveY.update();
    this.shoot.update();
}