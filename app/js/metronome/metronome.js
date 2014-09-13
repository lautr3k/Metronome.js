/*
The MIT License (MIT)

Copyright (c) 2014 Sébastien Mischler (skarab)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

(function (window) {
    /** Metronome constructor */
    function Metronome(params) {
        // force instanciation
        if (! (this instanceof Metronome)) {
            return new Metronome(params);
        }

        // init parameters
        params = params || {};

        this._context       = (params.context || new window.AudioContext());
        this._tempo         = 90;
        this._timeSignature = '4/4';
        this._beatsPerBar   = 4;
        this._beatValue     = 4;
        this._beatDuration  = 0.6666666666666666;
        this._playing       = false;
        this._worker        = null;
        this._workerURI     = params.workerURI || 'js/metronome/worker.js';
        this._timeout       = params.timeout || 25;
        this._lookahead     = params.lookahead || 0.1;
        this._nextBeatTime  = 0;
        this._beatsCount    = 0;
        this._barsCount     = 0;
        this._nextBeat      = 1;
        this._firstBeat     = true;
        this._beatsQueue    = [];
        this.sheduler       = params.sheduler || this.sheduler;
        this.draw           = params.draw || null;

        params.tempo && this.tempo(params.tempo);
        params.timeSignature && this.timeSignature(params.timeSignature);
    }

    /** set/get audio context */
    Metronome.prototype.context = function(context) {
        // getter
        if (! arguments.length) {
            return this._context;
        }

        // setter
        this._context = context;
    };

    // update/calculate beatDuration
    Metronome.prototype._updateBeatDuration = function() {
        this._beatDuration = (60 / this._tempo) / (this._beatValue / 4);
    };

    /** set/get tempo */
    Metronome.prototype.tempo = function(tempo) {
        // getter
        if (! arguments.length) {
            return this._tempo;
        }

        // setter
        this._tempo = tempo;

        // update beat duration
        this._updateBeatDuration();
    };

    /** set/get timeSignature */
    Metronome.prototype.timeSignature = function(timeSignature) {
        // getter
        if (! arguments.length) {
            return this._timeSignature;
        }

        //setter
        this._timeSignature = timeSignature;
        
        // update associed values
        var r = this._timeSignature.split('/', 2);

        this._beatsPerBar = r[0];
        this._beatValue   = r[1];

        this._updateBeatDuration();
    };

    /** set/get sheduler timeout */
    Metronome.prototype.timeout = function(timeout) {
        // getter
        if (! arguments.length) {
            return this._timeout;
        }

        // setter
        this._timeout = timeout;

        // update worker timeout if started
        if (this._playing && this._worker) {
            this._worker.postMessage({
                cmd     : 'update', 
                timeout : this._timeout
            });
        }
    };

    /** set/get sheduler lookahead */
    Metronome.prototype.lookahead = function(lookahead) {
        // getter
        if (! arguments.length) {
            return this._lookahead;
        }

        // setter
        this._lookahead = lookahead;
    };

    /** sheduler (beat number, shedule time) */
    Metronome.prototype.sheduler = function(beats, time) {
        var o = this._context.createOscillator();
        o.frequency.value = beats == 1 ? 440 : 220;
        o.connect(this._context.destination);
        o.start(time);
        o.stop(time + 0.05);
    };

    /** draw on played beat (beat number, bars number) */
    Metronome.prototype.draw = function(beats, bars) {
        // console.log('beat:', beats, '/', bars);
    };

    // internal draw
    Metronome.prototype._draw = function(queue) {
        while(queue.length && queue[0].time < this._context.currentTime)
        {
            // call public drawing callback if defined
            this.draw && this.draw(queue[0].beat, this._barsCount);
            
            // remove first beat from queue
            queue.splice(0, 1);
        }
    };

    // internal sheduler
    Metronome.prototype._sheduler = function() {
        // while next note soon
        while(this._nextBeatTime < this._context.currentTime + this._lookahead)
        {
            // increment beat counters
            this._beatsCount++;

            // is first beat
            this._firstBeat = this._beatsCount % this._beatsPerBar == 1; 
            this._firstBeat = this._firstBeat || this._beatsPerBar == 1;

            // new bar, first beat
            if (this._firstBeat) {
                this._nextBeat = 1;
                this._barsCount++;
            }
            else {
                this._nextBeat++;
            }
            
            // call public sheduler
            this.sheduler(this._nextBeat, this._nextBeatTime);

            // push beat in queue
            this._beatsQueue.push({
                beat : this._nextBeat,
                time : this._nextBeatTime
            });

            // next beat time
            this._nextBeatTime += this._beatDuration;
        }

        // call internal drawing callback
        this._draw(this._beatsQueue);
    };

    /** play metronome */
    Metronome.prototype.play = function() {
        // allready playing
        if (this._playing) return;

        // next beat as soon as possible
        this._nextBeatTime = this._context.currentTime;

        // update status
        this._playing = true;

        // initialize/start timer worker
        this._worker = new Worker(this._workerURI);

        var self = this;

        this._worker.addEventListener('message', function (e) {
            self._sheduler();
        });

        this._worker.postMessage({
            cmd     : 'start', 
            timeout : this._timeout
        });
    };

    /** pause metronome (restart on next beat, not at stop time) */
    Metronome.prototype.pause = function() {
        // not playing
        if (! this._playing) return;

        // stop sheduler
        this._worker.terminate();
        this._worker = undefined;

        // update status
        this._playing = false;
    };

    /** reset metronome */
    Metronome.prototype.reset = function() {
        this._nextBeatTime = this._context.currentTime;
        this._beatsCount   = 0;
        this._barsCount    = 0;
        this._nextBeat     = 1;
        this._firstBeat    = true;
        this._beatsQueue   = [];
    };

    /** stop metronome */
    Metronome.prototype.stop = function() {
        // pause & reset timer
        this.pause();

        // reset counter
        this.reset();
    };

    /** return playing status */
    Metronome.prototype.isPlaying = function() {
        return this._playing;
    };
    
    // export
    window.Metronome = Metronome;

})(this);