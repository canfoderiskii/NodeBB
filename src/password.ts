'use strict';

import path from 'path';
import crypto from 'crypto';
import util from 'util';

import bcrypt from 'bcryptjs';

import fork from './meta/debugFork';

function forkChild(message, callback) {
	const child = fork(path.join(__dirname, 'password'));

	child.on('message', (msg: any) => {
		callback(msg.err ? new Error(msg.err) : null, msg.result);
	});
	child.on('error', (err) => {
		console.error(err.stack);
		callback(err);
	});

	child.send(message);
}

const forkChildAsync = util.promisify(forkChild);

export const hash = async function (rounds, password) {
	password = crypto.createHash('sha512').update(password).digest('hex');
	return await forkChildAsync({ type: 'hash', rounds: rounds, password: password });
};

export const compareFn = async function (password, hash, shaWrapped) {
	const fakeHash = await getFakeHash();

	if (shaWrapped) {
		password = crypto.createHash('sha512').update(password).digest('hex');
	}

	return await forkChildAsync({ type: 'compare', password: password, hash: hash || fakeHash });
};

let fakeHashCache;
async function getFakeHash() {
	if (fakeHashCache) {
		return fakeHashCache;
	}
	fakeHashCache = await hash(12, Math.random().toString());
	return fakeHashCache;
}

// child process
(process as any).on('message', (msg) => {
	if (msg.type === 'hash') {
		tryMethod(hashPassword, msg);
	} else if (msg.type === 'compare') {
		tryMethod(compare, msg);
	}
});

async function tryMethod(method, msg) {
	try {
		const result = await method(msg);
		(process as any).send({ result: result });
	} catch (err: any) {
		(process as any).send({ err: err.message });
	} finally {
		(process as any).disconnect();
	}
}

async function hashPassword(msg) {
	const salt = await bcrypt.genSalt(parseInt(msg.rounds, 10));
	const hash = await bcrypt.hash(msg.password, salt);
	return hash;
}

async function compare(msg) {
	return await bcrypt.compare(String(msg.password || ''), String(msg.hash || ''));
}

import promisify from './promisify';
promisify(exports);
