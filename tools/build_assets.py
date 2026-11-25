"""Builds the V10 yard assets from the approved reference photo.
   Camera model of the photo (calibrated from stall lines / curb / vanishing points):
   f=860 px, principal column cx=W/2, horizon row h0=376. Level pinhole camera."""
import cv2, numpy as np, json, os, sys
SRC='/mnt/user-data/uploads/5bea4a75-image.png'
OUT=sys.argv[1] if len(sys.argv)>1 else '/home/claude/work/v10'
os.makedirs(OUT,exist_ok=True)
im=cv2.imread(SRC); H,W=im.shape[:2]          # 724 x 2172
F=860.0; CX=W/2.0; H0=376.0; HCAM=3.89264
TH_EDGE=np.degrees(np.arctan(CX/F))            # half horizontal FOV = 51.6 deg
PHI_MIN,PHI_MAX=-30.0,90.0
meta=dict(f=F,cx=CX,h0=H0,w=W,h=H,hcam=HCAM,thEdge=TH_EDGE,phiMin=PHI_MIN,phiMax=PHI_MAX,thRange=90.0)

def smooth(x): x=np.clip(x,0,1); return x*x*(3-2*x)

# ---------------------------------------------------------------- DOME (equirectangular, theta +-90, phi -30..75)
def build_dome(w,h):
    thd=np.linspace(-90,90,w,endpoint=False)+90.0/w
    phd=np.linspace(PHI_MAX,PHI_MIN,h,endpoint=False)-(PHI_MAX-PHI_MIN)/h*0.5
    THD,PHD=np.meshgrid(thd,phd); PH=np.radians(PHD)
    mir=np.abs(THD)>TH_EDGE
    thp=np.where(mir,np.sign(THD)*(2*TH_EDGE-np.abs(THD)),THD); thp=np.radians(thp)
    u=CX+F*np.tan(thp)-0.5
    v=H0-F*np.tan(PH)/np.cos(thp)-0.5
    uc=np.clip(u,0,W-1).astype(np.float32); vc=np.clip(v,0,H-1).astype(np.float32)
    out=cv2.remap(im,uc,vc,cv2.INTER_CUBIC,borderMode=cv2.BORDER_REPLICATE).astype(np.float32)
    # ---- sky above the photo: very smooth gradient (no cloud streaks)
    topband=im[0:24].astype(np.float32).mean(0)
    topband=cv2.GaussianBlur(topband.reshape(1,W,3),(0,0),sigmaX=260,sigmaY=0.1,borderType=cv2.BORDER_REFLECT).reshape(W,3)
    zen=topband.mean(0)*np.array([0.80,0.88,0.98],np.float32)
    ph_top=np.degrees(np.arctan(H0*np.cos(thp)/F))
    s=smooth((PHD-ph_top)/(PHI_MAX-ph_top+1e-6))*0.9
    topcol=topband[np.clip(u,0,W-1).astype(int)]
    sky=topcol*(1-s[...,None])+zen[None,None,:]*s[...,None]
    wt=smooth((48.0-v)/48.0)                       # blend starts 24 rows inside the photo
    out=out*(1-wt[...,None])+sky*wt[...,None]
    # ---- below the photo: fade into concrete grey progressively (no cliff)
    botband=im[-40:].astype(np.float32).mean(0)
    botband=cv2.GaussianBlur(botband.reshape(1,W,3),(0,0),sigmaX=120,sigmaY=0.1,borderType=cv2.BORDER_REFLECT).reshape(W,3)
    conc=np.array([164,162,162],np.float32)
    botcol=botband[np.clip(u,0,W-1).astype(int)]
    ph_bot=np.degrees(np.arctan(-(H-1-H0)*np.cos(thp)/F))
    sb=smooth((ph_bot-PHD)/(ph_bot-PHI_MIN+1e-6))*0.8
    ext=botcol*(1-sb[...,None])+conc[None,None,:]*sb[...,None]
    wb=smooth((v-(H-70.0))/70.0)
    out=out*(1-wb[...,None])+ext*wb[...,None]
    # ---- sides: progressively blurred mirror -> soft haze, no readable duplicates
    d=np.where(mir,np.abs(THD)-TH_EDGE,0.0)
    sig1=max(2,int(w/4096*10)); sig2=max(6,int(w/4096*40)); sig3=max(15,int(w/4096*110))
    b1=cv2.GaussianBlur(out,(0,0),sig1); b2=cv2.GaussianBlur(out,(0,0),sig2); b3=cv2.GaussianBlur(out,(0,0),sig3)
    w1=smooth(d/4.0)[...,None]; w2=smooth((d-4.0)/10.0)[...,None]; w3=smooth((d-14.0)/16.0)[...,None]
    o2=out*(1-w1)+b1*w1; o2=o2*(1-w2)+b2*w2; o2=o2*(1-w3)+b3*w3
    out=np.where(mir[...,None],o2,out)
    return np.clip(out,0,255).astype(np.uint8)

