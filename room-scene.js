import * as THREE from './vendor/three.module.js';

// Real geometry, real light. All room objects are built here so makers can remix them.
export function createRoom(host, onSelect) {
  const scene = new THREE.Scene();
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setClearColor(0, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  host.append(renderer.domElement);
  renderer.domElement.setAttribute('aria-hidden', 'true');
  const camera = new THREE.OrthographicCamera(-7, 7, 6, -6, .1, 80);
  const target = new THREE.Vector3(1.6, 1.3, .2);
  const views = {
    home: { target:[1.6,1.3,.2], angle:.65, height:12.8, width:18.6, elevation:10 },
    desk: { target:[1.35,1.1,1.35], angle:.45, height:5.8, width:7.8, elevation:7 },
    table: { target:[-2,1,2.15], angle:.5, height:5.7, width:7.5, elevation:7 },
    bed: { target:[6.35,1.0,-.45], angle:.52, height:6.2, width:8, elevation:8 },
  };
  let activeView='home', viewHeight=12.8, elevation=10, speaking=false;
  const desiredTarget=target.clone();
  let angle = .65, zoom = 1, pixel = false, phase = '', action = 'idle', lastFrame = 0, clock = 0;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const materials = new Map();
  const objects = [];
  const room = new THREE.Group(); scene.add(room);
  const mat = (color, emissive = false) => {
    const key = `${color}-${emissive}`;
    if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color, roughness: .83, metalness: .02, ...(emissive ? { emissive: color, emissiveIntensity: 1.3 } : {}) }));
    return materials.get(key);
  };
  const box = (parent, size, pos, color, options = {}) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), typeof color === 'string' ? mat(color, options.glow) : color);
    mesh.position.set(...pos); mesh.castShadow = options.shadow !== false; mesh.receiveShadow = true;
    if (options.rotation) mesh.rotation.set(...options.rotation);
    parent.add(mesh); return mesh;
  };
  const group = (name, pos, panel) => {
    const g = new THREE.Group(); g.position.set(...pos); room.add(g);
    if (panel) { g.userData = { panel, label: name }; objects.push(g); }
    return g;
  };
  const cylinder = (parent, top, bottom, height, pos, color, sides = 8) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(top, bottom, height, sides), mat(color));
    m.position.set(...pos); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
  };
  const line = (points, color, parent = room) => {
    const g = new THREE.BufferGeometry().setFromPoints(points.map(p => new THREE.Vector3(...p)));
    const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color })); parent.add(l);
  };

  // Raised diorama plinth and individually laid oak floorboards.
  box(room, [8.35, .36, 7.45], [0, -.24, 0], '#49392f');
  box(room, [8.2, .10, 7.3], [0, -.025, 0], '#b27d50');
  const woods = ['#b59168', '#b99a75', '#bd9b72', '#aa855e', '#c4a17c'];
  for (let row = 0; row < 18; row++) {
    for (let col = 0; col < 5; col++) {
      const x = -3.2 + col * 1.62;
      box(room, [1.605, .035, .392], [x, .035, -3.43 + row * .402], woods[(row * 3 + col * 7) % woods.length], { shadow: false });
    }
  }
  // Walls wrap around window openings instead of covering them.
  const wall = (parent) => {
    box(parent, [8.2, 1.48, .19], [0, .77, 0], '#746278');
    box(parent, [8.2, .83, .19], [0, 3.985, 0], '#827087');
    box(parent, [1.5, 2.0, .19], [-3.35, 2.5, 0], '#817086');
    box(parent, [4.1, 2.0, .19], [2.05, 2.5, 0], '#817086');
    box(parent, [8.3, .16, .26], [0, 4.46, 0], '#a189a0');
    box(parent, [8.18, .18, .13], [0, .18, .16], '#5e4b61');
    for (let i = 0; i < 17; i++) box(parent, [.025, 1.10, .025], [-4 + i * .5, .82, .11], '#88768c', { shadow: false });
    box(parent, [8.18, .06, .08], [0, 1.4, .15], '#9d859c');
  };
  const back = new THREE.Group(); back.position.z = -3.61; room.add(back); wall(back);
  const left = new THREE.Group(); left.position.set(-4.04, 0, .36); left.rotation.y = Math.PI / 2; room.add(left); wall(left);
  const skies = [], lamps = [];
  const windowAt = (parent) => {
    const skyMat = new THREE.MeshBasicMaterial({ color: '#d5e7d7' }); skies.push(skyMat);
    box(parent, [2.65, 2.12, .035], [-1.32, 2.5, -.14], skyMat, { shadow: false });
    // Distant trees as little stepped silhouettes.
    for (let i = 0; i < 10; i++) {
      const x = -2.48 + i * .25, height = .35 + (i % 4) * .12;
      box(parent, [.20, height, .02], [x, 1.7 + height / 2, -.10], i % 2 ? '#a2b99e' : '#839b86', { shadow: false });
    }
    for (const x of [-2.69, -1.32, .05]) box(parent, [.08, 2.14, .16], [x, 2.5, .07], '#deb68e');
    for (const y of [1.45, 2.51, 3.56]) box(parent, [2.82, .085, .16], [-1.32, y, .07], '#deb68e');
    box(parent, [3.10, .14, .42], [-1.32, 1.43, .12], '#d8b18a');
    box(parent, [3.42, .055, .07], [-1.32, 3.79, .28], '#b59265');
    for (const side of [-2.89, .28]) {
      for (let fold = 0; fold < 5; fold++) box(parent, [.115, 2.52, .15], [side + fold * .075, 2.42, .22 + (fold % 2) * .08], fold % 2 ? '#3d6063' : '#4d7273');
      box(parent, [.41, .07, .22], [side + .15, 1.94, .34], '#bf9661');
    }
  };
  windowAt(back); windowAt(left);

  // Soft woven rug, couch, knit cushions, and a throw.
  const rug = group('The softest rug', [-.4, .065, .40]);
  box(rug, [4.6, .035, 3.6], [0, 0, 0], '#9cafa1');
  box(rug, [4.36, .012, 3.36], [0, .026, 0], '#b8c3ac');
  box(rug, [4.05, .013, 3.06], [0, .033, 0], '#a0b0a0');
  for (let i = 0; i < 28; i++) box(rug, [.028, .016, 3.02], [-1.95 + i * .145, .045, 0], '#acbbaa', { shadow: false });
  for (let i = 0; i < 24; i++) for (const z of [-1.84, 1.84]) box(rug, [.065, .02, .13], [-2.15 + i * .185, 0, z], '#c8c9ac', { shadow: false });
  const sofa = group('Sofa · rest & diary', [-.05, 0, -1.95], 'diary');
  for (const x of [-1.40, 1.40]) for (const z of [-.42, .45]) box(sofa, [.13, .24, .13], [x, .17, z], '#604533');
  box(sofa, [3.15, .40, 1.20], [0, .50, 0], '#b8755f');
  box(sofa, [3.10, 1.0, .25], [0, 1.07, -.48], '#cb9176');
  for (const x of [-1.57, 1.57]) box(sofa, [.25, .77, 1.24], [x, .85, 0], '#c5876c');
  for (const x of [-.76, 0, .76]) {
    box(sofa, [.74, .21, .94], [x, .78, .12], '#e0b190');
    box(sofa, [.72, .68, .22], [x, 1.13, -.27], '#d5a084', { rotation: [-.12, 0, 0] });
  }
  for (const [x,c] of [[-1.05,'#788b7c'], [1.02,'#96677b']]) box(sofa, [.49,.53,.25], [x,1.1,.13], c, {rotation:[-.12,0,x * -.19]});
  for(let i=0;i<9;i++) box(sofa,[.055,.07,1.1],[.65+i*.065,.95,.13],i%2?'#d8c6a4':'#b7a28c');

  const plant = (parent, x, y, z, scale = 1) => {
    const p = new THREE.Group(); p.position.set(x,y,z); p.scale.setScalar(scale); parent.add(p);
    cylinder(p,.23,.17,.40,[0,.20,0],'#bd825e');
    cylinder(p,.235,.235,.055,[0,.42,0],'#d9a684');
    cylinder(p,.19,.19,.022,[0,.435,0],'#4d4633');
    box(p,[.045,1.18,.045],[0,.96,0],'#65714a');
    for(let i=0;i<9;i++) {
      const a=i*2.4, h=.62+i*.115;
      const leaf=box(p,[.34,.10,.25],[Math.sin(a)*.22,h,Math.cos(a)*.22],['#5b8054','#7c9b68','#9eaf73'][i%3]);
      leaf.rotation.set(Math.sin(a)*.3,a,Math.cos(a)*.3);
      box(p,[.19,.10,.23],[Math.sin(a)*.39,h+.01,Math.cos(a)*.39],['#5b8054','#7c9b68','#9eaf73'][i%3]);
    }
    return p;
  };
  const garden = group('Plant · growing together', [-2.55,0,-2.34], 'growth');
  plant(garden,0,0,0,1.1);

  // Tall bookcase with books, a trailing plant, framed memory and collectibles.
  const shelf = group('Bookshelf · memories', [3.19,0,-2.61], 'memories');
  box(shelf,[1.15,3.0,.08],[0,1.6,-.28],'#635048');
  box(shelf,[.95,2.76,.05],[0,1.6,-.22],'#493e3b');
  for(const x of [-.59,.59]) box(shelf,[.09,3.0,.68],[x,1.6,.07],'#886653');
  for(let row=0;row<5;row++) {
    const y=.25+row*.57;
    box(shelf,[1.27,.075,.75],[0,y,.07],'#9b775b');
    for(let i=0;i<5;i++) {
      const h=.23+(i+row)%3*.075, x=-.44+i*.175;
      box(shelf,[.13,h,.30],[x,y+.04+h/2,.17],['#d5aa77','#8d9e91','#b37969','#c7bf9e','#6a7f8b'][(row+i)%5],{rotation:[0,0,i===4?.13:0]});
      box(shelf,[.09,.025,.009],[x,y+.13,.326],'#e4d4b7',{shadow:false});
    }
  }
  plant(shelf,-.12,3.13,0,.43);
  const extra = group('Little things we earned', [3.40,3.39,-2.42]);
  box(extra,[.28,.25,.22],[0,0,0],'#a483b8');
  box(extra,[.10,.12,.12],[-.1,.18,0],'#c4a0d5');box(extra,[.10,.12,.12],[.1,.18,0],'#c4a0d5');

  // Front desk, working laptop, notebook, water glass, lamp and chair.
  const desk = group('Laptop · focus with Pixo', [1.5,0,1.25], 'focus');
  box(desk,[2.62,.15,1.16],[0,1.17,0],'#997451');
  box(desk,[2.58,.045,1.13],[0,1.27,0],'#ba966d');
  for(const x of [-1.09,1.09]) for(const z of [-.43,.43]) box(desk,[.09,1.12,.10],[x,.60,z],'#454844');
  const laptop = new THREE.Group(); desk.add(laptop);
  box(laptop,[.90,.06,.62],[0,1.34,0],'#7d8885');
  box(laptop,[.78,.012,.32],[0,1.376,-.04],'#40484c');
  for(let row=0;row<3;row++)for(let col=0;col<8;col++)box(laptop,[.068,.009,.06],[-.32+col*.09,1.386,-.14+row*.085],'#a8b6ae',{shadow:false});
  box(laptop,[.23,.014,.10],[0,1.38,.23],'#aeb8af');
  const display = box(laptop,[.91,.63,.055],[0,1.65,-.27],'#454e51',{rotation:[-.11,0,0]});
  const screenMat = new THREE.MeshStandardMaterial({color:'#aacbc1',emissive:'#a8d6c8',emissiveIntensity:.5,roughness:.4});
  box(laptop,[.80,.51,.013],[0,1.66,-.226],screenMat,{rotation:[-.11,0,0]});
  for(let i=0;i<4;i++) box(laptop,[.43-i*.06,.025,.012],[-.07,1.79-i*.09,-.18],'#5b8383',{shadow:false});
  const notes = group('Notebook · today’s quest', [.59,1.31,1.35], 'quest');
  box(notes,[.40,.048,.49],[0,0,0],'#dcc6a4',{rotation:[0,-.15,0]});
  for(let i=0;i<4;i++)box(notes,[.23,.01,.018],[0,.03,-.13+i*.075],'#a29c87',{shadow:false});
  const glass = group('Water · a little care', [2.35,1.34,1.45], 'care');
  cylinder(glass,.12,.10,.24,[0,.12,0],'#8dbab8');cylinder(glass,.105,.105,.02,[0,.245,0],'#d1e4db');
  const lamp = group('Desk lamp · room light', [2.49,1.32,.9], 'light');
  cylinder(lamp,.15,.19,.07,[0,0,0],'#c7a064');box(lamp,[.035,.43,.035],[0,.25,0],'#bd9257');
  cylinder(lamp,.13,.25,.25,[0,.56,0],'#e4c390');
  const lampLight = new THREE.PointLight('#ffc075',9,4,2);lampLight.position.set(0,.45,.04);lamp.add(lampLight);lamps.push(lampLight);
  const chair = group('Your little seat', [1.4,0,2.35]);
  cylinder(chair,.11,.14,.6,[0,.34,0],'#474d47');box(chair,[.82,.16,.72],[0,.67,0],'#657970');
  box(chair,[.84,.81,.16],[0,1.05,.36],'#7c9183');
  for(const x of [-.36,.36])box(chair,[.07,.35,.55],[x,.9,0],'#49564e');
  box(chair,[1,.07,.12],[0,.07,0],'#414944');box(chair,[.12,.07,.9],[0,.07,0],'#414944');

  // Aquarium with moving fish and little plants.
  const aquarium = group('Aquarium · take a breath', [-2.95,0,1.25], 'rest');
  box(aquarium,[1.35,.12,.80],[0,.88,0],'#795b46');
  for(const x of [-.55,.55])for(const z of [-.3,.3])box(aquarium,[.09,.82,.09],[x,.43,z],'#554b41');
  box(aquarium,[1.24,.09,.69],[0,1,0],'#324e50');
  const waterMat = new THREE.MeshPhysicalMaterial({color:'#72a6aa',transparent:true,opacity:.30,roughness:.12,metalness:.08,depthWrite:false});
  box(aquarium,[1.17,.65,.61],[0,1.37,0],waterMat,{shadow:false});
  box(aquarium,[1.26,.065,.70],[0,1.72,0],'#42666a');
  box(aquarium,[1.16,.05,.6],[0,1.065,0],'#cdb995');
  for(let i=0;i<4;i++)box(aquarium,[.04,.19+(i%3)*.09,.07],[-.41+i*.21,1.22, -.18],'#688c60');
  const fish = [];
  for(let i=0;i<3;i++){
    const f=new THREE.Group();f.position.set(-.3+i*.27,1.30+i*.09,.10);aquarium.add(f);
    box(f,[.16,.09,.06],[0,0,0],i%2?'#f2bc65':'#d88c56');box(f,[.07,.13,.035],[-.1,0,0],'#d59765');fish.push(f);
  }
  const table=group('A page for today',[-1.62,0,-.22]);
  cylinder(table,.47,.48,.10,[0,.63,0],'#b88965');
  for(const x of [-.26,.26])box(table,[.07,.6,.07],[x,.3,0],'#8c684b');
  box(table,[.52,.035,.35],[0,.71,0],'#e1d4b9',{rotation:[0,.3,0]});

  const backpack=group('Backpack · our little collection',[-1.74,0,2.58],'backpack');
  box(backpack,[.51,.54,.30],[0,.31,0],'#bf915c');box(backpack,[.35,.24,.10],[0,.26,.2],'#d9ad73');
  box(backpack,[.20,.045,.06],[0,.63,0],'#805f43');box(backpack,[.06,.11,.06],[0,.44,.265],'#f1d39a');

  // An adjoining bedroom: continuous flooring, an open doorway, linen, and a bedside light.
  box(room,[4.65,.36,7.45],[6.48,-.24,0],'#49392f');
  for(let r=0;r<18;r++)for(let c=0;c<3;c++)box(room,[1.49,.09,.397],[4.95+c*1.51,0,-3.4+r*.4],woods[(r+c)%woods.length]);
  box(room,[4.66,4.25,.16],[6.47,2.10,-3.6],'#647779');
  box(room,[4.72,.13,.23],[6.47,4.28,-3.6],'#8b9b98');
  for(let i=0;i<9;i++)box(room,[.04,4.1,.07],[4.3+i*.53,2.08,-3.48],'#768989');
  box(room,[4.7,.17,.12],[6.47,.14,-3.48],'#bec0a7');
  const bed=group('Bed · sleep together',[6.35,0,-.6],'sleep');
  box(bed,[2.3,.25,3.45],[0,.37,0],'#79634f');
  box(bed,[2.22,1.15,.20],[0,.89,-1.64],'#a08b6c');
  box(bed,[2.13,.27,3.23],[0,.63,0],'#e6d6b7');
  box(bed,[1.78,.20,.70],[0,.86,-1.07],'#f6ead5');
  box(bed,[2.14,.12,2.17],[0,.85,.48],'#839a87');
  for(let i=0;i<8;i++)box(bed,[2.15,.018,.03],[0,.919,-.49+i*.28],'#a3b29b',{shadow:false});
  const bedside=group('Bedside lamp · night light',[7.97,0,-1.95],'light');
  box(bedside,[.76,.72,.72],[0,.4,0],'#b49570');
  box(bedside,[.8,.075,.76],[0,.79,0],'#d0b58f');
  cylinder(bedside,.09,.14,.3,[0,1,0],'#a78153');cylinder(bedside,.20,.30,.37,[0,1.28,0],'#e8cfa0');
  const bedsideLight=new THREE.PointLight('#ffbb73',3,5,2);bedsideLight.position.set(0,1.3,.15);bedside.add(bedsideLight);lamps.push(bedsideLight);
  box(room,[3.0,.015,4.45],[6.4,.065,-.5],'#9fa590',{shadow:false});
  plant(room,8.15,0,2.25,.9);
  const dresser=group('A quiet corner',[4.8,0,-2.9],'backpack');
  box(dresser,[.85,1.4,.8],[0,.7,0],'#a38765');
  for(let i=0;i<3;i++){box(dresser,[.75,.37,.04],[0,.25+i*.45,.43],'#c0a27b');box(dresser,[.15,.035,.04],[0,.25+i*.45,.46],'#7d7058');}
  plant(dresser,0,1.42,0,.36);
  // Dining space in the foreground. Pixo sits on the far side, facing the viewer.
  const dining=group('Dining table · eat with me',[-2.05,0,2.6],'eat');
  box(dining,[1.5,.13,1.1],[0,.78,0],'#c7a079');
  for(const x of [-.59,.59])for(const z of [-.41,.41])box(dining,[.08,.75,.08],[x,.38,z],'#7b6650');
  cylinder(dining,.23,.18,.055,[0,.875,-.13],'#f3e6c8');
  for(let i=0;i<7;i++)box(dining,[.09,.05,.08],[-.13+(i%3)*.11,.93,-.23+Math.floor(i/3)*.08],i%2?'#c98851':'#83a365');
  cylinder(dining,.09,.08,.20,[.47,.94,-.2],'#87aeaf');
  box(dining,[.045,.018,.4],[-.39,.863,-.06],'#bec5b6');
  const diningChair=group('Dining chair',[-2.05,0,1.58]);
  box(diningChair,[.62,.10,.61],[0,.44,0],'#9b8063');box(diningChair,[.64,.68,.09],[0,.76,-.25],'#aa8f6c');
  for(const x of [-.24,.24])for(const z of [-.23,.23])box(diningChair,[.06,.45,.06],[x,.22,z],'#79654f');

  // String lights and wall art give the room a lived-in feel.
  const bulbs=[];
  for(let i=0;i<11;i++){
    const x=-3.65+i*.69, y=4.06-Math.sin(i/10*Math.PI)*.35;
    bulbs.push([x,y,-3.36]);
    box(room,[.085,.12,.085],[x,y-.12,-3.36],'#ffd494',{glow:true});
    if(i%4===0){const l=new THREE.PointLight('#ffba72',1.2,2.5);l.position.set(x,y-.2,-3.15);room.add(l);lamps.push(l);}
  }
  line(bulbs,'#4d4641');
  const art=group('A small reminder',[1.45,2.65,-3.45]);
  box(art,[.72,.92,.08],[0,0,0],'#ccac82');box(art,[.61,.81,.015],[0,0,.06],'#3e5a59');
  box(art,[.12,.43,.02],[0,-.08,.08],'#88a27a');box(art,[.30,.17,.02],[-.10,.09,.08],'#a5b885');
  box(art,[.30,.17,.02],[.08,-.02,.08],'#c7c79b');

  // Pixo is a voxel creature: layered body, fur blocks, expressive eyes, orange beanie.
  const pixo=group('Pixo · say hello',[-.7,0,1.25],'talk');
  pixo.scale.setScalar(1.13);
  const body=new THREE.Group();pixo.add(body);
  const purples=['#9561ba','#a771cc','#b582dc','#8c59aa'];
  for(let layer=0;layer<8;layer++){
    const width=[.44,.66,.82,.88,.88,.79,.65,.44][layer];
    box(body,[width,.115,.52],[0,.35+layer*.11,0],purples[layer%4]);
    for(let j=0;j<4;j++){
      const side=j%2?1:-1;
      box(body,[.115,.115,.12],[side*(width/2),.36+layer*.11,-.20+(j>1?.4:0)],purples[(layer+j)%4]);
    }
  }
  const feet=[];for(const x of [-.23,.23])feet.push(box(body,[.27,.15,.40],[x,.14,.10],'#a47acb'));
  const arms=[];for(const x of [-.5,.5]){const pivot=new THREE.Group();pivot.position.set(x,.76,.05);body.add(pivot);box(pivot,[.18,.4,.22],[0,-.16,0],'#ab78d0');arms.push(pivot);}
  box(body,[.87,.16,.63],[0,1.15,-.015],'#e98c4e');
  box(body,[.70,.16,.55],[0,1.29,-.015],'#f09a5b');box(body,[.47,.12,.40],[0,1.42,-.015],'#ee9756');
  for(let i=0;i<7;i++)box(body,[.025,.18,.017],[-.33+i*.11,1.27,.272],'#c87244',{shadow:false});
  box(body,[.19,.19,.024],[.18,1.18,.322],'#f9dec0');box(body,[.075,.105,.03],[.18,1.18,.34],'#8c63a5');
  const eyes=[];
  for(const x of [-.22,.22]){
    const eye=new THREE.Group();eye.position.set(x,.92,.30);body.add(eye);
    box(eye,[.30,.30,.085],[0,0,0],'#f5ead7');box(eye,[.14,.19,.055],[.025,-.015,.06],'#48302a');
    box(eye,[.07,.115,.035],[.035,-.01,.09],'#201d22');box(eye,[.055,.055,.02],[.06,.055,.112],'#fff9ec');eyes.push(eye);
    box(body,[.14,.07,.02],[x*1.5,.71,.305],'#e8a199');
  }
  const mouth=box(body,[.16,.045,.035],[0,.68,.31],'#392d3a');box(body,[.08,.035,.038],[0,.65,.31],'#392d3a');
  // Satchel and diagonal strap.
  box(body,[.53,.24,.17],[.07,.38,.35],'#d6ab70');box(body,[.17,.16,.025],[.21,.40,.445],'#9870b8');
  for(let i=0;i<7;i++)box(body,[.13,.12,.07],[-.32+i*.077,.78-i*.064,.32],'#deb880');
  const carried = new THREE.Group();arms[0].add(carried);carried.position.set(0,-.35,.15);
  cylinder(carried,.075,.065,.16,[0,0,0],'#8ecbc3');carried.visible=false;
  const spoon=new THREE.Group();arms[1].add(spoon);spoon.position.set(0,-.32,.15);
  box(spoon,[.025,.03,.32],[0,0,.03],'#c8ccbb');box(spoon,[.07,.03,.09],[0,0,.22],'#e0d9b6');spoon.visible=false;
  const droplets=[];for(let i=0;i<4;i++){const d=box(room,[.025,.045,.025],[0,0,0],'#a7dad8',{shadow:false});d.visible=false;droplets.push(d);}
  const sleep = new THREE.Group();body.add(sleep);sleep.position.set(.18,1.7,0);
  for(let i=0;i<3;i++)box(sleep,[.11,.045,.035],[i*.10,i*.15,0],'#d7c59f');sleep.visible=false;
  pixo.rotation.y=.5;

  const hemi = new THREE.HemisphereLight('#e1ecf0','#836347',2.8);scene.add(hemi);
  const sun = new THREE.DirectionalLight('#ffdfb1',3.4);sun.position.set(-3,8,4);sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-7;sun.shadow.camera.right=7;sun.shadow.camera.top=7;sun.shadow.camera.bottom=-7;
  sun.shadow.normalBias=.04;sun.shadow.bias=-.00015;scene.add(sun);
  const fill=new THREE.DirectionalLight('#d0dfea',1.5);fill.position.set(5,4,6);scene.add(fill);
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.ShadowMaterial({opacity:.13}));
  ground.rotation.x=-Math.PI/2;ground.position.y=-.43;ground.receiveShadow=true;scene.add(ground);

  const setPhase = (value) => {
    if(value===phase)return;phase=value;
    const night=value==='night'; const evening=value==='evening';
    hemi.intensity=night?1.0:1.9;sun.intensity=night?.30:evening?2.5:2.5;
    fill.intensity=night?.75:1.0;sun.color.set(night?'#a1b1ee':evening?'#ffc082':'#ffe6bd');
    hemi.color.set(night?'#899acb':'#dfecf1');
    skies.forEach(m=>m.color.set(night?'#26395b':evening?'#eab997':'#d4e6d9'));
    lamps.forEach((l,i)=>l.intensity=(i===0?9:1.2)*(night?1.25:.45));
  };
  const resize = () => {
    const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;
    renderer.setPixelRatio(pixel?.7:Math.min(window.devicePixelRatio,1.6));renderer.setSize(w,h);
    renderer.domElement.style.imageRendering=pixel?'pixelated':'auto';
  };
  const observer=new ResizeObserver(resize);observer.observe(host);
  const ray=new THREE.Raycaster(), pointer=new THREE.Vector2();let start=null,dragging=false;
  const hit = (event) => {
    const r=renderer.domElement.getBoundingClientRect();pointer.set((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1);
    ray.setFromCamera(pointer,camera);
    const hits=ray.intersectObjects(objects,true);
    if(!hits.length)return null;
    let node=hits[0].object;while(node&&!node.userData.panel)node=node.parent;return node;
  };
  const tooltip=document.querySelector('#room-tooltip');
  renderer.domElement.addEventListener('pointerdown',e=>{start={x:e.clientX,y:e.clientY,angle};dragging=false;renderer.domElement.setPointerCapture(e.pointerId);});
  renderer.domElement.addEventListener('pointermove',e=>{
    if(start&&Math.abs(e.clientX-start.x)>5){dragging=true;angle=THREE.MathUtils.clamp(start.angle+(e.clientX-start.x)*.002,.32,1.14);tooltip.hidden=true;}
    else if(!start){const object=hit(e);renderer.domElement.style.cursor=object?'pointer':'grab';tooltip.hidden=!object;
      if(object){tooltip.textContent=object.userData.label;const b=host.parentElement.getBoundingClientRect();tooltip.style.left=`${Math.min(b.width-200,Math.max(10,e.clientX-b.left+12))}px`;tooltip.style.top=`${e.clientY-b.top-38}px`;}}
  });
  renderer.domElement.addEventListener('pointerup',e=>{if(start&&!dragging){const object=hit(e);if(object)onSelect(object.userData.panel);}start=null;});
  renderer.domElement.addEventListener('pointercancel',()=>{start=null;});
  renderer.domElement.addEventListener('pointerleave',()=>{tooltip.hidden=true;});
  renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();host.dispatchEvent(new Event('room:lost'));});
  let position=new THREE.Vector3(-.7,0,1.25), destination=position.clone(), sinceAction=0, blinkAt=3, blinkEnd=0, celebration=0;
  const destinations={working:[1.38,.48,2.17],sleeping:[6.35,.91,-.35],watering:[-2.3,0,-1.45],reading:[-.85,.57,-1.72],water:[-.7,0,1.95],eating:[-2.05,.19,1.52],idle:[-.7,0,1.25],stretch:[-.7,0,1.25]};
  let waypoints=[];
  const setAction = (value) => {
    if(!destinations[value])value='idle';
    if(value===action)return;action=value;sinceAction=clock;
    const final=new THREE.Vector3(...destinations[value]);
    // Walk through the open central aisle before settling into furniture.
    waypoints=[];
    if(position.x>4||final.x>4){waypoints.push(new THREE.Vector3(position.x,0,2.4),new THREE.Vector3(final.x,0,2.4));}
    else if(position.distanceTo(final)>1.5){waypoints.push(new THREE.Vector3(-.15,0,1.1));}
    waypoints.push(final);destination.copy(waypoints.shift());
  };
  const setView = value => {if(!views[value])return;activeView=value;desiredTarget.set(...views[value].target);angle=views[value].angle;zoom=1;};
  let raf;
  const frame=(time)=>{
    raf=requestAnimationFrame(frame);if(document.hidden||time-lastFrame<33)return;
    const dt=Math.min((time-lastFrame)/1000,.08);lastFrame=time;clock+=dt;
    const ratio=host.clientWidth/Math.max(1,host.clientHeight),v=views[activeView];
    const desiredHeight=Math.max(v.height,v.width/ratio);
    viewHeight=THREE.MathUtils.lerp(viewHeight,desiredHeight,reduceMotion.matches?1:Math.min(1,dt*4));
    elevation=THREE.MathUtils.lerp(elevation,v.elevation,Math.min(1,dt*4));target.lerp(desiredTarget,reduceMotion.matches?1:Math.min(1,dt*4));
    camera.left=-viewHeight*ratio/2;camera.right=viewHeight*ratio/2;camera.top=viewHeight/2;camera.bottom=-viewHeight/2;camera.zoom=zoom;camera.updateProjectionMatrix();
    camera.position.set(target.x+Math.sin(angle)*13,target.y+elevation,target.z+Math.cos(angle)*13);camera.lookAt(target);
    const moving=position.distanceTo(destination)>.035;
    if(!moving&&waypoints.length)destination.copy(waypoints.shift());
    position.lerp(destination,reduceMotion.matches?1:Math.min(1,dt*1.8));pixo.position.copy(position);
    const settled=!moving&&!waypoints.length;
    body.rotation.x=settled&&action==='sleeping'?-Math.PI/2:0;
    if(!reduceMotion.matches){
      body.position.y=moving?Math.abs(Math.sin(clock*10))*.065:action==='working'?Math.sin(clock*5)*.015:Math.sin(clock*2)*.025;
      body.rotation.z=settled&&action==='sleeping'?0:Math.sin(clock*1.5)*.018;
      arms.forEach((a,i)=>a.rotation.x=action==='working'?-.7+Math.sin(clock*12+i)*.15:moving?Math.sin(clock*10+i*Math.PI)*.4:Math.sin(clock*2+i)*.08);
      if(settled&&action==='water'){arms[0].rotation.x=-2.3+Math.sin(clock*1.8)*.18;arms[0].rotation.z=-.3;body.rotation.x=-.1;}
      if(settled&&action==='eating'){arms[1].rotation.x=-1.4-Math.sin(clock*2.4)*.7;mouth.scale.y=1+Math.max(0,Math.sin(clock*2.4))*2;}
      if(settled&&action==='watering'){arms[0].rotation.x=-1.5;carried.rotation.z=.5;}
      if(action==='stretch'){arms.forEach((a,i)=>{a.rotation.z=(i?1:-1)*2.6;a.rotation.x=0;});body.rotation.z=Math.sin(clock*.8)*.16;}
      feet.forEach((f,i)=>f.rotation.x=moving?Math.sin(clock*10+i*Math.PI)*.4:0);
      fish.forEach((f,i)=>{f.position.x=Math.sin(clock*.65+i*2)*.38;f.rotation.y=Math.cos(clock*.65+i*2)>0?0:Math.PI;});
    }
    pixo.rotation.y=moving?Math.atan2(destination.x-position.x,destination.z-position.z):action==='working'?Math.PI:action==='sleeping'||action==='eating'?0:.5;
    if(clock>blinkAt){blinkEnd=clock+.15;blinkAt=clock+3+Math.random()*4;}
    eyes.forEach(e=>e.scale.y=settled&&action==='sleeping'?.12:clock<blinkEnd?.12:1);
    carried.visible=action==='water'||action==='watering';spoon.visible=action==='eating';sleep.visible=settled&&action==='sleeping';
    if(action!=='watering')carried.rotation.z=0;
    if(action!=='eating')mouth.scale.y=speaking?1+Math.abs(Math.sin(clock*15))*3:1;
    droplets.forEach((d,i)=>{d.visible=settled&&action==='watering';d.position.set(position.x-.4,.7-((clock*.55+i*.15)%.65),position.z+.3);});
    if(clock<celebration&&!reduceMotion.matches){body.position.y=Math.abs(Math.sin(clock*13))*.20;arms.forEach((a,i)=>a.rotation.z=(i?1:-1)*.9);}
    else if(action!=='stretch'&&action!=='water')arms.forEach(a=>a.rotation.z=0);
    renderer.render(scene,camera);
  };
  setPhase('morning');resize();raf=requestAnimationFrame(frame);
  return {setPhase,setAction,setView,setSpeaking:value=>{speaking=Boolean(value);},celebrate:()=>{celebration=clock+2;},setPixel:value=>{pixel=value;resize();},reset:()=>setView('home'),setGrowth:days=>{extra.visible=days>=7;garden.scale.setScalar(1+Math.min(days,30)*.005);},dispose:()=>{cancelAnimationFrame(raf);observer.disconnect();scene.traverse(n=>{n.geometry?.dispose();});materials.forEach(m=>m.dispose());renderer.dispose();}};
}
