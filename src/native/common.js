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

exports.install = function(TeaLeaf, hostname) {
    logger.log('installing native support');

	import device;
	import lib.PubSub;
	import .Window;
	import .Document;
	import .localStorage;
	import .events;
	import .launchInfo;
	import .plugins;
	import .screen;
	import .Image;
	Image.install();
	import .XMLHttpRequest;
	XMLHttpRequest.install();
	import .Audio;
	Audio.install();

	import platforms.native.Canvas;

	if(NATIVE.device.native_info) {
		NATIVE.device.info = JSON.parse(NATIVE.device.native_info);
	}

	import .timestep;
	timestep.install();

	// publisher for the overlay UIWebView
	NATIVE.overlay.delegate = new lib.PubSub();
	CONFIG.preload = CONFIG.preload || {};
	var oldHide = CONFIG.preload.hide || function(){};
	CONFIG.preload.hide = function (cb) {
		if (NATIVE.doneLoading instanceof Function) {
			NATIVE.doneLoading();
		}

		if (oldHide instanceof Function) {
			oldHide();
		}

		cb && cb();
	};
}
