# Top görünümlerini, sembolleri ve taş sütunu render eder.
# Kullanım: pip install bpy && python3 tools/blender_toplar.py --out render_out/ --mode all
import bpy, math, sys, os
from mathutils import Vector
OUT=sys.argv[sys.argv.index('--out')+1] if '--out' in sys.argv else '/home/claude/work/out2/'
os.makedirs(OUT,exist_ok=True)
SIZE=160
bpy.ops.wm.read_factory_settings(use_empty=True)
sc=bpy.context.scene
sc.render.engine='CYCLES'; sc.cycles.device='CPU'; sc.cycles.samples=64
try: sc.cycles.use_denoising=True
except: pass
sc.render.film_transparent=True
sc.render.resolution_x=SIZE; sc.render.resolution_y=SIZE
sc.render.image_settings.file_format='PNG'; sc.render.image_settings.color_mode='RGBA'
sc.view_settings.view_transform='Standard'
# gradient world (for reflections)
w=bpy.data.worlds.new('w'); sc.world=w; w.use_nodes=True
nt=w.node_tree; N=nt.nodes; Lk=nt.links
bg=N['Background']
tc=N.new('ShaderNodeTexCoord'); sep=N.new('ShaderNodeSeparateXYZ'); ramp=N.new('ShaderNodeValToRGB')
Lk.new(tc.outputs['Generated'],sep.inputs[0]); Lk.new(sep.outputs['Z'],ramp.inputs[0])
ramp.color_ramp.elements[0].position=0.35; ramp.color_ramp.elements[0].color=(0.12,0.11,0.1,1)
ramp.color_ramp.elements[1].position=0.75; ramp.color_ramp.elements[1].color=(0.95,0.97,1.0,1)
Lk.new(ramp.outputs[0],bg.inputs[0]); bg.inputs[1].default_value=0.3
cam=bpy.data.cameras.new('c'); cam.type='ORTHO'; cam.ortho_scale=2.12
co=bpy.data.objects.new('cam',cam); sc.collection.objects.link(co); co.location=(0,0,10); sc.camera=co
def light(name,loc,energy,size,color=(1,1,1)):
    l=bpy.data.lights.new(name,'AREA'); l.energy=energy; l.size=size; l.color=color; l.shape='DISK'
    o=bpy.data.objects.new(name,l); sc.collection.objects.link(o); o.location=loc
    d=Vector((0,0,0))-Vector(loc); o.rotation_euler=d.to_track_quat('-Z','Y').to_euler()
light('key',(-3,3,5),650,1.6); light('fill',(4,-2,3),120,5,(0.9,0.95,1)); light('rim',(3,-3,-0.3),260,2.5,(1,0.95,0.85))
bpy.ops.mesh.primitive_uv_sphere_add(segments=96,ring_count=48,radius=1)
sph=bpy.context.object; bpy.ops.object.shade_smooth()
def srgb(h):
    h=h.lstrip('#'); c=[int(h[i:i+2],16)/255 for i in (0,2,4)]
    return tuple((x/12.92) if x<=0.04045 else ((x+0.055)/1.055)**2.4 for x in c)
def lighten(c,a): return tuple(x+(1-x)*a for x in c)
def P(m): return m.node_tree.nodes['Principled BSDF']
def setp(p,k,v):
    if k in p.inputs: p.inputs[k].default_value=v
def mat_classic(c):
    m=bpy.data.materials.new('m'); m.use_nodes=True; p=P(m)
    setp(p,'Base Color',(*c,1)); setp(p,'Roughness',0.16); setp(p,'Coat Weight',1.0); setp(p,'Coat Roughness',0.04)
    setp(p,'Subsurface Weight',0.08); return m
def mat_glass(c):
    m=bpy.data.materials.new('m'); m.use_nodes=True; p=P(m)
    setp(p,'Base Color',(*lighten(c,0.25),1)); setp(p,'Roughness',0.03); setp(p,'Transmission Weight',0.7); setp(p,'IOR',1.5)
    setp(p,'Emission Color',(*c,1)); setp(p,'Emission Strength',1.1); setp(p,'Coat Weight',1.0)
    return m
