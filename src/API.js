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

// Import this before importing GC
// _api.client.init sets up the GC object for the client apis

import lib.PubSub;
import lib.Callback;
import std.uri as URI;
import ui.Engine;
import ui.View;
import ui.StackView;

import device;

if (device.simulatingMobileNative) {
	jsio('import .debugging.nativeShim');
}

if (!GLOBAL.CONFIG) { GLOBAL.CONFIG = {}; }
if (!GLOBAL.DEBUG) { GLOBAL.DEBUG = false; }

exports = Class(lib.PubSub, function() {

	var ua = navigator.userAgent;
	this.isNative = /TeaLeaf/.test(ua);
	if (this.isNative) {
		this.isIOS = /iPhone OS/.test(ua);
		this.isAndroid = /Android/.test(ua);
	} else if (/(iPod|iPhone|iPad)/i.test(ua)) {
		this.isMobileBrowser = true;
		this.isIOS = true;
		this.isUIWebView = !/Safari/.test(ua);
	} else if (/Android/.test(ua)) {
		this.isMobileBrowser = true;
		this.isAndroid = true;
	} else {
		this.isDesktop = true;
		this.isFacebook = GLOBAL.CONFIG.isFacebookApp;
	}

	this.init = function (opts) {
		if (DEBUG) {
			if (GLOBAL.window && window.top) {
				try {
					window.top.GC = GLOBAL.GC;
				} catch (e) {
					//window.top is read-only in firefox
				}
			}
		}

		if (GLOBAL.ADDON_SOCIAL && ADDON_SOCIAL) {
			jsio("import GCSocial.GCSocial", {suppressErrors: true});
			this.social = GCSocial.GCSocial;
			
			GLOBAL.gcsocial = this.social; // deprecated

			this.social.init({
				appID: GLOBAL.CONFIG.appID,
				shortName: GLOBAL.CONFIG.shortName,
				inviteURLTemplate: GLOBAL.CONFIG.inviteURLTemplate,
				endpoint: GLOBAL.CONFIG.servicesURL,
			});

			this.track = gcsocial.tracker;
		}

		window.addEventListener('pageshow', bind(this, '_onShow'), false);

		window.addEventListener('pagehide', bind(this, '_onHide'), false);

		this.isOnline = navigator.onLine;

		window.addEventListener('online', bind(this, function() {
			if (!this.isOnline) {
				this.isOnline = true;
				this.publish('OnlineStateChanged', true);
			}
		}), false);

		window.addEventListener('offline', bind(this, function() {
			if (this.isOnline) {
				this.isOnline = false;
				this.publish('OnlineStateChanged', false);
			}
		}), false);

		// var uri = new URI(window.location);
		// var campaign = uri.query('campaign') || "NO CAMPAIGN";
		//
		// XXX: The following lines cause a DOMException in some browsers
		// because we're using a <base> tag, which doesn't resolve the URL relative correctly.
		//get rid of it in case the game uses something
		// if (window.history && window.history.replaceState) {
		// 	history.replaceState(null, null, uri.toString().replace("?campaign=" + campaign, ""));
		// }
		//
		// if (!localStorage.getItem("campaignID")) {
		// 	localStorage.setItem("campaignID", campaign)
		// }


		if (CONFIG.version) {
			logger.log('Version', CONFIG.version);
		}
	}

	GLOBAL.GC = new this.constructor();

	GC.Application = ui.StackView;

	// this.track({
	// 	name: "campaignID",
	// 	category: "campaign",
	// 	subcategory: "id",
	// 	data: campaign
	// });

	import .UI;
	GC.ui = new UI();

	// import .OverlayAPI;
	// GC.overlay = new OverlayAPI(this.env);

	try {
		var map = JSON.parse(GLOBAL.CACHE['spritesheets/map.json']);
	} catch (e) {
		logger.warn("spritesheet map failed to parse", e);
	}
		
	import ui.resource.loader;
	GC.resources = ui.resource.loader;
	GC.resources.setMap(map);

	if (GC.env == 'browser') { setTimeout(bind(this, '_onShow'), 0); }

	this._onHide = function() {
		// signal to the app that the window is going away
		this.app && this.app.onPause && this.app.onPause();

		this.publish('Hide');
		this.publish('AfterHide');

		if (this.tracker) {
			this.tracker.endSession();
		}
	};

	this._onShow = function() {
		this.app && this.app.onResume && this.app.onResume();

		this.publish('Show');
		this.publish('AfterShow');
	}

	this.buildApp = function(entry) {
		jsio("import src.Application as Application");

		Application.prototype.__root = true;
		var app = this.app = new Application();

		if (!(app instanceof ui.View)) {
			throw "src/Application.js must export a Class that inherits from ui.View";
		}

		app.subscribe('onLoadError', this, '_onAppLoadError');

		if (!entry) { entry = 'launchUI'; }

		var launch;
		if (typeof app[entry] == 'function') {
			launch = bind(app, entry);
		}

		app.view = app; // legacy, deprecated
		app.engine = new ui.Engine({view: app});
		app.engine.show();
		app.engine.startLoop();

		try {

			app.initUI && app.initUI();

			var settings = app._settings || {};
			var preload = settings.preload;
			var autoHide = CONFIG.preload && (CONFIG.preload.autoHide !== false);
			if (preload && preload.length) {
				var cb = new lib.Callback();
				for (var i = 0, group; group = preload[i]; ++i) {
					GC.resources.preload(group, cb.chain());
				}
				
				// note that hidePreloader takes a null cb argument to avoid
				// forwarding the preloader result as the callback
				if (autoHide) { cb.run(GC, 'hidePreloader', null); }
				if (launch) { cb.run(launch); }
			} else {
				if (autoHide) { GC.hidePreloader(); }
				launch && launch();
			}
		} catch(error) {
			this._onAppLoadError(error);
			throw error;
		}

		return this.app;
	};

	this._onAppLoadError = function(error) {
		logger.error('encountered error when creating src Application: ', JSON.stringify(error));
		var preloader = CONFIG.preload;
		if(preloader && preloader.onAppLoadError) {
			preloader.onAppLoadError(error);
		}
	};

	this.hidePreloader = function(cb) {
		var preloader = CONFIG.preload;
		if (preloader && preloader.hide && !preloader.hidden) {
			preloader.hide(cb);
			preloader.hidden = true;
		} else {
			cb && cb();
		}
	};
});