var players = [];

var crosshairMaterial = new THREE.MeshBasicMaterial({
    color: 0x00ff00,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.5,
    map: texLoader.load("crosshair.png")
});
var crosshairGeometry = new THREE.PlaneGeometry(50, 50, 1, 1);
var playerGeometry = new THREE.BoxGeometry(200, 200, 200);

/*console.log("here");
playerGeometryFuture = superLoad(jsonLoader.load.bind(jsonLoader), ["spaceship.json"]);
console.log("no");*/

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
    //console.log(playerGeometryFuture.value);
    this.mesh = new THREE.Mesh(playerGeometry, this.material);
    jsonLoader.load("spaceship.json", this.applyGeometryWhenReady());
    var shipScale = 100.0;
    this.mesh.scale.set(shipScale, shipScale, shipScale);
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
    this.nextTrail = clock.getElapsedTime();
    this.trailInterval = 0.05;
    this.cameraModifier = 0.0;
    this.controller = controller;
    this.alive = true;
    this.roll = 0;

    this.trailMaterial = new THREE.MeshBasicMaterial({color: playerColors[colorIndex]});

    this.viewport = getViewport(viewportIndex, playerCount);
    this.camera = new THREE.PerspectiveCamera(60, this.viewport.width / this.viewport.height, 10, 40000);
    this.camera.position.x = 0;
    this.camera.position.z = 1000;
    this.camera.position.y = terrain.getHeight(this.camera.position.x, this.camera.position.z) + 500;
    this.camera.lookAt(this.mesh.position);
    this.camera.terrainOffset = 60;
    this.camera.playerHeightOffset = this.radius;

    // hud scene
    this.hudCamera = new THREE.OrthographicCamera(0, this.viewport.width, 0, this.viewport.height, -1, 1);
    this.hudScene = new THREE.Scene();

    this.crosshairMeshNear = new THREE.Mesh(crosshairGeometry, crosshairMaterial);
    this.crosshairMeshFar = new THREE.Mesh(crosshairGeometry, crosshairMaterial);
    this.crosshairMeshFar.scale.set(0.5, 0.5, 0.5);
    this.hudScene.add(this.crosshairMeshNear);
    this.hudScene.add(this.crosshairMeshFar);

    //html overlay
    var alert = document.createElement("h2");
    alert.innerHTML = "";
    alert.style.position = "absolute";
    alert.style.fontSize = "500%";
    alert.style.left = (this.viewport.x + this.viewport.width / 2) + "px";
    alert.style.bottom = (this.viewport.y + this.viewport.height / 2) + "px";
    document.getElementsByTagName("body")[0].appendChild(alert);
    this.alert = alert;

    // particle system
    this.particleGroup = new THREE.Object3D();
    this.particleMesh = new THREE.BoxGeometry(40, 40, 40);
    this.particleMaterial = new THREE.MeshBasicMaterial({
        color: playerColors[colorIndex],
        transparent: true,
        opacity: 0.5,
        blending: THREE["AdditiveBlending"],
    });
    this.particles = [];

    //shooting logic
    this.nextShot = clock.getElapsedTime();
    this.ammo = 0;
    this.ammoRecharge = 3.0; //per second
    this.ammoMax = 12;
    this.shotInterval = 0.15;

    //engine
    this.engineSoundId = sounds.engine.play();

}

Player.prototype.applyGeometryWhenReady = function() {
    var that = this;
    return function(geometry) {
        console.log(that, that.mesh);
        scene.remove(that.mesh);
        var newMesh = new THREE.Mesh(geometry, that.material);
        var shipScale = 150.0;
        newMesh.scale.set(shipScale, shipScale, shipScale);
        newMesh.position.copy(that.mesh.position);
        newMesh.castShadow = true;
        newMesh.receiveShadow = true;
        that.mesh = newMesh;
        scene.add(that.mesh);
    }
}

