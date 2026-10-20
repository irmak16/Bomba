# Gökkuşağı top, Kaplan/Kristal/Neon görünümleri ve Rakun Rüstem'i render eder.
# Kullanım: pip install bpy && python3 tools/blender_ekstra.py --mode joker|skins|raccoon (çıktı yolu dosyadaki OUT)
import bpy, math, sys, os
from mathutils import Vector
OUT='/home/claude/work/out4/'
mode=sys.argv[sys.argv.index('--mode')+1]
bpy.ops.wm.read_factory_settings(use_empty=True)
sc=bpy.context.scene
sc.render.engine='CYCLES'; sc.cycles.device='CPU'; sc.cycles.samples=64
try: sc.cycles.use_denoising=True
except: pass
sc.render.film_transparent=True; sc.render.image_settings.color_mode='RGBA'; sc.view_settings.view_transform='Standard'
w=bpy.data.worlds.new('w'); sc.world=w; w.use_nodes=True
nt=w.node_tree; N=nt.nodes; bg=N['Background']
tc=N.new('ShaderNodeTexCoord'); sep=N.new('ShaderNodeSeparateXYZ'); ramp=N.new('ShaderNodeValToRGB')
nt.links.new(tc.outputs['Generated'],sep.inputs[0]); nt.links.new(sep.outputs['Z'],ramp.inputs[0])
ramp.color_ramp.elements[0].position=0.35; ramp.color_ramp.elements[0].color=(0.12,0.11,0.1,1)
ramp.color_ramp.elements[1].position=0.75; ramp.color_ramp.elements[1].color=(0.95,0.97,1.0,1)
nt.links.new(ramp.outputs[0],bg.inputs[0]); bg.inputs[1].default_value=0.3
def srgb(h):
    h=h.lstrip('#'); c=[int(h[i:i+2],16)/255 for i in (0,2,4)]
    return tuple((x/12.92) if x<=0.04045 else ((x+0.055)/1.055)**2.4 for x in c)
def lighten(c,a): return tuple(x+(1-x)*a for x in c)
def P(m): return m.node_tree.nodes['Principled BSDF']
def setp(p,k,v):
    if k in p.inputs: p.inputs[k].default_value=v
def light(name,loc,energy,size,color=(1,1,1),target=(0,0,0)):
    l=bpy.data.lights.new(name,'AREA'); l.energy=energy; l.size=size; l.color=color; l.shape='DISK'
    o=bpy.data.objects.new(name,l); sc.collection.objects.link(o); o.location=loc
    d=Vector(target)-Vector(loc); o.rotation_euler=d.to_track_quat('-Z','Y').to_euler()
COLS=[('red','#e8203a'),('blue','#1f6fff'),('green','#22c043'),('yellow','#ffc81a'),('purple','#a33ef0'),('cyan','#16c9e0')]
def topcam(scale=2.12,res=160):
    cam=bpy.data.cameras.new('c'); cam.type='ORTHO'; cam.ortho_scale=scale
    co=bpy.data.objects.new('cam',cam); sc.collection.objects.link(co); co.location=(0,0,10); sc.camera=co
    sc.render.resolution_x=sc.render.resolution_y=res
    light('key',(-3,3,5),650,1.6); light('fill',(4,-2,3),120,5,(0.9,0.95,1)); light('rim',(3,-3,-0.3),260,2.5,(1,0.95,0.85))