for name,(w,h) in {'4k':(4096,2731),'2k':(2048,1366)}.items():
    d=build_dome(w,h); cv2.imwrite(f'{OUT}/rhenus_dome_v10_{name}.jpg',d,[cv2.IMWRITE_JPEG_QUALITY,92])
    print('dome',name,d.shape)
    if name=='2k':
        # back sector (azimuth +90..+270): smooth haze between the right and the left edge column of the front sector
        colR=d[:,-6:].astype(np.float32).mean(1); colL=d[:,:6].astype(np.float32).mean(1)
        bw=256; t=smooth(np.linspace(0,1,bw))[None,:,None]
        back=colR[:,None,:]*(1-t)+colL[:,None,:]*t
        back=cv2.GaussianBlur(back,(0,0),sigmaX=1.0,sigmaY=3.0)
        cv2.imwrite(f'{OUT}/rhenus_dome_v10_back.jpg',np.clip(back,0,255).astype(np.uint8),[cv2.IMWRITE_JPEG_QUALITY,92]); print('back',back.shape)

# ---------------------------------------------------------------- PHOTO (ground projection source)
for name,w in {'4k':4096,'2k':2048}.items():
    h=round(W and (724*w/2172))
    p=cv2.resize(im,(w,h),interpolation=cv2.INTER_LANCZOS4 if w>W else cv2.INTER_AREA)
    cv2.imwrite(f'{OUT}/rhenus_photo_v10_{name}.jpg',p,[cv2.IMWRITE_JPEG_QUALITY,93]); print('photo',name,p.shape)

# ---------------------------------------------------------------- GROUND MASK (photo space)
poly=[(0,724),(0,420),(80,389),(104,383),(126,415),(250,407),(400,400),(500,399),(560,399),(620,396),(700,395),
      (780,392),(800,388),(900,387),(1000,393),(1100,399.5),(1500,421.3),(2000,448.5),(2171,457.8),(2171,724)]
m=np.zeros((H,W),np.uint8); cv2.fillPoly(m,[np.round(np.array(poly)*16).astype(np.int32)],255,shift=4,lineType=cv2.LINE_AA)
m=m.astype(np.float32)/255
# soften the boundary a little (1.2 px) so that the seam to the dome is invisible
m=cv2.GaussianBlur(m,(0,0),1.2)
rows=np.arange(H,dtype=np.float32)[:,None]
Z=F*HCAM/np.maximum(rows-H0,1e-3)
near=smooth((Z-11.0)/6.0)                      # photo floor fades in between 11 m and 17 m (disc below it)
far=1-smooth((Z-130.0)/45.0)                   # and out beyond 130..175 m
m=m*near*far
cv2.imwrite(f'{OUT}/rhenus_ground_mask_v10.png',np.round(m*255).astype(np.uint8)); print('mask',m.shape)
cv2.imwrite('/home/claude/work/out/mask_preview.png',np.round(m*255).astype(np.uint8))
ov=im.copy(); ov[...,2]=np.clip(ov[...,2].astype(np.float32)+m*120,0,255).astype(np.uint8); cv2.imwrite('/home/claude/work/out/mask_overlay.png',ov)

# ---------------------------------------------------------------- CONCRETE (joint-free, seamless)
a=cv2.imread('/home/claude/work/assets/concrete_albedo_2k.jpg'); N=a.shape[0]
g=cv2.cvtColor(a,cv2.COLOR_BGR2GRAY).astype(np.float32)
# joint lines: thin dark lines on a 4x4 grid (every N/4 px); detect as dark columns/rows
mk=np.zeros((N,N),np.uint8)
for k in range(4):
    c=k*N//4
    for off in range(-4,5): 
        mk[:,(c+off)%N]=255; mk[(c+off)%N,:]=255
# roll so that the mask lines are not cut at array border
a_in=cv2.inpaint(a,mk,5,cv2.INPAINT_TELEA)
cv2.imwrite(f'{OUT}/concrete_albedo_v10_2k.jpg',a_in,[cv2.IMWRITE_JPEG_QUALITY,93])
cv2.imwrite('/home/claude/work/out/concrete_nojoint_preview.png',cv2.resize(a_in,(900,900),interpolation=cv2.INTER_AREA))
json.dump(meta,open(f'{OUT}/rhenus_yard_v10_calibration.json','w'),indent=1)
print(json.dumps(meta))
