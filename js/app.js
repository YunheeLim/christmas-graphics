/*
My WebGL App
*/
// Import modules
import * as THREE from './mods/three.module.js';
import Stats from './mods/stats.module.js';
import { OrbitControls } from './mods/OrbitControls.js';
import { Water } from './mods/Water2.js';
import { TWEEN } from './mods/tween.module.min.js';
import { GUI } from './mods/lil-gui.module.min.js';
import { createMultiMaterialObject } from './mods/SceneUtils.js';
import {GLTFLoader} from './mods/GLTFLoader.js';

// Global variables
let mainContainer = document.getElementById('webgl-scene');
let fpsContainer = null;
let stats = null;
let camera = null;
let renderer = null;
let scene = null;
let snowmanTween = false;
let background = null;
let water = null;

let ctrl = null;
let gui = new GUI();

let loader = null;

const reindeer = new THREE.Group();
const mixers = []; // needed for cat animations
const clock = new THREE.Clock();

let listener = null;
let sound = null;
let audioLoader = null;
let controlBoxParams = {
	soundon: false
};

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let intersects;

let camControls = null;
// Global Meshes
let plane, box, sphere, cone = null;

let dirLight, spotLight, ambientLight = null;

// Animations
function update(){
	const delta = clock.getDelta();
    for ( const mixer of mixers ) {
      mixer.update( delta );
    }

	if(snowmanTween == true)
		TWEEN.update();
}

// Statically rendered content
function render(){
	stats.begin();
	renderer.render( scene, camera );
	stats.end();
}

function createSound(){
	listener = new THREE.AudioListener();
	camera.add( listener );

	// create a global audio source
	sound = new THREE.Audio( listener );
	// load a sound and set it as the Audio object's buffer
	audioLoader = new THREE.AudioLoader();
	// https://www.youtube.com/watch?v=doZoznTlzDA
	audioLoader.load( 'sounds/carol.mp3', function( buffer ) {
		sound.setBuffer( buffer );
		sound.setLoop( true );
		sound.setVolume( 0.3 );
		//sound.play();
	});

	// sound control
	let sb = gui.add( controlBoxParams, 'soundon').name('Sound On/Off');
	sb.listen();
	sb.onChange( function ( value ) {
		if(value == true)sound.play();
		else sound.stop();
	});
}

function init(){
	
	fpsContainer = document.querySelector( '#fps' );
	mainContainer = document.querySelector( '#webgl-scene' );
	scene = new THREE.Scene();

	let loader = new THREE.CubeTextureLoader();
	loader.setPath( 'img/cube/' );
	background = loader.load( [
		'yonder_ft.jpg', 'yonder_bk.jpg',
		'yonder_up.jpg', 'yonder_dn.jpg',
		'yonder_rt.jpg', 'yonder_lf.jpg'
	] );
	background.format = THREE.RGBAFormat;
	scene.background = background;

	createStats();
	createCamera();
	createControls();
	createMeshes();
	createDirectionalLight();
	createAmbientLight();

	createSound();

	createRenderer();
	renderer.outputEncoding = THREE.sRGBEncoding;
	
	renderer.setAnimationLoop( () => {
		update();
		render();
  	} );
}

function createReindeer(){
	//https://sketchfab.com/3d-models/deer-non-commercial-211dee27721d4a92874a171b1e7869e0
	const loader = new GLTFLoader();
	const onLoad = ( gltf, position, scale ) => {
		const model = gltf.scene.children[ 0 ];
		model.traverse( function ( child ){
      		if ( child instanceof THREE.Mesh ){
				child.castShadow = true;
      		}
    	});
		model.position.copy( position );
		model.scale.set(scale, scale, scale);
		// Model animations
		const animation = gltf.animations[ 0 ];
		const mixer = new THREE.AnimationMixer( model );
		mixers.push( mixer );
		const action = mixer.clipAction( animation );
		action.setDuration(10);
		action.play();
		//
		reindeer.add( model );
		reindeer.name="Reindeer";
	};
	const onProgress = () => {};
	const onError = ( errorMessage ) => { console.log( errorMessage ); };

	const modelPosition = new THREE.Vector3( 20, 0.1, 25 );
	const modelScale = 2;
  	loader.load( './models/reindeer/scene.gltf', gltf => onLoad( gltf, modelPosition, modelScale ), onProgress, onError ); 
	scene.add(reindeer);
}

