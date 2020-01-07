import * as THREE from '/lib/three.module.js';
import { TrackballControls } from "./lib/controls/TrackballControls.js";
import { OrbitControls } from "./lib/controls/OrbitControls.js";
import Loader from "./Loader.js";

export default class Scene {
    constructor(options){
        if(!options.elementToBindTo){
            options.elementToBindTo = document.getElementById('canvas');

            if(!options.elementToBindTo){
                options.elementToBindTo = document.body
            }
        }

        this.objects = options.object || [];
        this.update = options.update || function(){};
        this.click = options.click || function(){};

        this.renderer = null;
        this.canvas = options.elementToBindTo;
        this.aspectRatio = 1;
        this.recalcAspectRatio();

        this.scene = null;
        this.cameraDefaults = {
            posCamera: new THREE.Vector3(0.0, 0.0, 500.0),
            posCameraTarget: new THREE.Vector3(0, 0, 0),
            near: .1,
            far: 10000, 
            fov: 60
        };

        this.camera = null;
        this.cameraTarget = this.cameraDefaults.posCameraTarget;

        this.mouse = new THREE.Vector2();
        this.controls = null;
        this.mainModel = null;
        this.raycaster = new THREE.Raycaster();

        this.initGL();
        this.resizeDisplayGL();
        this.animate();

        // let helper = new THREE.GridHelper(1200, 60, 0xFF4444, 0x404040);
        // helper.rotation.x = Math.PI / 2;
        // this.scene.add(helper);

        this.initObjects();
    }

