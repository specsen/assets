/* Reproducible GLB 2.0 courtyard assets. Units: metres, Y up, foot-centre origin. */
'use strict';
const fs=require('node:fs'),path=require('node:path');
const modules=process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
const {createCanvas}=require(modules?path.join(modules,'@napi-rs/canvas'):'@napi-rs/canvas');
const root=path.resolve(__dirname,'..');
const assetDir=fs.existsSync(path.join(root,'assets168'))?path.join(root,'assets168'):root;
const out=path.join(assetDir,'models/environment/rhenus-yard/v34168');
const tex=path.join(assetDir,'textures/environment/rhenus-yard/v34168');
fs.mkdirSync(out,{recursive:true});fs.mkdirSync(tex,{recursive:true});
for(const f of ['concrete-basecolor.png','pallet-wood-basecolor.png']){
  const source=fs.existsSync(path.join(root,'materials168',f))?path.join(root,'materials168',f):path.join(tex,f);
  const target=path.join(tex,f);if(source!==target)fs.copyFileSync(source,target);
}
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const add=(a,b)=>a.map((v,i)=>v+b[i]);
const scale=(a,k)=>a.map(v=>v*k);
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const unit=a=>scale(a,1/(Math.hypot(...a)||1));
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));

// Independent, periodic microstructure maps. They are procedural maps, not a
// claim to measured height data from the AI-generated base-colour photograph.
function noiseMaps(){
  const n=512,c=createCanvas(n,n),ctx=c.getContext('2d'),normal=ctx.createImageData(n,n),orm=ctx.createImageData(n,n);
  function value(x,y){
    return .42*Math.sin(x*2*Math.PI/n*13+Math.sin(y*2*Math.PI/n*11))
      +.19*Math.sin(x*2*Math.PI/n*57+y*2*Math.PI/n*49)
      +.10*Math.sin(x*2*Math.PI/n*117-y*2*Math.PI/n*131);
  }
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){
    const i=(y*n+x)*4,dx=(value(x+1,y)-value(x-1,y))*.075,dy=(value(x,y+1)-value(x,y-1))*.075;
    const v=unit([-dx,-dy,1]);normal.data[i]=Math.round((v[0]*.5+.5)*255);normal.data[i+1]=Math.round((v[1]*.5+.5)*255);normal.data[i+2]=Math.round((v[2]*.5+.5)*255);normal.data[i+3]=255;
    orm.data[i]=255;orm.data[i+1]=Math.round(clamp(.86+value(x,y)*.035,0,1)*255);orm.data[i+2]=0;orm.data[i+3]=255;
  }
  ctx.putImageData(normal,0,0);fs.writeFileSync(path.join(tex,'concrete-normal-procedural.png'),c.toBuffer('image/png'));
  ctx.putImageData(orm,0,0);fs.writeFileSync(path.join(tex,'concrete-orm-procedural.png'),c.toBuffer('image/png'));
  const s=createCanvas(128,128),sc=s.getContext('2d'),im=sc.createImageData(128,128);
  for(let y=0;y<128;y++)for(let x=0;x<128;x++){
    const i=(y*128+x)*4,r=Math.hypot((x-63.5)/63.5,(y-63.5)/63.5);
    im.data[i]=im.data[i+1]=im.data[i+2]=0;im.data[i+3]=Math.round(72*Math.pow(Math.max(0,1-r*r),2));
  }
  sc.putImageData(im,0,0);fs.writeFileSync(path.join(tex,'contact-soft.png'),s.toBuffer('image/png'));
}
noiseMaps();
const mats={
  blue:{name:'worn_blue_powder_coated_steel',color:[.055,.19,.31,1],metal:.60,rough:.43},
  edge:{name:'exposed_galvanized_edge',color:[.36,.39,.40,1],metal:.88,rough:.52},
  dark:{name:'dark_cast_iron',color:[.115,.135,.145,1],metal:.64,rough:.69},
  rubber:{name:'rubber_base_and_black_stripe',color:[.022,.026,.030,1],metal:0,rough:.84},
  yellow:{name:'traffic_yellow_paint',color:[.94,.65,.035,1],metal:.12,rough:.55},
  concrete:{name:'dry_pale_concrete',color:[.75,.76,.74,1],metal:0,rough:.9},
  wood:{name:'unfinished_pallet_wood',color:[.88,.84,.75,1],metal:0,rough:.88,base:'pallet-wood-basecolor.png'},
  glass:{name:'lamp_diffuser',color:[.76,.79,.80,1],metal:0,rough:.38},
  floor:{name:'courtyard_concrete_PBR',color:[1,1,1,1],metal:0,rough:1,base:'concrete-basecolor.png',normal:'concrete-normal-procedural.png',orm:'concrete-orm-procedural.png'},
  joint:{name:'dry_sawn_concrete_joint',color:[.37,.38,.38,1],metal:0,rough:1}
};
Object.assign(mats,{
 asphalt:{name:'service_lane_asphalt',color:[.22,.235,.25,1],metal:0,rough:1,base:'concrete-basecolor.png'},
 white:{name:'loading_bay_white_paint',color:[.86,.87,.84,1],metal:0,rough:.9},
 grass:{name:'maintained_grass_verge',color:[.15,.22,.075,1],metal:0,rough:1,base:'concrete-basecolor.png'},
 architecture:{name:'projected_architecture_photo',color:[1,1,1,1],metal:0,rough:1,base:'training-architecture-4k.png',unlit:true,alpha:true},
 facade:{name:'photographic_facade_volume',color:[.72,.73,.72,1],metal:0,rough:.78},
 roof:{name:'standing_seam_roof',color:[.30,.34,.36,1],metal:.3,rough:.68}
});
class Model{
  constructor(name){this.name=name;this.parts=new Map();}
  part(mat){if(!this.parts.has(mat))this.parts.set(mat,{p:[],n:[],uv:[],ix:[]});return this.parts.get(mat);}
  face(mat,pts,normal,uv){
    const q=this.part(mat),base=q.p.length/3;
    let vv=pts.slice(),tt=uv?uv.slice():null;
    const calc=cross(sub(vv[1],vv[0]),sub(vv[2],vv[0]));
    if(dot(calc,normal)<0){vv.reverse();if(tt)tt.reverse();}
    const nn=unit(normal),major=nn.map(Math.abs).indexOf(Math.max(...nn.map(Math.abs)));
    vv.forEach((p,i)=>{q.p.push(...p);q.n.push(...nn);q.uv.push(...(tt?tt[i]:major===1?[p[0]*1.6,p[2]*1.6]:major===0?[p[2]*1.6,p[1]*1.6]:[p[0]*1.6,p[1]*1.6]));});
    for(let i=1;i<vv.length-1;i++)q.ix.push(base,base+i,base+i+1);
  }
  box(mat,w,h,d,centre,b=.003,rotation=0){
    const half=[w/2,h/2,d/2],bevel=Math.min(b,...half.map(v=>v*.35));
    const rot=p=>{const co=Math.cos(rotation),si=Math.sin(rotation);return add([p[0]*co+p[2]*si,p[1],-p[0]*si+p[2]*co],centre);};
    const norm=n=>{const co=Math.cos(rotation),si=Math.sin(rotation);return [n[0]*co+n[2]*si,n[1],-n[0]*si+n[2]*co];};
    const face=(pts,n)=>{
      let uv;
      if(mat==='wood'){
        const grainAxis=half.indexOf(Math.max(...half));
        const faceAxis=n.map(Math.abs).indexOf(Math.max(...n.map(Math.abs)));
        const crossAxis=[0,1,2].find(i=>i!==faceAxis&&i!==grainAxis);
        const phase=Math.abs(Math.sin(centre[0]*31+centre[1]*57+centre[2]*43))*2.13;
        if(faceAxis!==grainAxis)uv=pts.map(p=>[p[crossAxis]*1.6+phase,p[grainAxis]*1.6+phase]);
      }
      this.face(mat,pts.map(rot),norm(n),uv);
    };
    for(let axis=0;axis<3;axis++)for(const sign of [-1,1]){
      const other=[0,1,2].filter(i=>i!==axis),pts=[];
      for(const [a,b] of [[-1,-1],[1,-1],[1,1],[-1,1]]){const p=[0,0,0];p[axis]=sign*half[axis];p[other[0]]=a*(half[other[0]]-bevel);p[other[1]]=b*(half[other[1]]-bevel);pts.push(p);}
      const n=[0,0,0];n[axis]=sign;face(pts,n);
    }
    if(bevel<=0)return;
    for(let axis=0;axis<3;axis++){
      const other=[0,1,2].filter(i=>i!==axis);
      for(const a of [-1,1])for(const b of [-1,1]){
        const pts=[];
        for(const [e,t] of [[0,-1],[1,-1],[1,1],[0,1]]){
          const p=[0,0,0];p[axis]=t*(half[axis]-bevel);p[other[0]]=a*(half[other[0]]-(e?bevel:0));p[other[1]]=b*(half[other[1]]-(e?0:bevel));pts.push(p);
        }
        const n=[0,0,0];n[other[0]]=a;n[other[1]]=b;face(pts,n);
      }
    }
    for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1]){
      const sign=[x,y,z],pts=[];
      for(let axis=0;axis<3;axis++)pts.push(half.map((v,i)=>sign[i]*(v-(i===axis?0:bevel))));
      face(pts,sign);
    }
  }
  beam(mat,a,b,w,d=w){
    const axis=unit(sub(b,a)),side=unit(cross(axis,Math.abs(axis[1])<.92?[0,1,0]:[0,0,1])),up=unit(cross(side,axis));
    const ring=p=>[[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,z])=>add(add(p,scale(side,x*w/2)),scale(up,z*d/2)));
    const aa=ring(a),bb=ring(b);
    this.face(mat,aa,scale(axis,-1));this.face(mat,bb,axis);
    for(let i=0;i<4;i++){const j=(i+1)%4;this.face(mat,[aa[i],aa[j],bb[j],bb[i]],unit(sub(add(aa[i],aa[j]),scale(a,2))));}
  }
  cylinder(mat,rBottom,rTop,y0,y1,x=0,z=0,segments=16){
    const low=[],high=[];
    for(let i=0;i<segments;i++){
      const a=2*Math.PI*i/segments,b=2*Math.PI*(i+1)/segments;
      const p0=[x+Math.cos(a)*rBottom,y0,z+Math.sin(a)*rBottom],p1=[x+Math.cos(b)*rBottom,y0,z+Math.sin(b)*rBottom];
      const p2=[x+Math.cos(b)*rTop,y1,z+Math.sin(b)*rTop],p3=[x+Math.cos(a)*rTop,y1,z+Math.sin(a)*rTop];
      this.face(mat,[p0,p1,p2,p3],[Math.cos((a+b)/2),(rBottom-rTop)/(y1-y0),Math.sin((a+b)/2)]);
      low.push(p0);high.push(p3);
    }
    this.face(mat,low,[0,-1,0]);this.face(mat,high,[0,1,0]);
  }
  write(){
    const gltf={asset:{version:'2.0',generator:'Rhenus courtyard asset builder V34.168'},scene:0,scenes:[{nodes:[0]}],nodes:[{name:this.name,mesh:0}],meshes:[{name:this.name,primitives:[]}],materials:[],buffers:[{byteLength:0}],bufferViews:[],accessors:[],samplers:[{magFilter:9729,minFilter:9987,wrapS:10497,wrapT:10497},{magFilter:9729,minFilter:9987,wrapS:33071,wrapT:33071}],textures:[],images:[],extras:{units:'metres',upAxis:'Y',origin:'foot-centre',purpose:'decorative yard environment'}};
    const chunks=[];let size=0;const textureIndices=new Map();
    function bytes(buffer,target){const pad=(4-size%4)%4;if(pad){chunks.push(Buffer.alloc(pad));size+=pad;}const offset=size;chunks.push(buffer);size+=buffer.length;const v={buffer:0,byteOffset:offset,byteLength:buffer.length};if(target)v.target=target;gltf.bufferViews.push(v);return gltf.bufferViews.length-1;}
    function accessor(values,type,integer=false){const comp={SCALAR:1,VEC2:2,VEC3:3}[type],array=integer?new Uint32Array(values):new Float32Array(values),view=bytes(Buffer.from(array.buffer),integer?34963:34962);const a={bufferView:view,componentType:integer?5125:5126,count:values.length/comp,type};if(type==='VEC3'){a.min=[Infinity,Infinity,Infinity];a.max=[-Infinity,-Infinity,-Infinity];for(let i=0;i<values.length;i++) {a.min[i%3]=Math.min(a.min[i%3],values[i]);a.max[i%3]=Math.max(a.max[i%3],values[i]);}}gltf.accessors.push(a);return gltf.accessors.length-1;}
    function texture(file){if(textureIndices.has(file))return textureIndices.get(file);const view=bytes(fs.readFileSync(path.join(tex,file)));gltf.images.push({name:file,mimeType:'image/png',bufferView:view});gltf.textures.push({sampler:file.startsWith('training-')?1:0,source:gltf.images.length-1});const index=gltf.textures.length-1;textureIndices.set(file,index);return index;}
    for(const [key,part] of this.parts){
      let q=part;
      // Babylon's glTF import root reflects X (rotationY PI, scaleZ -1).
      if(this.yardSpace){
        q={p:part.p.map((v,i)=>i%3===0?-v:v),n:part.n.map((v,i)=>i%3===0?-v:v),uv:part.uv,ix:part.ix.slice()};
        for(let i=0;i<q.ix.length;i+=3)[q.ix[i+1],q.ix[i+2]]=[q.ix[i+2],q.ix[i+1]];
      }
      const spec=mats[key],mat={name:spec.name,pbrMetallicRoughness:{baseColorFactor:spec.color,metallicFactor:spec.metal,roughnessFactor:spec.rough}};
      if(spec.base)mat.pbrMetallicRoughness.baseColorTexture={index:texture(spec.base)};
      if(spec.orm)mat.pbrMetallicRoughness.metallicRoughnessTexture={index:texture(spec.orm)};
      if(spec.normal)mat.normalTexture={index:texture(spec.normal),scale:.35};
      if(spec.unlit){mat.extensions={KHR_materials_unlit:{}};gltf.extensionsUsed=['KHR_materials_unlit'];}
      if(spec.alpha){mat.alphaMode='MASK';mat.alphaCutoff=.18;mat.doubleSided=true;}
      gltf.materials.push(mat);
      gltf.meshes[0].primitives.push({attributes:{POSITION:accessor(q.p,'VEC3'),NORMAL:accessor(q.n,'VEC3'),TEXCOORD_0:accessor(q.uv,'VEC2')},indices:accessor(q.ix,'SCALAR',true),material:gltf.materials.length-1,mode:4});
    }
    gltf.buffers[0].byteLength=size;let json=Buffer.from(JSON.stringify(gltf));json=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]);let bin=Buffer.concat(chunks);bin=Buffer.concat([bin,Buffer.alloc((4-bin.length%4)%4)]);
    const header=Buffer.alloc(12),jh=Buffer.alloc(8),bh=Buffer.alloc(8);header.writeUInt32LE(0x46546c67,0);header.writeUInt32LE(2,4);header.writeUInt32LE(12+8+json.length+8+bin.length,8);jh.writeUInt32LE(json.length,0);jh.writeUInt32LE(0x4e4f534a,4);bh.writeUInt32LE(bin.length,0);bh.writeUInt32LE(0x004e4942,4);
    fs.writeFileSync(path.join(out,this.name+'.glb'),Buffer.concat([header,jh,json,bh,bin]));
    return {file:this.name+'.glb',triangles:[...this.parts.values()].reduce((s,q)=>s+q.ix.length/3,0),primitives:this.parts.size,bytes:12+8+json.length+8+bin.length};
  }
}

