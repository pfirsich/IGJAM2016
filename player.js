players = []

var crosshairMaterial = new THREE.MeshBasicMaterial({
    color: 0x00ff00,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.5,
    map: texLoader.load("crosshair.png")
});
var crosshairGeometry = new THREE.PlaneGeometry(50, 50, 1, 1);
var playerGeometry = new THREE.BoxGeometry(200, 200, 200);

var playerColors = [0x1560ff, 0x15ff60, 0xff1560, 0xff8015];

function getViewport(index, number) {
    var w = window.innerWidth, h = window.innerHeight;
    if (number > 4) {
        console.log("No more than 4 players!");
        number = 4;
    }
    if (number == 3) {
        number = 4;
    }
    if (number == 1) {
        return {x: 0, y: 0, width: w, height: h};
    }
    if (number == 2) {
        if (index == 1) {
            return {x: 0, y: 0, width: w, height: h/2};
        } else {
            return {x: 0, y: h/2, width: w, height: h/2};
        }
    }
    if (number == 4) {
        if (index == 1) {
            return {x: 0, y: 0, width: w/2, height: h/2};
        } else if (index == 2) {
            return {x: w/2, y: 0, width: w/2, height: h/2};
        } else if (index == 3) {
            return {x: 0, y: h/2, width: w/2, height: h/2};
        } else if (index == 4) {
            return {x: w/2, y: h/2, width: w/2, height: h/2};
        }
    }
}