def mat_candy(c):
    m=bpy.data.materials.new('m'); m.use_nodes=True; nt=m.node_tree; p=P(m)
    wave=nt.nodes.new('ShaderNodeTexWave'); wave.inputs['Scale'].default_value=1.3; wave.inputs['Distortion'].default_value=0.0
    wave.wave_profile='SAW' if False else 'SIN'
    mp=nt.nodes.new('ShaderNodeMapping'); tco=nt.nodes.new('ShaderNodeTexCoord')
    mp.inputs['Rotation'].default_value=(0.6,0.3,0.8)
    nt.links.new(tco.outputs['Object'],mp.inputs[0]); nt.links.new(mp.outputs[0],wave.inputs['Vector'])
    ramp=nt.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.interpolation='CONSTANT'
    ramp.color_ramp.elements[0].color=(*c,1); ramp.color_ramp.elements[1].position=0.62; ramp.color_ramp.elements[1].color=(*lighten(c,0.8),1)
    nt.links.new(wave.outputs['Fac'],ramp.inputs[0]); nt.links.new(ramp.outputs[0],p.inputs['Base Color'])
    setp(p,'Roughness',0.2); setp(p,'Coat Weight',1.0); setp(p,'Coat Roughness',0.03); return m
def mat_gold(c):
    m=bpy.data.materials.new('m'); m.use_nodes=True; p=P(m)
    g=(1.0,0.72,0.25); mix=tuple(a*0.65+b*0.35 for a,b in zip(c,g))
    setp(p,'Base Color',(*mix,1)); setp(p,'Metallic',0.55); setp(p,'Roughness',0.28); setp(p,'Coat Weight',1.0); setp(p,'Coat Roughness',0.05)
    setp(p,'Emission Color',(*mix,1)); setp(p,'Emission Strength',0.15); return m
SKINS={'classic':mat_classic,'glass':mat_glass,'candy':mat_candy,'gold':mat_gold}
if '--skins' in sys.argv: SKINS={k:SKINS[k] for k in sys.argv[sys.argv.index('--skins')+1].split(',')}
COLS=[('red','#e8203a'),('blue','#1f6fff'),('green','#22c043'),('yellow','#ffc81a'),('purple','#a33ef0'),('cyan','#16c9e0')]
mode=sys.argv[sys.argv.index('--mode')+1] if '--mode' in sys.argv else 'all'
if mode in ('all','skins'):
    for skin,fn in SKINS.items():
        for name,hx in COLS:
            sph.data.materials.clear(); sph.data.materials.append(fn(srgb(hx)))
            sc.render.filepath=f'{OUT}{skin}_{name}.png'; bpy.ops.render.render(write_still=True)
# emblems (sphere holdout)
def star(n=5,r1=1,r2=0.45): return [((r1 if i%2==0 else r2)*math.cos(math.pi/2+i*math.pi/n),(r1 if i%2==0 else r2)*math.sin(math.pi/2+i*math.pi/n)) for i in range(n*2)]
def heart():
    pts=[]
    for i in range(80):
        t=i/80*2*math.pi; x=16*math.sin(t)**3; y=13*math.cos(t)-5*math.cos(2*t)-2*math.cos(3*t)-math.cos(4*t)
        pts.append((x/17,y/17+0.12))
    return pts
def diamond(): return [(0,1.05),(0.72,0.2),(0,-1.0),(-0.72,0.2)]
def leaf():
    pts=[]
    for i in range(60):
        t=i/60*2*math.pi; x=math.sin(t); y=math.cos(t); pts.append((0.62*x*abs(x)**0.6,y))
    return pts
