'use strict';

import db from '../../database';
import user from '../../user';
import meta from '../../meta';
import * as batch from '../../batch';


export const obj = {
	name: 'Update global and user language keys',
	timestamp: Date.UTC(2016, 10, 22),
	method: async function () {
		const { progress } = this;
		const defaultLang = await meta.configs.get('defaultLang');
		if (defaultLang) {
			const newLanguage = defaultLang.replace('_', '-').replace('@', '-x-');
			if (newLanguage !== defaultLang) {
				await meta.configs.set('defaultLang', newLanguage);
			}
		}

		await batch.processSortedSet('users:joindate', async (ids) => {
			await Promise.all(ids.map(async (uid) => {
				progress.incr();
				const language = await db.getObjectField(`user:${uid}:settings`, 'userLang');
				if (language) {
					const newLanguage = language.replace('_', '-').replace('@', '-x-');
					if (newLanguage !== language) {
						await user.setSetting(uid, 'userLang', newLanguage);
					}
				}
			}));
		}, {
			progress: progress,
		});
	},
};