function createTree(posx, posz, scale){

	let loader = new GLTFLoader();
	loader.load('./models/christmas_tree/scene.gltf', function(gltf){
		const tree = gltf.scene;
		tree.scale.set(1.3, 1.3, 1.3);
		tree.position.setX(-30);
		tree.position.setY(-5);
		tree.position.setZ(0);
		tree.traverse(function(node){
			if (node.isMesh){node.castShadow = true;}
		});
		scene.add(tree);
	});

	loader.load('./models/christmas_tree/scene.gltf', function(gltf){
		const tree = gltf.scene;
		tree.scale.set(1.3, 1.3, 1.3);
		tree.position.setX(30);
		tree.position.setY(-5);
		tree.position.setZ(0);
		tree.traverse(function(node){
			if (node.isMesh){node.castShadow = true;}
		});
		scene.add(tree);
	});
}

function createSnow(posX, posZ){
    let planeGeometry = new THREE.SphereGeometry(0.5,32,16);
	const planeMaterial =  new THREE.MeshStandardMaterial({color:0xffffff});
	let snow = new THREE.Mesh(planeGeometry,planeMaterial);
	snow.position.set(posX, 70, posZ);
	snow.receiveShadow = true;
	snow.name = "snow";
	scene.add(snow);
}

function createSnowman(){

	let points = [];
	for(var i=-12; i<=10; i = i + 0.5) {
		if(i < 0) {
			points.push(new THREE.Vector3(Math.sqrt(36 - Math.pow(i + 6, 2)) * 1.2, i))
		} else if(i < 8 && i >= 0) {
			points.push(new THREE.Vector3(Math.sqrt(16 - Math.pow(i - 4, 2)) * 1.2, i))
		} else {
			points.push(new THREE.Vector3(Math.sqrt(1 - Math.pow(i - 9, 2)) * 1.2, i))
		}
	}
	var latheGeom = new THREE.LatheGeometry(points, 30, 0, Math.PI * 2);
	const materials = [
		new THREE.MeshLambertMaterial( { color: 0xffffff, transparent:true, side:THREE.DoubleSide } ),
		new THREE.MeshBasicMaterial( { color: 0xD1F2F3, wireframe: true } )
	];

	const mesh = createMultiMaterialObject(latheGeom,materials);
	mesh.children.forEach(function(e) {
		e.castShadow=true;
	});	

	return mesh;
}

// FPS counter
function createStats(){
	stats = new Stats();
	stats.showPanel( 0 );	// 0: fps, 1: ms, 2: mb, 3+: custom
	fpsContainer.appendChild( stats.dom );
}

// Camera object
function createCamera(){
	const fov = 50;
	const aspect =  mainContainer.clientWidth / mainContainer.clientHeight;
	const near = 0.1;
	const far = 500;	// meters
	camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
	camera.position.x = 0;
	camera.position.y = 30;
	camera.position.z = 74;
	camera.lookAt(scene.position);
}

// Interactive controls
function createControls(){
	camControls = new OrbitControls(camera, mainContainer);
	camControls.autoRotate = false;
}

// Create directional - sun light
function createDirectionalLight(){
	dirLight = new THREE.DirectionalLight( 0xffffff, 1, 100 ); // color, intensity, proximity
	dirLight.position.set( -10, 25, 25);
	// makes the shadows with less blurry edges
	dirLight.shadow.mapSize.width = 4096;  	// default
	dirLight.shadow.mapSize.height = 4096; 	// default
	// set light coverage
	dirLight.shadow.camera.near = 0.5;      // default
	dirLight.shadow.camera.far = 100;      	// default
	dirLight.shadow.camera.left = -100;
	dirLight.shadow.camera.top = 100;
	dirLight.shadow.camera.right = 100;
	dirLight.shadow.camera.bottom = -100;
	dirLight.castShadow = true;
	scene.add( dirLight );
}