Player.prototype.update = function(dt) {
    this.controller.update();

    var alignResult = alignAlongVector(this.mesh, this.velocity);
    this.mesh.setRotationFromQuaternion(alignResult.rotQuat);
    var angle = this.roll * -Math.PI/4.0
    var quat = alignResult.rotQuat.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), angle));
    this.mesh.setRotationFromQuaternion(quat);
    var rotMat = alignResult.rotMat; //alignAlongVector(this.mesh, this.velocity);

    var angleDist = 0.0;
    if (this.alive) {
        var move = new THREE.Vector3(-this.controller.moveX.state, -this.controller.moveY.state, 0);
        move.multiplyScalar(this.steerAccel);
        move.multiplyScalar(dt);
        move.applyMatrix4(rotMat);

        var terrainHeight = terrain.getHeight(this.mesh.position.x, this.mesh.position.z);
        if (this.mesh.position.y < terrainHeight) {
            this.spark(20);
            this.mesh.position.setY(terrainHeight);
            this.velocity.add(new THREE.Vector3(0, 200, 0));
            [sounds.ground1, sounds.ground2, sounds.ground3][Math.floor(Math.random()*3)].play();
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

        this.ammo += dt * this.ammoRecharge;
        if (this.ammo > this.ammoMax)
            this.ammo = this.ammoMax;

        if (this.controller.shoot.state > 0) {
            if (this.nextShot < clock.getElapsedTime() && this.ammo >= 1) {
                this.nextShot = clock.getElapsedTime() + this.shotInterval;
                spawnBullet(this.mesh.position, this.velocity, bulletMaterial, false, this);

                //heatup
                this.ammo--;

                //sound
                sounds.shoot2.rate(1.0 + (Math.random()*2.0-1.0) * 0.3);
                sounds.shoot2.play();
            }
        } /*else {
            this.ammo += dt * this.ammoRecharge;
            if (this.ammo > this.ammoMax)
                this.ammo = this.ammoMax;
        }*/

        if (this.nextTrail < clock.getElapsedTime()) {
            this.nextTrail = clock.getElapsedTime() + this.trailInterval;
            this.lastCreatedBulletIndex = nextBulletIndex;
            spawnBullet(this.mesh.position, this.velocity, this.trailMaterial, true, this);
        }

        if (Math.abs(this.controller.moveX.state) > 0.1 || Math.abs(this.controller.moveY.state) > 0.1) {
            this.cameraModifier += dt;
            if (this.cameraModifier > 1.0) this.cameraModifier = 1.0;
        } else {
            this.cameraModifier -= dt;
            if (this.cameraModifier < 0.0) this.cameraModifier = 0.0;
        }

        var rollSpeed = 2.0;
        if (Math.abs(this.controller.moveX.state) > 0.1) {
            if (this.controller.moveX.state > 0) {
                this.roll += dt * rollSpeed;
            } else {
                this.roll -= dt * rollSpeed;
            }
        } else {
            if (this.roll > 0.0) this.roll -= dt * rollSpeed;
            if (this.roll < 0.0) this.roll += dt * rollSpeed;
        }
        this.roll = Math.max(Math.min(this.roll, 1.0), -1.0);

        // update camera
        var playerVelocity = this.velocity.clone();
        playerVelocity.normalize();
        //var angleDist = Math.pow(Math.max(0, this.camera.getWorldDirection().dot(playerVelocity)), 40.0);
        angleDist = 1.0 - this.cameraModifier;

        // adjust lookat
        var focusPoint = this.velocity.clone();
        focusPoint.setLength(lerp(this.focusPointMaxDistance, this.focusPointDistance, angleDist));
        focusPoint.add(this.mesh.position);
        this.camera.lookAt(focusPoint);
    } else {
        this.velocity.add(new THREE.Vector3(0, -500 * dt, 0));
        this.mesh.position = this.mesh.position.add(this.velocity.clone().multiplyScalar(dt));

        var terrainHeight = terrain.getHeight(this.mesh.position.x, this.mesh.position.z);
        if (this.mesh.position.y < terrainHeight) {
            if (this.velocity.length() > 50) {
                this.spark(400);
                sounds.explosion.rate(1.0 + Math.random());
                sounds.explosion.play();
            }
            this.velocity = new THREE.Vector3(0, 0, 0);
            this.mesh.position.setY(terrainHeight);
        }

        if (this.velocity.length() > 50) {
            this.angle += dt;
        }

        this.mesh.setRotationFromAxisAngle(this.rotAxis, this.angle);
        this.camera.lookAt(this.mesh.position);
    }

    for(var i = 0; i < players.length; ++i) {
        if(i > players.indexOf(this)) {
            var other = players[i];
            var rel = other.mesh.position.clone().sub(this.mesh.position);
            if (rel.dot(rel) < this.radius*this.radius*4) {
                this.die();
                other.die();
                console.log("kamikaze");
            }
        }
    }


    var playerPos = this.mesh.position.clone().add(new THREE.Vector3(0, angleDist * this.camera.playerHeightOffset, 0));
    var rel = playerPos.sub(this.camera.position);
    // Adjust target distance
    var targetDistance = lerp(this.cameraMinDistance, this.cameraDistance, angleDist);
    rel.setLength((rel.length() - targetDistance));
    this.camera.position.add(rel);

    var terrainHeight = terrain.getHeight(this.camera.position.x, this.camera.position.z);
    if (this.camera.position.y < terrainHeight) {
        this.camera.position.y = terrainHeight + this.camera.terrainOffset;

        //[sounds.ground1, sounds.ground2, sounds.ground3][Math.floor(Math.random() * 3)].play(); // :D
        //console.log([1, 2, 3][Math.floor(Math.random() * 3)]);
    }

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

    // update particles
    for(var i = 0; i < this.particles.length; ++i) {
        var particle = this.particles[i];
        particle.lifetime -= dt;
        if (particle.lifetime <= 0) {
            scene.remove(particle.mesh);
            this.particles.splice(this.particles.indexOf(particle), 1);
        }
        particle.mesh.position.add(particle.velocity.clone().multiplyScalar(dt));
        var scale = particle.mesh.scale.x * Math.pow(0.6, dt);
        particle.mesh.scale.set(scale, scale, scale);
        particle.velocity.multiplyScalar(Math.pow(0.1, dt));
    }

    //engine sound
    //console.log(sounds.engine);
    if (this.alive) {
        sounds.engine.volume(0.2 + 0.6 * this.cameraModifier, this.engineSoundId);
    } else {
        sounds.engine.stop(this.engineSoundId);
    }
}