    initGL(){
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            autoClear: true
        });
        this.renderer.setClearColor(0x666666);
        
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(this.cameraDefaults.fov, this.aspectRatio, this.cameraDefaults.near, this.cameraDefaults.far);
        this.resetCamera();

        this.initializeLighting(this.scene);
        this.loader = new Loader(this.scene);

        const self = this;
        this.selectedObject = null;
        this.canvas.addEventListener('click', function(event){
            const parentTop = self.canvas.offsetTop;
            const parentLeft = self.canvas.offsetLeft;
            const parentWidth = self.canvas.offsetWidth;
            const parentHeight = self.canvas.offsetHeight;

            self.mouse.x = ((event.clientX - parentLeft) / parentWidth) * 2 - 1;
            self.mouse.y = -((event.clientY - parentTop) / parentHeight) * 2 + 1;

            const intersectedObject = self.raycast();

            if(self.selectedObject){
                const rootColor = self.selectedObject.material.color.getHex();
                self.selectedObject.children[0].material.color.setHex(rootColor * .5);
                self.selectedObject = null;
            }

            if(intersectedObject && intersectedObject !== self.mainModel){
                if(intersectedObject.name === 'cube'){
                    self.selectedObject = intersectedObject;
                    intersectedObject.children[0].material.color.setHex(0xffffff);
                }
            }

            self.click(intersectedObject);
        });

        window.addEventListener('resize', function(){
            self.resizeDisplayGL();
        }, false);
    };

    initObjects(){
        const visibleHeightAtZDepth = ( depth, camera ) => {
            // compensate for cameras not positioned at z=0
            const cameraOffset = camera.position.z;
            if ( depth < cameraOffset ) depth -= cameraOffset;
            else depth += cameraOffset;

            // vertical fov in radians
            const vFOV = camera.fov * Math.PI / 180; 

            // Math.abs to ensure the result is always positive
            return 2 * Math.tan( vFOV / 2 ) * Math.abs( depth );
        };

        const visibleWidthAtZDepth = ( depth, camera ) => {
            const height = visibleHeightAtZDepth( depth, camera );
            return height * camera.aspect;
        };


        let circleRadius = 160;
        let size = 60;
        let self = this;

        var geometry = new THREE.BoxBufferGeometry( size, size/2, size/64 );
        let topGroup = new THREE.Group();
        let bottomGroup = new THREE.Group();
        let leftGroup = new THREE.Group();
        let rightGroup = new THREE.Group();

        let n = 10;
        let x = size;
        let y = 0;
        let z = 0;
        let cubeSize = 100;
        let topGroupHeight = 0;

        let initialX = (n - 1) * size /2;
        for(let i = 0; i < n; i++){
            for(let j = 0; j < 5; j++){
                let xx = initialX - size * i;
                let yy = size/1.45 * j;
                let zz = -size * j * .75;

                topGroup.add(createStupidObject(xx, yy + 150, zz, 0xaa0000));
                topGroup.add(createStupidObject(xx, -yy - 150, zz, 0x00aa00));
            }
        }

        initialX = 150 - size/2;
        for(let i = 0; i < n - 1; i++){
            for(let j = 0; j < 3; j++){
                let xx = initialX - size/2 * i;
                let yy = size * j;
                let zz = 0;

                leftGroup.add(createStupidObject(yy + 150, xx, zz, 0x0000aa));
                rightGroup.add(createStupidObject(-yy - 150, xx, zz, 0x00aaaa));
            }
        }

        // for(let i = 3; i < n; i++){
        //     for(let j = 0; j < i * 2 - 1; j++){
        //         const yy = y + i * size;
        //         const xx = x + j * size - yy;
        //         const zz = -i * size/2 + (size/2 * 2);

        //         //pyramid kinda
        //         // topGroup.add(createStupidObject(xx, yy - (i * size / 2), zz, 0xaa0000));
        //         // bottomGroup.add(createStupidObject(xx, -yy + (i * size / 2), zz, 0x00aa00));
        //         // leftGroup.add(createStupidObject(-yy, -xx + (j * size / 2) - ((i - 1) * size / 2), zz, 0x0000aa));
        //         // rightGroup.add(createStupidObject(yy, -xx  + (j * size / 2) - ((i - 1) * size / 2), zz, 0x00aaaa));

        //         // on edges
        //         // const height = visibleHeightAtZDepth(zz, self.camera) - 10;
        //         // const width = visibleWidthAtZDepth(zz, self.camera) - 10;
        //         // const posY = size/4 * (n - i);
        //         // const posX = size/2 * (n - i);
        //         // topGroup.add(createStupidObject(xx, height/2 - posY, zz, 0xaa0000));
        //         // bottomGroup.add(createStupidObject(xx, -height/2 + posY, zz, 0x00aa00));
        //         // leftGroup.add(createStupidObject(-width/2 + posX, -xx + (j * size / 2) - ((i - 1) * size / 2), zz, 0x0000aa));
        //         // rightGroup.add(createStupidObject(width/2 - posX, -xx  + (j * size / 2) - ((i - 1) * size / 2), zz, 0x00aaaa));
        //     }
        // }

        self.scene.add(topGroup);
        self.scene.add(bottomGroup);
        self.scene.add(leftGroup);
        self.scene.add(rightGroup);

        function createStupidObject(x, y, z, color){
            var object = new THREE.Mesh( geometry, new THREE.MeshLambertMaterial( { color:  color } ) );
            object.name = 'cube'
            object.position.set(x, y, z);
            object.scale.set(.9, .9, .9);

            let geo = new THREE.EdgesGeometry(object.geometry);
            let mesh = new THREE.LineBasicMaterial({color: color * .5, linewidth: 2});
            let wireframe = new THREE.LineSegments(geo, mesh);
            wireframe.name = 'cube-frame'
            wireframe.renderOrder = 1;
            
            object.add(wireframe)
            return object;
        }

    }

    initializeControls(object) {
        if(!this.controls){
            this.controls = new ObjectControls(this.camera, this.renderer.domElement, object);
        }
        else {
            this.controls.setObjectToMove(object);
        }

        this.controls.setCurrentScale(object.scale.x);
        this.controls.setScaleLimits(0.001, 100);
        this.controls.setScaleSpeed(.1);
        this.controls.enableVerticalRotation();
        // this.controls.setMaxVerticalRotationAngle(Math.PI / 4, Math.PI / 4);
        this.controls.setRotationSpeed(0.075);
    }

    updateMainModel(object){
        const desiredWidth = 175;
        let box = new THREE.Box3().setFromObject(object);
        let width = box.max.x * 2;
        let ratio = desiredWidth / width;

        object.scale.set(ratio, ratio, ratio);

        if(this.mainModel){
            this.scene.remove(this.mainModel);
            this.animate();
        }

        this.mainModel = object;
        this.initializeControls(this.mainModel);
    }

    initializeLighting(scene){
        let ambientLight = new THREE.AmbientLight(0xa0a0a0);
        let directionalLight1 = new THREE.DirectionalLight(0xC0C090);
        let directionalLight2 = new THREE.DirectionalLight(0xC0C090);

        directionalLight1.position.set(- 100, - 50, 100);
        directionalLight2.position.set(100, 50, - 100);

        scene.add(directionalLight1);
        scene.add(directionalLight2);
        scene.add(ambientLight);
    };

    resizeDisplayGL(){
        //this.controls.handleResize();
        this.recalcAspectRatio();
        this.renderer.setSize(this.canvas.offsetWidth, this.canvas.offsetHeight, false);
        this.updateCamera();
    };

    recalcAspectRatio(){
        this.aspectRatio = (this.canvas.offsetHeight === 0) ? 1 : this.canvas.offsetWidth / this.canvas.offsetHeight;
    };

    resetCamera(){
        this.camera.position.copy(this.cameraDefaults.posCamera);
        this.cameraTarget.copy(this.cameraDefaults.posCameraTarget);
        this.updateCamera();
    };

    updateCamera(){
        this.camera.aspect = this.aspectRatio;
        this.camera.lookAt(this.cameraTarget);
        this.camera.updateProjectionMatrix();
    };

    raycast(){
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);
        if(intersects.length > 0){
            return intersects[0].object;
        }

        return null;
    }

    render(){
        if(!this.renderer.autoClear){
            this.renderer.clear();
        }

        TWEEN.update();
        this.update();
        // this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    animate(){
        const self = this;

        requestAnimationFrame(function(){
            self.animate();
        });
        self.render();
    };

    loadModel(options){
        const self = this;
        if(!options.type){
            console.log('Please provide a type of a file')
        }
        else if(options.type === 'obj'){
            this.loader.loadOBJ(options.name, options.objPath, options.mltPath, function(object) {
                self.updateMainModel(object);
            });
        }
        else if(options.type === 'gltf'){
            this.loader.loadGLTF(options.gltfPath, function(object) {
                self.updateMainModel(object);
            });
        }
    }
}