// Create spot - lamp light 
function createSpotLight(){
	spotLight = new THREE.SpotLight( 0xffffff );
	spotLight.position.set( -10, 20, 10 );
	// Makes the shadows with less blurry edges
	spotLight.shadow.mapSize.width = 2048; // default 512
	spotLight.shadow.mapSize.height = 2048;	//default 512
	// change lighting params
	spotLight.intensity = 1.5;
	spotLight.distance = 200;
	spotLight.angle = Math.PI/3;
	spotLight.penumbra = 0.4; 	// 0 - 1
	spotLight.decay = 0.2; 		// how quickly light dimishes
	// enable shadows for light source
	spotLight.castShadow = true;
	scene.add( spotLight );

	// adds helping lines
	// const spotLightHelper = new THREE.SpotLightHelper( spotLight, 0xcc0000 );
	// scene.add( spotLightHelper );	
}

// Create ambient light
function createAmbientLight(){
	// If the want to make the whole scene lighter or add some mood, usually it should be some grey tone
	ambientLight = new THREE.AmbientLight( 0xffffff, 0.2 ); // 0x111111 - 0xaaaaaa, 1 ; 0xffffff, 0.1 - 0.3; 0x404040
	scene.add( ambientLight );
}
// -2

function createPlane(){
	const texture = new THREE.TextureLoader().load("img/ground.jpg");
	texture.anisotropy = 16;
	texture.magFilter = THREE.LinearFilter;
	texture.minFilter = THREE.LinearMipMapLinearFilter;

	texture.wrapS = THREE.RepeatWrapping;
	texture.wrapT = THREE.RepeatWrapping;
	texture.repeat.set(2,2);

	const planeGeometry = new THREE.PlaneGeometry(92,92);
	const planeMaterial =  new THREE.MeshStandardMaterial({map:texture});
	plane = new THREE.Mesh(planeGeometry,planeMaterial);
	plane.rotation.x = -0.5*Math.PI;
	plane.position.x = 0;
	plane.position.y = 0;
	plane.position.z = 0;
	plane.receiveShadow = true;
	scene.add(plane);
}

function createBox(){
	var boxGeometry = new THREE.BoxGeometry(30,15,30);
	var boxMaterial =  new THREE.MeshLambertMaterial({ opacity:1, color: 0xffffff, transparent:false});
	box = new THREE.Mesh(boxGeometry, boxMaterial);
	box.position.x=0;
	box.position.y=7.52;
	box.position.z=0;
	box.castShadow = true;
	box.receiveShadow = true;
	scene.add(box);

	var boxGeometry = new THREE.BoxGeometry(25,12,25);
	var boxMaterial =  new THREE.MeshLambertMaterial({ opacity:1, color: 0xffffff, transparent:false});
	box = new THREE.Mesh(boxGeometry, boxMaterial);
	box.position.x=0;
	box.position.y=24;
	box.position.z=0;
	box.castShadow = true;
	box.receiveShadow = true;
	scene.add(box);
}

function createCone(){
	var coneGeometry = new THREE.ConeGeometry(26, 10, 4);
	var coneMaterial =  new THREE.MeshLambertMaterial({color: 0xab0000});
	coneMaterial.metalness = 0; // non metal 0-1 metal default 0.5
	coneMaterial.roughness = 1; // mirror 0-1 diffuse default 0.5
	cone = new THREE.Mesh( coneGeometry, coneMaterial );
	cone.position.x=0;
	cone.position.y=20;
	cone.position.z=0;
	cone.rotateY(Math.PI / 4);
	cone.castShadow = true;
	cone.receiveShadow = true;
	scene.add(cone);

	var coneGeometry = new THREE.ConeGeometry(21.5, 5, 4);
	var coneMaterial =  new THREE.MeshLambertMaterial({color: 0xab0000});
	coneMaterial.metalness = 0; // non metal 0-1 metal default 0.5
	coneMaterial.roughness = 1; // mirror 0-1 diffuse default 0.5
	cone = new THREE.Mesh( coneGeometry, coneMaterial );
	cone.position.x=0;
	cone.position.y=32;
	cone.position.z=0;
	cone.rotateY(Math.PI / 4);
	cone.castShadow = true;
	cone.receiveShadow = true;
	scene.add(cone);
}