// dependent on player viewport!
Player.prototype.projectToScreen = function(vec) {
    var projected = vec.clone().project(this.camera);
    projected.multiply(new THREE.Vector3(1, -1, 0));
    projected.add(new THREE.Vector3(1, 1, 0));
    projected.multiply(new THREE.Vector3(this.viewport.width / 2.0, this.viewport.height / 2.0, 0));
    //projected.add(new THREE.Vector3(this.viewport.x, this.viewport.y, 0));
    return projected;
}

Player.prototype.spark = function(amount) {
    for(var i = 0; i < amount; ++i) {
        var particle = new Object();
        particle.mesh = new THREE.Mesh(this.particleMesh, this.particleMaterial);
        particle.velocity = new THREE.Vector3(Math.random(), Math.random(), Math.random());
        particle.velocity.multiplyScalar(2.0).sub(new THREE.Vector3(1, 1, 1)).normalize();
        particle.velocity.multiplyScalar(800 + Math.random() * 400);
        particle.mesh.position.copy(this.mesh.position);
        particle.lifetime = 5.0;
        this.particles.push(particle);
        scene.add(particle.mesh);
    }
}

Player.prototype.die = function() {
    this.alive = false;
    this.spark(100);
    this.rotAxis = new THREE.Vector3(Math.random(), Math.random(), Math.random());
    this.rotAxis.multiplyScalar(2.0).sub(new THREE.Vector3(-1, -1, -1)).normalize();
    this.angle = 0;
    sounds.explosion.rate(Math.random()*0.2-0.1 + 0.9);
    sounds.explosion.play();
    this.alert.innerHTML = "game over - press space to reload";
}