const report=[];
const floor=new Model('yard_floor');floor.yardSpace=true;
function ground(model,mat,x0,x1,z0,z1,y=0,tile=4){model.face(mat,[[x0,y,z0],[x0,y,z1],[x1,y,z1],[x1,y,z0]],[0,1,0],[[x0/tile,z0/tile],[x0/tile,z1/tile],[x1/tile,z1/tile],[x1/tile,z0/tile]]);}
ground(floor,'asphalt',-300,80,-180,180,-.005);
ground(floor,'floor',-54,9,-39,22,0);
for(let x=-51;x<=8;x+=4.8)ground(floor,'joint',x-.005,x+.005,-39,22,.0015);
for(let z=-37;z<=21;z+=5.6)ground(floor,'joint',-54,9,z-.005,z+.005,.0015);
ground(floor,'white',-3.1,-2.99,-12.9,10.9,.0025);
ground(floor,'white',4.4,4.51,-12.9,10.9,.0025);
ground(floor,'white',-3.1,4.51,-12.9,-12.79,.0025);
ground(floor,'white',-3.1,4.51,10.79,10.9,.0025);
ground(floor,'floor',-37,-30,-36,-26,.08);
ground(floor,'yellow',-30.12,-30.02,-36,-26,.081);
for(let z=-35.5;z<-26;z+=1.3)ground(floor,'yellow',-32,-30.25,z,z+.12,.082);
ground(floor,'grass',-260,-55,-170,12,.005,3);
ground(floor,'grass',-260,-55,24,170,.005,3);
ground(floor,'grass',-55,0,26,170,.005,3);
for(let x=-235;x<-55;x+=12)ground(floor,'white',x,x+4.5,17.85,17.95,.008);
report.push(floor.write());
const rack=new Model('blue_transport_rack');
for(const x of [-.78,.78])for(const z of [-.59,.59]){
  rack.box('blue',.14,.09,.14,[x,.045,z],.009);
  rack.box('blue',.06,1.27,.06,[x,.715,z],.004);
  rack.box('edge',.075,.025,.075,[x,1.3625,z],.003);
  rack.box('blue',.16,.026,.16,[x,.102,z],.004);
}
for(const z of [-.59,.59]){rack.box('blue',1.62,.07,.055,[0,.22,z],.004);rack.box('blue',1.62,.055,.055,[0,1.32,z],.004);}
for(const x of [-.78,.78]){rack.box('blue',.055,.07,1.22,[x,.22,0],.004);rack.box('blue',.055,.055,1.22,[x,1.32,0],.004);}
for(const z of [-.34,0,.34])rack.box('blue',1.50,.035,.07,[0,.18,z],.003);
// Back cross-bracing and open front; transport forks can actually enter.
rack.beam('blue',[-.76,.26,.59],[.76,1.27,.59],.025,.014);rack.beam('blue',[.76,.26,.60],[-.76,1.27,.60],.025,.014);
for(const x of [-.78,.78])rack.beam('blue',[x,.26,-.56],[x,1.27,.56],.025,.014);
for(const x of [-.62,.62])rack.box('edge',.18,.0018,.035,[x,.255,-.59],.0003);
report.push(rack.write());
const pallet=new Model('wood_pallet');
for(const x of [-.51,0,.51])for(const z of [-.31,0,.31])pallet.box('wood',.145,.078,.145,[x,.061,z],.004);
for(const z of [-.31,0,.31])pallet.box('wood',1.2,.022,.14,[0,.011,z],.003);
for(const x of [-.51,0,.51])pallet.box('wood',.145,.020,.8,[x,.110,0],.003);
for(const z of [-.35,-.175,0,.175,.35])pallet.box('wood',1.2,.022,z===0?.145:.10,[0,.133,z],.003);
for(const x of [-.51,0,.51])for(const z of [-.35,-.175,0,.175,.35])pallet.cylinder('dark',.0026,.0026,.144,.145,x,z,6);
report.push(pallet.write());
const lamp=new Model('yard_lamp');
lamp.box('concrete',.42,.28,.42,[0,.14,0],.025);
lamp.box('edge',.23,.020,.23,[0,.29,0],.005);
for(const x of [-.08,.08])for(const z of [-.08,.08])lamp.cylinder('dark',.014,.014,.30,.324,x,z,8);
lamp.cylinder('edge',.055,.034,.305,6.15,0,0,16);
lamp.beam('edge',[0,6.10,0],[.36,6.10,0],.045,.045);
lamp.box('dark',.52,.085,.28,[.37,6.10,0],.024);
lamp.box('glass',.40,.008,.20,[.40,6.055,0],.001);
report.push(lamp.write());
const bollard=new Model('safety_bollard');
bollard.cylinder('dark',.15,.15,0,.055,0,0,16);
bollard.cylinder('yellow',.081,.081,.055,1.025,0,0,16);
for(const y of [.35,.68])bollard.cylinder('rubber',.082,.082,y,y+.11,0,0,16);
bollard.cylinder('yellow',.081,.055,1.025,1.06,0,0,16);
for(const x of [-.10,.10])for(const z of [-.06,.06])bollard.cylinder('edge',.011,.011,.055,.073,x,z,8);
report.push(bollard.write());
const kerb=new Model('kerb_1m');
kerb.box('concrete',1,.16,.24,[0,.08,0],.015);
report.push(kerb.write());
const drain=new Model('drainage_channel_2m');
// Foot origin at top of concrete floor: channel trough extends below Y=0.
drain.box('dark',.255,.06,2,[0,-.037,0],.002);
drain.box('edge',.018,.035,2,[-.13,-.01,0],.001);drain.box('edge',.018,.035,2,[.13,-.01,0],.001);
for(let z=-.95;z<=.951;z+=.095)drain.box('dark',.242,.018,.035,[0,.007,z],0);
drain.box('dark',.026,.012,1.96,[0,-.004,0],.001);
report.push(drain.write());

