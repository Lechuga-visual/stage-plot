#!/usr/bin/env python3
"""Original GordoStage vector sample. Geometry is authored here, without embedded raster images."""
from pathlib import Path
from html import escape
import json, subprocess, unicodedata, re
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'muestra-de-iconos' / 'familia-gordostage-v1'
PALETTES = {
    'claro': dict(ink='#292e34', body='#fff4e5', soft='#e3e7e9', panel='#303841', line='#a8b3bc', orange='#ed7529', blue='#56b8db', white='#ffffff', off='#f6f3ee'),
    'oscuro': dict(ink='#edf3f8', body='#182a3b', soft='#2d4559', panel='#101c29', line='#91aabd', orange='#ff8a3d', blue='#63c7e8', white='#edf3f8', off='#0c1522'),
}
C = PALETTES['claro']
def color(value): return C.get(value, value)
def attrs(fill='none', stroke='ink', sw=2.4):
    return f'fill="{color(fill)}" stroke="{color(stroke)}" stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round"'
def path(d, fill='none', stroke='ink', sw=2.4): return f'<path d="{d}" {attrs(fill,stroke,sw)}/>'
def line(x1,y1,x2,y2,stroke='ink',sw=2.4): return path(f'M{x1:g} {y1:g}L{x2:g} {y2:g}',stroke=stroke,sw=sw)
def rect(x,y,w,h,fill='body',rx=3,stroke='ink',sw=2.4): return f'<rect x="{x:g}" y="{y:g}" width="{w:g}" height="{h:g}" rx="{rx:g}" {attrs(fill,stroke,sw)}/>'
def circle(x,y,r,fill='body',stroke='ink',sw=2.4): return f'<circle cx="{x:g}" cy="{y:g}" r="{r:g}" {attrs(fill,stroke,sw)}/>'
def ellipse(x,y,rx,ry,fill='body',stroke='ink',sw=2.4): return f'<ellipse cx="{x:g}" cy="{y:g}" rx="{rx:g}" ry="{ry:g}" {attrs(fill,stroke,sw)}/>'
def poly(points,fill='body',stroke='ink',sw=2.4): return path('M'+'L'.join(f'{x:g} {y:g}' for x,y in points)+'Z',fill,stroke,sw)
def group(svg, transform=''): return f'<g transform="{transform}">{svg}</g>' if transform else f'<g>{svg}</g>'
def dots(x,y,n,step=7,r=1.2,fill='ink'): return ''.join(circle(x+i*step,y,r,fill,'none',0) for i in range(n))
def grille(x,y,w,h,rows=5,cols=7):
    result=rect(x,y,w,h,'panel',2)
    for row in range(rows):
        for col in range(cols): result+=circle(x+4+col*(w-8)/max(1,cols-1),y+4+row*(h-8)/max(1,rows-1),.9,'line','none',0)
    return result
GLYPHS={
'A':[(0,6,2,0),(2,0,4,6),(1,4,3,4)],'B':[(0,0,0,6),(0,0,3,0),(3,0,4,1),(4,1,3,3),(0,3,3,3),(3,3,4,5),(4,5,3,6),(3,6,0,6)],
'C':[(4,0,1,0),(1,0,0,1),(0,1,0,5),(0,5,1,6),(1,6,4,6)],'D':[(0,0,0,6),(0,0,2,0),(2,0,4,2),(4,2,4,4),(4,4,2,6),(2,6,0,6)],
'E':[(0,0,0,6),(0,0,4,0),(0,3,3,3),(0,6,4,6)],'F':[(0,0,0,6),(0,0,4,0),(0,3,3,3)],'G':[(4,1,3,0),(3,0,1,0),(1,0,0,1),(0,1,0,5),(0,5,1,6),(1,6,4,6),(4,6,4,3),(4,3,2,3)],
'H':[(0,0,0,6),(4,0,4,6),(0,3,4,3)],'I':[(0,0,4,0),(2,0,2,6),(0,6,4,6)],'L':[(0,0,0,6),(0,6,4,6)],'M':[(0,6,0,0),(0,0,2,3),(2,3,4,0),(4,0,4,6)],
'N':[(0,6,0,0),(0,0,4,6),(4,6,4,0)],'O':[(1,0,3,0),(3,0,4,1),(4,1,4,5),(4,5,3,6),(3,6,1,6),(1,6,0,5),(0,5,0,1),(0,1,1,0)],
'P':[(0,6,0,0),(0,0,3,0),(3,0,4,1),(4,1,4,2),(4,2,3,3),(3,3,0,3)],'R':[(0,6,0,0),(0,0,3,0),(3,0,4,1),(4,1,4,2),(4,2,3,3),(3,3,0,3),(2,3,4,6)],
'S':[(4,0,1,0),(1,0,0,1),(0,1,1,3),(1,3,3,3),(3,3,4,5),(4,5,3,6),(3,6,0,6)],'T':[(0,0,4,0),(2,0,2,6)],'U':[(0,0,0,5),(0,5,1,6),(1,6,3,6),(3,6,4,5),(4,5,4,0)],
'V':[(0,0,2,6),(2,6,4,0)],'X':[(0,0,4,6),(4,0,0,6)],'Y':[(0,0,2,3),(4,0,2,3),(2,3,2,6)],'Z':[(0,0,4,0),(4,0,0,6),(0,6,4,6)],
'0':[(1,0,3,0),(3,0,4,1),(4,1,4,5),(4,5,3,6),(3,6,1,6),(1,6,0,5),(0,5,0,1),(0,1,1,0)],'1':[(1,1,2,0),(2,0,2,6),(0,6,4,6)],'2':[(0,1,1,0),(1,0,3,0),(3,0,4,1),(4,1,0,6),(0,6,4,6)],'3':[(0,0,4,0),(4,0,2,3),(2,3,4,4),(4,4,4,5),(4,5,3,6),(3,6,0,6)],'4':[(3,6,3,0),(3,0,0,4),(0,4,4,4)],'8':[(1,0,3,0),(3,0,4,1),(4,1,4,2),(4,2,0,4),(0,4,0,5),(0,5,1,6),(1,6,3,6),(3,6,4,5),(4,5,4,4),(4,4,0,2),(0,2,0,1),(0,1,1,0)],
'+':[(2,1,2,5),(0,3,4,3)],'-':[(0,3,4,3)]}
def label(text,x,y,scale=1,stroke='ink'):
    result=''
    for i,ch in enumerate(text):
        for a,b,c,d in GLYPHS.get(ch,[]):result+=line(x+(i*6+a)*scale,y+b*scale,x+(i*6+c)*scale,y+d*scale,stroke,1.35*scale)
    return result