def crown(): return [(-0.95,-0.6),(0.95,-0.6),(0.95,0.75),(0.5,0.15),(0,0.95),(-0.5,0.15),(-0.95,0.75)]
def moon():
    n=48; pts=[]
    for i in range(n+1):
        a=math.radians(60+240*i/n); pts.append((math.cos(a),math.sin(a)))
    for i in range(n+1):
        a=math.radians(300-240*i/n); pts.append((0.42+0.78*math.cos(a),0.78*math.sin(a)))
    return pts
SHAPES={'red':(heart(),0.42),'blue':(diamond(),0.44),'green':(leaf(),0.42),'yellow':(star(),0.46),'purple':(crown(),0.4),'cyan':(moon(),0.42)}
def emblem(pts,scale,col):
    area=sum(pts[i][0]*pts[(i+1)%len(pts)][1]-pts[(i+1)%len(pts)][0]*pts[i][1] for i in range(len(pts)))
    if area<0: pts=pts[::-1]
    me=bpy.data.meshes.new('em'); me.from_pydata([(x*scale,y*scale,0) for x,y in pts],[],[list(range(len(pts)))]); me.update()
    o=bpy.data.objects.new('em',me); sc.collection.objects.link(o)
    s=o.modifiers.new('s','SOLIDIFY'); s.thickness=0.2; s.offset=1
    b=o.modifiers.new('b','BEVEL'); b.width=0.035; b.segments=4; b.limit_method='ANGLE'
    o.location=(0,0,0.86)
    m=bpy.data.materials.new('e'); m.use_nodes=True; p=P(m); setp(p,'Base Color',(*col,1)); setp(p,'Roughness',0.25); setp(p,'Coat Weight',1.0)
    o.data.materials.append(m)
    for poly in me.polygons: poly.use_smooth=True
    return o
if mode in ('all','emblems'):
    hold=bpy.data.materials.new('hold'); hold.use_nodes=True; nt=hold.node_tree
    for n in list(nt.nodes): nt.nodes.remove(n)
    ho=nt.nodes.new('ShaderNodeHoldout'); outn=nt.nodes.new('ShaderNodeOutputMaterial'); nt.links.new(ho.outputs[0],outn.inputs[0])
    sph.data.materials.clear(); sph.data.materials.append(hold)
    for name,hx in COLS:
        pts,s_=SHAPES[name]; em=emblem(pts,s_,lighten(srgb(hx),0.6))
        sc.render.filepath=f'{OUT}emblem_{name}.png'; bpy.ops.render.render(write_still=True)
        bpy.data.objects.remove(em)
# pillar obstacle
if mode in ('all','pillar'):
    bpy.data.objects.remove(sph)
    cam.ortho_scale=2.3
    def cyl(r,d,z,mat,v=96):
        bpy.ops.mesh.primitive_cylinder_add(vertices=v,radius=r,depth=d,location=(0,0,z)); o=bpy.context.object
        bv=o.modifiers.new('b','BEVEL'); bv.width=0.04; bv.segments=4; bpy.ops.object.shade_smooth(); o.data.materials.append(mat); return o
    def M(c,rough=0.5,metal=0.0,coat=0.0):
        m=bpy.data.materials.new('x'); m.use_nodes=True; p=P(m); setp(p,'Base Color',(*c,1)); setp(p,'Roughness',rough); setp(p,'Metallic',metal); setp(p,'Coat Weight',coat); return m
    stone=M(srgb('#efe3c8'),0.55); stone2=M(srgb('#d8c7a2'),0.6); gold=M(srgb('#ffc23a'),0.25,1.0)
    cyl(1.0,0.3,0.0,stone2); cyl(0.86,0.3,0.25,stone); cyl(0.9,0.08,0.42,gold); cyl(0.7,0.25,0.55,stone)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.48,location=(0,0,0.85)); orb=bpy.context.object; bpy.ops.object.shade_smooth()
    orb.data.materials.append(M(srgb('#3d8bff'),0.1,0.0,1.0))
    cyl(0.56,0.08,0.68,gold)
    sc.render.resolution_x=sc.render.resolution_y=200
    sc.render.filepath=f'{OUT}pillar.png'; bpy.ops.render.render(write_still=True)
print('ok')