function createWindow(){
	var boxGeometry = new THREE.BoxGeometry(18,11,0.05);
	var boxMaterial =  new THREE.MeshPhysicalMaterial({
		color: 0x0174DF,
		metalness: 0.5,
		roughness: 0.2,
		transparent: true,
		opacity: 0.5,
		transmission: 0.1,
		side: THREE.FrontSide,
		clearcoat: 1.0,
		clearcoatRoughness: 0.39,
	});

	box = new THREE.Mesh(boxGeometry, boxMaterial);
	box.position.x= -4;
	box.position.y=6.5;
	box.position.z=15;
	box.castShadow = true;
	box.receiveShadow = true;
	scene.add(box);

	var boxGeometry = new THREE.BoxGeometry(12,8,0.05);
	box = new THREE.Mesh(boxGeometry, boxMaterial);
	box.position.x= -4;
	box.position.y=23.5;
	box.position.z=12.5;
	box.castShadow = true;
	box.receiveShadow = true;
	scene.add(box);	

	var boxGeometry = new THREE.BoxGeometry(4,6,0.05);
	box = new THREE.Mesh(boxGeometry, boxMaterial);
	box.position.x= 7;
	box.position.y=23.5;
	box.position.z=12.5;
	box.castShadow = true;
	box.receiveShadow = true;
	scene.add(box);	

	var boxGeometry = new THREE.BoxGeometry(0.5,11.1,0.1);
	var boxMaterial =  new THREE.MeshLambertMaterial({color: 0xffffff});
	box = new THREE.Mesh(boxGeometry, boxMaterial);
	box.position.x= -4;
	box.position.y=6.5;
	box.position.z=15.02;
	box.castShadow = false;
	box.receiveShadow = true;
	scene.add(box);

	var boxGeometry = new THREE.BoxGeometry(0.5,8.1,0.1);
	var boxMaterial =  new THREE.MeshLambertMaterial({color: 0xffffff});
	box = new THREE.Mesh(boxGeometry, boxMaterial);
	box.position.x= -4;
	box.position.y=23.5;
	box.position.z=12.52;
	box.castShadow = false;
	box.receiveShadow = true;
	scene.add(box);
}

function createDoor(){
	var texture = new THREE.TextureLoader().load("img/door.jpg");
	texture.anisotropy = 16;

	const bump = new THREE.TextureLoader().load( "img/door_bump.jpg"); // load bump map
	bump.wrapS = THREE.RepeatWrapping;
	bump.wrapT = THREE.RepeatWrapping;
	bump.repeat.set(0.5, 0.5);

	const normal = new THREE.TextureLoader().load("img/door_normal.jpg");
	normal.wrapS = THREE.RepeatWrapping;
	normal.wrapT = THREE.RepeatWrapping;
	normal.repeat.set(0.5, 0.5);

	var boxGeometry = new THREE.BoxGeometry(5,11,0.05);
	var boxMaterial =  new THREE.MeshStandardMaterial({ map: texture });
	box = new THREE.Mesh(boxGeometry, boxMaterial);

	box.material.map.wrapS = THREE.RepeatWrapping;
	box.material.map.wrapT = THREE.RepeatWrapping;
	box.material.map.repeat.set(0.5, 0.5);

	boxMaterial.bumpMap = bump;		// add map to material
	boxMaterial.bumpScale = 0.3;
	
	boxMaterial.normalMap = normal;
	boxMaterial.normalScale = new THREE.Vector2(0.5, 0.5);

	box.position.x= 10;
	box.position.y=6.5;
	box.position.z=15;
	box.castShadow = true;
	box.receiveShadow = true;
	scene.add(box);

	var path = new THREE.Shape();
	path.absellipse(0, 0, 0.5, 0.5, 0, Math.PI*2, 0, 0);
	var geometry = new THREE.ShapeGeometry( path );
	var material = new THREE.MeshBasicMaterial( { color: 0x000000} );
	var ellipse = new THREE.Mesh( geometry, material );
	ellipse.position.x = 8.5;
	ellipse.position.y = 6.5;
	ellipse.position.z = 15.05;
	scene.add(ellipse);
}

