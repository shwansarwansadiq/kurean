# Original instrumental loops for Kurean's scenery stories. Composed in code, so Kurean owns them outright.
import numpy as np, sys
from scipy.signal import butter, lfilter, fftconvolve
from scipy.io import wavfile

SR = 44100
rng = np.random.default_rng(7)

def note(n):  # MIDI number -> Hz
    return 440.0 * 2 ** ((n - 69) / 12)

def env(n, a, d, s, r, sustain_len):
    a, d, r = int(a*SR), int(d*SR), int(r*SR); sl = max(0, int(sustain_len*SR) - a - d)
    return np.concatenate([np.linspace(0,1,a,False), np.linspace(1,s,d,False), np.full(sl, s), np.linspace(s,0,r)])[:n] if n else None

def lowpass(x, fc, order=2):
    b, a = butter(order, fc/(SR/2), 'low'); return lfilter(b, a, x)
def highpass(x, fc, order=2):
    b, a = butter(order, fc/(SR/2), 'high'); return lfilter(b, a, x)

def pluck(f, dur, bright=0.5):  # Karplus-Strong: a gayageum-like plucked string
    n = int(dur*SR); N = max(2, int(SR/f))
    buf = rng.uniform(-1, 1, N); buf = lowpass(buf, 2000 + 6000*bright)
    out = np.zeros(n)
    for i in range(n):
        out[i] = buf[i % N]
        buf[i % N] = 0.996 * 0.5 * (buf[i % N] + buf[(i+1) % N])
    # a little pitch bend at the attack, like a gayageum pressed string
    return out * np.exp(-np.arange(n)/SR*1.6)

def bell(f, dur, decay=2.2):  # kalimba / soft bell
    t = np.arange(int(dur*SR))/SR
    x = np.sin(2*np.pi*f*t) + 0.35*np.sin(2*np.pi*f*2.76*t)*np.exp(-t*6) + 0.15*np.sin(2*np.pi*f*5.4*t)*np.exp(-t*10)
    return x * np.exp(-t*decay) * np.minimum(1, t*400)

def ep(f, dur):  # electric-piano-ish chord tone with gentle tremolo
    t = np.arange(int(dur*SR))/SR
    x = np.sin(2*np.pi*f*t) + 0.25*np.sin(2*np.pi*2*f*t) + 0.08*np.sin(2*np.pi*3*f*t)
    return x * np.exp(-t*0.9) * (1 + 0.12*np.sin(2*np.pi*4.5*t)) * np.minimum(1, t*200)

def pad(freqs, dur, fc=1400):  # warm detuned pad
    t = np.arange(int(dur*SR))/SR; x = np.zeros_like(t)
    for f in freqs:
        for det in (-0.12, 0, 0.11):
            ph = rng.uniform(0, 2*np.pi)
            x += 2*((f*(1+det/100)*t + ph/(2*np.pi)) % 1) - 1
    x = lowpass(x, fc, 2) / (len(freqs)*3)
    a = np.minimum(1, t/1.2); r = np.minimum(1, (dur - t)/1.0)
    return x * a * np.clip(r, 0, 1)

def kick(dur=0.4):
    t = np.arange(int(dur*SR))/SR; f = 50 + 70*np.exp(-t*30)
    return np.sin(2*np.pi*np.cumsum(f)/SR) * np.exp(-t*9)
def hat(dur=0.06):
    n = int(dur*SR); return highpass(rng.normal(0,1,n), 7000) * np.exp(-np.arange(n)/SR*60) * 0.25
def brush(dur=0.18):
    n = int(dur*SR); return lowpass(highpass(rng.normal(0,1,n), 1500), 6000) * np.exp(-np.arange(n)/SR*18) * 0.35

def place(track, x, at, gain=1.0):
    i = int(at*SR); j = min(len(track), i+len(x)); track[i:j] += x[:j-i]*gain

def reverb(x, seconds=1.8, mix=0.25):
    n = int(seconds*SR); ir = rng.normal(0,1,n) * np.exp(-np.arange(n)/SR*3.2); ir = lowpass(ir, 5000)
    ir /= np.sqrt((ir**2).sum())
    wet = fftconvolve(x, ir)[:len(x)]
    return (1-mix)*x + mix*wet

def master(x, length):
    x = x[:int(length*SR)]
    t = np.arange(len(x))/SR
    x = x * np.minimum(1, t/0.6) * np.clip((length - t)/1.2, 0, 1)   # fade in / fade out
    x = np.tanh(x / (np.max(np.abs(x))+1e-9) * 1.2) * 0.82
    return x