const capture={x:16.5,y:5.65,z:.6,targetX:0,targetY:2.28,targetZ:.6,fov:.72,aspect:16/9};
const pitch=Math.atan2(capture.y-capture.targetY,capture.x),co=Math.cos(pitch),si=Math.sin(pitch);
const tanV=Math.tan(capture.fov/2),tanH=tanV*capture.aspect;
const textureFrame={scaleU:.765,scaleV:.85,offsetV:-.017};
function sourceRay(px,py){
 const u=px/1672*textureFrame.scaleU,v=py/941*textureFrame.scaleV+textureFrame.offsetV,up=(1-2*v)*tanV;
 return {o:[capture.x,capture.y,capture.z],d:[-co-si*up,-si+co*up,(2*u-1)*tanH]};
}
function atGround(px,py){const r=sourceRay(px,py);return add(r.o,scale(r.d,-r.o[1]/r.d[1]));}
function photoUV(p){
 const dx=p[0]-capture.x,dy=p[1]-capture.y,dz=p[2]-capture.z,depth=-co*dx-si*dy,up=-si*dx+co*dy;
 return [(.5+dz/(2*depth*tanH))/textureFrame.scaleU,((.5-up/(2*depth*tanV))-textureFrame.offsetV)/textureFrame.scaleV];
}
function rayPlane(px,py,a,n){const r=sourceRay(px,py),t=dot(sub(a,r.o),n)/dot(r.d,n);return add(r.o,scale(r.d,t));}
const buildings=new Model('training_buildings');buildings.yardSpace=true;
function photoFace(pts,n){
 const steps=18;
 for(let row=0;row<steps;row++)for(let col=0;col<steps;col++){
  const point=(u,v)=>add(scale(add(scale(pts[0],1-u),scale(pts[1],u)),1-v),scale(add(scale(pts[3],1-u),scale(pts[2],u)),v));
  const p=[point(col/steps,row/steps),point((col+1)/steps,row/steps),point((col+1)/steps,(row+1)/steps),point(col/steps,(row+1)/steps)];
  buildings.face('architecture',p,n,p.map(photoUV));
 }
}
const buildingMeasurements=[];
function volume(name,left,right,topLeft,topRight,depth){
 const a=atGround(...left),b=atGround(...right),along=unit(sub(b,a));
 let normal=[along[2],0,-along[0]];if(dot(normal,sub([capture.x,capture.y,capture.z],a))<0)normal=scale(normal,-1);
 const topA=rayPlane(...topLeft,a,normal),topB=rayPlane(...topRight,a,normal),back=scale(normal,-depth);
 photoFace([a,b,topB,topA],normal);
 const aa=add(a,back),bb=add(b,back),ta=add(topA,back),tb=add(topB,back);
 buildings.face('facade',[aa,bb,tb,ta],scale(normal,-1));
 buildings.face('facade',[a,aa,ta,topA],scale(along,-1));
 buildings.face('facade',[b,topB,tb,bb],along);
 buildings.face('roof',[topA,ta,tb,topB],[0,1,0]);
 buildingMeasurements.push({name,frontA:a,frontB:b,topA,topB,depth});
 return {a,b,normal,along,topA,topB};
}
const office=volume('office',[0,431],[568,399],[0,-88],[568,123],14);
volume('connector',[568,399],[721,391],[568,166],[721,201],13);
volume('workshop',[721,391],[1384,391],[721,216],[1384,238],18);
const canopyA=rayPlane(148,239,office.a,office.normal),canopyB=rayPlane(517,274,office.a,office.normal);
const canopyY=(canopyA[1]+canopyB[1])*.5;
const ca=[canopyA[0],canopyY,canopyA[2]],cb=[canopyB[0],canopyY,canopyB[2]];
const cf=add(ca,scale(office.normal,2.5)),cg=add(cb,scale(office.normal,2.5));
buildings.face('roof',[ca,cb,cg,cf],[0,1,0]);buildings.face('dark',[ca,cf,cg,cb],[0,-1,0]);
buildings.beam('dark',cf,cg,.30,.20);buildings.beam('dark',ca,cf,.22,.20);buildings.beam('dark',cb,cg,.22,.20);
for(const p of [cf,cg]){buildings.box('dark',.18,canopyY,.18,[p[0],canopyY/2,p[2]],.01);buildings.box('edge',.32,.025,.32,[p[0],.013,p[2]],.008);}
report.push(buildings.write());
const fence=new Model('fence_panel_3m');
for(const x of [-1.48,1.48])fence.box('dark',.075,2.1,.075,[x,1.05,0],.003);
for(const y of [.22,1,1.96])fence.box('dark',2.94,.035,.032,[0,y,0],.002);
for(let x=-1.35;x<1.4;x+=.15)fence.box('dark',.011,1.78,.011,[x,1.1,0],0);
report.push(fence.write());
const gate=new Model('sliding_gate_6m');
for(const x of [-3,3])gate.box('dark',.13,2.2,.13,[x,1.1,0],.006);
for(const y of [.18,2.12])gate.box('dark',6,.12,.12,[0,y,0],.005);
for(let x=-2.8;x<2.9;x+=.18)gate.box('dark',.028,1.82,.028,[x,1.14,0],.002);
gate.beam('dark',[-2.9,.27,.04],[2.9,2.03,.04],.04,.03);
for(const x of [-2.4,2.4])gate.cylinder('rubber',.09,.09,.04,.15,x,0,12);
report.push(gate.write());
fs.writeFileSync(path.join(out,'asset-metrics.json'),JSON.stringify({version:'34.168',units:'metres',axis:'Y-up',models:report,capture,textureFrame,buildings:buildingMeasurements},null,2)+'\n');
fs.writeFileSync(path.join(assetDir,'camera-and-architecture.json'),JSON.stringify({capture,textureFrame,buildings:buildingMeasurements},null,2)+'\n');
console.log(JSON.stringify(report,null,2));