function createCloud(){
	var X_position = -25;
	for (var i = 0; i < 3; i++){
		var cloudTexture = new THREE.TextureLoader().load( "img/cloud.png" );
		var cloudMaterial = new THREE.SpriteMaterial( { map: cloudTexture, color: 0xffffff } );
		// const cloudMaterial = new THREE.SpriteMaterial( { map: cloudTexture, color: 0xffffff, transparent:true, opacity:0.7 } );
		var cloud = new THREE.Sprite( cloudMaterial );
		cloud.scale.set(20, 10, 1);
		cloud.position.set(X_position,40,-10);
		scene.add( cloud );
		X_position += 25;
	}
}

function createWater(){
	const texture = new THREE.TextureLoader().load("img/pebble.jpg");
	texture.anisotropy = 16;
	texture.magFilter = THREE.LinearFilter;
	texture.minFilter = THREE.LinearMipMapLinearFilter;

	texture.wrapS = THREE.RepeatWrapping;
	texture.wrapT = THREE.RepeatWrapping;
	texture.repeat.set(3,3);

	const planeGeometry = new THREE.PlaneGeometry(20,20);
	const planeMaterial =  new THREE.MeshStandardMaterial({map:texture});
	plane = new THREE.Mesh(planeGeometry,planeMaterial);
	plane.rotation.x = -0.5*Math.PI;
	plane.position.x = -27;
	plane.position.y = 0.1;
	plane.position.z = 27;
	plane.receiveShadow = true;
	scene.add(plane);

	let waterParams = {
		color: '#93B0FF',
		scale: 4,
		flowX: 0.6,
		flowY: 0.6,
		sound: true
	};

	const waterGeometry = new THREE.PlaneGeometry( 20, 20 );

	water = new Water( waterGeometry, {
		color: waterParams.color,
		scale: waterParams.scale,
		flowDirection: new THREE.Vector2( waterParams.flowX, waterParams.flowY ),
		textureWidth: 1024,
		textureHeight: 1024
	} );
	water.position.x = -27;
	water.position.y = 1;
	water.position.z = 27;
	water.rotation.x = -0.5 * Math.PI;
	scene.add( water );
}

function createRock(){
	
	const texture = new THREE.TextureLoader().load("img/rock.png");
	texture.anisotropy = 16;

	const bump = new THREE.TextureLoader().load("img/rock_bump.png");
	bump.wrapS = THREE.RepeatWrapping;
	bump.wrapT = THREE.RepeatWrapping;
	bump.repeat.set(0.5, 0.5);

	texture.magFilter = THREE.LinearFilter;
	texture.minFilter = THREE.LinearMipMapLinearFilter;

	texture.wrapS = THREE.RepeatWrapping;
	texture.wrapT = THREE.RepeatWrapping;
	texture.repeat.set(2,2);

	const sphereGeometry = new THREE.SphereGeometry(2,32,16, 0, Math.PI*2, 0, Math.PI/2);
	const sphereMaterial =  new THREE.MeshStandardMaterial({map:texture});
	
	sphereMaterial.bumpMap = bump;
	sphereMaterial.bumpScale = 0.3;
	

	var z_position = 18;
	for(var i = 0; i < 7; i++){
		var x_position = -36;
		for(var j = 0; j < 7; j++){
			if(i == 0 || i == 6){
				sphere = new THREE.Mesh(sphereGeometry,sphereMaterial);
				sphere.position.x=x_position;
				sphere.position.y=0;
				sphere.position.z=z_position;
				sphere.castShadow = true;
				scene.add(sphere);
			}
			else{
				if(j == 0 || j == 6){
					sphere = new THREE.Mesh(sphereGeometry,sphereMaterial);
					sphere.position.x=x_position;
					sphere.position.y=0;
					sphere.position.z=z_position;
					sphere.castShadow = true;
					scene.add(sphere);
				}
			}				
			x_position += 3;
		}
		z_position += 3;
	}
}

