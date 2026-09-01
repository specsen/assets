/**
 * RHENUS V28.79 vegetation loader for Babylon.js.
 * Runtime source: only specsen/assets on GitHub.
 * Assumes global BABYLON.
 */
(function(global){
  const ROOT = "https://raw.githubusercontent.com/specsen/assets/main";
  const BASE = ROOT + "/models/environment/vegetation/";

  const URLS = Object.freeze({
    shrubA: BASE + "shrub_photo_volume_a.glb",
    shrubB: BASE + "shrub_photo_volume_b.glb",
    grassA: BASE + "ornamental_grass_photo_volume_a.glb",
    grassB: BASE + "ornamental_grass_photo_volume_b.glb",
    groundcover: BASE + "groundcover_photo_volume.glb",
    smallTree: BASE + "small_deciduous_tree_photo_volume.glb",
    pineLod2: BASE + "trees_pine_realtime_lod2_v2872.glb"
  });

  async function loadContainer(scene, url){
    const clean=url.split('?')[0];
    const slash=clean.lastIndexOf('/');
    const root=clean.slice(0,slash+1);
    const file=clean.slice(slash+1);
    return BABYLON.SceneLoader.LoadAssetContainerAsync(root,file,scene);
  }

  async function createRhenusVegetationLibrary(scene){
    const cache=new Map();
    async function get(key){
      if(!URLS[key]) throw new Error("Unknown vegetation asset: "+key);
      if(!cache.has(key)) cache.set(key, await loadContainer(scene,URLS[key]));
      return cache.get(key);
    }
    function instantiate(container,name,position,scale=1,rotationY=0){
      const result=container.instantiateModelsToScene(n=>name+"_"+n,false,{doNotInstantiate:false});
      const roots=result.rootNodes||[];
      roots.forEach(root=>{
        root.position.copyFrom(position);
        root.scaling.setAll(scale);
        root.rotationQuaternion=null;
        root.rotation.y=rotationY;
      });
      return result;
    }
    async function place(key,name,x,y,z,scale=1,rotationY=0){
      const c=await get(key);
      return instantiate(c,name,new BABYLON.Vector3(x,y,z),scale,rotationY);
    }
    return {ROOT,URLS,get,place,instantiate,cache};
  }

  global.RHENUS_VEGETATION_URLS=URLS;
  global.createRhenusVegetationLibrary=createRhenusVegetationLibrary;
})(window);
