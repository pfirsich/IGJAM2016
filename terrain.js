function Terrain(width, height, widthSegments, heightSegments) {
    this.width = width;
    this.height = height;
    this.widthSegments = widthSegments;
    this.heightSegments = heightSegments;
    this.dataToUnitConversion = 60;

    this.data = this.generateHeight(widthSegments + 1, heightSegments + 1);

    this.geometry = new THREE.PlaneBufferGeometry(width, height, widthSegments, heightSegments);
    this.geometry.rotateX( - Math.PI / 2 );
    var vertices = this.geometry.attributes.position.array;
    for ( var i = 0, j = 0, l = vertices.length; i < l; i ++, j += 3 ) {
        vertices[j + 1] = this.data[i] * this.dataToUnitConversion;
    }
    this.geometry.computeFaceNormals();
    this.geometry.computeVertexNormals();

    this.material = new THREE.MeshLambertMaterial({
        color: 0xe68a00,
        shading: THREE.SmoothShading
    });
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
}

Terrain.prototype.generateHeight = function(width, height) {
    var size = width * height, data = new Uint8Array( size ),
    perlin = new ImprovedNoise(), quality = 50, z = Math.random() * 100;
    var qualities = [{freq: 50, amp: 0.85, negativeExp: 0.5}, {freq: 20, amp: 0.15, negativeExp: 1.0}];

    for (var j = 0; j < qualities.length; j++) {
        for (var i = 0; i < size; i++) {
            var x = i % width, y = ~~ (i / width);
            var noise = perlin.noise(x / qualities[j].freq, y / qualities[j].freq, z);
            if (noise < 0.0) noise = -Math.pow(-noise, qualities[j].negativeExp);
            noise = (noise + 1.0) * 0.5;
            data[i] += noise * qualities[j].amp * 255;
        }
    }

    return data;
}

Terrain.prototype.getHeight = function(x, y) {
    // half is center
    var x = worldHalfWidth + Math.floor(x / this.width * this.widthSegments);
    x = Math.min(Math.max(x, 0), this.widthSegments);
    var y = worldHalfDepth + Math.floor(y / this.height * this.heightSegments);
    y = Math.min(Math.max(y, 0), this.heightSegments);
    return this.data[x + y * worldWidth] * this.dataToUnitConversion;
}