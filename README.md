Metronome.js
============
An attempt to implement ***rock-solid timing for audio applications*** based on this [metronome] (https://github.com/cwilso/metronome) and the associated article [A Tale of Two Clocks - Scheduling Web Audio with Precision] (http://www.html5rocks.com/en/tutorials/audio/scheduling/). 
In accordance with the following [pull request] (https://github.com/cwilso/metronome/pull/1) on the original script, this metronome use a ***Web Worker*** to avoid setTimeout throttle in inactive tabs.

---

##[Live Demo](http://www.onlfait.ch/Metronome.js/)

---

Documentation
=============
Start by creating a new Metronome instance, all parameters are optional :

`var metronome = new Metronome(parameters);`

Parameters
----------
- **tempo** [integer] [tempo](http://en.wikipedia.org/wiki/Tempo) (BPM), _default = 90_
- **timeSignature** [string] [time signature](http://en.wikipedia.org/wiki/Time_signature), _default = '4/4'_
- **timeout** [integer] how frequently to call scheduler (ms), _default = 25_
- **lookahead** [float] how far ahead to schedule audio (sec), _default = 0.1_
- **workerURI** [string] the worker URI, _default = 'js/metronome/worker.js'_
- **context** [AudioContext] an AudioContext for time reference
- **syncWith** [Metronome] an Metronome to sync with
- **cloneFrom** [Metronome] an Metronome to clone from
- **sheduler** [function(beats, time)] callback to shedule audio events
- **draw** [function(beats, bars)] callback to draw on audio events
- **onTempoChange** [function(newValue)] called after the tempo have changed
- **onTimeSignatureChange** [function(newValue)] called after the time signature have changed

Methodes
--------
- **play()** [void] start playing
- **pause()** [void] pause playing, restart playing on next beat, not at paused time
- **reset()** [void] reset all counters
- **stop()** [void] stop playing
- **isPlaying()** [boolean] return if is playing
- **tempo()** [integer] get tempo
- **tempo(tempo)** [void] set tempo
  - **tempo** [integer] [tempo](http://en.wikipedia.org/wiki/Tempo) (BPM)
- **timeSignature()** [string] get time signature
- **timeSignature(timeSignature)** [void] set time signature
  - **timeSignature** [string] [time signature](http://en.wikipedia.org/wiki/Time_signature)
- **timeout()** [integer] get sheduler timeout
- **timeout(timeout)** [void] set sheduler timeout
  - **timeout** [integer] how frequently to call scheduler (ms)
- **lookahead()** [float] get sheduler lookahead
- **lookahead(lookahead)** [void] set sheduler lookahead
  - **lookahead** [float] how far ahead to schedule audio (sec)
- **context()** [AudioContext] get audio context
- **context(context)** [void] set audio context
  - **context** [AudioContext] an AudioContext for time reference
- **sync(metronome, simple)** [void] sync this metronome with another
  - **metronome** [integer] an Metronome to sync with, or NULL to unsync
  - **simple** [integer] juste sync on next beat
- **clone(metronome)** [void] clone this metronome from another
  - **metronome** [Metronome] an Metronome to clone from
- **sheduler(beats, time)** [void] called before each beat
  - **beats** [integer] beat number
  - **time** [float] beat time
- **draw(beats, bars)** [void] called after each beat
  - **beats** [integer] beat number
  - **bars** [integer] bars number
- **onTempoChange(newValue)** [void] called after the tempo have changed
  - **newValue** [integer] new tempo
- **onTimeSignatureChange(newValue)** [void] called after the time signature have changed
  - **newValue** [integer] new time signature

Example
======
Create a Metronome instance with an AudioContext provided.
```javascript
var audioContext = new window.AudioContext();
```
```javascript
var metronome = new Metronome({
    timeSignature : '4/4',
    tempo         : 90,
    context       : audioContext
});
```

Or let Metronome.js create an AudioContext for you and retrieve it later.
```javascript
var metronome = new Metronome({
    timeSignature : '4/4',
    tempo         : 90
});

var audioContext = metronome.context();
```

Basic sheduler callback implementation, play a sound on each beat (high, low, low, low).
```javascript
metronome.sheduler = function(beats, time) { 
    // create an oscillator
    var o = audioContext.createOscillator();
    
    // high tone on first beat, low tone on others
    o.frequency.value = beats == 1 ? 440 : 220;
    
    // connect to destination
    o.connect(audioContext.destination);
    
    // shedule start/stop time
    o.start(time);
    o.stop(time + 0.05);
};
```

Basic drawing callback implementation, juste log in console the current beats/bars.
```javascript
metronome.draw = function(beats, bars) {
    console.log('beat:', beats, '/', bars);
};
```

And finally, start playing.
```javascript
metronome.play();
```
