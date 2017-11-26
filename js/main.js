// standard global variables
var container, scene, camera, renderer, controls, stats, gui;
var time = 0;
var speed = 0.7;
var clock = new THREE.Clock();
var song = document.getElementById('song');

var starGlow, star;

// Boolean for start and restart
var going = false;
var pulsar = false;


var particleSystem, uniformsParticles, particleGeometry;
var particles = 100000;
var radius = 5.0;
var explosion = false;
var particleSize = 80;
var particleTTL = 100;


init();
animate();


function initGUI() {

	var guiControls = new function (){ 
        this.start = function(){
        	going = !going;
        	if(going) {
        		song.play();
        	} else {
        		song.pause();
        	}
        	
        }
    }; 


	gui = new dat.GUI();
	parameters = 
	{ c: 0.41, p: 1.4, bs: true, fs: false, nb: false, ab: true, mv: true, st_ps: false, color: "#b3afff"};

	var first = gui.addFolder('Glow Shader Attributes');

	var cGUI = first.add(parameters, 'c').min(0.0).max(1.0).step(0.01).name("c").listen();
	cGUI.onChange( function(value) { 
		starGlow.material.uniforms[ "c" ].value = parameters.c; 
	});

	var pGUI = first.add( parameters, 'p' ).min(0.0).max(6.0).step(0.01).name("p").listen();
	pGUI.onChange( function(value) { 
		starGlow.material.uniforms[ "p" ].value = parameters.p; 
	});
	var glowColor = first.addColor( parameters, 'color' ).name('Glow Color').listen();
	glowColor.onChange( function(value) {
		starGlow.material.uniforms.glowColor.value.setHex( value.replace("#", "0x"));   
	});
	first.open();

	// toggle front side / back side 
	var folder1 = gui.addFolder('Render side');
	var fsGUI = folder1.add( parameters, 'fs' ).name("THREE.FrontSide").listen();
	fsGUI.onChange( function(value) { 
	    if (value) 
	    {
	        bsGUI.setValue(false);
			starGlow.material.side = THREE.FrontSide;  
	    }
	});
	var bsGUI = folder1.add( parameters, 'bs' ).name("THREE.BackSide").listen();
	bsGUI.onChange( function(value) { 
		if (value)
		{
			fsGUI.setValue(false);
			starGlow.material.side = THREE.BackSide;  
		}
	});
	folder1.open();

	// toggle normal blending / additive blending
	var folder2 = gui.addFolder('Blending style');
	var nbGUI = folder2.add( parameters, 'nb' ).name("THREE.NormalBlending").listen();
	nbGUI.onChange( function(value) { 
	    if (value) 
	    {
	        abGUI.setValue(false);
			starGlow.material.blending = THREE.NormalBlending;  
	    }
	});

	var abGUI = folder2.add( parameters, 'ab' ).name("THREE.AdditiveBlending").listen();
	abGUI.onChange( function(value) { 
		if (value)
		{
			nbGUI.setValue(false);
			starGlow.material.blending = THREE.AdditiveBlending; 
		}
	});
	folder2.open();

	// toggle mesh visibility
	var folder3 = gui.addFolder('Mesh Star');
	var mvGUI = folder3.add( parameters, 'mv' ).name("Meshes-Visible").listen();
	mvGUI.onChange( function(value) { 
		star.visible = value; 
	});
	folder3.open();


	// start / pause
	var folder4 = gui.addFolder('Start/Pause');
	folder4.add(guiControls, 'start').name("Start/Pause");
	folder4.open();
}


