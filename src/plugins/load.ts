'use strict';

import semver from 'semver';
import async from 'async';
import winston from 'winston';
import nconf from 'nconf';
import _ from 'lodash';
import meta from '../meta';
import { themeNamePattern } from '../constants';

export default function (Plugins) {
	async function registerPluginAssets(pluginData, fields?) {
		function add(dest, arr) {
			dest.push(...(arr || []));
		}

		const handlers = {
			staticDirs: function (next) {
				Plugins.data.getStaticDirectories(pluginData, next);
			},
			cssFiles: function (next) {
				Plugins.data.getFiles(pluginData, 'css', next);
			},
			scssFiles: function (next) {
				Plugins.data.getFiles(pluginData, 'scss', next);
			},
			acpScssFiles: function (next) {
				Plugins.data.getFiles(pluginData, 'acpScss', next);
			},
			clientScripts: function (next) {
				Plugins.data.getScripts(pluginData, 'client', next);
			},
			acpScripts: function (next) {
				Plugins.data.getScripts(pluginData, 'acp', next);
			},
			modules: function (next) {
				Plugins.data.getModules(pluginData, next);
			},
			languageData: function (next) {
				Plugins.data.getLanguageData(pluginData, next);
			},
		};

		let methods = {};
		if (Array.isArray(fields)) {
			fields.forEach((field) => {
				methods[field] = handlers[field];
			});
		} else {
			methods = handlers;
		}

		const results = await async.parallel(methods);

		Object.assign(Plugins.staticDirs, results.staticDirs || {});
		add(Plugins.cssFiles, results.cssFiles);
		add(Plugins.scssFiles, results.scssFiles);
		add(Plugins.acpScssFiles, results.acpScssFiles);
		add(Plugins.clientScripts, results.clientScripts);
		add(Plugins.acpScripts, results.acpScripts);
		Object.assign(meta.js.scripts.modules, results.modules || {});
		if (results.languageData) {
			Plugins.languageData.languages = _.union(Plugins.languageData.languages, results.languageData.languages);
			Plugins.languageData.namespaces = _.union(Plugins.languageData.namespaces, results.languageData.namespaces);
			pluginData.languageData = results.languageData;
		}
		Plugins.pluginsData[pluginData.id] = pluginData;
	}

	Plugins.prepareForBuild = async function (targets) {
		const map = {
			'plugin static dirs': ['staticDirs'],
			'requirejs modules': ['modules'],
			'client js bundle': ['clientScripts'],
			'admin js bundle': ['acpScripts'],
			'client side styles': ['cssFiles', 'scssFiles'],
			'admin control panel styles': ['cssFiles', 'scssFiles', 'acpScssFiles'],
			languages: ['languageData'],
		};

		const fields = _.uniq(_.flatMap(targets, target => map[target] || []));

		// clear old data before build
		fields.forEach((field) => {
			switch (field) {
				case 'clientScripts':
				case 'acpScripts':
				case 'cssFiles':
				case 'scssFiles':
				case 'acpScssFiles':
					Plugins[field].length = 0;
					break;
				case 'languageData':
					Plugins.languageData.languages = [];
					Plugins.languageData.namespaces = [];
					break;
			// do nothing for modules and staticDirs
			}
		});

		winston.verbose(`[plugins] loading the following fields from plugin data: ${fields.join(', ')}`);
		const plugins = await Plugins.data.getActive();
		await Promise.all(plugins.map(p => registerPluginAssets(p, fields)));
	};

	Plugins.loadPlugin = async function (pluginPath) {
		let pluginData;
		try {
			pluginData = await Plugins.data.loadPluginInfo(pluginPath);
		} catch (err: any) {
			if (err.message === '[[error:parse-error]]') {
				return;
			}
			if (!themeNamePattern.test(pluginPath)) {
				throw err;
			}
			return;
		}
		checkVersion(pluginData);

		try {
			registerHooks(pluginData);
			await registerPluginAssets(pluginData);
		} catch (err: any) {
			winston.error(err.stack);
			winston.verbose(`[plugins] Could not load plugin : ${pluginData.id}`);
			return;
		}

		if (!pluginData.private) {
			Plugins.loadedPlugins.push({
				id: pluginData.id,
				version: pluginData.version,
			});
		}

		winston.verbose(`[plugins] Loaded plugin: ${pluginData.id}`);
	};

	function checkVersion(pluginData) {
		function add() {
			if (!Plugins.versionWarning.includes(pluginData.id)) {
				Plugins.versionWarning.push(pluginData.id);
			}
		}

		if (pluginData.nbbpm && pluginData.nbbpm.compatibility && semver.validRange(pluginData.nbbpm.compatibility)) {
			if (!semver.satisfies(nconf.get('version'), pluginData.nbbpm.compatibility)) {
				add();
			}
		} else {
			add();
		}
	}

	function registerHooks(pluginData) {
		try {
			if (!Plugins.libraries[pluginData.id]) {
				Plugins.requireLibrary(pluginData);
			}

			if (Array.isArray(pluginData.hooks)) {
				pluginData.hooks.forEach(hook => Plugins.hooks.register(pluginData.id, hook));
			}
		} catch (err: any) {
			winston.warn(`[plugins] Unable to load library for: ${pluginData.id}`);
			throw err;
		}
	}
};
