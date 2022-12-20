
'use strict';

import util from 'util';

import db from './database';

import utils from './utils';
import promisify from './promisify';


const DEFAULT_BATCH_SIZE = 100;

const sleep = util.promisify(setTimeout);

export const processSortedSet = async function (setKey, process, options , callback?) {
	options = options || {};

	if (typeof process !== 'function') {
		throw new Error('[[error:process-not-a-function]]');
	}

	// Progress bar handling (upgrade scripts)
	if (options.progress) {
		options.progress.total = await db.sortedSetCard(setKey);
	}

	options.batch = options.batch || DEFAULT_BATCH_SIZE;

	// use the fast path if possible
	if (db.processSortedSet && typeof options.doneIf !== 'function' && !utils.isNumber(options.alwaysStartAt)) {
		return await db.processSortedSet(setKey, process, options);
	}

	// custom done condition
	options.doneIf = typeof options.doneIf === 'function' ? options.doneIf : function () {};

	let start = 0;
	let stop = options.batch - 1;

	if (process && (process as any).constructor && (process as any).constructor.name !== 'AsyncFunction') {
		process = util.promisify(process);
	}

	while (true) {
		/* eslint-disable no-await-in-loop */
		const ids = await db[`getSortedSetRange${options.withScores ? 'WithScores' : ''}`](setKey, start, stop);
		if (!ids.length || options.doneIf(start, stop, ids)) {
			return;
		}
		await process(ids);

		start += utils.isNumber(options.alwaysStartAt) ? options.alwaysStartAt : options.batch;
		stop = start + options.batch - 1;

		if (options.interval) {
			await sleep(options.interval);
		}
	}
};

export const processArray = async function (array, process, options) {
	options = options || {};

	if (!Array.isArray(array) || !array.length) {
		return;
	}
	if (typeof process !== 'function') {
		throw new Error('[[error:process-not-a-function]]');
	}

	const batch = options.batch || DEFAULT_BATCH_SIZE;
	let start = 0;
	if (process && (process as any).constructor && (process as any).constructor.name !== 'AsyncFunction') {
		process = util.promisify(process);
	}

	while (true) {
		const currentBatch = array.slice(start, start + batch);

		if (!currentBatch.length) {
			return;
		}

		await process(currentBatch);

		start += batch;

		if (options.interval) {
			await sleep(options.interval);
		}
	}
};

promisify({ processArray });
promisify({ processSortedSet });