function init() {

	// GUI
	initGUI();


	// SCENE
	scene = new THREE.Scene();

	// CAMERA
	var SCREEN_WIDTH = window.innerWidth, SCREEN_HEIGHT = window.innerHeight;
	var VIEW_ANGLE = 45, ASPECT = SCREEN_WIDTH / SCREEN_HEIGHT, NEAR = 2, FAR = 5000;
	camera = new THREE.PerspectiveCamera( VIEW_ANGLE, ASPECT, NEAR, FAR);
	scene.add(camera);
	if(mobile()){
        camera.position.set(0,270,1000);
        var lookingPosition = new THREE.Vector3(scene.position.x, scene.position.y + 150, scene.position.z);
        gui.close();
    } else {
        camera.position.set(0,200,400);
        var lookingPosition = new THREE.Vector3(scene.position.x, scene.position.y, scene.position.z);
    }
	

	// RENDERER
	if ( Detector.webgl )
		renderer = new THREE.WebGLRenderer( {antialias:true} );
	else
		renderer = new THREE.CanvasRenderer(); 
	renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);
	container = document.getElementById('WebGL');
	container.appendChild( renderer.domElement );


	// EVENTS
	THREEx.WindowResize(renderer, camera);
    THREEx.FullScreen.bindKey({ charCode : 'f'.charCodeAt(0) }); // Va fullscreen se si preme f


    var keyboard = new THREEx.KeyboardState();

    window.addEventListener('keydown', function(event){
        if (event.repeat) {
            return;
        }
        var key     = "space";
        var pressed = keyboard.pressed(key);
        if(pressed){
            going = !going;
            if(going) {
        		song.play();
        	} else {
        		song.pause();
        	}
        }
    })

	// CONTROLS
	controls = new THREE.OrbitControls( camera, renderer.domElement );

    if (mobile()) {
        controls.target = lookingPosition;
    } else {
        controls.center = lookingPosition;
    }

	// STATS
	stats = new Stats();
	stats.domElement.style.position = 'absolute';
	stats.domElement.style.bottom = '0px';
	stats.domElement.style.zIndex = 100;
	container.appendChild( stats.domElement );

	// LIGHT
	var light = new THREE.PointLight(0xffffff);
	light.position.set(0,555,0);
	scene.add(light);

	// SPACE BOX
	var spaceTexture = new THREE.TextureLoader().load( 'images/space.png' );
	var spaceBoxGeometry = new THREE.SphereGeometry( 1000, 80, 80 );
	var sphereBox = new THREE.Mesh( spaceBoxGeometry, new THREE.MeshBasicMaterial( { map: spaceTexture } ) );
	sphereBox.scale.x = -1;
	sphereBox.doubleSided = true;
	scene.add( sphereBox );

	// STAR
	// texture base per mesh
	var lavaTexture = new THREE.ImageUtils.loadTexture( 'images/lava.jpg');
	lavaTexture.wrapS = lavaTexture.wrapT = THREE.RepeatWrapping; 
	// moltiplicatore per velocità distorsione  		
	var baseSpeed = 0.02;
	// number of times to repeat texture in each direction
	var repeatS = repeatT = 4.0;

	// texture che serve per generare casualità, distorce tutte le altre texture
	var noiseTexture = new THREE.ImageUtils.loadTexture( 'images/cloud.png' );
	noiseTexture.wrapS = noiseTexture.wrapT = THREE.RepeatWrapping; 
	// grandezza effetto rumore
	var noiseScale = 0.5;

	// texture che si mescola alla texture di base
	var blendTexture = new THREE.ImageUtils.loadTexture( 'images/lava.jpg' );
	blendTexture.wrapS = blendTexture.wrapT = THREE.RepeatWrapping; 
	// stessa cosa di basepeed 
	var blendSpeed = 0.01;
	// modella la luminosità e l'oscurità di blendTexture
	var blendOffset = 0.25;
	// texture per determinare il displacement sulla normale
	var bumpTexture = noiseTexture;
	bumpTexture.wrapS = bumpTexture.wrapT = THREE.RepeatWrapping; 
	// analogo a baseSpeed
	var bumpSpeed   = 0.15;
	// grandezza del displacement
	var bumpScale   = 15.0;

	// con this si hanno oggetti globali
	this.starUniforms = {
		baseTexture: 	{ type: "t", value: lavaTexture },
		baseSpeed:		{ type: "f", value: baseSpeed },
		repeatS:		{ type: "f", value: repeatS },
		repeatT:		{ type: "f", value: repeatT },
		noiseTexture:	{ type: "t", value: noiseTexture },
		noiseScale:		{ type: "f", value: noiseScale },
		blendTexture:	{ type: "t", value: blendTexture },
		blendSpeed: 	{ type: "f", value: blendSpeed },
		blendOffset: 	{ type: "f", value: blendOffset },
		bumpTexture:	{ type: "t", value: bumpTexture },
		bumpSpeed: 		{ type: "f", value: bumpSpeed },
		bumpScale: 		{ type: "f", value: bumpScale },
		alpha: 			{ type: "f", value: 1.0 },
		time: 			{ type: "f", value: 1.0 }
	};

	var sphereGeometry = new THREE.SphereGeometry( 100, 64, 64 );

	var starMaterial = new THREE.ShaderMaterial( 
	{
	    uniforms: starUniforms,
		vertexShader:   document.getElementById( 'vertexShaderStar'   ).textContent,
		fragmentShader: document.getElementById( 'fragmentShaderStar' ).textContent
	});
		
	starGeometry = new THREE.SphereGeometry( 100, 64, 64 );
	star = new THREE.Mesh(	starGeometry, starMaterial );
	star.rotation.z = 23.439281 * Math.PI / 180;

	scene.add( star );


	// GLOW
	this.glowUniforms = {
		"c":        {type: "f", value: 0.55},
		"p":        {type: "f", value: 6.0},
		glowColor:  {type: "c", value: new THREE.Color(0xb3afff)},
		viewVector: {type: "v3", value: camera.position}
	};

	var customMaterial = new THREE.ShaderMaterial({
		uniforms: glowUniforms,
		vertexShader: document.getElementById('vertexShaderGlow').textContent,
		fragmentShader: document.getElementById('fragmentShaderGlow').textContent,
		side: THREE.BackSide,
		blending: THREE.AdditiveBlending,
		transparent: true
	});

	starGlow = new THREE.Mesh(starGeometry.clone(), customMaterial.clone());
	starGlow.position = star.position;
	starGlow.scale.multiplyScalar(1.4);

	scene.add(starGlow);



	//PARTICLES
	particleGeometry = new THREE.BufferGeometry();
	particleData = createExplosionParticle(particles);

	particleGeometry.addAttribute('position', new THREE.BufferAttribute(new Float32Array(particles*3), 3));
    particleGeometry.addAttribute('customSize', new THREE.BufferAttribute(particleData.sz, 1));
    particleGeometry.addAttribute('theta', new THREE.BufferAttribute(particleData.th,1));
    particleGeometry.addAttribute('phi', new THREE.BufferAttribute(particleData.ph,1));
    particleGeometry.addAttribute('timeOffset', new THREE.BufferAttribute(particleData.timeOffset, 1));

	var particleColor = new Float32Array(3);
    particleColor[0] = 0.545098;
    particleColor[1] = 0.270588;
	particleColor[2] = 0.0745098;

	uniformsParticles = {
        t:              {value: 0.0},
        radius:         {value: radius},
        texture:        { value: new THREE.TextureLoader().load( "images/debrisParticle.png" ) },
        customColor:    {value: particleColor}
	};

	var shaderMaterial = new THREE.ShaderMaterial( {
		uniforms:       uniformsParticles,
		vertexShader:   document.getElementById( 'vertexShaderParticle' ).textContent,
		fragmentShader: document.getElementById( 'fragmentShaderParticle' ).textContent,
		blending:       THREE.AdditiveBlending,
		depthTest:      false,
		transparent:    true,
		vertexColors:   true
	});

	particleSystem = new THREE.Points( particleGeometry, shaderMaterial );
	particleSystem.boundingSphere = 50;
	particleSystem.sizeAttenuation = false;
	particleSystem.sortParticles = true;
	particleSystem.rotation.z = 23.439281 * Math.PI / 180;
	//scene.add( particleSystem );

}


