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
meta=dict(road=dict(nX=0.6586,nZ=0.7545,p0X=-9.731,p0Z=9.731,curb=0.36,asphaltWidth=8.2),lotEdge=dict(nX=0.8984,nZ=0.4379,c=64.32),f=F,cx=CX,h0=H0,w=W,h=H,hcam=HCAM,thEdge=TH_EDGE,phiMin=PHI_MIN,phiMax=PHI_MAX,thRange=90.0)

def smooth(x): x=np.clip(x,0,1); return x*x*(3-2*x)

# ---------------------------------------------------------------- DOME (equirectangular, theta +-90, phi -30..75)
def fold(t,L):
    """triangle wave: 0..L..0..L ... (mirror tiling)"""
    k=np.mod(t,2*L); return np.where(k<L,k,2*L-k)

A_LO=22.0                                    # mirror strip for the far field: azimuth 22..51.6 deg (forest line, fence, lawn, trees)
L_R=TH_EDGE-A_LO
L_L=9.0                                      # left strip: azimuth -51.6..-42.6 deg (tree avenue) continues the left photo edge
SKY_A0,SKY_P,SKY_F=-35.0,60.0,25.0           # periodic sky: source azimuth -35..50 deg, period 60 deg, 25 deg cross-fade
ground_far=im[440:470,1600:2100].reshape(-1,3).astype(np.float32).mean(0)   # BGR, far lot concrete colour
lawn_col=im[398:415,1100:1900].reshape(-1,3).astype(np.float32).mean(0)     # BGR, sunlit lawn strip
topband0=im[0:24].astype(np.float32).mean(0)
topband0=cv2.GaussianBlur(topband0.reshape(1,W,3),(0,0),sigmaX=260,sigmaY=0.1,borderType=cv2.BORDER_REFLECT).reshape(W,3)

def sample_full(Asrc,PHD,PH):
    """photo colour in direction (Asrc,PH) incl. smooth sky above the photo's top edge. Returns col,u,v,thp."""
    thp=np.radians(Asrc)
    u=CX+F*np.tan(thp)-0.5; v=H0-F*np.tan(PH)/np.cos(thp)-0.5
    uc=np.clip(u,0,W-1).astype(np.float32); vc=np.clip(v,0,H-1).astype(np.float32)
    col=cv2.remap(im,uc,vc,cv2.INTER_CUBIC,borderMode=cv2.BORDER_REPLICATE).astype(np.float32)
    zen=topband0.mean(0)*np.array([0.80,0.88,0.98],np.float32)
    ph_top=np.degrees(np.arctan(H0*np.cos(thp)/F))
    sk=smooth((PHD-ph_top)/(PHI_MAX-ph_top+1e-6))*0.9
    topcol=topband0[np.clip(u,0,W-1).astype(int)]
    sky=topcol*(1-sk[...,None])+zen[None,None,:]*sk[...,None]
    wt=smooth((48.0-v)/48.0)
    col=col*(1-wt[...,None])+sky*wt[...,None]
    return col,u,v,thp

