// Lots of this code is taken from http://www.html5rocks.com/en/tutorials/doodles/gamepad/


// Emitter stolen from https://raw.github.com/creationix/eventemitter-browser/

(function (window, document) {
  "use strict";

  function EventEmitter() {}

  EventEmitter.prototype.on = function (name, callback) {
    if (!this.hasOwnProperty("_handlers")) {
      this._handlers = {};
    }
    var handlers = this._handlers;
    if (!handlers.hasOwnProperty(name)) {
      handlers[name] = [];
    }
    var list = handlers[name];
    list.push(callback);
  };

  EventEmitter.prototype.addListener = EventEmitter.prototype.on;

  EventEmitter.prototype.once = function (name, callback) {
    var remove = function () {
      this.off(name, callback);
      this.off(name, remove);
    };

    this.on(name, callback);
    this.on(name, remove);
  };

  EventEmitter.prototype.emit = function (name /*, args...*/ ) {
    console.log('emitting', arguments);
    if (!this.hasOwnProperty("_handlers")) {
      return;
    }
    var handlers = this._handlers;
    if (!handlers.hasOwnProperty(name)) {
      return;
    }
    var list = handlers[name];
    var args = Array.prototype.slice.call(arguments, 1);
    for (var i = 0, l = list.length; i < l; i++) {
      if (!list[i]) {
        continue;
      }
      list[i].apply(this, args);
    }
  };

  EventEmitter.prototype.off = function (name, callback) {
    if (!this.hasOwnProperty("_handlers")) {
      return;
    }
    var handlers = this._handlers;
    if (!handlers.hasOwnProperty(name)) {
      return;
    }
    var list = handlers[name];
    var index = list.indexOf(callback);
    if (index < 0) {
      return;
    }
    list[index] = false;
    if (index === list.length - 1) {
      while (index >= 0 && !list[index]) {
        list.length--;
        index--;
      }
    }
  };

  EventEmitter.prototype.removeListener = EventEmitter.prototype.off;


  // util#inherits from nodejs core https://github.com/joyent/node/blob/master/lib/util.js#L553

  var inherits = function (ctor, superCtor) {
    ctor.super_ = superCtor;
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };

  // This works in chrome but your gamepad must be plugged in when you open chrome
  var GamepadEmitter = function (opt) {
    this.gamepad = null;
    this.previousRead = {};

    // bind the read loop
    this.loop = this.loop.bind(this);

    // On chrome you poll
    if (navigator.webkitGetGamepads) {
      this.pollForDevice = this.pollForDevice.bind(this);
      this.pollForDevice();
    } else {
      // On firefox we have an event
      window.addEventListener('MozGamepadConnected', this.waitForDevice.bind(this));
    }
  };

  inherits(GamepadEmitter, EventEmitter);

  GamepadEmitter.prototype.pollForDevice = function () {
    this.gamepad = navigator.webkitGetGamepads()[0];
    if (this.gamepad) {
      return this.ready();
    }
    requestAnimationFrame(this.pollForDevice);
  };

  GamepadEmitter.prototype.waitForDevice = function (e) {
    this.gamepad = e.gamepad;
    if (this.gamepad) {
      this.ready();
    }
  };

  GamepadEmitter.prototype.ready = function () {
    this.emit('ready', this.gamepad);
    this.loop();
  };

  GamepadEmitter.prototype.disconnect = function () {
    this.previousRead = {};
    this.emit('disconnect');
  };

  GamepadEmitter.prototype.loop = function () {
    // Chrome needs you to call getGamepadsevery time, firefox doesn't not afaik
    if (navigator.webkitGetGamepads) {
      var gamepad2 = navigator.webkitGetGamepads()[0];
      // probably a disconnect event
      if (!gamepad2) {
        return this.disconnect();
      }
    }

    window.requestAnimationFrame(this.loop);

    var gamepad = this.gamepad;
    var previousRead = this.previousRead;

    // Skip if no updates
    if (gamepad.timestamp && gamepad.timestamp === previousRead.timestamp) {
      return;
    }

    previousRead.timestamp = gamepad.timestamp;

    gamepad.buttons.forEach(function (button, index) {
      var id = 'button-' + index;
      if (previousRead[id] !== button) {
        this.emit(id, button);
      }
      previousRead[id] = button;
    }, this);

    gamepad.axes.forEach(function (axes, index) {
      var id = 'axes-' + index;
      if (previousRead[id] !== axes) {
        this.emit(id, axes);
      }
      previousRead[id] = axes;
    }, this);

    this.gamepad = gamepad;
  };

  window.GamepadEmitter = GamepadEmitter;

}(window, document));