function createExplosionParticle(particles) {
	var sizes = new Float32Array(particles);
	var to = new Float32Array(particles);
	var thetas = new Float32Array(particles);
    var phis = new Float32Array(particles);
	for ( var i = 0; i < particles; i ++ ) {            
        thetas[i] = THREE.Math.randFloatSpread(180);
        phis[i] = THREE.Math.randFloatSpread(360);

        to[i] = Math.random() * (particleTTL - 0) + 0;

		sizes[i] = Math.floor(Math.random() * particleSize) + 1;
	}

	return {sz: sizes, timeOffset: to, th: thetas, ph: phis};
}


function animate() 
{
    requestAnimationFrame( animate );
	render();		
	update();
}

function update()
{

	if(going) {

		if(!explosion) {

			// Aggiorno il displacement
			starUniforms.time.value += speed;

			// riduzione raggio star e glow
			star.scale.x -= 0.001;
			star.scale.y -= 0.001;
			star.scale.z -= 0.001;

			starGlow.scale.x -= 0.001;
			starGlow.scale.y -= 0.001;
			starGlow.scale.z -= 0.001;
		
			// regolo i valori di glow
			if(starGlow.material.uniforms.c.value > 0) {
				starGlow.material.uniforms.c.value -= 0.0005;
				parameters.c = starGlow.material.uniforms.c.value;
			}
			if(starGlow.material.uniforms.p.value <= 6) {
				starGlow.material.uniforms.p.value += 0.005;
				parameters.p = starGlow.material.uniforms.p.value;
			}

			// esplosione 
			if(star.scale.x < 0.09) {
				scene.add( particleSystem );
				star.material.dispose();
			    star.geometry.dispose();
			    scene.remove(star);
				explosion = true;
			}

		} else if(!pulsar) {

			// aumenta raggio luce esplosione
			starGlow.scale.x += 0.013;
			starGlow.scale.y += 0.013;
			starGlow.scale.z += 0.013;

			// espande esplosione
			time += 0.005;
			uniformsParticles.t.value += time;

			if(starGlow.material.uniforms.p.value > 2) {
				starGlow.material.uniforms.p.value -= 0.006;
				parameters.p = starGlow.material.uniforms.p.value;
			}

			if(starGlow.material.uniforms.c.value > 0) {
				starGlow.material.uniforms.c.value -= 0.0001;
				parameters.c = starGlow.material.uniforms.c.value;
			}

			if(starGlow.scale.x > 9.5) {
				pulsar = true;
			}
				
		} else {

			if(starGlow.material.uniforms.p.value < 5.5) {
				starGlow.material.uniforms.p.value += 0.009;
				parameters.p = starGlow.material.uniforms.p.value;
			}

			if(starGlow.material.uniforms.c.value < 0.1) {
				starGlow.material.uniforms.c.value += 0.0005;
				parameters.c = starGlow.material.uniforms.c.value;
			}
		}
		
	}

	starGlow.material.uniforms.viewVector.value = new THREE.Vector3().subVectors( camera.position, starGlow.position );
	
	controls.update();
	stats.update();
    
}


function render() 
{
	renderer.render( scene, camera );
}