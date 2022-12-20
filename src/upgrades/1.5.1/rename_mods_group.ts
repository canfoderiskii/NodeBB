'use strict';

import async from 'async';
import winston from 'winston';
import * as batch from '../../batch';
import groups from '../../groups';




export const obj = {
	name: 'rename user mod privileges group',
	timestamp: Date.UTC(2017, 4, 26),
	method: function (callback) {
		const { progress } = this;
		batch.processSortedSet('categories:cid', (cids, next) => {
			async.eachSeries(cids, (cid, next) => {
				const groupName = `cid:${cid}:privileges:mods`;
				const newName = `cid:${cid}:privileges:moderate`;
				groups.exists(groupName, (err, exists) => {
					if (err || !exists) {
						progress.incr();
						return next(err);
					}
					winston.verbose(`renaming ${groupName} to ${newName}`);
					progress.incr();
					groups.renameGroup(groupName, newName, next);
				});
			}, next);
		}, {
			progress: progress,
		}, callback);
	},
};
