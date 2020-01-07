import * as THREE from '/lib/three.module.js';
import { OBJLoader2 } from './lib/loaders/OBJLoader2.js';
import { MTLLoader } from './lib/loaders/MTLLoader.js';
import { MtlObjBridge } from './lib/loaders/obj2/bridge/MtlObjBridge.js';
import { GLTFLoader } from './lib/loaders/GLTFLoader.js';

export default class Loader {
    constructor(scene, debug) {
        const self = this;
        if (!scene) {
            console.log('Invalid Scene. Unable to initialize loader.');
            return null;
        }
        this._scene = scene;
        this._debug = debug || false;
        this._addToScene = function(object3d) {
            const box = new THREE.Box3().setFromObject(object3d);
            box.getCenter(object3d.position);

            object3d.position.multiplyScalar(-1);

            const group = new THREE.Group();
            group.add(object3d)
            
            self._onLoad(group);
            self._scene.add(group);
        }
        this._onLoad = function (object3d) { };
        
        this._extractPath = function(filePath) {
            return {
                path: filePath.substring(0, filePath.lastIndexOf("/") + 1),
                fileName: filePath.substring(filePath.lastIndexOf("/") + 1),
                original: filePath
            };
        }
    }

    loadOBJ(modelName, objPath, texturePath, onLoad) {
        const objLoader = new OBJLoader2();
        const mtlLoader = new MTLLoader();
        const self = this;
        texturePath = texturePath || "";

        this._onLoad = onLoad || function () { };

        const loadOBJFile = function (mtlParseResult) {
            objLoader.setModelName(modelName);
            objLoader.setLogging(self._debug, self._debug);
            if (mtlParseResult) {
                objLoader.addMaterials(MtlObjBridge.addMaterialsFromMtlLoader(mtlParseResult));
            }

            const path = self._extractPath(objPath);
            objLoader.setPath(path.path);
            objLoader.load(path.original, self._addToScene, null, null, null);
        };
        
        if (texturePath) {
            const path = this._extractPath(texturePath);
            mtlLoader.setPath(path.path);
            mtlLoader.load(path.fileName, loadOBJFile);
        }
        else {
            loadOBJFile();
        }
    }

    loadGLTF(filePath, onLoad) {
        const path = this._extractPath(filePath);
        const gltfLoader = new GLTFLoader().setPath(path.path);
        const self = this;

        this._onLoad = onLoad || function () { };
        gltfLoader.load(path.fileName, function (gltf) {
            gltf.scene.traverse(function (child) {
                if (child.isMesh) {
                    // child.material.envMap = envMap;
                }
            });
            self._addToScene(gltf.scene);
        });
    }
}

