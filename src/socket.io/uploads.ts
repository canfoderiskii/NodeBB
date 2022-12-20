'use strict';

import socketUser from './user';
import socketGroup from './groups';
import image from '../image';
import meta from '../meta';

const inProgress = {};

const uploads = {} as any;

uploads.upload = async function (socket, data) {
	const methodToFunc = {
		'user.uploadCroppedPicture': socketUser.uploadCroppedPicture,
		'user.updateCover': socketUser.updateCover,
		'groups.cover.update': socketGroup.cover.update,
	};
	if (!socket.uid || !data || !data.chunk ||
		!data.params || !data.params.method || !methodToFunc.hasOwnProperty(data.params.method)) {
		throw new Error('[[error:invalid-data]]');
	}

	inProgress[socket.id] = inProgress[socket.id] || Object.create(null);
	const socketUploads = inProgress[socket.id];
	const { method } = data.params;

	socketUploads[method] = socketUploads[method] || { imageData: '' };
	socketUploads[method].imageData += data.chunk;

	try {
		const maxSize = data.params.method === 'user.uploadCroppedPicture' ?
			meta.config.maximumProfileImageSize : meta.config.maximumCoverImageSize;
		const size = image.sizeFromBase64(socketUploads[method].imageData);

		if (size > maxSize * 1024) {
			throw new Error(`[[error:file-too-big, ${maxSize}]]`);
		}
		if (socketUploads[method].imageData.length < data.params.size) {
			return;
		}
		data.params.imageData = socketUploads[method].imageData;
		const result = await methodToFunc[data.params.method](socket, data.params);
		delete socketUploads[method];
		return result;
	} catch (err: any) {
		delete inProgress[socket.id];
		throw err;
	}
};

uploads.clear = function (sid) {
	delete inProgress[sid];
};

export default uploads;