L = 12.0
PENTA = [0, 2, 4, 7, 9]  # major pentatonic, the colour of Korean folk melody

def scale(root, octaves=2):
    return [root + 12*o + s for o in range(octaves) for s in PENTA]

def han_river():  # 84 bpm, gayageum plucks over a warm pad
    beat = 60/84; x = np.zeros(int((L+3)*SR)); sc = scale(62)  # D pentatonic
    for c, (start, chord) in enumerate([(0, [50, 57, 62, 66]), (beat*8, [47, 54, 59, 62]), (beat*16, [55, 62, 67, 71])]):
        place(x, pad([note(n) for n in chord], beat*8+1.0, 1100), start, 0.55)
    melody = [0, 2, 4, 3, 2, 4, 5, 7, 6, 4, 3, 2, 1, 2, 4, 0]
    for i, m in enumerate(melody):
        if i % 4 == 3 and rng.random() < 0.4: continue
        place(x, pluck(note(sc[m]), 2.2, 0.6), i*beat*0.75 + 0.3, 0.9)
    return master(reverb(x, 2.2, 0.3), L)

def jeju_breeze():  # 76 bpm, airy pad and bell arpeggio
    beat = 60/76; x = np.zeros(int((L+3)*SR)); sc = scale(69)  # A pentatonic
    for start, chord in [(0, [57, 64, 69, 73]), (beat*8, [54, 61, 66, 69])]:
        place(x, pad([note(n) for n in chord], beat*8+1.2, 1600), start, 0.6)
    arp = [0, 2, 4, 7, 9, 7, 4, 2]
    for i in range(int(L/(beat/2))):
        place(x, bell(note(sc[arp[i % 8]] + (12 if i % 16 >= 8 else 0)), 1.6, 2.6), i*beat/2 + 0.2, 0.32)
    return master(reverb(x, 2.6, 0.35), L)

def seoul_night():  # 80 bpm lo-fi: soft drums, electric piano chords
    beat = 60/80; x = np.zeros(int((L+3)*SR))
    chords = [[62, 65, 69, 72], [60, 64, 67, 71], [58, 62, 65, 69], [57, 60, 64, 67]]  # Dm9-ish wander
    for b in range(int(L/beat)):
        if b % 2 == 0: place(x, kick(), b*beat, 0.55)
        if b % 2 == 1: place(x, brush(), b*beat, 0.6)
        place(x, hat(), b*beat + beat/2, 0.5)
    for c in range(4):
        for n in chords[c]:
            place(x, ep(note(n), beat*4 + 0.6), c*beat*4 + (0.02 if n % 2 else 0), 0.22)
    bass = [50, 48, 46, 45]
    for c in range(4):
        place(x, lowpass(ep(note(bass[c]-12), beat*4), 400), c*beat*4, 0.5)
    x = lowpass(x, 5200)  # the lo-fi dullness
    return master(reverb(x, 1.4, 0.18), L)

def blossom():  # 92 bpm, bright kalimba with a light pulse
    beat = 60/92; x = np.zeros(int((L+3)*SR)); sc = scale(67)  # G pentatonic
    for start, chord in [(0, [55, 62, 67, 71]), (beat*8, [52, 59, 64, 67]), (beat*16, [60, 67, 72, 76])]:
        place(x, pad([note(n) for n in chord], beat*8+0.8, 1800), start, 0.4)
    pattern = [0, 4, 7, 4, 2, 4, 9, 7, 5, 4, 2, 4, 7, 9, 7, 4]
    for i in range(int(L/(beat/2))):
        place(x, bell(note(sc[pattern[i % 16]]), 1.2, 3.4), i*beat/2 + 0.1, 0.38)
        if i % 4 == 0: place(x, kick(0.3), i*beat/2 + 0.1, 0.25)
    return master(reverb(x, 1.8, 0.25), L)

out = sys.argv[1]
for name, fn in [("han-river", han_river), ("jeju-breeze", jeju_breeze), ("seoul-night", seoul_night), ("blossom", blossom)]:
    y = fn(); st = np.stack([y, np.roll(y, int(0.012*SR))*0.96], axis=1)  # a touch of stereo width
    wavfile.write(f"{out}/{name}.wav", SR, (st*32767).astype(np.int16)); print(name, len(y)/SR)
