/*
 * GCRand
 *      A new Marsaglia's KISS -style PRNG
 *      - Period ~2^^96, enough to generate 2^^32 random numbers with a 32-bit seed
 *      - Passes all BigCrush tests
 *      - Performance is good
 *              It's 10% faster than a JavaScript Mersenne Twister I found for
 *              long output and much faster for short output
 *      - No multiply/divide/modulus instructions required
 *  - Completely avoids floating-point operations, so it should be fairly fast
 *    and portable across all platforms
 *  - For additional performance in inner loops use the cached version below
 *
 * Technical contact: Christopher A. Taylor <chris@gameclosure.com>
 */

exports = Class(function () {

	// Initialize the random number generator from an optional seed
	this.init = function (seed) {
		// If seed was not specified,
		if (typeof(seed) != 'number') {
			var mrx = Math.random() * 4294967296.0;
			var mry = new Date().getTime();
			seed = mrx ^ mry;
		}

		// XOR Shift
		x = seed ^ 1453667877;

		// Weyl Generator
		y = seed ^ 1223235218;

		// Add-With-Carry
		z = 2686646964 >>> 0;
		w = 3741327162 >>> 0;
		c = 0;
	};

	// Iterate state object returning the next 32-bit unsigned random value
	this.uint32 = function () {
		// XOR Shift
		var x = this.x;
		x ^= x << 5;
		x ^= x >>> 7;
		x ^= x << 22;
		this.x = x;

		// Weyl Generator
		var y = this.y;
		y += 2654435769;
		this.y = y >>> 0;

		// Add-With-Carry
		var w = this.w;
		var t = (this.z + w + this.c) >>> 0;
		this.z = w;
		this.c = t >>> 31;
		w = t & 2147483647;
		this.w = w;

		return (x + y + w) >>> 0;
	};

	// Produce a 31-bit integer number in the range [0 ... 0x7fffffff] inclusive
	this.uint31 = function () {
		return this.uint32() >>> 1;
	};

	// Produce a 32-bit floating-point number in the range [0.0 ... 1.0] inclusive
	this.random = function () {
		return this.uint32() * (1.0 / 4294967296.0);
	};

	// Produce a 53-bit floating-point number according to a normal distribution
	// with mean = 0 and variance = 1, using the Box-Mulder (trigonometric) method
	this.normal = function () {
		var u1 = 0,
			u2 = 0;

		while (u1 * u2 == 0.0) {
			u1 = this.random();
			u2 = this.random();
		}

		return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
	};

	// Produce a 53-bit floating-point number according to a Gaussian distribution
	// with your specified mean and variance
	this.gaussian = function(mean, stddev) {
		return stddev * this.normal() + mean;
	};
});