def guitar(kind='electric'):
    acoustic=kind in ['acoustic','classical','resonator','ukulele']
    body=path('M43 48C38 39 29 43 31 54C32 59 35 60 31 65C18 80 29 93 48 93C67 93 77 80 65 66C60 60 63 57 64 53C66 42 56 39 53 49Z','body') if acoustic else path('M41 50C34 45 31 48 32 56C34 62 27 65 25 76C22 88 32 94 47 94C63 94 73 86 70 76C68 68 62 65 63 57C65 48 58 45 55 51L52 57H44Z','body')
    body+=rect(44,19,9 if kind!='bass' else 7,48,'body',1)
    if kind=='bass':body=path('M41 51C34 42 30 48 33 57C34 63 27 65 26 77C24 88 34 94 48 94C63 94 72 85 69 75C67 66 60 64 62 55C64 45 56 47 54 54L51 59H44Z','body')+rect(45,14,7,54,'body',1)
    neckx=45 if kind=='bass' else 44
    body+=path(f'M{neckx} 20L{neckx-1} 9Q{neckx+4} 4 {neckx+10} 8L{neckx+8} 20Z','body')
    pegs=4 if kind=='bass' else 6
    for i in range(pegs):
        xx=neckx-3 if i%2==0 else neckx+12;yy=10+(i//2)*4
        body+=line(xx,yy,neckx+(0 if i%2==0 else 8),yy,sw=1.7)+circle(xx,yy,1.3,'orange')
    for i in range(4 if kind=='bass' else 3):body+=line(neckx+2+i*1.6,20,neckx+2+i*1.6,83,'line',.8)
    for yy in [28,36,44,52]:body+=line(neckx,yy,neckx+8,yy,'ink',1)
    if acoustic:
        body+=circle(48,70,5.3,'panel')+circle(48,70,7.2,'none','orange',1.8)+rect(40,84,17,3,'panel',1)
        if kind=='resonator':body+=circle(48,75,11,'soft')+dots(42,75,3,6,1)
        if kind=='classical':body+=line(33,86,62,86,'orange',1.2)
    else:
        body+=path('M39 62L54 59L61 76L54 85L38 81Z','orange','none',0)+rect(40,65,15,3,'panel',1)+rect(40,75,15,3,'panel',1)+rect(40,85,15,3,'panel',1)+circle(61,82,2,'blue')
    return group(body,'translate(3 0)') if kind!='ukulele' else group(body,'translate(10 10) scale(.82)')

def bowed(kind):
    body=path('M42 30C32 24 27 36 34 44C38 49 35 52 29 57C16 74 28 90 49 90C69 90 78 74 65 58C60 51 57 49 62 43C68 33 62 24 54 30L51 37H45Z','body')
    body+=rect(45,11,7,51,'body',1)+path('M44 12C40 5 55 3 54 12','body')+rect(40,71,18,3,'orange',1)+line(46,12,46,81,'line',.9)+line(50,12,50,81,'line',.9)
    body+=path('M36 55q-7 4-2 9m-2-5-1 8M60 55q7 4 2 9m2-5 1 8',stroke='ink',sw=1.7)+line(82,12,79,87,'ink',2)+line(79,15,77,85,'orange',.9)
    if kind in ['cello','upright_bass']:body+=line(49,90,49,96)
    return group(body,'translate(7 6) scale(.86)') if kind=='viola' else body

def harp():
    return path('M19 16Q54 5 81 27L67 86L29 89Z','body')+path('M19 16L29 89L36 86L28 22Q53 17 73 31L67 86L75 89L88 23Q55-1 19 16Z','orange')+''.join(line(30+i*6,21+i*.6,35+i*5.1,86,'line',1.2) for i in range(7))
def round_strings(kind):
    body=circle(49,69,22,'body')+circle(49,69,17,'none','orange',1.7) if kind=='banjo' else path('M49 41C24 45 19 70 33 86Q49 97 65 86C79 70 74 45 49 41Z','body')
    body+=rect(46,14,7,48,'body',1)+rect(43,6,13,9,'orange',2)+circle(49,68,4,'panel')+rect(40,82,18,3,'panel',1)
    body+=''.join(line(47+i*1.5,15,47+i*1.5,83,'line',.8) for i in range(3))
    return body

def keyboard(x=12,y=22,w=76,h=24,controls=True):
    result=rect(x,y,w,h,'panel',4)
    key_y=y+(8 if controls else 3);key_h=h-(11 if controls else 6)
    result+=rect(x+4,key_y,w-8,key_h,'white',1,'ink',1.5)
    step=(w-8)/12
    for n in range(1,12):result+=line(x+4+n*step,key_y,x+4+n*step,key_y+key_h,'panel',.8)
    for n in [1,2,4,5,6,8,9,11]:result+=rect(x+2+n*step,key_y,step*.6,key_h*.62,'panel',.5,'none',0)
    if controls:result+=rect(x+5,y+3,9,3,'blue',1,'none',0)+dots(x+w-19,y+4,3,5,1.3,'orange')
    return result

def keys_rig(kind):
    if kind=='double_keyboard_rig':return keyboard(14,18,72,22)+keyboard(10,49,80,24)+line(23,74,70,91)+line(77,74,30,91)+circle(50,82,2.3,'orange')
    if kind=='grand_piano':
        return path('M22 77V26C22 9 48 7 62 15C75 23 65 32 71 40C81 54 77 69 68 76Z','panel')+keyboard(21,67,50,19,False)+line(28,87,25,94)+line(65,87,68,94)+path('M30 22Q54 12 64 26',stroke='orange')
    if kind=='upright_piano':return rect(15,15,70,58,'panel',4)+rect(22,23,56,21,'soft')+keyboard(15,51,70,25,False)+line(22,76,20,91)+line(78,76,80,91)+line(36,87,64,87,'orange')
    if kind=='organ_leslie_rig':return group(keyboard(5,23,58,19)+keyboard(5,45,58,19)+line(15,66,11,87)+line(54,66,59,87))+rect(71,33,22,53,'panel')+''.join(line(75,43+i*7,89,43+i*7,'line',1.5) for i in range(5))+rect(77,77,10,3,'orange',1,'none',0)
    if kind=='synthesizer':return keyboard(10,43,80,28)+rect(10,23,80,22,'panel',4)+''.join(circle(22+i*15,32,3,'orange' if i==0 else 'soft') for i in range(3))+rect(68,29,14,9,'blue',1)
    if kind=='midi_controller':return keyboard(12,43,76,28)+rect(12,27,76,18,'panel')+''.join(rect(20+c*8,32+r*5,5,3,'orange' if (r+c)%3==0 else 'soft',.5,'none',0) for r in range(2) for c in range(4))+dots(66,35,3,6,1.8,'blue')
    if kind=='keytar':return group(keyboard(21,36,65,26,False)+path('M20 38L8 25L16 18L35 36Z','orange'),'translate(6 3) rotate(-24 50 50)')
    if kind=='accordion':return rect(13,21,20,60,'panel')+rect(32,26,35,50,'body')+''.join(path(f'M{34+i*5} 27l2 24-2 24',stroke='orange' if i==2 else 'ink',sw=1.5) for i in range(6))+rect(66,21,21,60,'panel',2)+rect(69,24,15,54,'white',1)+''.join(line(69,24+i*6,84,24+i*6,'panel',.9) for i in range(1,9))+''.join(rect(69,22+i*6,9,3,'panel',.5,'none',0) for i in [1,2,4,5,6,8])+dots(20,35,2,6,1.6,'white')+dots(20,47,2,6,1.6,'white')+dots(20,59,2,6,1.6,'white')
    if kind=='generic_electronic_instrument':return rect(17,23,66,51,'panel')+rect(26,31,24,18,'blue')+dots(60,38,3,7,2,'orange')+''.join(rect(25+i*14,57,9,9,'soft',1) for i in range(4))
    if kind=='digital_piano':return keyboard(9,28,82,26)+rect(16,55,5,32,'panel',1)+rect(79,55,5,32,'panel',1)+line(27,84,73,84,'orange')
    return keyboard(10,26,80,26)+line(23,53,75,88)+line(77,53,25,88)+line(18,89,36,89)+line(64,89,82,89)+circle(50,70,3,'orange')

def drum(x,y,r=13,h=14):
    return path(f'M{x-r} {y}V{y+h}a{r} {r*.35} 0 0 0 {r*2} 0V{y}Z','orange')+ellipse(x,y,r,r*.32,'body')+ellipse(x,y+h,r,r*.3,'none')+line(x-r+4,y+3,x-r+4,y+h,'line',1.4)+line(x+r-4,y+3,x+r-4,y+h,'line',1.4)
def cymbal(x,y,rx=14,stand=48):
    return line(x,y+2,x,stand)+line(x,stand,x-8,stand+10)+line(x,stand,x+8,stand+10)+ellipse(x,y,rx,3.4,'orange')+line(x,y-5,x,y-1,'ink',2)
def kit(electronic=False,hybrid=False):
    result=cymbal(18,24,13,72)+cymbal(83,30,12,77)
    if electronic:
        result+=path('M26 46H75M32 45L27 88M70 45L78 88')
        result+=''.join(ellipse(x,y,11,5,'panel','ink',2.4) for x,y in [(38,36),(64,36),(23,56),(79,57)])+circle(50,70,16,'panel')+circle(50,70,11,'none','orange',2)+rect(43,88,14,4,'orange',1)
    else:
        result+=drum(39,41,11,14)+drum(64,41,11,14)+drum(79,65,10,15)+circle(50,73,20,'orange')+circle(50,73,16,'body')+circle(58,79,3,'blue')+line(32,87,27,94)+line(68,87,73,94)
        if hybrid:result+=rect(6,47,15,14,'panel',2)+line(14,61,10,85)+line(10,85,5,90)+line(10,85,16,90)
    return result

def percussion(kind):
    if kind in ['acoustic_drum_kit','electronic_drum_kit','hybrid_drum_kit']:return kit(kind=='electronic_drum_kit',kind=='hybrid_drum_kit')
    if kind=='kick_drum':return circle(50,48,30,'orange')+circle(50,48,24,'body')+circle(61,58,5,'blue')+line(25,71,18,85)+line(75,71,82,85)+rect(44,80,13,7,'panel',1)
    if kind in ['snare_drum','rack_tom','floor_tom']:
        h=18 if kind=='snare_drum' else 29 if kind=='rack_tom' else 40
        result=drum(50,28,25,h)
        if kind=='snare_drum':result+=line(32,48,50,67)+line(68,48,50,67)+line(50,67,50,83)+line(50,83,34,91)+line(50,83,66,91)+line(31,41,69,41,'line',1.1)
        elif kind=='rack_tom':result+=path('M50 58V72H68',stroke='ink')
        else:result+=line(30,65,27,90)+line(70,65,73,90)+line(51,70,51,91)
        return result
    if kind=='hi_hat':return cymbal(50,29,29,80)+ellipse(50,34,28,5,'body')+rect(63,83,15,5,'orange',1)
    if kind=='cymbal':return cymbal(50,29,33,79)
    if kind=='drum_throne':return ellipse(50,30,27,10,'panel')+path('M23 30v9q27 17 54 0v-9','panel')+line(50,48,50,77)+line(50,77,28,89)+line(50,77,72,89)+circle(50,62,3,'orange')
    if kind=='drum_rug':return poly([(10,27),(80,21),(92,73),(19,82)],'soft')+path('M18 33L74 28L83 68L25 75Z','none','orange',2)+''.join(line(20+i*8,82,19+i*8,87,'line',1.3) for i in range(8))
    if kind=='bongos':return drum(29,34,20,31)+drum(72,39,17,25)+line(49,48,55,48,'panel',6)
    if kind=='conga_set':return path('M12 24Q7 58 23 88H39Q53 58 47 24Z','orange')+ellipse(30,24,18,6,'body')+path('M55 35Q50 64 64 89H80Q93 64 89 35Z','body')+ellipse(72,35,17,5,'body')+line(18,35,23,79,'line',1.3)+line(60,45,65,80,'orange',1.5)
    if kind=='cajon':return rect(23,13,54,76,'body',5)+rect(29,20,42,61,'soft',2)+circle(50,58,11,'panel')+rect(40,82,20,3,'orange',1,'none',0)+dots(34,26,4,11,1)+dots(34,76,4,11,1)
    if kind=='djembe':return path('M22 24Q23 49 42 59L30 88H71L58 59Q78 49 78 24Z','orange')+ellipse(50,24,28,8,'body')+''.join(line(25+i*7,32,42+(i%2)*16,59,'line',1) for i in range(8))+line(35,79,66,79)
    if kind=='percussion_rig':return cymbal(19,30,13,77)+drum(44,39,16,32)+drum(76,41,14,30)+line(44,73,40,89)+line(76,72,80,89)+line(29,89,88,89,'orange')
    if kind=='small_percussion':return path('M20 28Q51 8 77 32L68 43Q49 27 29 41Z','orange')+path('M22 30L10 54Q48 91 87 59L75 33','body')+''.join(circle(x,y,4,'soft') for x,y in [(20,54),(36,66),(56,67),(75,58)])
    if kind=='timpani_set':return path('M10 35Q12 75 31 75Q50 75 52 35Z','orange')+ellipse(31,35,21,7,'body')+line(20,72,14,90)+line(42,72,48,90)+path('M54 28Q56 65 74 65Q92 65 94 28Z','body')+ellipse(74,28,20,6,'body')+line(64,64,58,86)+line(84,64,91,86)
    if kind in ['marimba','vibraphone','xylophone_glockenspiel','mallet_instrument']:
        result=poly([(10,29),(88,21),(90,62),(12,71)],'body')
        for n in range(10):result+=rect(16+n*7,28+n*.1,5,34-n*1.6,'orange' if n%3==0 else 'soft',1)
        if kind in ['marimba','vibraphone']:result+=''.join(line(18+i*8,66-i*.5,18+i*8,79-i*1.1,'line',3) for i in range(8))+line(17,72,15,91)+line(82,65,85,89)
        if kind=='vibraphone':result+=rect(78,71,13,7,'blue',1)
        if kind=='mallet_instrument':result+=rect(38,76,25,6,'orange',1)+line(50,82,50,91)
        result+=line(21,15,59,22,'ink',2)+circle(21,15,4,'orange')+line(71,11,47,24,'ink',2)+circle(71,11,4,'blue')
        return result
    if kind in ['sample_pad','sampler_drum_machine']:
        result=rect(17,19,66,61,'panel',5)
        for row in range(2 if kind=='sampler_drum_machine' else 3):
            for col in range(3):result+=rect(25+col*17,30+row*14,12,10,'orange' if (row,col)==(0,0) else 'soft',2)
        if kind=='sampler_drum_machine':result+=rect(25,61,30,9,'blue',1)+dots(67,66,2,7,2,'orange')
        else:result+=line(50,81,50,90)+line(50,90,36,95)+line(50,90,64,95)
        return result
    if kind=='cowbell':return path('M32 23H67L79 77Q50 91 20 77Z','orange')+ellipse(50,77,29,7,'panel')+rect(42,14,16,9,'soft',2)+line(16,20,35,60,'ink',3)
    return drum(50,31,27,36)+line(22,15,75,78,'orange',2.5)+line(76,12,30,78,'ink',2.5)

def wind(kind):
    if kind=='generic_wind_brass':return path('M32 18H68L60 43V70Q60 85 43 85Q25 85 25 69V51H35V70Q35 76 43 76Q50 76 50 69V43Z','orange')+ellipse(50,18,18,6,'body')+rect(39,49,6,19,'body',1)+line(42,43,42,49)+line(21,91,75,91,'blue',2)
    if kind in ['flute','dizi']:
        result=rect(44,8,11,79,'body',4)+line(44,19,55,19,'orange',3)+''.join(circle(49.5,30+i*8,1.9,'panel') for i in range(6))+line(45,82,54,82,'orange',2)
        if kind=='dizi':result+=line(44,57,55,57,'orange',3)+rect(46,20,7,6,'blue',1)
        return group(result,'rotate(32 50 50)')
    if kind in ['clarinet','oboe','bassoon','suona','generic_wind_brass']:
        if kind=='bassoon':return path('M32 89V25Q32 13 44 15L57 79Q58 86 66 84V19','body')+rect(29,24,9,58,'orange',3)+path('M66 20V12H78L82 20',stroke='ink')+''.join(circle(34,39+i*8,1.8,'soft') for i in range(5))
        bell=path('M43 72L33 89Q50 96 66 89L56 72Z','orange') if kind in ['clarinet','suona','generic_wind_brass'] else path('M44 75L40 89H59L55 75Z','body')
        result=bell+rect(44,19,11,58,'panel' if kind=='clarinet' else 'body',2)+path('M46 19L46 9L53 7V19Z','orange')+''.join(circle(49.5,30+i*8,1.9,'line','ink',1.2) for i in range(5))
        if kind=='oboe':result+=line(44,24,55,24,'blue',2)
        if kind=='suona':result+=line(43,66,56,66,'blue',3)
        return result
    if kind=='saxophone':return path('M41 10H53L62 51Q66 68 52 79Q38 91 27 78L19 68L32 56L38 67Q41 71 46 66Q49 62 47 55L39 24H32V17H41Z','orange')+ellipse(27,63,10,6,'body')+path('M45 22L54 57Q57 72 45 77',stroke='ink',sw=1.4)+''.join(circle(48+i*1.8,34+i*8,1.8,'body') for i in range(4))
    if kind=='trumpet':return path('M13 44H65L86 29V68L65 54H30Q18 54 20 67Q22 79 36 76H63V64H40','orange')+line(7,45,13,45)+line(7,40,7,51)+''.join(line(37+i*10,37,37+i*10,63,'ink',2.5)+rect(33+i*10,31,8,5,'body',1) for i in range(3))+line(29,83,57,83,'ink',2)
    if kind=='trombone':return path('M10 33H62L87 20V59L62 46H24V79H70Q81 79 81 67V54','orange')+line(7,29,7,38)+line(13,34,13,80)+line(24,80,70,80)+line(13,86,70,86)+path('M70 80Q82 80 82 70',stroke='ink')
    if kind=='french_horn':return circle(47,57,28,'orange')+circle(47,57,18,'body')+path('M24 45Q12 40 18 23H31V32H39V39M66 39L91 26V65L69 54Z','orange')+''.join(rect(35+i*9,43,5,19,'body',1) for i in range(3))+path('M29 76L20 88H56',stroke='ink')
    if kind=='tuba':return path('M27 19H78L66 43V75Q66 91 44 91Q22 91 22 72V47H33V72Q33 80 44 80Q55 80 55 73V44Z','orange')+ellipse(52,19,26,7,'body')+''.join(rect(35+i*8,48,5,24,'body',1) for i in range(3))+line(38,43,38,48)+line(46,43,46,48)+line(54,43,54,48)
    if kind=='harmonica':return poly([(12,37),(82,28),(90,61),(20,72)],'soft')+poly([(15,47),(85,39),(87,53),(19,64)],'panel')+''.join(line(24+i*8,47-i,26+i*8,60-i,'orange',3) for i in range(7))+line(24,69,84,61,'orange',1.5)
    if kind=='bagpipes':return path('M22 48Q9 61 21 80Q43 99 68 79L77 55L57 43Z','orange')+path('M29 50L18 14H24L40 46M47 43L41 8H48L58 44M62 47L71 13H77L73 52','body')+path('M24 72L9 86H16L35 78M68 77L80 91H87L76 69','body')+line(24,57,60,82,'ink',1.4)+line(37,48,72,69,'ink',1.4)
    if kind=='erhu':return poly([(31,74),(49,64),(66,75),(65,88),(46,96),(31,87)],'orange')+rect(43,12,6,62,'body',1)+path('M43 14Q55 4 55 14M40 25H57M39 35H57')+line(14,56,83,78,'ink',2.5)+line(16,59,80,79,'line',1.2)
    if kind=='guzheng':return poly([(10,31),(84,20),(91,66),(18,80)],'body')+''.join(line(17,34+i*5.3,83,25+i*5.2,'line',1) for i in range(7))+''.join(poly([(34+i*6,42+i*2),(36+i*6,36+i*2),(38+i*6,42+i*2)],'orange','ink',1.2) for i in range(6))+line(19,77,88,63,'orange',2)
    if kind=='pipa':return path('M45 31C40 39 21 58 25 76Q30 95 50 94Q73 93 76 76C79 57 59 39 55 31Z','body')+rect(46,11,8,32,'body',1)+path('M46 12Q37 7 44 5H58V11Z','orange')+''.join(line(47+i*1.8,15,47+i*1.8,83,'line',.9) for i in range(3))+rect(40,83,21,3,'panel',1)+''.join(line(45-i*.7,45+i*5,55+i*.7,45+i*5,'orange',1.4) for i in range(5))
    return path('M19 26H79L70 72H28Z','body')+''.join(line(27+i*9,32,31+i*6,66,'orange',2) for i in range(6))+line(26,76,20,88)+line(72,76,79,88)

def mic_capsule(kind='dynamic'):
    if kind=='shotgun':return rect(43,8,14,55,'panel',5)+''.join(line(46,16+i*6,54,16+i*6,'line',1.3) for i in range(6))+rect(45,63,10,21,'body',1)
    if kind=='ribbon':return rect(35,10,30,47,'panel',10)+''.join(line(40,18+i*6,60,18+i*6,'line',1.4) for i in range(6))+rect(44,57,12,25,'body',2)+path('M38 44V66H62V44',stroke='orange')
    if kind=='condenser':return rect(37,9,26,39,'panel',8)+''.join(line(42,17+i*6,58,17+i*6,'line',1.2) for i in range(5))+rect(39,48,22,28,'body',3)+line(37,49,63,49,'orange',3)+circle(50,62,2,'blue')
    return ellipse(50,23,15,18,'panel')+''.join(line(41,13+i*5,59,13+i*5,'line',1.1) for i in range(5))+path('M40 39L44 77Q50 82 56 77L60 39Z','body')+line(41,43,59,43,'orange',3)+rect(46,79,8,6,'panel',1)

def microphones(kind):
    if kind in ['utility_dynamic_mic','wireless_handheld_mic']:
        result=mic_capsule()
        if kind=='wireless_handheld_mic':result+=path('M72 14q10 9 0 19M79 8q17 15 0 31',stroke='blue',sw=2)+rect(46,62,8,5,'orange',1)
        else:result+=path('M50 85v4q0 8 17 6',stroke='ink')
        return result
    if kind in ['utility_condenser_mic','ribbon_mic','shotgun_mic','ambient_mic']:
        if kind=='ambient_mic':return rect(44,17,12,58,'body',4)+rect(44,13,12,19,'panel',4)+line(44,34,56,34,'orange',3)+path('M30 20q-9 12 0 23M70 20q9 12 0 23',stroke='blue',sw=1.8)+rect(46,77,8,11,'panel',2)
        return mic_capsule({'utility_condenser_mic':'condenser','ribbon_mic':'ribbon','shotgun_mic':'shotgun'}[kind])+rect(43,84,14,5,'orange',1)
    if kind in ['ambient_mic_pair','drum_overhead_pair']:
        a=group(mic_capsule('condenser'),'translate(2 8) scale(.58)')
        b=group(mic_capsule('condenser'),'translate(41 8) scale(.58)')
        result=a+b+line(30,58,30,83)+line(70,58,70,83)+line(17,88,43,88)+line(57,88,83,88)+label('L',24,70,.8,'blue')+label('R',64,70,.8,'orange')
        return result+(path('M41 70Q50 62 59 70V86H41Z','soft')+ellipse(50,70,9,3,'body') if kind=='drum_overhead_pair' else path('M37 12q13-9 26 0',stroke='blue',sw=1.6))
    if kind=='boundary_mic':return poly([(19,38),(72,24),(88,57),(31,77)],'panel')+poly([(26,44),(69,33),(77,54),(34,66)],'soft')+''.join(line(34+i*7,44-i,37+i*7,60-i,'line',1) for i in range(5))+path('M31 77L24 87H12',stroke='orange')
    if kind=='gooseneck_mic':return ellipse(47,86,28,7,'panel')+path('M47 81V52Q47 37 59 33L72 22',stroke='ink',sw=3)+group(rect(66,9,11,22,'panel',5),'rotate(35 70 22)')+line(65,30,70,23,'orange',3)
    if kind=='lavalier_mic':return rect(39,17,22,31,'panel',8)+line(39,35,61,35,'orange',3)+path('M50 48v21q0 17 19 11q21-6 9-19',stroke='ink',sw=2.5)+path('M38 30h-8v24h17',stroke='line',sw=3)
    if kind=='headset_mic':return path('M18 56V44Q18 15 50 15Q82 15 82 44V56',stroke='ink',sw=4)+rect(13,44,12,27,'panel',5)+rect(75,44,12,27,'panel',5)+path('M80 69q-3 16-22 16',stroke='orange',sw=2.6)+rect(45,81,16,7,'panel',3)
    if kind=='clip_on_instrument_mic':return path('M29 87V50H48V73H61V87Z','soft')+path('M39 49Q37 21 61 21H72',stroke='ink',sw=3)+rect(65,14,21,13,'panel',5)+line(68,16,68,25,'orange',3)+line(35,62,48,62,'orange',2)
    if kind=='talkback_mic':return rect(21,63,57,24,'panel',5)+rect(29,68,21,8,'blue',1)+circle(65,75,4,'orange')+path('M46 63V40Q46 31 60 25',stroke='ink',sw=3)+group(rect(56,9,13,22,'panel',5),'rotate(34 61 20)')
    # Vocal microphone on tripod, matching the approved core sample.
    return line(50,30,50,77,'ink',3)+line(50,77,23,91,'ink',3)+line(50,77,77,91,'ink',3)+line(50,77,50,94,'ink',3)+circle(50,77,4,'panel')+rect(47,56,6,10,'orange',1)+group(mic_capsule(),'translate(51 28) rotate(-60) scale(.5) translate(-50 -58)')

def stands(kind):
    if kind in ['boom_mic_stand','short_boom_mic_stand']:
        result=line(49,42,49,78)+line(49,78,22,91)+line(49,78,75,91)+line(49,78,49,95)+line(20,25,80,43)+circle(49,35,4,'orange')+rect(18,19,15,7,'panel',2)+rect(46,58,6,10,'orange',1)
        return group(result,'translate(3 20) scale(.8)') if kind=='short_boom_mic_stand' else result
    if kind=='straight_mic_stand':return line(50,18,50,78)+rect(45,10,10,10,'panel',2)+rect(47,45,6,10,'orange',1)+line(50,78,21,91)+line(50,78,79,91)+line(50,78,50,95)
    if kind=='table_mic_stand':return ellipse(50,78,29,10,'panel')+rect(47,41,6,33,'body',1)+rect(40,30,20,12,'orange',3)+rect(38,19,24,14,'panel',5)
    if kind=='stereo_bar':return rect(12,41,76,12,'body',3)+circle(21,47,3,'orange')+circle(79,47,3,'blue')+rect(46,53,8,21,'panel',2)+line(23,34,23,41)+line(77,34,77,41)+dots(39,47,4,7,1)
    if kind=='mic_clamp':return path('M31 20Q12 22 19 49Q24 64 43 58L72 48L68 36L40 46Q31 50 30 39L28 24Z','panel')+path('M47 54L53 78H65V61',stroke='orange',sw=4)+circle(58,69,4,'body')
    if kind=='guitar_stand':return path('M47 13H54V62L74 84M51 62L28 84M51 64V91M31 67L23 76L29 84M70 67L78 76L73 84',stroke='ink',sw=3)+rect(45,13,11,9,'orange',2)
    if kind=='music_stand':return poly([(16,19),(78,19),(86,52),(22,57)],'panel')+line(19,50,85,45,'orange',3)+line(51,56,51,78)+line(51,78,26,91)+line(51,78,77,91)+line(51,78,51,95)
    if kind=='chair':return rect(27,10,46,36,'body',6)+rect(23,54,54,12,'panel',4)+line(31,44,31,54)+line(69,44,69,54)+line(29,65,24,91)+line(71,65,76,91)+line(29,76,72,76,'orange',2)
    if kind=='stool':return ellipse(50,27,28,9,'panel')+line(29,32,23,90)+line(71,32,77,90)+line(48,35,50,91)+ellipse(50,68,22,6,'none','orange',2)
    if kind=='lectern':return poly([(19,16),(72,16),(84,34),(28,37)],'panel')+poly([(31,37),(70,35),(63,85),(38,85)],'body')+rect(26,86,50,6,'panel',2)+path('M53 27V12q0-6 10-4',stroke='orange',sw=2.4)
    raise KeyError(kind)

def cabinet(x=20,y=20,w=60,h=66,bass=False):
    result=rect(x,y,w,h,'body',5)+rect(x+5,y+6,w-10,h-12,'panel',3)
    if bass:
        result+=circle(x+w/2,y+h*.58,min(w*.33,h*.28),'soft')+circle(x+w/2,y+h*.58,5,'panel')+rect(x+w*.35,y+11,w*.3,6,'orange',1)
    else:
        result+=circle(x+w/2,y+h*.57,min(w*.30,h*.29),'soft')+circle(x+w/2,y+h*.57,6,'panel')+dots(x+12,y+12,4,9,1.4,'orange')
    return result

def rack(x=19,y=13,w=62,h=73,rows=4,screen=False):
    result=rect(x,y,w,h,'body',4)+rect(x+5,y+5,w-10,h-10,'panel',2)
    rh=(h-16)/rows
    for i in range(rows):
        yy=y+8+i*rh
        result+=rect(x+9,yy,w-18,rh-3,'soft',1,'ink',1.4)+circle(x+w-16,yy+(rh-3)/2,2,'orange','ink',1)
        if screen and i==0:result+=rect(x+14,yy+3,w*.34,rh-9,'blue',1,'none',0)
        else:result+=dots(x+15,yy+(rh-3)/2,3,7,1.5,'panel')
    return result+line(x+9,y+h,x+9,y+h+5)+line(x+w-9,y+h,x+w-9,y+h+5)

def di_box(stereo=False,active=False):
    result=poly([(14,37),(69,24),(88,38),(33,52)],'body')+poly([(14,37),(33,52),(33,77),(14,63)],'soft')+poly([(33,52),(88,38),(88,64),(33,77)],'panel')
    result+=circle(49,61,6,'soft')+circle(49,61,2,'panel')+rect(60,50,20,5,'orange',1,'none',0)+label('DI',40,37,.85)
    if stereo:result+=circle(72,58,6,'soft')+circle(72,58,2,'panel')+label('LR',62,66,.65,'blue')
    elif active:result+=circle(76,63,2,'blue','none',0)+label('+',18,51,.9,'orange')
    else:result+=rect(70,60,8,5,'soft',1)
    return result

def audio(kind):
    if kind=='electric_guitar_amp':return cabinet(18,27,64,57)+rect(35,19,30,8,'panel',3)+line(24,85,24,89)+line(76,85,76,89)
    if kind=='guitar_amp_stack':return cabinet(24,38,52,54)+rect(24,12,52,22,'panel')+dots(32,24,6,7,1.4,'orange')+rect(41,7,18,5,'body',2)
    if kind=='bass_amp_rig':return cabinet(22,30,56,61,True)+rect(22,11,56,16,'panel')+rect(30,16,15,6,'blue',1)+dots(56,20,3,6,1.4,'orange')
    if kind=='amp_modeler_rig':return rect(13,40,74,31,'panel',5)+rect(22,47,24,13,'blue',1)+dots(57,48,3,9,2,'orange')+dots(22,66,5,13,2.2,'soft')+path('M24 40V21H75V40','body')+rect(31,26,37,7,'orange',1)
    if kind in ['amp_rack','equipment_rack','system_processor']:
        return rack(rows=3 if kind=='amp_rack' else 5 if kind=='equipment_rack' else 2,screen=kind=='system_processor')
    if kind=='pedalboard':
        result=poly([(16,27),(85,27),(92,78),(8,78)],'panel')
        for i in range(3):result+=rect(18+i*24,38,18,28,'orange' if i==0 else 'soft',3)+circle(27+i*24,59,2,'panel')+dots(23+i*24,44,2,7,1.3,'panel')
        return result+path('M13 73H86',stroke='blue',sw=1.7)
    if kind in ['active_di_box','passive_di_box','stereo_di_box']:return di_box(kind=='stereo_di_box',kind=='active_di_box')
    if kind=='audio_interface':return rect(12,27,76,48,'body',5)+rect(17,34,66,33,'panel',2)+circle(31,50,9,'soft')+circle(31,50,4,'panel')+circle(65,50,10,'orange')+circle(65,50,3,'panel')+rect(45,40,5,19,'blue',1)+label('USB',20,19,.75)
    if kind in ['stagebox','sub_snake']:
        result=rect(17,20,66,60 if kind=='stagebox' else 45,'panel',5)+rect(31,13,38,7,'body',2)
        for row in range(3 if kind=='stagebox' else 2):
            for col in range(4):result+=circle(28+col*15,32+row*17,4.4,'soft')+dots(26+col*15,32+row*17,2,4,1,'panel')
        result+=rect(26,72 if kind=='stagebox' else 57,24,3,'orange',1,'none',0)
        if kind=='sub_snake':result+=path('M68 65V83Q68 92 82 88',stroke='orange',sw=3)
        return result
    if kind=='audio_snake':return path('M15 29H39V55H15Z','panel')+dots(22,38,2,11,2,'orange')+dots(22,47,2,11,2,'soft')+path('M27 55V68Q27 91 51 91Q77 91 77 69Q77 51 55 54Q38 56 42 72Q44 84 59 77',stroke='ink',sw=4)+path('M39 40H64L77 16M63 40L85 32M64 40L88 49',stroke='blue',sw=2)+rect(73,9,8,12,'body',2)+rect(82,24,8,12,'body',2)+rect(85,44,8,12,'body',2)
    if kind=='mic_splitter':return rect(11,36,78,35,'panel')+circle(23,53,6,'soft')+''.join(circle(48+i*14,53,4,'soft') for i in range(3))+path('M23 35V23H76V35M48 23V35M62 23V35',stroke='orange',sw=2)+label('SPLIT',30,77,.8)
    if kind in ['line_source_mono','line_source_stereo']:
        stereo=kind=='line_source_stereo'
        result=rect(18,24,64,52,'body',6)+path('M25 50Q31 29 39 50T53 50T67 50T78 50',stroke='orange',sw=2)
        if stereo:result+=circle(36,68,3,'blue')+circle(64,68,3,'orange')+label('LR',44,31,.8)
        else:result+=circle(50,68,3,'blue')+label('M',47,31,.8)
        return result
    if kind=='generic_power_source':return rect(23,12,54,77,'body',6)+circle(50,39,14,'panel')+circle(44,36,2,'orange')+circle(56,36,2,'orange')+rect(47,43,6,4,'soft',1)+path('M53 58L42 72H50L46 84L62 67H53Z','orange','none',0)
    if kind=='generic_input_source':return rect(22,20,58,61,'body',6)+path('M9 50H56M44 38L56 50L44 62',stroke='orange',sw=4)+circle(67,33,3,'blue')+circle(67,68,3,'panel')
    if kind=='generic_audio_equipment':return rect(13,28,74,47,'panel',5)+rect(23,38,26,17,'blue',2)+circle(69,47,9,'orange')+dots(24,65,6,10,1.7,'soft')
    raise KeyError(kind)

def speaker(x=29,y=12,w=42,h=73):
    return rect(x,y,w,h,'panel',5)+circle(x+w/2,y+h*.62,w*.34,'soft')+circle(x+w/2,y+h*.62,w*.12,'panel')+rect(x+w*.23,y+8,w*.54,h*.15,'soft',3)+rect(x+w*.35,y+h-8,w*.3,3,'orange',1,'none',0)
def wedge(x=12,y=31,w=76,h=47):
    return poly([(x,y+h),(x+10,y+15),(x+w-15,y),(x+w,y+h-14),(x+19,y+h+8)],'body')+poly([(x+10,y+15),(x+w-15,y),(x+w-8,y+32),(x+19,y+h+8)],'panel')+ellipse(x+w*.54,y+27,w*.2,h*.25,'soft')+ellipse(x+w*.54,y+27,w*.07,h*.09,'panel')+line(x+4,y+h-2,x+16,y+h+3,'orange',3)
def iem_pack(stereo=False,wired=False):
    result=rect(29,33,42,53,'panel',6)+rect(36,43,28,13,'blue',2)+circle(42,72,4,'orange')+circle(59,72,4,'soft')+path('M37 33V22Q19 6 14 31Q12 45 23 44M63 33V22Q81 6 86 31Q88 45 77 44',stroke='ink',sw=2.4)+ellipse(21,41,6,4,'orange')+ellipse(79,41,6,4,'orange')
    if stereo:result+=label('LR',43,59,.8,'white')
    else:result+=label('M',47,59,.8,'white')
    return result+path('M50 86V95H80',stroke='orange') if wired else result+line(67,33,74,14,'orange',2)

def monitors(kind):
    if kind in ['wedge_monitor','cue_wedge']:return wedge()+ (label('CUE',28,88,.9,'orange') if kind=='cue_wedge' else '')
    if kind=='wedge_pair':return group(wedge(),'translate(-1 15) scale(.57)')+group(wedge(),'translate(43 0) scale(.57)')+label('LR',41,80,1.1,'orange')
    if kind=='sidefill_pair':return group(speaker(),'translate(-2 6) scale(.7)')+group(speaker(),'translate(38 6) scale(.7)')+path('M37 43L45 50L37 57M63 43L55 50L63 57',stroke='orange')
    if kind=='drum_fill':return cabinet(24,43,52,47,True)+group(wedge(),'translate(12 -1) scale(.77)')
    if kind=='front_fill':return rect(10,37,80,32,'panel',5)+''.join(circle(27+i*23,53,9,'soft')+circle(27+i*23,53,3,'panel') for i in range(3))+line(30,75,70,75,'orange',2)
    if kind=='delay_fill_speaker':return group(speaker(),'translate(13 0) scale(.72)')+line(50,63,50,83)+line(50,83,30,94)+line(50,83,70,94)+path('M79 27q12 13 0 27',stroke='blue',sw=2)
    if kind=='main_pa_speaker':return speaker()
    if kind=='pa_subwoofer':return cabinet(15,21,70,64,True)+rect(22,77,56,4,'orange',1)
    if kind in ['hardwired_iem_pack','iem_receiver_mono','iem_receiver_stereo']:return iem_pack(kind=='iem_receiver_stereo',kind=='hardwired_iem_pack')
    if kind=='cue_iem':return group(iem_pack(True),'translate(5 -4) scale(.9)')+label('CUE',37,88,.9,'orange')
    if kind=='iem_transmitter_rack':return rack(16,33,68,45,2,True)+line(24,31,17,10,'orange')+line(76,31,83,10,'orange')
    if kind=='confidence_monitor':return rect(12,22,76,50,'panel',5)+rect(18,28,64,38,'blue',2)+label('LIVE',31,42,1.5,'panel')+line(50,73,50,87)+line(32,87,68,87)
    if kind=='talkback_speaker':return group(speaker(),'translate(3 7) scale(.8)')+path('M77 35q12 12 0 24M84 28q18 19 0 38',stroke='orange',sw=2)
    if kind=='generic_monitor_destination':return rect(18,22,64,55,'body',6)+circle(50,49,18,'panel')+circle(50,49,8,'soft')+path('M50 7V32M40 22L50 32L60 22',stroke='orange',sw=3)+line(29,85,71,85,'blue',2)
    raise KeyError(kind)

def laptop(x=16,y=19,w=68,h=64):
    return rect(x+5,y,w-10,h*.65,'panel',4)+rect(x+10,y+5,w-20,h*.65-10,'blue',2)+poly([(x+5,y+h*.65),(x+w-5,y+h*.65),(x+w,y+h),(x,y+h)],'body')+''.join(line(x+12,y+h*.73+i*5,x+w-12,y+h*.73+i*5,'line',1) for i in range(2))+rect(x+w*.38,y+h*.87,w*.24,3,'orange',1,'none',0)
def mixer(x=20,y=18,w=60,h=68,lighting=False):
    result=rect(x,y,w,h,'panel',5)+rect(x+8,y+7,w*.44,13,'blue',1)+dots(x+w-18,y+13,2,8,2,'orange')
    for i in range(5):
        xx=x+10+i*(w-20)/4
        result+=line(xx,y+29,xx,y+h-10,'line',1.5)+rect(xx-3,y+37+(i%3)*8,6,5,'orange' if i%2==0 else 'body',1)
    if lighting:result+=label('LX',x+11,y+10,1,'panel')
    return result
def dj_deck():
    return rect(7,27,86,49,'panel',5)+circle(29,50,14,'soft')+circle(29,50,5,'panel')+circle(71,50,14,'soft')+circle(71,50,5,'panel')+rect(44,36,12,28,'body',1)+dots(21,69,3,8,1.5,'orange')+dots(64,69,3,8,1.5,'orange')+line(50,43,50,57,'orange',2)
def playback(kind):
    if kind=='dj_controller':return dj_deck()
    if kind=='dj_setup':return group(dj_deck(),'translate(4 15) scale(.92)')+group(laptop(),'translate(25 -1) scale(.5)')+line(17,87,83,87,'orange')
    if kind=='dj_mixer':return mixer(25,12,50,76)
    if kind=='turntable':return rect(10,21,80,61,'body',5)+circle(43,51,24,'panel')+circle(43,51,15,'none','line',1.4)+circle(43,51,5,'orange')+path('M77 35V60L63 66',stroke='ink',sw=3)+circle(77,32,4,'blue')+rect(18,72,13,4,'orange',1)
    if kind=='laptop':return laptop()
    if kind=='media_player':return rect(15,19,70,65,'panel',5)+rect(24,28,52,18,'blue',2)+circle(50,62,12,'soft')+poly([(47,55),(47,69),(57,62)],'orange','none',0)+dots(25,76,3,8,1.4,'orange')
    if kind=='playback_rig':return group(laptop(),'translate(-3 -1) scale(.75)')+group(rack(19,13,62,73,3,True),'translate(48 29) scale(.56)')+path('M23 65V84H57',stroke='orange',sw=2.5)
    raise KeyError(kind)

def person(x=50,y=17,scale=1,pose='stand',fill='body'):
    result=circle(0,0,8,fill)+path('M-14 21Q-14 12 0 12Q14 12 14 21V39H-14Z',fill)+line(-7,39,-9,66,'ink',4)+line(7,39,9,66,'ink',4)
    if pose=='conduct':result+=path('M-14 21L-26 9M14 21L29 5',stroke='ink',sw=4)+line(28,5,36,-5,'orange',2)
    elif pose=='raise':result+=path('M-14 21L-23 35M14 21L26 7',stroke='ink',sw=4)
    elif pose=='seated':
        result=circle(0,0,8,fill)+path('M-12 23Q-12 12 0 12Q12 12 12 23V37H-12Z',fill)+path('M-8 37L-19 44L-19 62M8 37L22 42L22 62',stroke='ink',sw=4)+path('M-17 21V42H17V60',stroke='orange',sw=2)+line(-12,21,-17,33,'ink',4)+line(12,21,20,32,'ink',4)
    elif pose=='play':result+=path('M-14 21L-22 31L-9 34M14 21L23 31L9 34',stroke='ink',sw=4)
    else:result+=line(-14,22,-20,40,'ink',4)+line(14,22,20,40,'ink',4)
    result+=path('M-8 24H8',stroke='orange',sw=3)
    return group(result,f'translate({x} {y}) scale({scale})')
def people(kind):
    if kind in ['choir_group','ensemble_group']:
        result=person(21,23,.65,fill='soft')+person(79,23,.65,fill='soft')+person(50,18,.88)
        return result+(rect(34,50,32,14,'orange',2)+line(50,65,50,85) if kind=='choir_group' else group(guitar(),'translate(57 50) scale(.4)'))
    if kind=='seated_musician':return person(50,18,1,'seated')+group(round_strings('mandolin'),'translate(44 37) scale(.37)')
    if kind=='conductor':return person(46,18,1,'conduct')+rect(19,87,61,6,'panel',1)
    if kind in ['standing_musician','generic_performer']:return person(50,18,1,'raise' if kind=='generic_performer' else 'stand')
    if kind in ['lead_vocalist','backing_vocalist','host_mc','speaker_presenter']:
        result=person(43,18,1,'raise' if kind=='lead_vocalist' else 'play')
        result+=group(mic_capsule(),'translate(54 19) scale(.27)')+line(68,45,68,86)+line(68,86,56,93)+line(68,86,82,93)
        if kind=='backing_vocalist':result+=path('M76 22V10L88 7V18',stroke='blue')+ellipse(72,24,4,3,'blue')+ellipse(84,20,4,3,'blue')
        if kind=='host_mc':result+=rect(60,36,15,8,'orange',1)+label('MC',62,38,.6,'panel')
        if kind=='speaker_presenter':result+=rect(10,51,25,19,'soft',2)+line(15,58,29,58,'orange',1.7)
        return result
    if kind in ['guitarist','bassist']:return person(49,17,1,'play')+group(guitar('bass' if kind=='bassist' else 'electric'),'translate(18 28) rotate(27 45 45) scale(.62)')
    if kind=='drummer':return person(50,16,.9,'play')+group(kit(),'translate(11 24) scale(.78)')
    if kind=='keyboardist':return person(50,13,.95,'play')+keyboard(13,54,74,23)+line(23,78,74,94)+line(77,78,26,94)
    if kind=='percussionist':return person(50,14,.95,'play')+group(percussion('conga_set'),'translate(8 20) scale(.85)')
    if kind=='dj':return person(50,13,.95,'play')+group(dj_deck(),'translate(4 25) scale(.92)')+path('M40 15Q50 3 60 15',stroke='orange',sw=3)
    if kind=='playback_operator':return person(37,14,.95,'play')+group(laptop(),'translate(36 39) scale(.66)')
    if kind=='stage_technician':return person(41,18,1,'stand')+path('M74 28Q65 30 68 41L79 52L66 80Q65 86 71 87Q76 89 79 83L90 55L87 40Q97 29 86 24L82 35L74 32Z','soft')+circle(72,81,2,'orange')+path('M30 12Q41-1 52 12',stroke='orange',sw=4)
    raise KeyError(kind)

def screen(x=14,y=16,w=72,h=51,video=True):
    result=rect(x,y,w,h,'panel',4)+rect(x+5,y+5,w-10,h-10,'blue',2)
    if video:result+=poly([(x+w*.43,y+h*.27),(x+w*.43,y+h*.72),(x+w*.7,y+h*.5)],'body','none',0)
    return result+line(x+w*.5,y+h,x+w*.5,y+h+15)+line(x+w*.3,y+h+15,x+w*.7,y+h+15)
def production(kind):
    if kind in ['foh_position','monitor_world','lighting_console_position']:
        result=group(mixer(lighting=kind=='lighting_console_position'),'translate(11 20) scale(.78)')+rect(11,87,78,6,'body',2)
        if kind=='foh_position':result+=label('FOH',31,10,2,'orange')
        elif kind=='monitor_world':result+=group(wedge(),'translate(60 16) scale(.37)')+label('MON',13,10,1.7,'orange')
        else:result+=path('M31 11L41 29M50 8V27M69 11L59 29',stroke='orange',sw=2.5)
        return result
    if kind=='video_control_position':return group(screen(),'translate(9 -2) scale(.78)')+group(mixer(),'translate(20 43) scale(.6)')
    if kind=='broadcast_recording_position':return group(screen(video=False),'translate(6 -2) scale(.78)')+circle(46,32,9,'orange')+label('REC',35,44,.8,'panel')+rect(15,71,70,17,'panel',3)+dots(26,80,5,12,2,'blue')
    if kind=='wireless_receiver_rack':return rack(17,33,66,45,2,True)+line(25,32,15,10)+line(75,32,85,10)+path('M36 17q14-10 28 0',stroke='blue',sw=2)
    if kind=='rf_antenna':return path('M24 14H77L64 56L41 68L24 14Z','panel')+path('M37 23L66 24L57 48L44 55Z','orange')+line(48,66,48,82)+line(48,82,27,93)+line(48,82,69,93)+line(48,82,48,95)
    if kind=='rf_antenna_distribution':return rect(12,46,76,32,'panel',4)+dots(24,62,6,10,3,'soft')+path('M24 45V28M76 45V28M24 27L16 12M24 27L32 12M76 27L68 12M76 27L84 12',stroke='orange',sw=2.5)+label('RF',43,32,1,'blue')
    if kind=='intercom_beltpack':return rect(29,31,42,56,'panel',5)+rect(38,40,24,10,'blue',1)+circle(41,68,6,'orange')+circle(59,68,4,'soft')+path('M37 31V20H22V29M63 31V19Q63 6 79 8V21',stroke='ink',sw=2.5)+rect(74,18,12,17,'soft',4)
    if kind=='intercom_station':return rect(12,44,76,36,'panel',4)+rect(21,51,30,9,'blue',1)+circle(69,61,7,'orange')+dots(23,70,4,8,1.6,'soft')+path('M27 43V28Q27 16 45 18',stroke='ink',sw=3)+rect(42,12,17,10,'panel',4)
    if kind=='projector':return poly([(13,35),(70,25),(88,40),(30,52)],'body')+poly([(13,35),(30,52),(30,74),(13,59)],'soft')+poly([(30,52),(88,40),(88,63),(30,74)],'panel')+ellipse(67,56,12,10,'blue')+ellipse(67,56,6,5,'panel')+''.join(line(16,43+i*4,25,49+i*4,'line',1) for i in range(3))+circle(58,33,2,'orange')
    if kind=='projection_screen':return rect(11,17,78,8,'panel',2)+rect(15,25,70,47,'body',1)+poly([(42,35),(42,60),(63,48)],'blue','none',0)+line(50,73,50,83)+line(50,83,29,94)+line(50,83,71,94)
    if kind=='generic_video_equipment':return screen()+rect(20,83,60,8,'panel',2)+circle(30,87,2,'orange')
    raise KeyError(kind)

def annotations(kind):
    if kind=='center_line':return path('M50 8V92',stroke='orange',sw=3)+path('M27 18H73M27 82H73',stroke='ink')+path('M21 50H39M61 50H79',stroke='line',sw=2)+path('M39 42L47 50L39 58M61 42L53 50L61 58',stroke='ink')
    if kind=='text_note':return path('M22 11H63L79 27V88H22Z','body')+path('M63 11V28H79','soft')+line(32,41,66,41,'orange',3)+line(32,53,66,53,'line',2)+line(32,65,57,65,'line',2)+line(32,77,62,77,'line',2)
    if kind=='generic_zone':return rect(12,22,76,56,'body',6)+path('M12 37V22H28M72 22H88V37M88 63V78H72M28 78H12V63',stroke='orange',sw=4)+label('ZONE',27,44,1.6)+line(22,33,78,33,'line',1)+line(22,67,78,67,'line',1)
    raise KeyError(kind)

def connector(kind):
    if kind=='xlr_connector':return rect(32,33,36,39,'panel',5)+ellipse(50,31,18,14,'soft')+ellipse(50,31,12,9,'panel')+circle(45,28,1.8,'orange')+circle(55,28,1.8,'orange')+circle(50,35,1.8,'orange')+rect(41,73,18,10,'body',2)+path('M50 84V93H76',stroke='ink',sw=4)+rect(63,43,7,13,'blue',1)
    if kind=='trs_connector':return rect(39,48,22,30,'panel',3)+rect(44,12,12,36,'body',2)+path('M44 12L50 6L56 12Z','orange')+line(44,23,56,23,'panel',3)+line(44,35,56,35,'panel',3)+rect(42,79,16,7,'orange',1)+path('M50 86V94H76',stroke='ink',sw=4)
    if kind=='ethernet_connector':return rect(31,14,38,42,'body',3)+rect(36,22,28,18,'soft',1)+''.join(line(39+i*3.3,24,39+i*3.3,35,'orange',1.5) for i in range(7))+rect(41,6,18,12,'soft',1)+rect(35,56,30,22,'panel',3)+path('M43 62H57M43 68H57',stroke='line',sw=1.5)+path('M50 78V92H80',stroke='blue',sw=4)
    if kind=='powercon_connector':return ellipse(50,27,21,16,'blue')+ellipse(50,27,13,9,'panel')+dots(43,27,3,7,2,'body')+path('M29 27V65Q50 78 71 65V27','blue')+path('M34 43V61M43 46V65M53 46V66M63 43V63',stroke='panel',sw=2)+rect(40,73,20,10,'panel',2)+path('M50 84V93H76',stroke='ink',sw=4)
    raise KeyError(kind)

def lighting(kind):
    if kind=='moving_head_light':return rect(21,77,58,14,'panel',3)+path('M27 74V41H35V64Q50 76 65 64V41H73V74Z','body')+group(rect(32,25,36,36,'panel',6)+ellipse(50,25,18,10,'soft')+ellipse(50,25,11,6,'orange')+rect(44,55,12,4,'blue',1),'rotate(-20 50 43)')+circle(31,49,4,'orange')+circle(69,49,4,'orange')+path('M29 10L36 17M50 5V13M71 10L64 17',stroke='blue',sw=2)
    if kind=='led_bar':return rect(8,34,84,29,'panel',4)+''.join(circle(19+i*15.5,48,5.5,'orange' if i%2==0 else 'blue') for i in range(5))+path('M17 64V78H83V64',stroke='ink',sw=3)+line(42,78,58,78,'orange',3)
    raise KeyError(kind)

ADDITIONS = [
    dict(id='cowbell',label='Cencerro',category='Batería y percusión',usage='stage'),
    dict(id='xlr_connector',label='Conector XLR',category='Conectores y cableado',usage='production'),
    dict(id='trs_connector',label='Conector jack TRS',category='Conectores y cableado',usage='production'),
    dict(id='ethernet_connector',label='Conector RJ45 / Ethernet',category='Conectores y cableado',usage='production'),
    dict(id='powercon_connector',label='Conector PowerCON',category='Conectores y cableado',usage='production'),
    dict(id='moving_head_light',label='Cabeza móvil',category='Iluminación',usage='production'),
    dict(id='led_bar',label='Barra LED',category='Iluminación',usage='production'),
]

def drawing(item):
    kind=item['id'];category=item['category']
    if category=='Cuerdas':
        if kind in ['electric_guitar','bass_guitar','acoustic_guitar','classical_guitar','resonator_guitar','ukulele']:
            return guitar({'electric_guitar':'electric','bass_guitar':'bass','acoustic_guitar':'acoustic','classical_guitar':'classical','resonator_guitar':'resonator','ukulele':'ukulele'}[kind])
        if kind in ['violin','viola','cello','upright_bass']:
            result=bowed(kind)
            if kind=='upright_bass':result+=path('M25 32L22 41M67 32L70 41',stroke='orange',sw=3)+rect(43,84,12,4,'panel',1)
            return result
        if kind=='harp':return harp()
        if kind in ['banjo','mandolin']:return round_strings(kind)
        if kind=='generic_string_instrument':return path('M22 20H78L70 79Q50 95 30 79Z','body')+path('M22 20L31 26H69L78 20',stroke='orange',sw=4)+''.join(line(34+i*8,27,38+i*6,77,'line',1.5) for i in range(5))+rect(30,75,40,5,'panel',1)
    dispatch={'Teclados y electrónica':keys_rig,'Batería y percusión':percussion,'Vientos y tradicionales':wind,'Micrófonos':microphones,'Soportes y mobiliario':stands,'Amplificadores y audio':audio,'Monitores y PA':monitors,'DJ y reproducción':playback,'Artistas y equipo humano':people,'Producción, RF y vídeo':production,'Anotaciones y zonas':annotations,'Conectores y cableado':connector,'Iluminación':lighting}
    return dispatch[category](kind)

def slug(value):
    return re.sub(r'[^a-z0-9]+','-',unicodedata.normalize('NFKD',value).encode('ascii','ignore').decode().lower()).strip('-')

def svg_document(item,theme,view='original'):
    global C
    C=PALETTES[theme]
    title=f"{item['label']} · GordoStage · {'vista cenital · ' if view=='cenital' else ''}{theme}"
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100" role="img" aria-labelledby="title desc">
<title id="title">{escape(title)}</title>
<desc id="desc">Familia propia de GordoStage. {escape(item['category'])}. Vista {view}. Variante para fondo {theme}. Fondo transparente y geometría vectorial editable.</desc>
<g id="art">{top_drawing(item) if view=='cenital' else drawing(item)}</g>
</svg>
'''

TOP_IDS=['acoustic_guitar','electric_guitar','bass_guitar','acoustic_drum_kit','electronic_drum_kit','conga_set','single_keyboard_rig','grand_piano','vocal_mic_wired','boom_mic_stand','wedge_monitor','electric_guitar_amp','bass_amp_rig','active_di_box','stagebox','dj_setup','lead_vocalist','foh_position','chair','moving_head_light']

def plan_guitar(kind):
    acoustic=kind=='acoustic_guitar'
    body=path('M42 47C34 40 28 47 32 56Q35 61 29 68C18 81 30 92 49 92Q78 91 68 72Q59 61 63 55C67 45 58 40 54 48L51 56H45Z','body')
    if acoustic:body=path('M41 48C34 42 29 48 33 56Q37 62 30 69C17 84 32 94 49 92Q76 91 68 73Q59 63 63 56C68 45 57 41 53 49Z','body')
    body+=rect(45,17,8,48,'soft',1)+path('M45 17L43 7H55L53 17Z','body')
    body+=circle(49,70,6,'panel')+circle(49,70,8,'none','orange',1.5) if acoustic else path('M38 62L55 59L60 78L52 83L38 78Z','orange','none',0)+rect(42,64,14,4,'panel',1)+rect(42,75,14,4,'panel',1)
    body+=rect(41,84,16,3,'panel',1)+''.join(line(47+i*1.4,15,47+i*1.4,85,'line',.85) for i in range(4))+''.join(line(45,25+i*8,53,25+i*8,'ink',1) for i in range(4))
    if kind=='bass_guitar':body+=rect(42,71,14,3,'panel',1)+circle(61,82,2,'blue')
    else:body+=circle(61,80,1.8,'blue')
    return group(body,'translate(5 5) scale(.9) rotate(24 50 50)')

def plan_kit(electronic=False):
    result=ellipse(50,14,10,6,'panel')
    if electronic:
        result+=path('M22 31H77M25 31L19 70M74 31L81 70',stroke='ink',sw=3)+line(16,73,28,73,'ink',3)+line(73,73,86,73,'ink',3)
        for x,y in [(32,40),(63,40),(24,61),(76,60)]:result+=ellipse(x,y,11,8,'panel')+ellipse(x,y,7,4,'none','orange',1.6)
        result+=ellipse(13,28,10,6,'panel')+ellipse(85,26,10,6,'panel')+rect(43,62,17,23,'panel',4)+rect(47,70,9,9,'orange',2)+rect(43,89,18,4,'soft',1)
    else:
        result+=rect(41,56,24,31,'orange',3)+rect(41,80,24,7,'body',2)+line(46,60,46,78,'line',1.5)+line(60,60,60,78,'line',1.5)+rect(48,46,10,13,'panel',2)
        for x,y,r in [(34,52,12),(41,33,11),(65,35,11),(79,63,13)]:result+=circle(x,y,r,'body')+circle(x,y,r-3,'none','orange',1.5)
        for x,y,r in [(15,31,11),(83,25,12),(15,60,9)]:result+=circle(x,y,r,'orange')+circle(x,y,3,'body')+line(x-4,y,x+4,y,'ink',1.1)+line(x,y-4,x,y+4,'ink',1.1)
        result+=rect(23,74,8,13,'soft',2)
    return result

def plan_cabinet(bass=False):
    # Only the top is visible: handle, rear controls, vents and front grille edge.
    result=rect(15,28,70,46,'body',4)+rect(15,64,70,10,'panel',2)+rect(37,42,26,8,'panel',3)+rect(42,45,16,3,'soft',1,'none',0)
    result+=''.join(line(23+i*6,34,23+i*6,39,'line',1.3) for i in range(10))+line(23,58,77,58,'orange',2)
    if bass:result+=rect(21,19,58,16,'panel',3)+rect(28,23,17,7,'blue',1)+dots(54,27,3,8,1.5,'orange')
    else:result+=dots(24,61,5,13,1,'line')
    return result

def approved_top_drawing(item):
    kind=item['id']
    if kind in ['acoustic_guitar','electric_guitar','bass_guitar']:return plan_guitar(kind)
    if kind in ['acoustic_drum_kit','electronic_drum_kit']:return plan_kit(kind=='electronic_drum_kit')
    if kind=='conga_set':return circle(29,46,22,'orange')+circle(29,46,17,'body')+circle(74,57,19,'orange')+circle(74,57,14,'body')+line(50,50,55,52,'panel',4)+''.join(circle(x,y,1.2,'soft') for x,y in [(29,25),(9,46),(29,67),(49,46),(74,39),(57,57),(74,75),(91,57)])
    if kind=='single_keyboard_rig':return keyboard(7,30,86,38)+rect(18,35,15,5,'blue',1)+dots(65,36,4,6,1.5,'orange')
    if kind=='grand_piano':return path('M21 85V28Q20 8 44 9Q68 9 66 29Q64 40 76 49Q90 64 77 85Z','panel')+path('M28 72V30Q28 16 44 17Q58 17 57 29Q55 45 69 55Q81 66 72 72Z','body')+''.join(line(31+i*5,28+i*.6,31+i*5,69,'line',1.1) for i in range(8))+path('M32 25Q50 16 55 31L66 65',stroke='orange',sw=2.2)+keyboard(21,74,57,17,False)
    if kind=='vocal_mic_wired':return circle(49,55,24,'panel')+circle(49,55,18,'none','line',1.4)+circle(49,55,5,'orange')+path('M49 56V27',stroke='ink',sw=3)+rect(44,11,10,20,'body',4)+ellipse(49,12,5,4,'panel')+path('M49 80q4 17 24 11',stroke='orange',sw=2.5)
    if kind=='boom_mic_stand':return path('M49 56L21 80M49 56L78 80M49 56V29',stroke='ink',sw=4)+circle(49,56,6,'orange')+path('M49 56L74 19',stroke='ink',sw=3)+group(rect(70,6,10,19,'panel',4)+line(70,16,80,16,'orange',2),'rotate(34 75 16)')+circle(49,56,2,'panel')
    if kind=='wedge_monitor':return poly([(22,24),(78,24),(88,77),(12,77)],'body')+poly([(27,32),(73,32),(81,67),(19,67)],'panel')+ellipse(50,49,16,14,'soft')+ellipse(50,49,7,6,'panel')+rect(40,25,20,4,'orange',1,'none',0)+line(20,73,80,73,'line',1.5)
    if kind in ['electric_guitar_amp','bass_amp_rig']:return plan_cabinet(kind=='bass_amp_rig')
    if kind=='active_di_box':return rect(24,22,52,57,'body',4)+rect(31,29,38,42,'panel',2)+label('DI',41,43,1.35,'white')+circle(61,35,2,'blue')+rect(32,17,12,7,'soft',2)+rect(53,76,13,8,'soft',2)+rect(35,61,12,4,'orange',1)+path('M38 16V7H19M60 84V93H79',stroke='ink',sw=3)
    if kind=='stagebox':
        result=rect(18,18,64,67,'panel',4)+rect(34,11,32,7,'body',2)+rect(18,18,64,8,'soft',2)
        for row in range(3):
            for col in range(4):result+=circle(28+col*15,36+row*17,4.5,'soft')+dots(26+col*15,36+row*17,2,4,1,'panel')
        return result+rect(29,77,24,3,'orange',1,'none',0)
    if kind=='dj_setup':return rect(7,33,86,50,'body',4)+circle(28,57,16,'panel')+circle(28,57,8,'none','line',1.4)+circle(28,57,3,'orange')+circle(73,57,16,'panel')+circle(73,57,8,'none','line',1.4)+circle(73,57,3,'orange')+rect(45,42,12,28,'soft',1)+line(51,47,51,65,'ink',1.5)+rect(48,54,6,4,'orange',1)+dots(17,77,3,9,1.6,'blue')+dots(64,77,3,9,1.6,'orange')+rect(34,9,33,21,'panel',2)+rect(38,12,25,13,'blue',1)+line(28,30,73,30)
    if kind=='lead_vocalist':return path('M19 43Q50 26 81 43L76 63Q50 54 24 63Z','body')+ellipse(50,43,13,15,'panel')+path('M46 56L50 63L54 56','body')+path('M23 57L17 76L38 79M77 57L83 76L62 79',stroke='ink',sw=5)+line(50,67,50,87,'orange',3)+circle(50,88,6,'panel')+ellipse(50,34,7,3,'none','line',1.5)
    if kind=='foh_position':return rect(8,12,84,72,'body',5)+rect(14,18,72,13,'panel',2)+rect(24,21,20,7,'blue',1)+rect(55,21,20,7,'blue',1)+group(mixer(18,25,64,62),'translate(10 11) scale(.8)')+label('FOH',36,88,1.4,'orange')
    if kind=='chair':return rect(24,22,52,15,'panel',4)+path('M29 37V65M71 37V65',stroke='line',sw=3)+rect(26,42,48,38,'body',9)+path('M35 49Q50 45 65 49',stroke='orange',sw=2)+line(34,85,66,85,'line',2)
    if kind=='moving_head_light':return rect(22,19,56,61,'panel',5)+path('M27 30V69H73V30H65V59H35V30Z','body')+rect(35,26,30,35,'soft',6)+rect(39,54,22,8,'orange',3)+circle(30,44,4,'orange')+circle(70,44,4,'orange')+path('M40 72H60',stroke='blue',sw=3)+path('M38 90L42 82M50 94V83M62 90L58 82',stroke='blue',sw=2)
    raise KeyError(kind)

def plan_strings(kind):
    """Portable strings are drawn lying flat; harp is an upright footprint."""
    if kind in ['classical_guitar','resonator_guitar','ukulele']:
        result=plan_guitar('acoustic_guitar')
        if kind=='classical_guitar':return result+group(rect(45,9,2,7,'panel',.5)+rect(51,9,2,7,'panel',.5)+line(39,86,59,86,'orange',2),'translate(5 5) scale(.9) rotate(24 50 50)')
        if kind=='resonator_guitar':return result+group(circle(49,73,12,'soft')+circle(49,73,8,'none','orange',1.5)+dots(44,73,3,5,1.2),'translate(5 5) scale(.9) rotate(24 50 50)')
        return group(result,'translate(12 12) scale(.76)')+line(43,27,51,27,'orange',2)
    if kind in ['violin','viola','cello','upright_bass']:
        result=path('M43 31Q29 21 28 38Q28 45 37 49L33 56Q15 64 26 82Q33 92 49 90Q70 91 74 77Q78 64 63 56L60 49Q73 42 67 32Q61 24 54 32L51 38H46Z','body')
        result+=rect(46,12,7,49,'soft',1)+circle(49.5,10,4,'orange')+rect(39,69,22,3,'orange',1)+path('M44 75L49 86L55 75Z','panel')+''.join(line(47+i*1.6,14,47+i*1.6,78,'line',.8) for i in range(3))+path('M35 54q-5 6 0 12M63 54q5 6 0 12',stroke='ink',sw=1.4)+line(83,17,80,87,'ink',2.2)+line(80,19,78,85,'orange',1)
        if kind=='cello':result+=line(49,90,49,96)
        if kind=='upright_bass':result+=line(49,90,49,97)+path('M30 36L23 42M67 35L73 41',stroke='orange',sw=2.5)
        if kind=='viola':result=group(result,'translate(6 5) scale(.9)')+circle(56,48,1.5,'blue','none',0)
        if kind=='violin':result=group(result,'translate(10 8) scale(.82)')
        return result
    if kind=='harp':return path('M25 15Q62 17 76 78L64 86Q51 38 25 30Z','body')+path('M25 15V84H35V31',stroke='ink',sw=4)+rect(20,13,19,15,'orange',3)+poly([(25,78),(64,78),(76,87),(19,87)],'panel')+path('M35 28Q57 45 67 77',stroke='orange',sw=2)+circle(29,20,3,'soft')
    if kind in ['banjo','mandolin']:
        result=circle(48,66,24,'body')+circle(48,66,19,'none','orange',1.5) if kind=='banjo' else path('M48 39Q17 43 24 71Q29 91 49 91Q73 91 76 69Q80 43 48 39Z','body')+circle(48,66,5,'panel')
        result+=rect(45,15,7,44,'soft',1)+rect(42,7,13,9,'body',2)+rect(39,80,19,3,'panel',1)+''.join(line(46+i*1.6,13,46+i*1.6,81,'line',.8) for i in range(3))
        return group(result,'translate(4 3) scale(.94) rotate(-12 50 50)')
    if kind=='generic_string_instrument':return rect(18,24,64,53,'body',5)+rect(25,31,50,38,'panel',2)+''.join(line(30+i*7,30,30+i*7,68,'orange' if i==3 else 'line',1.4) for i in range(6))+line(28,39,72,39,'soft',2)+line(28,61,72,61,'soft',2)
    raise KeyError(kind)

def plan_keys(kind):
    if kind=='double_keyboard_rig':return keyboard(13,16,74,31)+keyboard(7,53,86,33)+path('M20 45V55M80 45V55',stroke='orange',sw=2)
    if kind=='digital_piano':return rect(7,26,86,45,'body',4)+keyboard(10,37,80,31,False)+rect(15,30,12,4,'blue',1)+dots(71,32,3,6,1.3,'orange')+line(18,73,82,73,'orange',2)
    if kind=='upright_piano':return rect(12,23,76,50,'panel',4)+rect(18,29,64,20,'body',2)+''.join(line(23+i*5,32,23+i*5,46,'line',1) for i in range(11))+line(21,36,79,36,'orange',2)+keyboard(12,52,76,22,False)
    if kind=='organ_leslie_rig':return keyboard(7,30,59,22)+keyboard(7,55,59,24)+rect(72,29,22,46,'body',3)+ellipse(83,48,7,13,'panel')+line(78,39,88,57,'orange',2)+rect(78,66,10,3,'orange',1)
    if kind=='synthesizer':return keyboard(9,29,82,45)+rect(15,34,24,10,'blue',1)+''.join(circle(50+i*11,39,3,'orange' if i==0 else 'soft') for i in range(4))+line(16,47,38,47,'line',2)
    if kind=='midi_controller':return rect(10,19,80,61,'panel',4)+''.join(rect(18+c*10,27+r*10,7,7,'orange' if c+r==0 else 'soft',1) for r in range(2) for c in range(4))+rect(64,27,17,17,'blue',2)+keyboard(13,50,74,26,False)
    if kind=='keytar':return group(poly([(13,34),(80,34),(87,62),(24,62),(8,20),(18,17),(35,34)],'panel')+keyboard(25,38,57,20,False)+circle(17,25,2,'orange')+dots(33,33,3,7,1,'blue'),'translate(3 3) scale(.94) rotate(-17 50 50)')
    if kind=='accordion':return rect(11,31,22,43,'panel',4)+rect(66,28,23,49,'body',4)+poly([(32,32),(65,29),(65,76),(32,72)],'body')+''.join(path(f'M{36+i*5} 32l2 19-2 21',stroke='orange' if i==2 else 'ink',sw=1.3) for i in range(6))+''.join(line(70,34+i*5,84,34+i*5,'panel',1.1) for i in range(8))+dots(18,41,2,7,1.5,'soft')+dots(18,51,2,7,1.5,'soft')+dots(18,61,2,7,1.5,'soft')+path('M22 28Q50 13 77 24',stroke='orange',sw=2)
    if kind=='generic_electronic_instrument':return rect(16,22,68,55,'body',5)+rect(25,30,31,30,'blue',3)+path('M30 45H51M40 35V55',stroke='panel',sw=1.4)+circle(69,36,5,'orange')+circle(69,54,5,'panel')+dots(29,68,4,13,1.8,'orange')
    raise KeyError(kind)

def plan_drum(x=50,y=49,r=28,finish='body'):
    result=circle(x,y,r,'orange')+circle(x,y,r-4,finish)+circle(x,y,r-7,'none','line',1)
    for dx,dy in [(0,-1),(1,0),(0,1),(-1,0)]:result+=rect(x+dx*(r-1)-2,y+dy*(r-1)-2,4,4,'soft',1,'ink',1)
    return result

def plan_mallets(kind):
    w=76 if kind!='xylophone_glockenspiel' else 64
    x=(100-w)/2
    result=poly([(x,25),(x+w,25),(x+w,76),(x,86)],'panel')
    for n in range(11):result+=rect(x+4+n*(w-8)/11,42,w/11-2,37-n*1.5,'orange' if n%4==0 else 'body',1,'ink',1.2)
    for n in [1,2,4,5,6,8,9]:result+=rect(x+3+n*(w-8)/11,31,w/11-2,19,'soft',1,'ink',1.2)
    result+=line(16,15,48,32,'ink',2)+circle(16,15,4,'orange')+line(82,12,59,30,'ink',2)+circle(82,12,4,'blue')
    if kind=='vibraphone':result+=rect(81,48,11,20,'soft',2)+circle(86,56,2,'blue')
    if kind=='marimba':result+=path('M15 88H85',stroke='orange',sw=2)
    if kind=='mallet_instrument':result+=rect(34,88,31,5,'orange',1)
    return result

def plan_percussion(kind):
    if kind=='hybrid_drum_kit':return plan_kit()+rect(6,77,25,17,'panel',3)+rect(10,81,7,5,'orange',1)+rect(20,81,7,5,'soft',1)+rect(10,88,17,3,'blue',1)
    if kind=='kick_drum':return rect(20,27,60,48,'orange',4)+rect(20,27,60,8,'soft',2)+rect(20,68,60,7,'body',2)+rect(43,10,14,16,'panel',2)+line(26,38,26,62,'line',1.5)+line(74,38,74,62,'line',1.5)+line(34,81,66,81,'ink',2)
    if kind in ['snare_drum','rack_tom','floor_tom']:
        result=plan_drum()
        if kind=='snare_drum':result+=rect(16,39,5,18,'panel',1)+rect(79,44,7,10,'blue',1)
        if kind=='rack_tom':result+=path('M42 18V9H60',stroke='ink',sw=3)+circle(60,9,3,'panel')
        if kind=='floor_tom':result+=path('M30 27L20 17M71 29L83 19M50 79V91',stroke='ink',sw=3)
        return result
    if kind in ['hi_hat','cymbal']:
        result=circle(50,45,31,'orange')+circle(50,45,23,'none','body',1.2)+circle(50,45,9,'body')+circle(50,45,3,'panel')
        if kind=='hi_hat':result+=rect(45,78,11,15,'soft',2)+line(50,75,50,79,'ink',2.5)+circle(50,45,15,'none','line',1)
        else:result+=path('M29 25Q38 18 47 18',stroke='body',sw=1.4)
        return result
    if kind=='drum_throne':return path('M22 38Q18 22 35 21H66Q83 21 79 38L70 66Q66 75 53 66L50 62L46 67Q34 75 30 66Z','panel')+path('M30 29H68',stroke='orange',sw=2)+path('M28 61L16 77M73 61L85 77M50 67V85',stroke='line',sw=2.5)
    if kind=='drum_rug':return rect(9,18,82,65,'soft',2)+rect(16,25,68,51,'none',1,'orange',2)+''.join(line(16+i*9,84,16+i*9,89,'line',1.4) for i in range(8))
    if kind=='bongos':return plan_drum(29,50,21)+plan_drum(74,50,17)+line(50,50,56,50,'panel',4)
    if kind=='cajon':return rect(23,20,54,59,'body',4)+rect(29,26,42,46,'soft',2)+line(29,72,71,72,'orange',3)+path('M35 33Q41 37 35 42M59 45Q66 50 60 57',stroke='line',sw=1.3)+dots(31,29,4,12,1)+dots(31,68,4,12,1)
    if kind=='djembe':return circle(50,49,31,'orange')+circle(50,49,23,'body')+''.join(path(f'M{x} {y}l3-4 3 4-3 4Z','soft','ink',1) for x,y in [(24,35),(24,63),(71,35),(71,63),(47,22),(47,76)])+circle(50,49,18,'none','line',1)
    if kind=='percussion_rig':return path('M12 23H88V77H12Z',stroke='ink',sw=3)+plan_drum(33,43,18)+plan_drum(72,56,17)+circle(17,74,9,'orange')+circle(17,74,3,'panel')+rect(27,80,48,6,'panel',2)
    if kind=='small_percussion':return circle(40,40,24,'orange')+circle(40,40,16,'body')+''.join(circle(x,y,4,'soft','ink',1.4) for x,y in [(23,23),(57,23),(23,57),(57,57)])+line(66,60,84,87,'ink',4)+ellipse(64,57,10,13,'body')+line(58,73,67,92,'orange',3)
    if kind=='timpani_set':return plan_drum(29,43,23)+plan_drum(73,53,21)+rect(24,76,10,14,'panel',2)+rect(68,82,10,11,'panel',2)
    if kind in ['marimba','vibraphone','xylophone_glockenspiel','mallet_instrument']:return plan_mallets(kind)
    if kind in ['sample_pad','sampler_drum_machine']:
        result=rect(16,17,68,68,'panel',5)
        if kind=='sample_pad':
            for row in range(3):
                for col in range(3):result+=rect(23+col*19,26+row*18,15,14,'orange' if row+col==0 else 'soft',2)
            result+=rect(24,79,20,3,'blue',1,'none',0)
        else:
            result+=rect(23,24,34,11,'blue',1)+dots(65,29,2,9,2,'orange')
            for row in range(3):
                for col in range(4):result+=rect(23+col*14,43+row*12,10,8,'orange' if row==2 and col==0 else 'soft',1)
        return result+rect(34,11,32,5,'body',1)
    if kind=='cowbell':return poly([(34,27),(66,27),(78,76),(22,76)],'orange')+rect(23,74,54,7,'panel',1)+rect(41,18,18,9,'soft',2)+line(12,25,32,65,'ink',3)+line(31,68,68,68,'line',1.5)
    if kind=='generic_drum_percussion':return plan_drum(50,51,28)+line(22,16,78,85,'orange',3)+line(78,16,22,85,'ink',3)
    raise KeyError(kind)

def plan_winds(kind):
    """Portable instruments laid horizontally, with keys and tubing seen from above."""
    if kind in ['flute','dizi']:
        result=rect(9,43,82,12,'body',4)+ellipse(20,49,6,9,'soft')+circle(20,49,2,'panel')+''.join(circle(37+i*7,49,2,'panel') for i in range(7))+line(27,44,27,54,'orange',3)
        if kind=='dizi':result+=rect(27,46,7,6,'blue',1)+line(64,43,64,55,'orange',3)+line(84,43,84,55,'orange',3)
        return result
    if kind in ['clarinet','oboe','suona']:
        result=rect(44,20,12,51,'panel' if kind=='clarinet' else 'body',2)+path('M46 20V10H53V20Z','orange')+''.join(circle(50,30+i*7,2,'soft','ink',1) for i in range(5))
        if kind=='clarinet':result+=path('M44 70L35 86Q50 92 65 86L56 70Z','panel')+ellipse(50,86,15,4,'soft')+rect(41,49,4,9,'orange',1)
        elif kind=='oboe':result+=path('M44 71L40 86H60L56 71Z','body')+line(46,6,46,11,'line',1.4)+line(53,6,53,11,'line',1.4)+line(44,25,56,25,'blue',2)
        else:result+=path('M44 69L31 86Q50 96 69 86L56 69Z','orange')+ellipse(50,86,19,5,'body')+line(44,62,56,62,'blue',3)
        return group(result,'translate(7 5) scale(.9) rotate(-14 50 50)')
    if kind=='bassoon':return path('M30 79V25Q30 15 39 15H44L58 78Q60 86 68 80V21','body')+rect(27,27,10,45,'orange',2)+''.join(circle(32,36+i*7,2,'soft','ink',1) for i in range(5))+path('M68 21V10H82V17',stroke='ink',sw=2.5)+ellipse(32,22,6,3,'panel')+ellipse(68,21,5,3,'panel')
    if kind=='saxophone':return path('M39 11H52L64 55Q70 78 49 86Q29 93 20 71L31 64Q36 75 44 70Q50 66 47 55L37 26H30V19H39Z','orange')+ellipse(26,67,10,7,'body')+path('M44 29L54 57Q59 73 45 78',stroke='ink',sw=1.5)+''.join(circle(47+i*2,34+i*9,2.1,'soft') for i in range(4))+line(29,17,37,17,'panel',3)
    if kind=='trumpet':return path('M10 36H63L84 23V59L63 46H25Q16 46 16 58Q16 70 29 70H62V57H31','orange')+ellipse(84,41,5,18,'body')+''.join(rect(34+i*11,29,6,31,'soft',2) for i in range(3))+''.join(circle(37+i*11,28,4,'body') for i in range(3))+path('M10 33V42M29 77H63',stroke='ink',sw=2)
    if kind=='trombone':return path('M12 28H60L84 17V49L60 38H25V72H71Q80 72 80 62V51','orange')+ellipse(84,33,4,16,'body')+path('M15 40V77Q15 86 27 86H73Q87 86 87 72V53',stroke='ink',sw=2.5)+line(25,79,71,79,'line',1.3)+line(8,25,8,33)
    if kind=='french_horn':return circle(45,56,27,'orange')+circle(45,56,18,'body')+path('M26 36Q12 19 28 17H36V30H42M65 42L88 29V65L66 55Z','orange')+ellipse(88,47,4,18,'body')+''.join(rect(34+i*8,42,5,24,'soft',1) for i in range(3))+circle(45,56,10,'none','line',1)
    if kind=='tuba':return path('M25 42V72Q25 89 44 89Q65 89 65 72V35H54V72Q54 80 44 80Q36 80 36 72V42Z','orange')+circle(66,25,20,'orange')+circle(66,25,14,'body')+circle(66,25,6,'panel')+''.join(rect(34+i*8,46,5,22,'soft',1) for i in range(3))+line(37,42,37,46)+line(45,42,45,46)+line(53,42,53,46)
    if kind=='harmonica':return rect(9,32,82,34,'body',4)+rect(15,40,70,18,'panel',2)+''.join(rect(20+i*8,43,5,12,'orange' if i%3==0 else 'soft',1,'none',0) for i in range(8))+line(18,36,82,36,'line',1.3)+line(18,62,82,62,'orange',1.5)
    if kind=='bagpipes':return path('M25 42Q10 46 14 65Q17 84 43 83Q68 86 77 66L65 43Z','orange')+path('M29 44L18 12H25L40 42M45 41L43 7H50L56 42M61 45L75 14H82L72 51','body')+path('M27 71L12 88H20L38 79M65 73L81 90H88L76 67','body')+path('M24 49L61 75M36 44L72 61',stroke='line',sw=1.3)
    if kind=='erhu':return poly([(31,73),(49,65),(67,73),(67,86),(49,94),(31,86)],'body')+rect(45,14,7,62,'soft',1)+path('M45 14Q58 5 54 15M42 24H59M42 34H59',stroke='ink',sw=2)+line(48,16,48,83,'line',1)+line(14,53,84,73,'orange',2.5)+line(15,55,83,75,'ink',1)+ellipse(49,78,12,7,'orange')
    if kind=='guzheng':return path('M9 30Q48 23 91 32V72Q48 62 9 75Z','body')+''.join(path(f'M15 {36+i*4.3}Q50 {29+i*4.3} 85 {37+i*3.8}',stroke='line',sw=.9) for i in range(8))+''.join(poly([(35+i*4,43+i*2),(38+i*4,37+i*2),(41+i*4,43+i*2)],'orange','ink',1) for i in range(8))+line(17,32,17,70,'panel',2)
    if kind=='pipa':return path('M45 32Q43 45 29 60Q13 81 37 91Q50 98 65 89Q86 79 69 59Q57 44 55 32Z','body')+rect(46,13,8,35,'soft',1)+rect(43,6,15,9,'orange',2)+''.join(line(47+i*1.7,16,47+i*1.7,84,'line',.8) for i in range(4))+''.join(line(43-i*.7,45+i*5,57+i*.7,45+i*5,'orange',1.5) for i in range(5))+rect(39,84,22,3,'panel',1)
    if kind=='generic_wind_brass':return path('M26 42V71Q26 88 43 88Q61 88 61 70V36H51V70Q51 78 43 78Q36 78 36 70V42Z','orange')+circle(61,25,18,'orange')+circle(61,25,11,'body')+rect(40,48,6,21,'soft',1)+line(43,43,43,48)+line(19,18,40,18,'blue',2)
    if kind=='generic_folk_instrument':return rect(22,16,56,72,'body',8)+circle(50,62,12,'panel')+rect(27,27,46,7,'orange',1)+''.join(rect(31+i*5,30,3,22+abs(3-i)*5,'soft',1,'ink',1) for i in range(8))+line(29,80,71,80,'orange',2)
    raise KeyError(kind)

def plan_hand_mic(kind):
    if kind=='shotgun_mic':return rect(44,8,12,61,'panel',4)+''.join(line(46,16+i*6,54,16+i*6,'line',1.2) for i in range(7))+rect(45,69,10,20,'body',2)+rect(46,91,8,4,'orange',1)
    if kind=='ribbon_mic':return rect(34,13,32,45,'panel',7)+''.join(line(39,20+i*6,61,20+i*6,'line',1.3) for i in range(6))+path('M30 42V65H70V42',stroke='orange',sw=2.5)+rect(44,59,12,27,'body',2)
    if kind=='utility_condenser_mic':return rect(37,11,26,41,'panel',7)+''.join(line(42,19+i*6,58,19+i*6,'line',1.2) for i in range(5))+rect(39,52,22,31,'body',3)+poly([(28,54),(50,43),(72,54),(72,75),(50,88),(28,75)],'none','orange',1.7)+circle(50,67,2,'blue')
    result=ellipse(50,24,14,17,'panel')+''.join(line(42,15+i*5,58,15+i*5,'line',1.1) for i in range(5))+path('M40 40L43 77H57L60 40Z','body')+rect(42,43,16,4,'orange',1)
    if kind=='wireless_handheld_mic':result+=rect(46,61,8,6,'blue',1)+path('M72 14q10 10 0 22M79 8q17 16 0 34',stroke='blue',sw=1.8)
    else:result+=path('M50 78V88Q50 96 74 90',stroke='ink',sw=2.5)
    return result

def plan_microphones(kind):
    if kind in ['wireless_handheld_mic','utility_dynamic_mic','utility_condenser_mic','ribbon_mic','shotgun_mic']:return plan_hand_mic(kind)
    if kind=='boundary_mic':return path('M22 22H77L87 75Q50 88 13 75Z','panel')+path('M29 30H70L78 67Q50 77 22 67Z','soft')+''.join(line(30+i*8,37,27+i*9,65,'line',1) for i in range(6))+path('M50 83V93H76',stroke='orange',sw=2.5)
    if kind=='gooseneck_mic':return circle(47,60,25,'panel')+circle(47,60,6,'orange')+path('M47 60Q32 39 58 28L70 18',stroke='ink',sw=3)+group(rect(66,7,10,22,'body',4)+ellipse(71,8,5,3,'panel'),'rotate(34 71 18)')+path('M46 85V93H24',stroke='line',sw=2)
    if kind=='lavalier_mic':return rect(37,16,26,32,'panel',9)+rect(31,28,7,25,'soft',2)+rect(39,37,22,4,'orange',1)+path('M50 48V69Q50 91 74 81Q88 74 76 62',stroke='ink',sw=2.5)+circle(50,25,6,'none','line',1)
    if kind=='headset_mic':return path('M19 54V44Q19 13 50 13Q81 13 81 44V54',stroke='ink',sw=4)+ellipse(19,56,7,13,'panel')+ellipse(81,56,7,13,'panel')+path('M81 69Q79 86 57 86',stroke='orange',sw=2.5)+ellipse(50,86,9,4,'panel')+path('M31 28Q50 15 69 28',stroke='line',sw=1.4)
    if kind=='clip_on_instrument_mic':return path('M21 69V49H47V69H40V59H28V69Z','soft')+rect(30,70,9,15,'orange',2)+path('M35 49Q27 18 57 21H69',stroke='ink',sw=3)+rect(64,14,24,13,'panel',5)+line(69,16,69,25,'orange',2)
    if kind=='ambient_mic':return rect(45,19,10,59,'body',3)+rect(44,12,12,20,'panel',4)+line(45,36,55,36,'orange',3)+path('M30 18q-8 12 0 24M70 18q8 12 0 24',stroke='blue',sw=1.6)+rect(46,80,8,10,'soft',1)
    if kind in ['ambient_mic_pair','drum_overhead_pair']:
        result=circle(27,70,14,'panel')+circle(73,70,14,'panel')+path('M27 70V34M73 70V34',stroke='ink',sw=2.5)+rect(22,14,10,26,'body',4)+rect(68,14,10,26,'body',4)+rect(22,14,10,9,'panel',3)+rect(68,14,10,9,'panel',3)+circle(27,70,3,'orange')+circle(73,70,3,'orange')
        if kind=='drum_overhead_pair':result+=circle(50,47,14,'body')+circle(50,47,10,'none','orange',1.5)+path('M27 35L40 42M73 35L61 42',stroke='line',sw=2)
        else:result+=path('M38 18Q50 7 62 18',stroke='blue',sw=1.5)+label('L',24,91,.8,'blue')+label('R',70,91,.8,'orange')
        return result
    if kind=='talkback_mic':return rect(17,51,66,34,'panel',5)+rect(24,60,26,10,'blue',1)+circle(66,68,7,'orange')+path('M38 51Q23 24 53 22H65',stroke='ink',sw=3)+rect(61,15,21,13,'body',4)+rect(73,16,9,11,'panel',3)+dots(26,77,4,7,1,'soft')
    raise KeyError(kind)

def plan_stands(kind):
    if kind=='short_boom_mic_stand':return group(approved_top_drawing({'id':'boom_mic_stand'}),'translate(13 16) scale(.73)')+rect(31,82,30,4,'orange',1)
    if kind=='straight_mic_stand':return path('M50 49L19 78M50 49L81 78M50 49V17',stroke='ink',sw=4)+circle(50,49,8,'panel')+circle(50,49,4,'orange')+path('M15 77L22 83M78 83L85 77M46 15H54',stroke='soft',sw=3)
    if kind=='table_mic_stand':return circle(50,51,28,'panel')+circle(50,51,19,'none','line',1.3)+rect(41,44,18,14,'orange',4)+circle(50,51,4,'body')+line(34,80,66,80,'line',1.5)
    if kind=='stereo_bar':return rect(11,43,78,12,'body',3)+circle(22,49,6,'panel')+circle(78,49,6,'panel')+circle(50,49,5,'orange')+rect(19,30,6,12,'soft',2)+rect(75,30,6,12,'soft',2)+label('L',20,67,1,'blue')+label('R',76,67,1,'orange')
    if kind=='mic_clamp':return path('M71 25Q49 9 31 27Q18 45 36 61L46 51Q35 42 43 34Q53 25 62 37Z','panel')+path('M39 59L30 76L40 83L53 62Z','soft')+circle(39,72,4,'orange')+path('M60 56L73 70L84 59',stroke='ink',sw=4)
    if kind=='guitar_stand':return path('M50 32L20 80M50 32L80 80M50 32V14',stroke='ink',sw=4)+path('M23 61V74Q23 81 32 81H68Q77 81 77 74V61',stroke='orange',sw=4)+circle(50,32,6,'panel')+path('M45 16Q50 24 55 16',stroke='line',sw=3)
    if kind=='music_stand':return rect(15,27,70,44,'panel',3)+rect(20,32,60,32,'body',1)+line(15,69,85,69,'orange',4)+path('M50 72V87M50 76L36 88M50 76L64 88',stroke='line',sw=2)+path('M28 39H44M55 39H72M28 47H44M55 47H72',stroke='line',sw=1.4)
    if kind=='stool':return path('M33 67L20 83M67 67L80 83M50 25V10',stroke='line',sw=3)+circle(50,49,27,'panel')+circle(50,49,20,'none','orange',1.6)+circle(50,49,4,'soft')
    if kind=='lectern':return rect(15,26,70,49,'panel',3)+rect(28,35,32,29,'body',1)+line(34,43,53,43,'line',1.3)+line(34,51,53,51,'line',1.3)+line(19,72,81,72,'orange',3)+path('M72 40Q87 11 65 14',stroke='ink',sw=2.5)+rect(58,10,15,9,'body',4)
    raise KeyError(kind)

def plan_case(x=19,y=22,w=62,h=57,vent_rows=4):
    result=rect(x,y,w,h,'body',4)+rect(x+6,y+6,w-12,h-17,'panel',2)+rect(x,y+h-9,w,9,'panel',1)
    for row in range(vent_rows):result+=line(x+13,y+13+row*6,x+w-13,y+13+row*6,'line',1.5)
    return result+rect(x+w/2-12,y+3,24,5,'orange',1,'none',0)+dots(x+12,y+h-4,5,(w-24)/4,1.2,'soft')

def plan_di(kind):
    result=rect(24,22,52,57,'body',4)+rect(31,29,38,42,'panel',2)+label('DI',41,43,1.35,'white')+rect(32,17,12,7,'soft',2)+rect(53,76,13,8,'soft',2)+rect(35,61,12,4,'orange',1)
    if kind=='stereo_di_box':result+=rect(54,17,12,7,'soft',2)+rect(32,76,12,8,'soft',2)+label('LR',49,60,.9,'blue')+path('M38 16V7H19M60 16V7H81M60 84V93H79M38 84V93H19',stroke='ink',sw=2.5)
    else:result+=rect(59,33,6,4,'soft',1)+path('M38 16V7H19M60 84V93H79',stroke='ink',sw=3)
    return result

def plan_audio(kind):
    if kind=='guitar_amp_stack':return plan_cabinet()+rect(23,21,54,19,'panel',3)+rect(39,26,22,6,'soft',2)+dots(31,35,5,9,1.2,'orange')
    if kind=='amp_modeler_rig':return poly([(20,23),(80,23),(90,79),(10,79)],'panel')+rect(24,31,27,17,'blue',2)+circle(68,40,7,'soft')+dots(24,62,5,13,3,'orange')+dots(32,74,4,13,1.5,'soft')
    if kind=='amp_rack':return plan_case(17,17,66,66,6)+rect(24,7,17,7,'panel',2)+rect(59,7,17,7,'panel',2)+rect(23,83,17,7,'panel',2)+rect(60,83,17,7,'panel',2)
    if kind=='pedalboard':
        result=rect(9,19,82,64,'panel',3)
        for row in range(2):
            for col in range(3):
                x=17+col*24;y=26+row*27
                result+=rect(x,y,18,23,'orange' if row+col==0 else 'soft',2)+circle(x+9,y+17,2,'panel')+dots(x+5,y+6,2,8,1.5,'panel')
        return result+path('M35 38Q43 32 41 53M59 66Q68 59 65 46',stroke='blue',sw=1.6)
    if kind in ['passive_di_box','stereo_di_box']:return plan_di(kind)
    if kind=='audio_interface':return rect(14,24,72,51,'body',4)+rect(20,30,60,33,'panel',2)+circle(64,46,11,'orange')+circle(64,46,5,'soft')+rect(26,35,19,15,'blue',1)+dots(27,57,3,7,1.5,'soft')+circle(31,70,4,'panel')+circle(48,70,4,'panel')+rect(67,69,10,4,'orange',1)+rect(23,18,10,6,'soft',1)+rect(68,18,10,6,'soft',1)
    if kind=='audio_snake':return rect(9,12,30,37,'panel',3)+dots(18,23,2,12,3,'soft')+dots(18,36,2,12,3,'orange')+path('M24 49V67Q24 90 50 90Q77 90 77 66Q77 47 55 48Q39 48 42 64Q45 78 61 70',stroke='ink',sw=4)+path('M39 29H55L67 9M55 29L83 23M55 29L84 41',stroke='blue',sw=2)+rect(63,4,8,12,'body',2)+rect(82,16,8,12,'body',2)+rect(83,35,8,12,'body',2)
    if kind=='sub_snake':return rect(17,22,66,47,'panel',4)+''.join(circle(28+c*15,35+r*17,4,'soft')+dots(26+c*15,35+r*17,2,4,1,'panel') for r in range(2) for c in range(4))+rect(23,60,22,3,'orange',1,'none',0)+path('M68 69V84Q68 94 86 87',stroke='ink',sw=3)
    if kind=='mic_splitter':return rect(10,31,80,40,'body',3)+rect(18,39,64,21,'panel',2)+''.join(rect(22+i*15,25,9,7,'soft',1)+rect(22+i*15,70,9,7,'soft',1) for i in range(4))+path('M27 36V66M42 36V66M57 36V66M72 36V66',stroke='orange',sw=1.5)+label('SPLIT',31,46,.9,'white')
    if kind=='equipment_rack':return plan_case(17,18,66,62,2)+rect(13,26,5,16,'panel',1)+rect(82,26,5,16,'panel',1)+path('M28 47H71M28 54H71',stroke='soft',sw=1)+rect(35,83,30,6,'orange',1)
    if kind=='system_processor':return plan_case(9,32,82,35,1)+rect(21,27,9,5,'soft',1)+rect(37,27,9,5,'soft',1)+rect(53,27,9,5,'soft',1)+rect(69,27,9,5,'soft',1)+rect(22,65,15,5,'blue',1)
    if kind in ['line_source_mono','line_source_stereo']:
        stereo=kind=='line_source_stereo'
        result=rect(17,24,66,51,'body',5)+path('M24 49q6-17 12 0t12 0t12 0t12 0',stroke='orange',sw=2)+circle(35 if stereo else 50,67,4,'panel')
        if stereo:result+=circle(66,67,4,'panel')+path('M35 76V86H21M66 76V86H80',stroke='blue',sw=2)
        else:result+=path('M50 76V89H72',stroke='blue',sw=2)
        return result
    if kind=='generic_audio_equipment':return rect(13,25,74,51,'body',4)+rect(22,33,25,18,'blue',2)+circle(67,43,9,'orange')+rect(21,59,56,9,'panel',1)+dots(27,64,5,10,1.3,'soft')
    if kind=='generic_input_source':return rect(27,22,54,57,'body',4)+circle(58,48,13,'panel')+circle(58,48,7,'soft')+path('M8 49H39M29 39L39 49L29 59',stroke='orange',sw=3)+rect(43,81,25,6,'panel',1)
    if kind=='generic_power_source':return rect(12,30,76,39,'body',6)+circle(35,49,12,'panel')+circle(65,49,12,'panel')+circle(30,49,2,'orange')+circle(40,49,2,'orange')+circle(60,49,2,'orange')+circle(70,49,2,'orange')+path('M12 49H6V20H26',stroke='ink',sw=3)+rect(18,72,14,4,'orange',1)
    raise KeyError(kind)

def plan_pa(x=30,y=20,w=40,h=59):
    return rect(x,y,w,h,'panel',4)+rect(x+5,y+5,w-10,h-16,'body',2)+rect(x+w/2-9,y+17,18,6,'panel',2)+line(x+7,y+h-6,x+w-7,y+h-6,'orange',2)+''.join(line(x+10+i*5,y+8,x+10+i*5,y+13,'line',1.3) for i in range(max(1,int((w-16)/5))))

def plan_iem(kind):
    result=rect(30,33,40,52,'panel',5)+rect(37,41,26,15,'blue',2)+circle(41,72,5,'orange')+circle(59,72,4,'soft')+path('M37 33V22Q20 7 15 28Q12 45 23 42M63 33V22Q80 7 85 28Q88 45 77 42',stroke='ink',sw=2.4)+ellipse(21,40,5,4,'orange')+ellipse(79,40,5,4,'orange')
    if kind in ['iem_receiver_stereo','cue_iem']:result+=label('LR',44,59,.85,'white')
    else:result+=label('M',47,59,.85,'white')
    if kind=='hardwired_iem_pack':result+=path('M50 85V94H77',stroke='orange',sw=2.5)
    else:result+=line(65,33,72,14,'orange',2)
    if kind=='cue_iem':result=group(result,'translate(5 -1) scale(.9)')+label('CUE',38,90,.9,'orange')
    return result

def plan_monitors(kind):
    if kind=='wedge_pair':return group(approved_top_drawing({'id':'wedge_monitor'}),'translate(-1 8) scale(.57)')+group(approved_top_drawing({'id':'wedge_monitor'}),'translate(44 8) scale(.57)')+label('LR',43,76,1,'orange')
    if kind=='sidefill_pair':return plan_pa(10,21,28,58)+plan_pa(62,21,28,58)+path('M39 43L47 50L39 57M61 43L53 50L61 57',stroke='orange',sw=2)
    if kind=='drum_fill':return plan_case(20,47,60,38,1)+group(approved_top_drawing({'id':'wedge_monitor'}),'translate(7 1) scale(.86)')
    if kind=='front_fill':return poly([(15,36),(85,36),(91,65),(9,65)],'panel')+''.join(rect(21+i*21,43,15,15,'body',2) for i in range(3))+line(37,61,63,61,'orange',2)
    if kind=='delay_fill_speaker':return path('M50 48L18 86M50 48L82 86M50 48V11',stroke='line',sw=2.5)+plan_pa(31,22,38,51)+path('M80 30q12 12 0 24',stroke='blue',sw=1.8)
    if kind=='main_pa_speaker':return plan_pa()
    if kind=='pa_subwoofer':return plan_case(15,22,70,54,3)+rect(9,37,6,20,'panel',2)+rect(85,37,6,20,'panel',2)+line(22,80,78,80,'orange',2)
    if kind=='cue_wedge':return approved_top_drawing({'id':'wedge_monitor'})+label('CUE',38,88,1,'orange')
    if kind in ['cue_iem','hardwired_iem_pack','iem_receiver_mono','iem_receiver_stereo']:return plan_iem(kind)
    if kind=='iem_transmitter_rack':return plan_case(15,29,70,45,3)+line(23,29,13,8,'orange',2.5)+line(77,29,87,8,'orange',2.5)+rect(24,70,18,5,'blue',1)+circle(73,70,3,'orange')
    if kind=='confidence_monitor':return poly([(21,31),(79,31),(88,69),(12,69)],'panel')+poly([(26,37),(74,37),(80,62),(20,62)],'blue')+label('LIVE',33,45,1.3,'panel')+line(37,73,63,73,'orange',2)
    if kind=='talkback_speaker':return plan_pa(20,21,43,58)+path('M75 34q10 12 0 24M83 27q16 19 0 38',stroke='orange',sw=1.8)+circle(41,43,3,'blue')
    if kind=='generic_monitor_destination':return rect(18,23,64,55,'body',5)+circle(50,50,18,'panel')+circle(50,50,10,'soft')+path('M50 7V34M41 25L50 34L59 25',stroke='orange',sw=3)+path('M30 86H70',stroke='blue',sw=2)
    raise KeyError(kind)

def plan_laptop(x=15,y=19,w=70,h=62):
    return rect(x,y,w,9,'panel',2)+rect(x+6,y+2,w-12,3,'blue',1,'none',0)+rect(x+2,y+11,w-4,h-11,'body',3)+rect(x+7,y+17,w-14,h*.42,'panel',1)+''.join(line(x+12,y+22+i*6,x+w-12,y+22+i*6,'soft',1) for i in range(3))+''.join(line(x+16+i*8,y+19,x+16+i*8,y+39,'line',.8) for i in range(5))+rect(x+w*.34,y+h-16,w*.32,10,'soft',2)+line(x+9,y+h-4,x+w-9,y+h-4,'orange',1.5)

def plan_playback(kind):
    if kind=='dj_controller':return rect(8,27,84,49,'panel',4)+circle(29,50,15,'soft')+circle(29,50,7,'panel')+circle(72,50,15,'soft')+circle(72,50,7,'panel')+rect(47,37,8,27,'body',1)+line(51,44,51,59,'orange',2)+dots(19,69,3,9,1.7,'orange')+dots(63,69,3,9,1.7,'orange')
    if kind=='dj_mixer':return mixer(24,19,52,64)+''.join(rect(29+i*10,13,6,6,'soft',1) for i in range(4))+line(36,88,64,88,'orange',2)
    if kind=='turntable':return rect(9,19,82,62,'body',4)+circle(42,49,25,'panel')+circle(42,49,18,'none','line',1)+circle(42,49,8,'orange')+circle(42,49,2,'body')+path('M78 31V57L60 67',stroke='ink',sw=3)+circle(78,29,5,'soft')+rect(58,64,9,5,'panel',1)+rect(18,73,12,4,'blue',1)+circle(80,73,2,'orange')
    if kind=='laptop':return plan_laptop()
    if kind=='media_player':return rect(20,14,60,72,'panel',5)+rect(29,23,42,16,'blue',2)+circle(50,59,15,'soft')+circle(50,59,8,'orange')+poly([(48,54),(48,64),(56,59)],'panel','none',0)+dots(30,80,4,13,1.5,'orange')+rect(34,8,30,5,'body',1)
    if kind=='playback_rig':return group(plan_laptop(),'translate(-4 0) scale(.69)')+group(plan_laptop(),'translate(45 4) scale(.6)')+rect(28,69,45,18,'panel',3)+rect(35,74,18,7,'blue',1)+circle(63,78,4,'orange')+path('M22 56V78H28M78 56V78H73',stroke='orange',sw=2)
    raise KeyError(kind)

def plan_person(x=50,y=33,scale=1,pose='play'):
    result=''
    if pose=='seated':result+=rect(-25,-24,50,9,'panel',3)+rect(-20,-17,40,43,'soft',6)
    result+=path('M-26 7Q0-8 26 7L22 25Q0 17-22 25Z','body')
    if pose in ['conduct','open']:
        result+=path('M-23 15L-37 3M23 15L37 3',stroke='ink',sw=4)
        if pose=='conduct':result+=line(36,3,42,-12,'orange',2)
    elif pose=='raise':result+=path('M-23 15L-29 29L-9 33M23 15L33-4',stroke='ink',sw=4)
    else:result+=path('M-23 15L-28 30L-9 33M23 15L28 30L9 33',stroke='ink',sw=4)
    result+=ellipse(0,-1,11,13,'panel')+path('M-3 11L0 17L3 11','body')+ellipse(0,-9,5,2,'none','line',1.2)
    return group(result,f'translate({x} {y}) scale({scale})')

def plan_people(kind):
    if kind=='backing_vocalist':return plan_person(48,37,.95)+circle(50,83,10,'panel')+line(50,70,50,83,'orange',2.5)+path('M76 27V14L88 10V23',stroke='blue',sw=1.7)+ellipse(72,29,4,3,'blue')+ellipse(84,25,4,3,'blue')
    if kind in ['guitarist','bassist']:return plan_person(50,30,1)+group(plan_guitar('bass_guitar' if kind=='bassist' else 'electric_guitar'),'translate(17 43) scale(.51) rotate(45 50 50)')+path('M26 57L39 70M74 57L60 70',stroke='ink',sw=3)
    if kind=='drummer':return group(plan_kit(),'translate(5 19) scale(.9)')+plan_person(50,19,.62)+line(32,47,40,56,'orange',2)+line(68,47,59,57,'ink',2)
    if kind=='keyboardist':return plan_person(50,28,.9)+keyboard(8,63,84,27)+path('M28 57L35 68M72 57L65 68',stroke='ink',sw=3)
    if kind=='percussionist':return plan_person(50,24,.9)+circle(29,73,20,'orange')+circle(29,73,15,'body')+circle(74,72,17,'orange')+circle(74,72,12,'body')+path('M26 49L30 62M74 49L72 62',stroke='ink',sw=3)
    if kind=='dj':return plan_person(50,24,.85)+group(plan_playback('dj_controller'),'translate(4 27) scale(.92)')+path('M42 17Q50 10 58 17',stroke='orange',sw=2.5)
    if kind=='playback_operator':return plan_person(50,25,.85)+group(plan_laptop(),'translate(11 33) scale(.79)')+path('M28 52L36 64M72 52L64 64',stroke='ink',sw=3)
    if kind=='conductor':return plan_person(48,39,.95,'conduct')+rect(26,78,48,7,'panel',2)+path('M31 68L40 72M65 68L56 72',stroke='orange',sw=2)
    if kind in ['choir_group','ensemble_group']:
        result=plan_person(22,29,.5)+plan_person(78,29,.5)+plan_person(50,41,.78)
        if kind=='choir_group':return result+rect(36,65,28,17,'body',2)+path('M50 66V81M41 70H46M54 70H59M41 75H46M54 75H59',stroke='orange',sw=1.1)
        return result+group(plan_strings('violin'),'translate(59 55) scale(.32)')+circle(26,73,11,'orange')+circle(26,73,7,'body')
    if kind=='seated_musician':return plan_person(50,38,1,'seated')+group(plan_strings('mandolin'),'translate(16 58) scale(.35)')
    if kind=='standing_musician':return plan_person(50,36,1)+ellipse(40,80,6,10,'panel')+ellipse(60,80,6,10,'panel')
    if kind=='generic_performer':return plan_person(50,39,1,'raise')+path('M39 83H61',stroke='orange',sw=3)
    if kind=='host_mc':return plan_person(49,35,.95,'raise')+rect(68,28,10,20,'panel',4)+rect(65,38,16,7,'orange',1)+label('MC',67,39,.5,'panel')+line(72,48,72,66,'line',2)
    if kind=='speaker_presenter':return plan_person(50,35,.95)+rect(18,65,30,21,'body',2)+path('M25 72H41M25 78H37',stroke='orange',sw=1.6)+rect(64,55,9,19,'panel',4)+circle(68.5,56,4.5,'soft')
    if kind=='stage_technician':return plan_person(44,34,.9)+path('M34 20Q44 12 54 20',stroke='orange',sw=3)+rect(17,70,36,18,'panel',3)+path('M23 76H47',stroke='orange',sw=2)+path('M75 42Q64 42 68 54L76 61L66 81Q65 87 71 88Q76 89 78 83L86 62Q92 54 85 46L81 54L75 50Z','soft')
    raise KeyError(kind)

def plan_desk(kind):
    result=rect(10,19,80,64,'body',4)+rect(17,24,66,9,'panel',2)+rect(23,26,23,4,'blue',1)+rect(55,26,23,4,'blue',1)
    if kind=='monitor_world':return result+group(mixer(18,25,64,62),'translate(-1 23) scale(.68)')+group(approved_top_drawing({'id':'wedge_monitor'}),'translate(53 41) scale(.38)')+label('MON',34,88,1.3,'orange')
    if kind=='lighting_console_position':return result+rect(18,39,64,35,'panel',2)+''.join(rect(24+c*10,44+r*10,6,6,'orange' if (c+r)%3==0 else 'blue' if c==4 else 'soft',1) for r in range(2) for c in range(5))+label('LX',42,88,1.3,'orange')
    if kind=='video_control_position':return result+rect(18,38,64,36,'panel',2)+rect(24,44,21,13,'blue',1)+rect(55,44,21,13,'blue',1)+poly([(32,47),(32,54),(39,50.5)],'body','none',0)+dots(27,65,5,11,2,'orange')+label('VIDEO',32,88,1,'orange')
    if kind=='broadcast_recording_position':return result+rect(18,39,64,35,'panel',2)+circle(35,55,10,'soft')+circle(65,55,10,'soft')+circle(35,55,4,'orange')+circle(65,55,4,'orange')+line(42,69,58,69,'blue',2)+label('REC',38,88,1.3,'orange')
    raise KeyError(kind)

def plan_production(kind):
    if kind in ['monitor_world','lighting_console_position','video_control_position','broadcast_recording_position']:return plan_desk(kind)
    if kind=='wireless_receiver_rack':return plan_case(15,30,70,43,3)+path('M23 30L13 8M77 30L87 8',stroke='ink',sw=2.5)+path('M35 13Q50 3 65 13',stroke='blue',sw=1.6)+label('RF',46,54,1,'body')
    if kind=='rf_antenna':return path('M50 50L24 81M50 50L77 81M50 50V18',stroke='line',sw=3)+circle(50,50,7,'orange')+group(rect(21,31,58,10,'panel',2)+rect(29,33,33,4,'orange',1,'none',0),'rotate(-18 50 36)')+path('M33 19Q47 8 64 14M28 12Q45 2 66 7',stroke='blue',sw=1.6)
    if kind=='rf_antenna_distribution':return plan_case(13,35,74,36,1)+path('M24 34V23L15 8M24 23L33 8M76 34V23L67 8M76 23L85 8',stroke='orange',sw=2.2)+path('M24 53H76M50 53V66',stroke='blue',sw=1.5)+''.join(circle(26+i*12,76,3,'soft') for i in range(5))
    if kind=='intercom_beltpack':return rect(28,23,44,59,'panel',5)+rect(34,16,32,8,'soft',1)+rect(36,32,28,13,'blue',1)+circle(41,64,6,'orange')+circle(60,64,4,'soft')+path('M36 23V11H18V24M64 23V12H82V29',stroke='ink',sw=2.5)+ellipse(82,33,6,8,'body')+label('IC',43,49,.9,'body')
    if kind=='intercom_station':return rect(12,40,76,40,'panel',4)+rect(20,48,30,11,'blue',1)+circle(68,59,8,'orange')+dots(24,70,5,11,1.6,'soft')+path('M30 40Q15 14 47 17H59',stroke='ink',sw=3)+rect(55,10,21,12,'body',4)+rect(67,11,9,10,'panel',3)
    if kind=='projector':return rect(17,23,66,51,'body',6)+rect(24,30,27,26,'panel',2)+''.join(line(28,35+i*4,47,35+i*4,'line',1) for i in range(5))+circle(67,40,7,'soft')+circle(67,40,3,'orange')+rect(54,66,21,12,'panel',3)+ellipse(64.5,76,8,4,'blue')+dots(28,66,3,6,1.5,'blue')+path('M60 85H70',stroke='orange',sw=2)
    if kind=='projection_screen':return path('M50 49L25 84M50 49L75 84M50 49V18',stroke='line',sw=2.5)+rect(9,38,82,11,'panel',2)+rect(14,43,72,5,'body',1)+path('M20 58L50 87L80 58',stroke='blue',sw=1.6)+line(38,52,62,52,'orange',2)
    if kind=='generic_video_equipment':return rect(18,24,64,53,'body',5)+rect(25,32,50,34,'blue',2)+poly([(43,40),(43,59),(61,49.5)],'panel','none',0)+rect(31,78,38,7,'panel',2)+circle(68,72,2,'orange')
    raise KeyError(kind)

def plan_connectors(kind):
    if kind=='xlr_connector':return rect(35,22,30,51,'panel',4)+rect(37,8,26,17,'body',3)+rect(43,11,14,6,'soft',1)+rect(44,28,12,16,'orange',2)+''.join(line(40,49+i*5,60,49+i*5,'line',1.1) for i in range(4))+rect(41,74,18,9,'soft',2)+path('M50 84V94H76',stroke='ink',sw=4)
    if kind=='trs_connector':return rect(39,49,22,31,'panel',4)+rect(45,13,10,36,'soft',1)+path('M45 13L50 6L55 13Z','body')+line(45,24,55,24,'ink',3)+line(45,37,55,37,'ink',3)+rect(42,82,16,6,'orange',1)+path('M50 88V94H78',stroke='ink',sw=4)+line(43,58,57,58,'line',1.1)+line(43,65,57,65,'line',1.1)
    if kind=='ethernet_connector':return rect(30,13,40,47,'body',2)+rect(35,18,30,20,'soft',1)+''.join(rect(38+i*3.4,19,1.6,14,'orange',.5,'none',0) for i in range(8))+path('M40 39V48H60V39Z','soft')+rect(35,60,30,20,'panel',3)+path('M41 66H59M41 72H59',stroke='line',sw=1.3)+path('M50 80V93H80',stroke='blue',sw=4)
    if kind=='powercon_connector':return rect(32,22,36,53,'blue',5)+rect(36,10,28,15,'soft',2)+rect(41,14,18,6,'panel',1)+rect(61,31,9,15,'orange',2)+path('M39 35V63M46 37V67M54 37V67M61 49V63',stroke='panel',sw=1.4)+rect(41,76,18,9,'panel',2)+path('M50 85V94H76',stroke='ink',sw=4)+path('M49 43L43 53H50L46 61L57 49H50Z','body','none',0)
    raise KeyError(kind)

def plan_lighting(kind):
    if kind=='led_bar':return rect(9,34,82,30,'panel',3)+rect(14,39,72,7,'soft',1)+''.join(line(20+i*7,40,20+i*7,44,'line',1.1) for i in range(9))+''.join(circle(20+i*15,55,4.5,'orange' if i%2==0 else 'blue') for i in range(5))+path('M9 45H5V76H22M91 45H95V76H78',stroke='ink',sw=2.5)+line(37,70,63,70,'orange',2)
    raise KeyError(kind)

def top_drawing(item):
    if item['id'] in TOP_IDS:return approved_top_drawing(item)
    dispatch={'Cuerdas':plan_strings,'Teclados y electrónica':plan_keys,'Batería y percusión':plan_percussion,'Vientos y tradicionales':plan_winds,'Micrófonos':plan_microphones,'Soportes y mobiliario':plan_stands,'Amplificadores y audio':plan_audio,'Monitores y PA':plan_monitors,'DJ y reproducción':plan_playback,'Artistas y equipo humano':plan_people,'Producción, RF y vídeo':plan_production,'Anotaciones y zonas':annotations,'Conectores y cableado':plan_connectors,'Iluminación':plan_lighting}
    return dispatch[item['category']](item['id'])

GALLERY='''<!doctype html>
<html lang="es" data-theme="claro">
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>GordoStage · __COUNT__ iconos propios</title>
<style>
:root{color-scheme:light;--bg:#f6f3ee;--card:#fffcf7;--fg:#292e34;--muted:#686d73;--edge:#ded8cf;--orange:#c34b0d;--chip:#f9e1d1;--icon-size:116px}
[data-theme=oscuro]{color-scheme:dark;--bg:#0c1522;--card:#152436;--fg:#edf3f8;--muted:#a5b9cd;--edge:#33475d;--orange:#ff9c5d;--chip:#442d22}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font-family:Inter,Segoe UI,Arial,sans-serif;line-height:1.5}main{max-width:1440px;margin:auto;padding:44px 36px 32px}header{border-top:5px solid var(--orange);padding-top:23px;margin-bottom:25px}.eyebrow{font-size:12px;letter-spacing:.19em;font-weight:750;color:var(--orange);text-transform:uppercase}h1{font-size:clamp(28px,4vw,44px);letter-spacing:-.045em;line-height:1.15;margin:10px 0}header p{margin:12px 0 16px;max-width:850px;color:var(--muted)}.status{display:inline-flex;gap:8px;align-items:center;font-size:12px;font-weight:700;border:1px solid var(--edge);border-radius:30px;padding:6px 12px}.status:before{content:'';width:7px;height:7px;background:var(--orange);border-radius:50%}.controls{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin:22px 0}.controls label{font-size:13px;font-weight:650}input,select,button{font:inherit;font-size:14px;padding:10px 12px;border-radius:8px;border:1px solid var(--edge);background:var(--card);color:var(--fg)}input{width:270px}button{cursor:pointer;font-weight:700}button:focus-visible,a:focus-visible,input:focus-visible,select:focus-visible{outline:3px solid var(--orange);outline-offset:3px}.count{font-size:13px;color:var(--muted);margin-left:auto}h2{font-size:18px;margin:30px 0 13px;letter-spacing:-.025em}h2 span{color:var(--orange);font-size:12px;margin-left:10px;font-weight:650}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(172px,1fr));gap:10px}.icon{position:relative;min-width:0;background:var(--card);border:1px solid var(--edge);border-radius:12px;text-align:center;padding:21px 10px 12px}.icon img{display:block;width:var(--icon-size);height:var(--icon-size);margin:0 auto 10px;object-fit:contain}.number{position:absolute;top:10px;left:11px;font:10px monospace;color:var(--muted)}.new{position:absolute;top:8px;right:9px;font-size:9px;color:var(--orange);background:var(--chip);padding:1px 5px;border-radius:8px}.name{font-size:13px;font-weight:650;min-height:39px;display:flex;align-items:center;justify-content:center;line-height:1.35}.filename{font:9px monospace;word-break:break-word;color:var(--muted);margin:5px 0 10px}.links{display:flex;justify-content:center;gap:12px}.links a{color:var(--orange);font-size:11px}footer{font-size:12px;margin-top:30px;color:var(--muted);border-top:1px solid var(--edge);padding-top:15px}.sheet .controls,.sheet .links,.sheet .filename,.sheet .status{display:none}.sheet main{max-width:none;width:1500px;padding:32px}.sheet h1{font-size:36px}.sheet .grid{grid-template-columns:repeat(6,minmax(0,1fr))}.sheet .icon{padding-top:23px}.sheet .icon img{width:132px;height:132px}.sheet .name{font-size:15px;min-height:42px}.sheet header{margin-bottom:18px}.overview main{width:1800px}.overview .grid{grid-template-columns:repeat(10,minmax(0,1fr))}.overview .icon img{width:96px;height:96px}.overview .name{font-size:12px;min-height:34px}.overview h2{margin-top:22px;font-size:17px}.overview .icon{padding:16px 5px 8px}.overview .new{font-size:8px}.sheet footer{margin-top:24px}@media(max-width:600px){main{padding:25px 16px}.grid{grid-template-columns:repeat(2,minmax(0,1fr))}.icon img{max-width:100%}.count{margin-left:0}input{width:100%}}
</style>
<main>
<header><div class="eyebrow">GordoStage / __EYEBROW__ / Muestra 01</div><h1>__HEADLINE__</h1><p id="intro">__COUNT__ diseños propios · __FILES__ archivos SVG independientes · Claro y oscuro · Fondo transparente</p><span class="status">Catálogo de revisión — integración en la app pendiente</span></header>
<div class="controls"><label for="search">Buscar</label><input id="search" type="search" placeholder="Guitarra, monitor, XLR…"><label for="category">Categoría</label><select id="category"><option value="">Todas las categorías</option></select><button id="theme" type="button" aria-pressed="false">Usar fondo oscuro</button><label for="size">Tamaño</label><select id="size"><option value="116">Normal</option><option value="64">64 px</option><option value="48">48 px</option><option value="32">32 px</option></select><span class="count" id="count" role="status"></span></div>
<div id="catalog"></div><footer>__NOTE__ SVG originales sin imágenes incrustadas ni dependencias externas. Los PNG son láminas de revisión.</footer>
</main>
<script id="inventory" type="application/json">__INVENTORY__</script>
<script>
const items=JSON.parse(document.querySelector('#inventory').textContent);
const categories=[...new Set(items.map(i=>i.category))];
const params=new URLSearchParams(location.search);
let theme=params.get('theme')==='oscuro'?'oscuro':'claro';
const select=document.querySelector('#category');
for(const category of categories){const option=document.createElement('option');option.value=category;option.textContent=category;select.append(option)}
if(categories.includes(params.get('category')))select.value=params.get('category');
if(params.has('sheet')){document.body.classList.add('sheet');if(params.get('sheet')==='all')document.body.classList.add('overview');if(params.get('sheet')==='sample')document.body.classList.add('sample')}
const normal=value=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const safe=value=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function render(){
 document.documentElement.dataset.theme=theme;
 document.querySelector('#theme').textContent=theme==='claro'?'Usar fondo oscuro':'Usar fondo claro';
 document.querySelector('#theme').setAttribute('aria-pressed',String(theme==='oscuro'));
 const query=normal(document.querySelector('#search').value);
 const filtered=items.filter(i=>(!select.value||i.category===select.value)&&normal(i.label+' '+i.id+' '+i.category).includes(query));
 document.querySelector('#count').textContent=filtered.length+' / __COUNT__ diseños';
 document.querySelector('#catalog').innerHTML=(params.get('sheet')==='sample'?['Vista cenital / Muestra de 20']:categories).map(category=>{
  const group=params.get('sheet')==='sample'?filtered:filtered.filter(i=>i.category===category);if(!group.length)return '';
  return '<section><h2>'+safe(category)+'<span>'+group.length+' iconos · '+theme+'</span></h2><div class="grid">'+group.map(i=>'<article class="icon"><span class="number">'+String(i.number).padStart(3,'0')+'</span>'+(i.origin==='addition'?'<span class="new">NUEVO</span>':'')+'<img src="'+theme+'/'+i.id+'.svg" alt="'+safe(i.label)+'" width="100" height="100"><div class="name">'+safe(i.label)+'</div><div class="filename">'+i.id+'.svg</div><div class="links"><a download href="claro/'+i.id+'.svg">SVG claro</a><a download href="oscuro/'+i.id+'.svg">SVG oscuro</a></div></article>').join('')+'</div></section>';
 }).join('');
 if(document.body.classList.contains('sheet')){document.querySelector('h1').textContent=select.value||'__SHEET_TITLE__';document.querySelector('#intro').textContent='Variante '+theme+' · '+filtered.length+' diseños · Contorno, naranja y azul · SVG individuales en las carpetas claro / oscuro'}
}
document.querySelector('#search').addEventListener('input',render);select.addEventListener('change',render);
document.querySelector('#theme').addEventListener('click',()=>{theme=theme==='claro'?'oscuro':'claro';render()});
document.querySelector('#size').addEventListener('change',e=>document.documentElement.style.setProperty('--icon-size',e.target.value+'px'));
render();
</script>
</html>
'''

def gallery_html(inventory,cenital=False):
    preview=cenital and len(inventory)==20
    replacements={
        '__COUNT__':str(len(inventory)), '__FILES__':str(len(inventory)*2),
        '__EYEBROW__':'Vista cenital / Referencia de 20 aprobada' if preview else 'Vista cenital / Familia completa' if cenital else 'Familia de iconos',
        '__HEADLINE__':'El escenario, visto desde arriba.' if cenital else 'Todo el escenario, un mismo lenguaje.',
        '__SHEET_TITLE__':'Vista cenital / 20 iconos de referencia' if preview else 'Los 180 cenitales de GordoStage' if cenital else 'Los 180 iconos de GordoStage',
        '__NOTE__':('Referencia de 20 conceptos aprobada; la colección cenital completa ya incluye los 180. ' if preview else 'Colección cenital de 180 conceptos, con el estilo de los 20 aprobados. ')+ 'Instrumentos portátiles apoyados horizontalmente. Dibujo esquemático sin escala. ' if cenital else '173 símbolos del inventario inicial, redibujados + cencerro, XLR, TRS, RJ45, PowerCON, cabeza móvil y barra LED. ',
        '__INVENTORY__':json.dumps(inventory,ensure_ascii=False).replace('<','\\u003c'),
    }
    result=GALLERY.replace('</style>','.sample .grid{grid-template-columns:repeat(5,minmax(0,1fr))}.sample .icon img{width:145px;height:145px}.sample .name{font-size:16px}.sample footer{max-width:1250px}</style>')
    for key,value in replacements.items():result=result.replace(key,value)
    return result

def main():
    global C
    original=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import {SYMBOLS} from './shared/symbols.js';process.stdout.write(JSON.stringify(SYMBOLS))"],cwd=ROOT))
    assert len(original)==173,'Review inventory changes before regenerating this sample'
    inventory=[dict(id=i['id'],label=i['label'],category=i['category'],usage=i['usage'],origin='initial-inventory') for i in original]
    inventory += [dict(**i,origin='addition') for i in ADDITIONS]
    assert len(inventory)==180 and len({i['id'] for i in inventory})==180
    # Keep every original ID and its position stable; additions receive numbers 174–180.
    for n,item in enumerate(inventory,1):
        item['number']=n
        item['files']={theme:f"{theme}/{item['id']}.svg" for theme in PALETTES}
    for theme in PALETTES:
        (OUT/theme).mkdir(parents=True,exist_ok=True)
        for item in inventory:(OUT/theme/f"{item['id']}.svg").write_text(svg_document(item,theme),encoding='utf-8')
    manifest=dict(name='GordoStage',family='gordostage-v1',view='original',status='sample-for-review',designs=180,variants=list(PALETTES),svgFiles=360,viewBox='0 0 100 100',transparentBackground=True,palettes=PALETTES,icons=inventory)
    (OUT/'catalogo.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    (OUT/'index.html').write_text(gallery_html(inventory),encoding='utf-8')
    categories=list(dict.fromkeys(i['category'] for i in inventory))
    (OUT/'laminas').mkdir(parents=True,exist_ok=True)
    sheets=['# Láminas de los 180 iconos\n','Cada categoría incluye versiones para fondo claro y oscuro. Los archivos SVG independientes están en [claro](../claro/) y [oscuro](../oscuro/).\n','[Lámina completa clara](catalogo-claro.png) · [Lámina completa oscura](catalogo-oscuro.png)\n','| Categoría | Diseños | Fondo claro | Fondo oscuro |','| --- | --- | --- | --- |']
    for category in categories:
        key=slug(category);count=sum(i['category']==category for i in inventory)
        sheets.append(f'| {category} | {count} | [Ver PNG](claro-{key}.png) | [Ver PNG](oscuro-{key}.png) |')
    for category in categories:
        key=slug(category)
        sheets.append(f'\n<details>\n<summary>{category} — claro y oscuro</summary>\n\n![{category}, claro](claro-{key}.png)\n\n![{category}, oscuro](oscuro-{key}.png)\n\n</details>\n')
    (OUT/'laminas'/'README.md').write_text('\n'.join(sheets),encoding='utf-8')
    rows=['# Inventario de la muestra\n','180 diseños × 2 variantes = **360 SVG independientes**. Fondo transparente; vista de 100 × 100.\n','La numeración 001–173 conserva el inventario inicial; 174–180 son incorporaciones.\n','| Nº | Icono | Categoría | Claro | Oscuro |','| --- | --- | --- | --- | --- |']
    for item in inventory:rows.append(f"| {item['number']:03} | {item['label']} | {item['category']} | [SVG]({item['files']['claro']}) | [SVG]({item['files']['oscuro']}) |")
    (OUT/'INVENTARIO.md').write_text('\n'.join(rows)+'\n',encoding='utf-8')
    (OUT/'README.md').write_text('''# Familia SVG de GordoStage — muestra 01

**180 diseños, 360 SVG independientes, 14 categorías.** Cada archivo tiene fondo transparente y geometría vectorial editable. La variante `claro` se usa sobre fondos claros; `oscuro`, sobre fondos oscuros.

- [Archivos claros](claro/) · [Archivos oscuros](oscuro/)
- [Inventario con enlaces a cada SVG](INVENTARIO.md) · [Metadatos JSON](catalogo.json)
- [Láminas PNG por categoría](laminas/)
- [Vista completa clara](laminas/catalogo-claro.png) · [Vista completa oscura](laminas/catalogo-oscuro.png)
- [Descargar ZIP completo](../gordostage-180-iconos-claro-oscuro.zip)
- Catálogo local: descarga y extrae el ZIP, luego abre `index.html` en el navegador. Permite buscar, filtrar, cambiar el fondo y comprobar tamaños de 32, 48, 64 y 116 px. Funciona sin servidor ni conexión.

Los 173 conceptos de la biblioteca inicial se han redibujado con la familia propia de GordoStage. Se añaden cencerro, XLR, TRS, RJ45, PowerCON, cabeza móvil y barra LED. No se han convertido los WebP en SVG ni se han incrustado imágenes.

## Criterios visuales

Vista frontal o perspectiva sencilla según el objeto; contornos redondeados; superficies marfil y carbón, acento naranja y detalles azules. La versión oscura mantiene exactamente la misma geometría y adapta contornos y superficies al fondo nocturno. Los SVG no llevan textos externos, fuentes, scripts ni referencias remotas; las pequeñas marcas técnicas están trazadas como vectores.

Esta carpeta es una **muestra para revisión**. La biblioteca activa y los proyectos de la aplicación conservan su comportamiento actual. Se mantiene la propuesta PNG anterior como referencia del estilo.

## Reproducir

Desde la raíz del repositorio, con Python 3, Node.js y las dependencias de desarrollo instaladas:

```sh
python3 scripts/generate-icon-sample.py
node scripts/render-icon-sample.mjs
```

El segundo comando valida los SVG, genera las láminas con Chromium y crea el ZIP descargable. Usa `CHROMIUM_PATH` si Chromium no está en `/usr/bin/chromium`.
''',encoding='utf-8')
    # Retain the approved 20-icon reference with its original SVG geometry.
    top_out=OUT.parent/'cenital-20'
    by_id={i['id']:i for i in inventory}
    top_inventory=[dict(by_id[id],number=n,originalNumber=by_id[id]['number']) for n,id in enumerate(TOP_IDS,1)]
    for theme in PALETTES:
        (top_out/theme).mkdir(parents=True,exist_ok=True)
        for item in top_inventory:(top_out/theme/f"{item['id']}.svg").write_text(svg_document(item,theme,'cenital'),encoding='utf-8')
    top_manifest=dict(manifest,family='gordostage-cenital-preview',view='cenital',status='approved-reference',designs=20,svgFiles=40,icons=top_inventory)
    (top_out/'catalogo.json').write_text(json.dumps(top_manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    (top_out/'index.html').write_text(gallery_html(top_inventory,True),encoding='utf-8')
    top_readme='''# GordoStage — referencia aprobada de 20 iconos cenitales

**20 conceptos, 40 SVG individuales**: una versión clara y otra oscura de cada uno. Esta muestra fue aprobada y sus dibujos se conservan sin cambios dentro de la [colección cenital completa de 180](../familia-gordostage-cenital-v1/).

- [SVG claros](claro/) · [SVG oscuros](oscuro/) · [Metadatos](catalogo.json)
- [Descargar ZIP de la prueba cenital](../gordostage-muestra-20-cenitales.zip)
- El ZIP incluye un catálogo `index.html` para buscar y comparar ambas variantes en el navegador, sin instalar nada.

## Fondo claro

![Los 20 iconos cenitales, claros](laminas/cenital-claro.png)

## Fondo oscuro

![Los 20 iconos cenitales, oscuros](laminas/cenital-oscuro.png)

## Convenciones de la prueba

Equipos y mobiliario muestran su superficie superior: los amplificadores tienen asa, ventilación y borde frontal; los monitores muestran la rejilla y su contorno; los micrófonos incluyen la base o las patas y la proyección del brazo. La batería combina parches y platos circulares con el cuerpo del bombo visto desde arriba. La cabeza del vocalista y los hombros indican su orientación hacia la parte inferior del plano.

Las guitarras muestran el instrumento apoyado horizontalmente, visto desde arriba. Esta silueta no representa una guitarra vertical ni el espacio de un soporte. Los dibujos son esquemáticos y **no están a escala**: sirven para revisar el lenguaje visual; el espacio real se configura en el plano.

Se mantiene la paleta de GordoStage: contorno carbón/marfil, naranja y detalles azules. Cada SVG tiene fondo transparente, vista de 100 × 100, geometría editable y ninguna imagen rasterizada incrustada. Claro y oscuro comparten exactamente la misma geometría.

## Archivos por icono

| Nº | Concepto | SVG claro | SVG oscuro |
| --- | --- | --- | --- |
'''
    for item in top_inventory:top_readme+=f"| {item['number']:02} | {item['label']} | [{item['id']}.svg]({item['files']['claro']}) | [{item['id']}.svg]({item['files']['oscuro']}) |\n"
    top_readme+='\nLos 180 cenitales ya están dibujados con este estilo; su incorporación a la aplicación se trata por separado. Para regenerar las colecciones: `python3 scripts/generate-icon-sample.py` y `node scripts/render-icon-sample.mjs` desde la raíz del repositorio.\n'
    (top_out/'README.md').write_text(top_readme,encoding='utf-8')
    full_top_out=OUT.parent/'familia-gordostage-cenital-v1'
    for theme in PALETTES:
        (full_top_out/theme).mkdir(parents=True,exist_ok=True)
        for item in inventory:(full_top_out/theme/f"{item['id']}.svg").write_text(svg_document(item,theme,'cenital'),encoding='utf-8')
    full_top_manifest=dict(manifest,family='gordostage-cenital-v1',view='cenital',status='style-approved',reference='cenital-20',icons=inventory)
    (full_top_out/'catalogo.json').write_text(json.dumps(full_top_manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    (full_top_out/'index.html').write_text(gallery_html(inventory,True),encoding='utf-8')
    (full_top_out/'INVENTARIO.md').write_text(('\n'.join(rows)+'\n').replace('# Inventario de la muestra','# Inventario de la colección cenital',1),encoding='utf-8')
    (full_top_out/'laminas').mkdir(parents=True,exist_ok=True)
    (full_top_out/'laminas'/'README.md').write_text('\n'.join(sheets).replace('# Láminas de los 180 iconos','# Láminas de los 180 iconos cenitales',1),encoding='utf-8')
    (full_top_out/'README.md').write_text('''# GordoStage — 180 iconos cenitales

**180 conceptos, 360 SVG independientes, 14 categorías.** Colección completa en el estilo de la referencia de 20 aprobada. Cada diseño tiene una variante para fondos claros y otra para fondos oscuros, ambas con fondo transparente y exactamente la misma geometría.

- [SVG claros](claro/) · [SVG oscuros](oscuro/)
- [Inventario con enlaces a cada icono](INVENTARIO.md) · [Metadatos JSON](catalogo.json)
- [Láminas de las 14 categorías](laminas/)
- [Lámina completa clara](laminas/catalogo-claro.png) · [Lámina completa oscura](laminas/catalogo-oscuro.png)
- [Descargar ZIP cenital completo](../gordostage-180-cenitales-claro-oscuro.zip)
- [Colección en la vista original](../familia-gordostage-v1/) · [Referencia de 20 aprobada](../cenital-20/)

Extrae el ZIP y abre `index.html` para buscar, filtrar categorías, cambiar de tema y comparar tamaños de 32, 48, 64 y 116 px. El catálogo usa archivos locales y no requiere instalar la aplicación ni levantar un servidor.

## Vista superior

Los equipos y el mobiliario muestran la superficie superior y el contorno de su posición: asas y ventilación de amplificadores, rejillas y orientación de monitores, proyección de pies y brazos, teclas y controles, mesas, sillas y puestos de trabajo. La batería combina parches y platos circulares con el cuerpo del bombo visto desde arriba. En los músicos se ven cabeza, hombros, brazos y el instrumento o la superficie de trabajo; la orientación principal apunta hacia la parte inferior del dibujo.

Los instrumentos portátiles —guitarras, cuerdas frotadas, vientos y pequeños accesorios— se representan apoyados horizontalmente, con su cara útil hacia arriba, siguiendo la muestra aprobada. Esta convención no representa un instrumento vertical ni las dimensiones de su soporte. Las marcas de centro, notas, zonas y fuentes genéricas son símbolos funcionales planos.

Los dibujos son esquemáticos y **no están a escala física**. Los SVG tienen vista de 100 × 100, geometría editable y trazos redondeados; no contienen imágenes incrustadas, fuentes, scripts ni referencias remotas. Paleta: carbón/marfil, naranja y azul.

![Batería y percusión cenital, variante clara](laminas/claro-bateria-y-percusion.png)

![Puestos de producción cenitales, variante oscura](laminas/oscuro-produccion-rf-y-video.png)

## Inventario y relación entre vistas

Se conservan los mismos identificadores, nombres, categorías y números de los 180 diseños de la vista original: 173 del inventario inicial más cencerro, XLR, TRS, RJ45, PowerCON, cabeza móvil y barra LED. Los 20 diseños cenitales aprobados están incluidos sin cambiar sus SVG. Cada archivo corresponde al mismo concepto en ambas colecciones.

La colección completa está publicada como recurso gráfico; la biblioteca activa de la aplicación mantiene su integración actual.

## Regenerar y comprobar

Desde la raíz del repositorio, con Python 3, Node.js, las dependencias de desarrollo y Chromium:

```sh
python3 scripts/generate-icon-sample.py
node scripts/render-icon-sample.mjs
```

Para regenerar solo las láminas y el ZIP cenital completo tras generar los SVG:

```sh
node scripts/render-icon-sample.mjs --pack=cenital
```

La comprobación revisa los 180 identificadores, la lectura de los 360 SVG, el margen de los dibujos, geometrías distintas entre conceptos, equivalencia entre claro/oscuro y conservación de los 20 aprobados. También ejercita los controles del catálogo y su vista móvil. La navegación directa a `file://` está bloqueada en el Chromium administrado del entorno; las pruebas funcionales se ejecutan por HTTP local. Usa `CHROMIUM_PATH` si Chromium no está en `/usr/bin/chromium`.
''',encoding='utf-8')
    print(json.dumps(dict(designs=len(inventory),svgFiles=len(inventory)*2,categories=len(categories),output=str(OUT)),ensure_ascii=False))
    print(json.dumps(dict(cenitalDesigns=20,cenitalSvgFiles=40,output=str(top_out)),ensure_ascii=False))
    print(json.dumps(dict(cenitalDesigns=180,cenitalSvgFiles=360,output=str(full_top_out)),ensure_ascii=False))

if __name__=='__main__':main()