def build_block(a0,a1,w,h,r0,r1):
    """equirectangular strip, azimuth a0..a1 (deg, relative to photo yaw), elevation PHI_MIN..PHI_MAX.
       Inside the photo's +-51.6 deg: the photo itself. Outside: far-field strips of the same campus
       (mirror-tiled horizon band, periodic sky) so that the whole sphere looks alike: no grey void, no blur smear."""
    A=np.linspace(a0,a1,w,endpoint=False)+(a1-a0)/w*0.5
    PHD=(np.linspace(PHI_MAX,PHI_MIN,h,endpoint=False)-(PHI_MAX-PHI_MIN)/h*0.5)[r0:r1]
    AD,PHD=np.meshgrid(A,PHD); PH=np.radians(PHD)
    Aw=np.mod(AD+180.0,360.0)-180.0
    inph=np.abs(Aw)<=TH_EDGE
    dout=np.abs(Aw)-TH_EDGE                              # distance outside the photographed wedge
    cP,uP,vP,thP=sample_full(np.where(inph,Aw,0.0),PHD,PH)
    # horizon band: mirror of the right strip; the left photo edge continues with its own (tree avenue) strip first
    tR=np.where(Aw>0,Aw-TH_EDGE,(360.0+Aw)-TH_EDGE)
    Ar=TH_EDGE-fold(tR,L_R)
    cR,uR,vR,thR=sample_full(Ar,PHD,PH)
    dL=np.where(Aw<0,-TH_EDGE-Aw,1e3)
    Al=-TH_EDGE+fold(np.maximum(dL,0),L_L)
    cL,uL,vL,thL=sample_full(Al,PHD,PH)
    wl=np.where(Aw<0,1-smooth((dL-33.0)/8.0),0.0)
    cH=cR*(1-wl[...,None])+cL*wl[...,None]
    vH=vR*(1-wl)+vL*wl; thH=thR*(1-wl)+thL*wl; uH=uR*(1-wl)+uL*wl
    # sky: periodic (no mirror symmetry), only where the horizon band is sky/cloud, and away from the photo edge
    P=SKY_P; Fd=SKY_F
    t=np.mod(Aw-SKY_A0,P)                                 # 0..P
    wc=smooth(t/Fd)                                       # 0 .. 1 over the first Fd degrees
    A1=SKY_A0+t; A2=np.where(t<Fd,SKY_A0+P+t,SKY_A0+t)
    c1,_,_,_=sample_full(A1,PHD,PH); c2,_,_,_=sample_full(A2,PHD,PH)
    cS=c1*wc[...,None]+c2*(1-wc[...,None])
    Bc,Gc,Rc=cH[...,0],cH[...,1],cH[...,2]
    mn=np.minimum(np.minimum(Bc,Gc),Rc); mx=np.maximum(np.maximum(Bc,Gc),Rc)
    cloud=smooth((mn-175.0)/30.0)*(1-smooth((mx-mn-25.0)/25.0))
    veg=smooth((Gc-Bc-6.0)/20.0)
    veg=cv2.dilate(veg.astype(np.float32),np.ones((7,7),np.uint8))
    skylike=np.maximum(smooth((Bc-np.maximum(Rc,Gc)-12.0)/40.0),cloud)*(1-veg)
    wsky=skylike*smooth((PHD-1.5)/3.0)*smooth((dout-10.0)/12.0)
    cO=cH*(1-wsky[...,None])+cS*wsky[...,None]
    out=np.where(inph[...,None],cP,cO)
    v=np.where(inph,vP,vH); thp=np.where(inph,thP,thH); u=np.where(inph,uP,uH)
    # ---- ground below the horizon outside the photographed wedge. The 3D floor (road, lawn, lot) covers everything
    #      up to ~60 m / 800 m; the dome only supplies a consistent far field: mirrored campus down to the fence
    #      line, then lawn colour, then lot concrete.
    edge=smooth(dout/4.0)
    wov=edge*smooth((-PHD-0.45)/0.7)
    t_c=smooth((-PHD-1.0)/1.6)
    gcol=lawn_col[None,None,:]*(1-t_c[...,None])+ground_far[None,None,:]*t_c[...,None]
    gcol=gcol*(1.0+0.08*smooth((-PHD-3.0)/25.0)[...,None])
    out=out*(1-wov[...,None])+gcol*wov[...,None]
    # ---- inside the photo: below its bottom edge fade to concrete (no cliff)
    botband=im[-40:].astype(np.float32).mean(0)
    botband=cv2.GaussianBlur(botband.reshape(1,W,3),(0,0),sigmaX=120,sigmaY=0.1,borderType=cv2.BORDER_REFLECT).reshape(W,3)
    conc=np.array([164,162,162],np.float32)
    botcol=botband[np.clip(uP,0,W-1).astype(int)]
    ph_bot=np.degrees(np.arctan(-(H-1-H0)*np.cos(thP)/F))
    sb=smooth((ph_bot-PHD)/(ph_bot-PHI_MIN+1e-6))*0.8
    ext=botcol*(1-sb[...,None])+conc[None,None,:]*sb[...,None]
    wb=smooth((vP-(H-70.0))/70.0)*inph
    out=out*(1-wb[...,None])+ext*wb[...,None]
    return np.clip(out,0,255).astype(np.uint8)

def build_dome_range(a0,a1,w,h,step=96):
    parts=[build_block(a0,a1,w,h,r,min(h,r+step)) for r in range(0,h,step)]
    return np.vstack(parts)

