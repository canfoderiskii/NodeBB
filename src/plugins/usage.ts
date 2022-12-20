'use strict';

import nconf from 'nconf';
import request from 'request';
import winston from 'winston';
import crypto from 'crypto';
import {  CronJob } from 'cron';
const cronJob = CronJob;
//@ts-ignore
import pkg from '../../package.json';
import meta from '../meta';

export default function (Plugins) {
	Plugins.startJobs = function () {
		new cronJob('0 0 0 * * *', (() => {
			Plugins.submitUsageData();
		}), null, true);
	};

	Plugins.submitUsageData = function (callback) {
		callback = callback || function () {};
		if (!meta.config.submitPluginUsage || !Plugins.loadedPlugins.length || (global as any).env !== 'production') {
			return callback();
		}

		const hash = crypto.createHash('sha256');
		hash.update(nconf.get('url'));
		request.post(`${nconf.get('registry') || 'https://packages.nodebb.org'}/api/v1/plugin/usage`, {
			form: {
				id: hash.digest('hex'),
				version: pkg.version,
				plugins: Plugins.loadedPlugins,
			},
			timeout: 5000,
		}, (err, res, body) => {
			if (err) {
				winston.error(err.stack);
				return callback(err);
			}
			if (res.statusCode !== 200) {
				winston.error(`[plugins.submitUsageData] received ${res.statusCode} ${body}`);
				callback(new Error(`[[error:nbbpm-${res.statusCode}]]`));
			} else {
				callback();
			}
		});
	};
};
