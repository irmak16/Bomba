# Bilge Baykuş maskotunu render eder. Kullanım: python3 tools/blender_baykus.py --out mascot.png (pip install bpy)
import bpy, math, sys
from mathutils import Vector
OUT=sys.argv[sys.argv.index('--out')+1]
bpy.ops.wm.read_factory_settings(use_empty=True)
sc=bpy.context.scene
sc.render.engine='CYCLES'; sc.cycles.device='CPU'; sc.cycles.samples=96
try: sc.cycles.use_denoising=True
except: pass
sc.render.film_transparent=True; sc.render.resolution_x=420; sc.render.resolution_y=480
sc.render.image_settings.color_mode='RGBA'; sc.view_settings.view_transform='Standard'
w=bpy.data.worlds.new('w'); sc.world=w; w.use_nodes=True
w.node_tree.nodes['Background'].inputs[0].default_value=(0.8,0.85,0.95,1); w.node_tree.nodes['Background'].inputs[1].default_value=0.45
def srgb(h):
    h=h.lstrip('#'); c=[int(h[i:i+2],16)/255 for i in (0,2,4)]
    return tuple((x/12.92) if x<=0.04045 else ((x+0.055)/1.055)**2.4 for x in c)
def M(hexc,rough=0.45,metal=0.0,coat=0.0,sss=0.0):
    m=bpy.data.materials.new('m'); m.use_nodes=True; p=m.node_tree.nodes['Principled BSDF']
    p.inputs['Base Color'].default_value=(*srgb(hexc),1); p.inputs['Roughness'].default_value=rough; p.inputs['Metallic'].default_value=metal
    if 'Coat Weight' in p.inputs: p.inputs['Coat Weight'].default_value=coat
    if sss and 'Subsurface Weight' in p.inputs: p.inputs['Subsurface Weight'].default_value=sss
    return m
def obj(o,mat,smooth=True,sub=2):
    if smooth:
        bpy.context.view_layer.objects.active=o; bpy.ops.object.shade_smooth()
    if sub: o.modifiers.new('s','SUBSURF').levels=sub
    o.data.materials.append(mat); return o
def sphere(loc,scale,mat,rot=(0,0,0),sub=1):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=48,ring_count=24,radius=1,location=loc,rotation=rot); o=bpy.context.object; o.scale=scale
    return obj(o,mat,sub=sub)
def cone(loc,r1,r2,depth,mat,rot=(0,0,0)):
    bpy.ops.mesh.primitive_cone_add(vertices=48,radius1=r1,radius2=r2,depth=depth,location=loc,rotation=rot); o=bpy.context.object
    bv=o.modifiers.new('b','BEVEL'); bv.width=0.04; bv.segments=4
    return obj(o,mat,sub=1)
brown=M('#8a5a34',0.55,sss=0.1); dark=M('#5e3a20',0.6); cream=M('#f5dfb5',0.6,sss=0.1)
white=M('#ffffff',0.2,coat=1); black=M('#1a1208',0.15,coat=1); orange=M('#ffa22a',0.35,coat=0.5)
gold=M('#ffc23a',0.25,1.0); red=M('#e8203a',0.2,coat=1); blue=M('#2f6fff',0.15,coat=1)
# body & head
sphere((0,0,0),(1.0,0.9,1.15),brown,sub=2)
sphere((0,-0.52,-0.12),(0.66,0.42,0.8),cream,sub=2)
# belly feather marks
for i,(x,z) in enumerate([(-0.25,0.1),(0.25,0.1),(0,-0.15),(-0.3,-0.4),(0.3,-0.4),(0,-0.65)]):
    sphere((x,-0.9+abs(x)*0.35+abs(z+0.2)*0.12,z),(0.1,0.05,0.06),M('#c99c66',0.6),sub=1)
sphere((0,0,1.35),(0.92,0.85,0.78),brown,sub=2)
# face disc
sphere((-0.34,-0.6,1.38),(0.38,0.2,0.38),cream,sub=2)
sphere((0.34,-0.6,1.38),(0.38,0.2,0.38),cream,sub=2)
# eyes
for x in (-0.34,0.34):
    sphere((x,-0.74,1.4),(0.27,0.14,0.27),white,sub=2)
    sphere((x*0.92,-0.86,1.38),(0.15,0.07,0.17),black,sub=2)
    sphere((x*0.92-0.05,-0.92,1.46),(0.05,0.02,0.05),white,sub=1)
# glasses (golden rims)
for x in (-0.34,0.34):
    bpy.ops.mesh.primitive_torus_add(major_radius=0.3,minor_radius=0.035,location=(x,-0.8,1.4),rotation=(math.pi/2,0,0)); obj(bpy.context.object,gold,sub=1)
# beak
cone((0,-0.86,1.16),0.11,0.0,0.3,orange,rot=(math.radians(110),0,0))
# ear tufts
cone((-0.6,0.0,2.0),0.2,0.0,0.5,dark,rot=(0,math.radians(-28),0))
cone((0.6,0.0,2.0),0.2,0.0,0.5,dark,rot=(0,math.radians(28),0))
# crown
bpy.ops.mesh.primitive_cylinder_add(vertices=48,radius=0.36,depth=0.22,location=(0,0.05,2.12)); obj(bpy.context.object,gold,sub=1)
for i in range(5):
    a=i/5*2*math.pi
    cone((0.33*math.cos(a),0.05+0.33*math.sin(a),2.34),0.1,0.0,0.26,gold)
    sphere((0.33*math.cos(a),0.05+0.33*math.sin(a),2.48),(0.055,0.055,0.055),gold,sub=1)
sphere((0,-0.34,2.13),(0.09,0.05,0.08),red,sub=1)
# wings
sphere((-0.98,0.0,0.05),(0.28,0.55,0.8),dark,rot=(0,math.radians(15),0),sub=2)
sphere((0.98,0.0,0.05),(0.28,0.55,0.8),dark,rot=(0,math.radians(-15),0),sub=2)
# feet
for x in (-0.35,0.35):
    for dx in (-0.1,0,0.1):
        sphere((x+dx,-0.45,-1.1),(0.08,0.18,0.07),orange,sub=1)
# scroll in wing (blue ribbon)

# camera & lights
cam=bpy.data.cameras.new('c'); cam.lens=70
co=bpy.data.objects.new('cam',cam); sc.collection.objects.link(co); sc.camera=co
co.location=(2.4,-8.5,2.0); d=Vector((0,0,0.6))-co.location; co.rotation_euler=d.to_track_quat('-Z','Y').to_euler()
def light(loc,e,s,col=(1,1,1)):
    l=bpy.data.lights.new('l','AREA'); l.energy=e; l.size=s; l.color=col
    o=bpy.data.objects.new('l',l); sc.collection.objects.link(o); o.location=loc
    d=Vector((0,0,0.6))-Vector(loc); o.rotation_euler=d.to_track_quat('-Z','Y').to_euler()
light((-4,-5,5),1400,3); light((5,-3,2),500,4,(0.9,0.95,1)); light((0,5,4),900,3,(1,0.9,0.75))
sc.render.filepath=OUT; bpy.ops.render.render(write_still=True); print('ok')