if mode in ('skins','joker'):
    topcam()
    bpy.ops.mesh.primitive_uv_sphere_add(segments=96,ring_count=48,radius=1); sph=bpy.context.object; bpy.ops.object.shade_smooth()
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1.04); ico=bpy.context.object; ico.hide_render=True
    def mat_marble(c):
        m=bpy.data.materials.new('m'); m.use_nodes=True; t=m.node_tree; p=P(m)
        n=t.nodes.new('ShaderNodeTexNoise'); n.inputs['Scale'].default_value=2.5; n.inputs['Detail'].default_value=8
        wv=t.nodes.new('ShaderNodeTexWave'); wv.inputs['Scale'].default_value=1.6; wv.inputs['Distortion'].default_value=9; wv.inputs['Detail'].default_value=6
        r=t.nodes.new('ShaderNodeValToRGB'); r.color_ramp.elements[0].position=0.0; r.color_ramp.elements[0].color=(*lighten(c,0.85),1)
        r.color_ramp.elements[1].position=0.55; r.color_ramp.elements[1].color=(*c,1)
        e=r.color_ramp.elements.new(0.8); e.color=(*[x*0.55 for x in c],1)
        t.links.new(wv.outputs['Fac'],r.inputs[0]); t.links.new(r.outputs[0],p.inputs['Base Color'])
        setp(p,'Roughness',0.12); setp(p,'Coat Weight',1.0); setp(p,'Coat Roughness',0.02); return m
    def mat_crystal(c):
        m=bpy.data.materials.new('m'); m.use_nodes=True; p=P(m)
        setp(p,'Base Color',(*lighten(c,0.1),1)); setp(p,'Roughness',0.05); setp(p,'Metallic',0.25)
        setp(p,'Emission Color',(*c,1)); setp(p,'Emission Strength',0.45); setp(p,'Coat Weight',1.0); return m
    def mat_neon(c):
        m=bpy.data.materials.new('m'); m.use_nodes=True; t=m.node_tree; p=P(m)
        setp(p,'Base Color',(0.02,0.02,0.035,1)); setp(p,'Roughness',0.15); setp(p,'Coat Weight',1.0)
        lw=t.nodes.new('ShaderNodeLayerWeight'); lw.inputs['Blend'].default_value=0.35
        em=t.nodes.new('ShaderNodeEmission'); em.inputs['Color'].default_value=(*c,1); em.inputs['Strength'].default_value=4.0
        mix=t.nodes.new('ShaderNodeMixShader'); out=t.nodes['Material Output']
        t.links.new(lw.outputs['Facing'],mix.inputs[0]); t.links.new(p.outputs[0],mix.inputs[1]); t.links.new(em.outputs[0],mix.inputs[2])
        t.links.new(mix.outputs[0],out.inputs[0]); return m
    if mode=='skins':
        for skin,fn,obj in [('marble',mat_marble,sph),('crystal',mat_crystal,ico),('neon',mat_neon,sph)]:
            sph.hide_render = obj is not sph; ico.hide_render = obj is not ico
            for name,hx in COLS:
                obj.data.materials.clear(); obj.data.materials.append(fn(srgb(hx)))
                sc.render.filepath=f'{OUT}{skin}_{name}.png'; bpy.ops.render.render(write_still=True)
    else:
        m=bpy.data.materials.new('rb'); m.use_nodes=True; t=m.node_tree; p=P(m)
        tco=t.nodes.new('ShaderNodeTexCoord'); g=t.nodes.new('ShaderNodeTexGradient'); g.gradient_type='RADIAL'
        r=t.nodes.new('ShaderNodeValToRGB'); cr=r.color_ramp
        cols=['#ff3b52','#ffb02e','#ffe03a','#36d65a','#2fb8ff','#7a5cff','#ff3b9a']
        cr.elements[0].color=(*srgb(cols[0]),1); cr.elements[1].position=1.0; cr.elements[1].color=(*srgb(cols[0]),1)
        for i,cc in enumerate(cols[1:]):
            e=cr.elements.new((i+1)/len(cols)); e.color=(*srgb(cc),1)
        t.links.new(tco.outputs['Object'],g.inputs[0]); t.links.new(g.outputs['Fac'],r.inputs[0]); t.links.new(r.outputs[0],p.inputs['Base Color'])
        setp(p,'Roughness',0.12); setp(p,'Coat Weight',1.0); setp(p,'Emission Color',(1,1,1,1)); setp(p,'Emission Strength',0.0)
        sph.data.materials.append(m)
        # white star emblem
        pts=[((1 if i%2==0 else 0.45)*math.cos(math.pi/2+i*math.pi/5),(1 if i%2==0 else 0.45)*math.sin(math.pi/2+i*math.pi/5)) for i in range(10)]
        me=bpy.data.meshes.new('em'); me.from_pydata([(x*0.48,y*0.48,0) for x,y in pts],[],[list(range(10))]); me.update()
        o=bpy.data.objects.new('em',me); sc.collection.objects.link(o)
        s=o.modifiers.new('s','SOLIDIFY'); s.thickness=0.2; s.offset=1
        b=o.modifiers.new('b','BEVEL'); b.width=0.035; b.segments=4; b.limit_method='ANGLE'; o.location=(0,0,0.86)
        em=bpy.data.materials.new('e'); em.use_nodes=True; setp(P(em),'Base Color',(1,1,1,1)); setp(P(em),'Roughness',0.2); setp(P(em),'Coat Weight',1)
        o.data.materials.append(em)
        sc.render.filepath=f'{OUT}joker.png'; bpy.ops.render.render(write_still=True)