function Player(viewportIndex, playerCount, colorIndex, controller) {
    this.material = new THREE.MeshPhongMaterial({
        color: playerColors[colorIndex],
        side: THREE.DoubleSide,
        shading: THREE.FlatShading
    });
    this.mesh = new THREE.Mesh(playerGeometry, this.material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.velocity = new THREE.Vector3(0.0, 0.0, -1.0);
    this.speed = 2000.0;
    this.maxSpeed = 2500.0;
    this.minSpeed = 0.0;
    this.accel = 1000.0;
    this.radius = 100.0;
    this.steerAccel = this.speed * 1.5;
    this.cameraMinDistance = this.radius * 7.0;
    this.cameraDistance = this.radius * 10.0;
    this.cameraApproachSpeed = 1.0;
    this.focusPointDistance = this.speed;
    this.focusPointMaxDistance = this.speed * 10.0;
    this.velocity.multiplyScalar(this.speed);
    this.nextShot = clock.getElapsedTime();
    this.shotInterval = 0.15;
    this.nextTrail = clock.getElapsedTime();
    this.trailInterval = 0.05;
    this.cameraModifier = 0.0;
    this.controller = controller;

    this.viewport = getViewport(viewportIndex, playerCount);
    this.camera = new THREE.PerspectiveCamera(60, this.viewport.width / this.viewport.height, 10, 40000);
    this.camera.position.x = 0;
    this.camera.position.z = 1000;
    this.camera.position.y = terrain.getHeight(this.camera.position.x, this.camera.position.z) + 500;
    this.camera.lookAt(this.mesh.position);
    this.camera.terrainOffset = 60;
    this.camera.playerHeightOffset = this.radius;

    // hud scene
    this.hudCamera = new THREE.OrthographicCamera(this.viewport.x, this.viewport.width, this.viewport.y, this.viewport.height, -1, 1);
    this.hudScene = new THREE.Scene();

    this.crosshairMeshNear = new THREE.Mesh(crosshairGeometry, crosshairMaterial);
    this.crosshairMeshFar = new THREE.Mesh(crosshairGeometry, crosshairMaterial);
    this.crosshairMeshFar.scale.set(0.5, 0.5, 0.5);
    this.hudScene.add(this.crosshairMeshNear);
    this.hudScene.add(this.crosshairMeshFar);
}

Player.prototype.update = function(dt) {
    this.controller.update();

    var rotMat = alignAlongVector(this.mesh, this.velocity);

    var move = new THREE.Vector3(-this.controller.moveX.state, -this.controller.moveY.state, 0);
    move.multiplyScalar(this.steerAccel);
    move.multiplyScalar(dt);
    move.applyMatrix4(rotMat);

    var terrainHeight = terrain.getHeight(this.mesh.position.x, this.mesh.position.z);
    if (this.mesh.position.y < terrainHeight) {
        this.mesh.position.setY(terrainHeight);
        this.velocity.add(new THREE.Vector3(0, 200, 0));
    }

    if (Math.abs(this.controller.accelerate.state) > 0.1) {
        this.speed += this.controller.accelerate.state * this.accel * dt;
        this.speed = Math.max(Math.min(this.speed, this.maxSpeed), this.minSpeed);
    }

    this.velocity.add(move);
    this.velocity.setLength(this.speed);

    var velDt = this.velocity.clone();
    velDt.multiplyScalar(dt);
    this.mesh.position = this.mesh.position.add(velDt);

    if (this.controller.shoot.state > 0) {
        if (this.nextShot < clock.getElapsedTime()) {
            this.nextShot = clock.getElapsedTime() + this.shotInterval;
            spawnBullet(this.mesh.position, this.velocity, bulletMaterial, false);
        }
    }

    if (this.nextTrail < clock.getElapsedTime()) {
        this.nextTrail = clock.getElapsedTime() + this.trailInterval;
        spawnBullet(this.mesh.position, this.velocity, trailMaterial, true);
    }

    if (Math.abs(this.controller.moveX.state) > 0.1 || Math.abs(this.controller.moveY.state) > 0.1) {
        this.cameraModifier += dt;
        if (this.cameraModifier > 1.0) this.cameraModifier = 1.0;
    } else {
        this.cameraModifier -= dt;
        if (this.cameraModifier < 0.0) this.cameraModifier = 0.0;
    }

    // update camera
    var playerVelocity = this.velocity.clone();
    playerVelocity.normalize();
    //var angleDist = Math.pow(Math.max(0, this.camera.getWorldDirection().dot(playerVelocity)), 40.0);
    angleDist = 1.0 - this.cameraModifier;

    var playerPos = this.mesh.position.clone().add(new THREE.Vector3(0, angleDist * this.camera.playerHeightOffset, 0));
    var rel = playerPos.sub(this.camera.position);
    // Adjust target distance
    var targetDistance = lerp(this.cameraMinDistance, this.cameraDistance, angleDist);
    rel.setLength((rel.length() - targetDistance));
    this.camera.position.add(rel);

    var terrainHeight = terrain.getHeight(this.camera.position.x, this.camera.position.z);
    if (this.camera.position.y < terrainHeight) {
        this.camera.position.y = terrainHeight + this.camera.terrainOffset;
    }

    // adjust lookat
    var focusPoint = this.velocity.clone();
    focusPoint.setLength(lerp(this.focusPointMaxDistance, this.focusPointDistance, angleDist));
    focusPoint.add(this.mesh.position);
    this.camera.lookAt(focusPoint);

    light.target = this.camera;
    var dir = sunDir.clone();
    dir.multiplyScalar(5000.0);
    light.position.copy(dir.add(light.target.position));

    // update hud
    var vel = this.velocity.clone();
    var crosshairDist = this.speed * 1.5;

    var crosshairPos = this.mesh.position.clone().add(vel.setLength(crosshairDist));
    this.crosshairMeshNear.position.copy(this.projectToScreen(crosshairPos, this.camera));

    crosshairPos = this.mesh.position.clone().add(vel.setLength(crosshairDist*3.0));
    this.crosshairMeshFar.position.copy(this.projectToScreen(crosshairPos));
}

// dependent on player viewport!
Player.prototype.projectToScreen = function(vec) {
    var projected = vec.clone().project(this.camera);
    projected.multiply(new THREE.Vector3(1, -1, 0));
    projected.add(new THREE.Vector3(1, 1, 0));
    projected.multiply(new THREE.Vector3(this.viewport.width / 2.0, this.viewport.height / 2.0, 0));
    projected.add(new THREE.Vector3(this.viewport.x, this.viewport.y, 0));
    return projected;
}