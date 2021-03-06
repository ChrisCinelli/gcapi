/* @license
 * This file is part of the Game Closure SDK.
 *
 * The Game Closure SDK is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.

 * The Game Closure SDK is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.

 * You should have received a copy of the GNU General Public License
 * along with the Game Closure SDK.  If not, see <http://www.gnu.org/licenses/>.
 */

var Audio = exports = Class(function () {

	this.init = function (url) {
		this._startedLoad = false;
		this._src = "";
		this.autoplay = false;
		this.preload = "auto";
		this._volume = 1;
		this.loop = false;
		this._startTime = 0;
		this._et = 0;
		if (url) {
			this.src = url;
		}
	};

	this._updateElapsed = function () {
		if (this._startTime > 0) {
			var now = Date.now();
			this._et += (now - this._startTime);
		}
	};

	this.__defineSetter__("src", function (url) {
		logger.log("audio source is ", url);
		this._src = url;

		// wait one frame in case preload gets set
		setTimeout(bind(this, function () {
			if ((this.autoplay || this.preload == "auto") && !this.isBackgroundMusic) {
				this.load();
			}

			if (this.autoplay) {
				this.play();
			}
		}), 0);
	});

	this.__defineGetter__("src", function () {
		return this._src;
	});

	this.__defineSetter__("volume", function(volume) {
		this._volume = volume;
		if (this._startedLoad) {
			NATIVE.sound.setVolume(this._src, volume);
		}
	});

	this.__defineGetter__("currentTime", function() {
		this._updateElapsed();
		return (this._et / 1000) | 0;
	});

	this.__defineSetter__("currentTime", function() {
		logger.log('setting current time not supported');
	});

	this.canPlayType = function (type) {
		return true;
	};

	this.load = function () {
		NATIVE.sound.loadSound(this._src);
		this._startedLoad = true;
	};

	this.play = function () {
		this.paused = false;
		if (this.isBackgroundMusic) {
			NATIVE.sound.playBackgroundMusic(this._src, this._volume, true);
		} else {
			if (!this._startedLoad) {
				this.load();
			}
			NATIVE.sound.playSound(
				this._src,
				this._volume,
				(this.loop === "loop" || this.loop === true)
			);
			this._startTime = Date.now();
		}


		this._startedLoad = true;
	};

	this.pause = function () {
		if (this.paused) { return; }
		this.paused = true;

		if (this._startedLoad) {
			NATIVE.sound.pauseSound(this._src);
			this._updateElapsed();
		}
	};

	this.stop = function() {
		if (this._startedLoad) {
			NATIVE.sound.stopSound(this._src);
		}
		
		this._et = 0;
	};

	this.destroy = function() {
		NATIVE.sound.destroySound(this._src);
	}

});

exports.install = function() {
	GLOBAL.Audio = Audio;
}