if mode=='raccoon':
    def M(hexc,rough=0.5,metal=0.0,coat=0.0,sss=0.0):
        m=bpy.data.materials.new('m'); m.use_nodes=True; p=P(m)
        setp(p,'Base Color',(*srgb(hexc),1)); setp(p,'Roughness',rough); setp(p,'Metallic',metal); setp(p,'Coat Weight',coat)
        if sss: setp(p,'Subsurface Weight',sss)
        return m
    def fin(o,mat,sub=2):
        bpy.context.view_layer.objects.active=o; bpy.ops.object.shade_smooth()
        if sub: o.modifiers.new('s','SUBSURF').levels=sub
        o.data.materials.append(mat); return o
    def sphere(loc,scale,mat,rot=(0,0,0),sub=1):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=48,ring_count=24,radius=1,location=loc,rotation=rot); o=bpy.context.object; o.scale=scale; return fin(o,mat,sub)
    def cone(loc,r1,r2,d,mat,rot=(0,0,0)):
        bpy.ops.mesh.primitive_cone_add(vertices=48,radius1=r1,radius2=r2,depth=d,location=loc,rotation=rot); o=bpy.context.object
        bv=o.modifiers.new('b','BEVEL'); bv.width=0.05; bv.segments=4; return fin(o,mat,1)
    grey=M('#8d8f9a',0.6,sss=0.1); lgrey=M('#e8e6e2',0.6,sss=0.1); black=M('#1c1c22',0.35,coat=0.4); dgrey=M('#4a4b55',0.6)
    white=M('#ffffff',0.2,coat=1); pupil=M('#0a0a0a',0.1,coat=1); nose=M('#222222',0.2,coat=1)
    sack=M('#a8743e',0.8); rope=M('#d9b26a',0.6); gold=M('#ffc23a',0.25,1.0); red=M('#e8203a',0.3,coat=1)
    # body
    sphere((0,0,0),(0.9,0.8,1.0),grey,sub=2)
    sphere((0,-0.45,-0.1),(0.6,0.4,0.72),lgrey,sub=2)
    # head
    sphere((0,-0.05,1.25),(0.95,0.8,0.78),grey,sub=2)
    sphere((-0.42,-0.55,1.05),(0.38,0.3,0.28),lgrey,sub=2); sphere((0.42,-0.55,1.05),(0.38,0.3,0.28),lgrey,sub=2)
    sphere((0,-0.78,1.02),(0.28,0.24,0.2),lgrey,sub=2)
    sphere((0,-1.0,1.08),(0.11,0.08,0.08),nose,sub=1)
    # bandit mask
    sphere((0,-0.55,1.35),(0.82,0.32,0.26),black,sub=2)
    for x in (-0.33,0.33):
        sphere((x,-0.78,1.37),(0.2,0.1,0.2),white,sub=2)
        sphere((x*0.95,-0.86,1.34),(0.11,0.06,0.12),pupil,sub=2)
        sphere((x*0.95-0.04,-0.9,1.4),(0.035,0.02,0.035),white,sub=1)
    # brows (sly)
    sphere((-0.34,-0.72,1.6),(0.2,0.05,0.05),black,rot=(0,math.radians(-15),0),sub=1)
    sphere((0.34,-0.72,1.6),(0.2,0.05,0.05),black,rot=(0,math.radians(15),0),sub=1)
    # ears
    for x,a in ((-0.62,-25),(0.62,25)):
        cone((x,0.0,1.85),0.24,0.04,0.4,grey,rot=(0,math.radians(a),0))
        cone((x*0.97,-0.08,1.83),0.14,0.02,0.3,black,rot=(0,math.radians(a),0))
    # tail striped
    for i in range(6):
        t=i/5; sphere((0.95+0.35*t,0.45+0.1*t,-0.6+0.9*t),(0.32-0.05*t,0.32-0.05*t,0.24),black if i%2 else dgrey,sub=1)
    # arms
    sphere((-0.88,-0.25,0.1),(0.22,0.22,0.5),grey,rot=(0,math.radians(20),0),sub=2)
    sphere((0.85,-0.2,0.35),(0.22,0.22,0.5),grey,rot=(0,math.radians(-40),0),sub=2)
    # loot sack over shoulder (behind right)
    sphere((0.9,0.35,0.95),(0.6,0.5,0.55),sack,sub=2)
    cone((0.9,0.35,1.5),0.18,0.08,0.25,rope)
    for i,(x,z) in enumerate([(0.75,1.62),(0.95,1.68),(1.1,1.6)]):
        bpy.ops.mesh.primitive_cylinder_add(vertices=32,radius=0.1,depth=0.03,location=(x,0.2,z),rotation=(math.radians(70),0,math.radians(i*20))); fin(bpy.context.object,gold,1)
    sphere((0.85,0.05,1.55),(0.08,0.08,0.08),red,sub=1)
    # feet
    sphere((-0.35,-0.35,-1.0),(0.25,0.32,0.14),black,sub=1); sphere((0.35,-0.35,-1.0),(0.25,0.32,0.14),black,sub=1)
    cam=bpy.data.cameras.new('c'); cam.lens=70
    co=bpy.data.objects.new('cam',cam); sc.collection.objects.link(co); sc.camera=co
    co.location=(2.0,-8.6,2.0); d=Vector((0.2,0,0.55))-co.location; co.rotation_euler=d.to_track_quat('-Z','Y').to_euler()
    light('k',(-4,-5,5),1400,3,target=(0,0,0.6)); light('f',(5,-3,2),500,4,(0.9,0.95,1),target=(0,0,0.6)); light('r',(0,5,4),900,3,(1,0.9,0.75),target=(0,0,0.6))
    sc.render.resolution_x=440; sc.render.resolution_y=480
    sc.render.filepath=f'{OUT}raccoon.png'; bpy.ops.render.render(write_still=True)
print('ok')