class Switch{
    addFog(){
		scene.fog = new THREE.FogExp2(0xffffff, 0.017);
	}
	removeFog(){
		scene.fog = new THREE.FogExp2(0xffffff, 0);
	}
}

// Meshes and other visible objects
function createMeshes(){
	ctrl = new Switch();
	gui.add(ctrl, 'addFog').name("Add fog");
	gui.add(ctrl, 'removeFog').name("Remove fog");

	createPlane();
	createBox();
	createCone();
	createCloud();
	createWindow();
	createDoor();
	createWater();
	createRock();
	createTree(-60,60,10.0);
	createReindeer();

	createSnow();
	let snowPosX = 0, snowPosZ = 0;
	for(let i=0; i<40; i++){
		snowPosX = -40 + Math.round((Math.random() * 80));
		snowPosZ = -50 + Math.round((Math.random() * 100));
		createSnow(snowPosX, snowPosZ);
	}
	let fall = {y: 25};
	let tween2 = new TWEEN.Tween(fall).to({y: -5}, 5000);
	tween2.easing(TWEEN.Easing.Linear.None);
    let t = 0;
	tween2.onUpdate(() => {
		scene.traverse(function(e) {
			if (e.name == "snow" ) {
				t++;
				e.position.y = fall.y + t*0.5;
				e.rotation.x += 0.001 * t;
				e.rotation.y += 0.001 * t;
				e.rotation.z += 0.001 * t;
			} else{
				t=0;
			}
		});
	});

	let snowman = createSnowman(); 
    snowman.position.set(30, 8.1, 30);
 	snowman.scale.set(0.7, 0.7, 0.7);
	snowman.name = "snowman";
	scene.add(snowman);
	let rot = {y: 0};
	let tween = new TWEEN.Tween(rot).to({y:3.14}, 20000);
	tween.easing(TWEEN.Easing.Linear.None);
    tween.onUpdate(() => {
		snowman.rotation.y = rot.y;
	});
	tween.repeat(Infinity);
	tween.start();

	tween2.repeat(Infinity);
	tween2.start();
}

// Renderer object and features
function createRenderer(){
	renderer = new THREE.WebGLRenderer( { antialias: true } );
	renderer.setSize(mainContainer.clientWidth, mainContainer.clientHeight);
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFSoftShadowMap; //THREE.BasicShadowMap | THREE.PCFShadowMap | THREE.PCFSoftShadowMap
	mainContainer.appendChild( renderer.domElement );
}

mainContainer.addEventListener('mousemove', e => {
	mouse.x = 2 * ( e.clientX / window.innerWidth ) - 1;
	mouse.y = 1 - 2 * ( e.clientY / window.innerHeight );
});

mainContainer.addEventListener('mousedown', e => {
	e.preventDefault();
	raycaster.setFromCamera( mouse, camera );
	intersects = raycaster.intersectObjects( scene.children, true ); // true mean recursively, if false checks only object
	for ( var i = 0; i < intersects.length; i++ ) {
		if(intersects[ i ].object.parent.name == "snowman"){ // parent required only for groups
			snowmanTween = !snowmanTween;
			console.log("click");
		}
	}
});

window.addEventListener('resize', e => {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );
});

init();