for name,(w,h) in {'4k':(4096,2731),'2k':(2048,1366)}.items():
    d=build_dome_range(-90,90,w,h); cv2.imwrite(f'{OUT}/rhenus_dome_v10_{name}.jpg',d,[cv2.IMWRITE_JPEG_QUALITY,92]); print('dome',name,d.shape)
    bk=build_dome_range(90,270,w,h); cv2.imwrite(f'{OUT}/rhenus_dome_v10_back_{name}.jpg',bk,[cv2.IMWRITE_JPEG_QUALITY,92]); print('back',name,bk.shape)
    if name=='2k':
        cv2.imwrite('/home/claude/work/out/dome360_preview.png',cv2.resize(np.hstack([bk[:, bk.shape[1]//2:], d, bk[:, :bk.shape[1]//2]]),(2400,int(2400*h/(w*2))),interpolation=cv2.INTER_AREA))

# ---------------------------------------------------------------- PHOTO (ground projection source)
for name,w in {'4k':4096,'2k':2048}.items():
    h=round(W and (724*w/2172))
    p=cv2.resize(im,(w,h),interpolation=cv2.INTER_LANCZOS4 if w>W else cv2.INTER_AREA)
    cv2.imwrite(f'{OUT}/rhenus_photo_v10_{name}.jpg',p,[cv2.IMWRITE_JPEG_QUALITY,93]); print('photo',name,p.shape)

# ---------------------------------------------------------------- GROUND MASK (photo space)
poly=[(0,724),(0,411),(46,394),(110,394),(126,415),(250,407),(400,400),(500,399),(560,399),(620,396),(700,395),
      (780,392),(800,388),(900,387),(1000,393),(1100,399.5),(1500,421.3),(2000,448.5),(2171,457.8),(2171,724)]
m=np.zeros((H,W),np.uint8); cv2.fillPoly(m,[np.round(np.array(poly)*16).astype(np.int32)],255,shift=4,lineType=cv2.LINE_AA)
m=m.astype(np.float32)/255
# soften the boundary a little (1.2 px) so that the seam to the dome is invisible
m=cv2.GaussianBlur(m,(0,0),1.2)
rows=np.arange(H,dtype=np.float32)[:,None]
Z=F*HCAM/np.maximum(rows-H0,1e-3)
near=smooth((Z-11.0)/6.0)                      # photo floor fades in between 11 m and 17 m (disc below it)
far=1-smooth((Z-130.0)/45.0)                   # and out beyond 130..175 m
edgeU=np.arange(W,dtype=np.float32)[None,:]; edgeFade=smooth(edgeU/70.0)*smooth((W-1-edgeU)/70.0)
m=m*near*far*edgeFade
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

# ---------------------------------------------------------------- TILEABLE ASPHALT / LAWN (3D floor outside the photo)
def periodic_noise(n,sigma,seed):
    rng=np.random.default_rng(seed); w=rng.standard_normal((n,n)).astype(np.float32)
    fx=np.fft.fftfreq(n)[:,None]; fy=np.fft.fftfreq(n)[None,:]
    g=np.exp(-2*(np.pi*sigma)**2*(fx**2+fy**2)); r=np.real(np.fft.ifft2(np.fft.fft2(w)*g))
    return (r-r.mean())/(r.std()+1e-6)
def make_asphalt(n=1024):
    base=np.array([92,84,80],np.float32)       # BGR measured on the photographed road (rows 560-700)
    fine=periodic_noise(n,0.8,1); mid=periodic_noise(n,5,2); big=periodic_noise(n,40,3)
    lum=1.0+0.060*fine+0.045*mid+0.035*big
    rng=np.random.default_rng(4); fl=(rng.random((n,n))>0.985).astype(np.float32)
    fl=cv2.GaussianBlur(fl,(0,0),0.9); fl=fl/(fl.max()+1e-6)
    img=base[None,None,:]*lum[...,None]+fl[...,None]*np.array([30,28,26],np.float32)
    return np.clip(img,0,255).astype(np.uint8)
def make_lawn(n=1024):
    base=np.array([lawn_col[0]*0.96,lawn_col[1]*0.96,lawn_col[2]*0.96],np.float32)
    fine=periodic_noise(n,1.0,11); mid=periodic_noise(n,6,12); big=periodic_noise(n,50,13)
    lum=1.0+0.045*fine+0.04*mid+0.045*big
    tint=1.0+0.015*periodic_noise(n,12,14)
    img=base[None,None,:]*lum[...,None]
    img[...,1]*=tint; img[...,2]*=(2.0-tint)
    return np.clip(img,0,255).astype(np.uint8)
cv2.imwrite(f'{OUT}/asphalt_v10_1k.jpg',make_asphalt(),[cv2.IMWRITE_JPEG_QUALITY,92])
cv2.imwrite(f'{OUT}/lawn_v10_1k.jpg',make_lawn(),[cv2.IMWRITE_JPEG_QUALITY,92])
print('asphalt/lawn textures')

json.dump(meta,open(f'{OUT}/rhenus_yard_v10_calibration.json','w'),indent=1)
print(json.dumps(meta))
