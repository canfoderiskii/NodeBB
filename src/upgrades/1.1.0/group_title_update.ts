'use strict';


import async from 'async';
import winston from 'winston';
import db from '../../database';
import user from '../../user';
import * as batch from '../../batch';

export const obj = {
	name: 'Group title from settings to user profile',
	timestamp: Date.UTC(2016, 3, 14),
	method: function (callback) {

		let count = 0;
		batch.processSortedSet('users:joindate', (uids, next) => {
			winston.verbose(`upgraded ${count} users`);
			user.getMultipleUserSettings(uids, (err, settings) => {
				if (err) {
					return next(err);
				}
				count += uids.length;
				settings = settings.filter(setting => setting && setting.groupTitle);

				async.each(settings, (setting, next) => {
					db.setObjectField(`user:${setting.uid}`, 'groupTitle', setting.groupTitle, next);
				}, next);
			});
		}, {}, callback);
	},
};
