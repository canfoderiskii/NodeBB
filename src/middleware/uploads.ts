'use strict';

import cacheCreate from '../cache/ttl';
import meta from '../meta';
import helpers from './helpers';
import user from '../user';

const cache = cacheCreate({
	ttl: meta.config.uploadRateLimitCooldown * 1000,
});

export const clearCache = function () {
	cache.clear();
};

export const ratelimit = helpers.try(async (req, res, next) => {
	const { uid } = req;
	if (!meta.config.uploadRateLimitThreshold || (uid && await user.isAdminOrGlobalMod(uid))) {
		return next();
	}

	const count = (cache.get(`${req.ip}:uploaded_file_count`) || 0) + req.files.files.length;
	if (count > meta.config.uploadRateLimitThreshold) {
		return next(new Error(['[[error:upload-ratelimit-reached]]'] as any));
	}
	cache.set(`${req.ip}:uploaded_file_count`, count);
	next();
});

