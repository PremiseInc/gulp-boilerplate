// Built-in modules
const fs = require( 'fs' );
const path = require( 'path' );

// Gulp + utilities
const { src, dest, watch, series, parallel, lastRun } = require( 'gulp' );
const through = require( 'through2' );
const getDependencies = require( './lib/dependencies' )();

// General Gulp Plugins
const filter = require( 'gulp-custom-filter' );
const rename = require( 'gulp-rename' );

// Style Handling
const sass = require( 'gulp-dart-sass' );
const postcss = require( 'gulp-postcss' );
const postcssPresetEnv = require( 'postcss-preset-env' );
const csso = require( 'postcss-csso' );

// Linting Handling
const eslint = require( 'gulp-eslint-new' );

// Script Handling
const rollup = require( 'rollup' );
const rollupEach = require( 'gulp-rollup-each' );
const { babel } = require( '@rollup/plugin-babel' );
const json = require( '@rollup/plugin-json' );
const { nodeResolve } = require( '@rollup/plugin-node-resolve' );
const commonjs = require( '@rollup/plugin-commonjs' );
const replace = require( '@rollup/plugin-replace' );
const terser = require( '@rollup/plugin-terser' );

// =========================
// ! Utilities
// =========================

// Set the since option for src(), using the lastRun of the
// specified task, or since watching started.
let sinceWatching = 0;
function sinceLastTask( task ) {
	return { since: lastRun( task ) || sinceWatching };
}

// Log the filename, formatted with a custom string
function log( format ) {
	return through.obj( function( file, encoding, callback ) {
		console.info( format, file.relative );

		// pass through
		callback( null, file );
	} );
}

// Update the mtime of the file
function mtime() {
	return through.obj( function( file, encoding, callback ) {
		file.stat.atime = file.stat.mtime = new Date();
		callback( null, file );
	} );
}

// For gulp-custom-filter; exclude those with no changes (including dependencies)
function checkDependencies( task ) {
	const { since } = sinceLastTask( task );

	return filter( function( file ) {
		// Not watching or first run, continue
		if ( ! since ) {
			return true;
		}

		// File in question has changed, continue
		if ( fs.statSync( file.path ).mtime.getTime() > since ) {
			console.info( 'Change detected to %s', file.path.substr( file.base.length ) );
			return true;
		}

		const dependencies = getDependencies( file.path );

		let hasChanges = false;

		// Check if ANY dependencies have been recently modified
		dependencies.forEach( dep => {
			const stats = fs.statSync( dep );

			if ( stats.mtime.getTime() > since ) {
				console.info( 'Change detected to %s', dep.substr( file.base.length ) );
				hasChanges = true;
			}
		} );

		return hasChanges;
	} );
}

// =========================
// ! Config Helpers
// =========================

function getGlobs( subdirs = '' ) {
	let prefix = '.';
	if ( subdirs ) {
		prefix = `./${ subdirs }`;
	}

	return {
		styles: {
			input: [
				// Both those in a css...
				`${ prefix }/**/css/*.scss`,
				// ... or scss folder
				`${ prefix }/**/scss/*.scss`,
				// Make sure partials arent' matched
				`!./**/_*.scss`,
			],
			watch: [
				`${ prefix }/**/*.scss`,
			],
			output: './',
		},
		scripts: {
			input: [
				// Both those in a js folder...
				`${ prefix }/**/js/*.js`,
				// ... or a src subfolder
				`${ prefix }/**/js/{src,lib}/*.js`,
				// Skip compiled/vendor stuff though
				`!${ prefix }/**/*.min.js`,
				`!${ prefix }/**/node_modules/**/*.js`,
			],
			lint: [
				`${ prefix }/**/*.js`,
				`!${ prefix }/**/*.min.js`,
				`!${ prefix }/**/{vendor,node_modules}/**/*.js`,
			],
			watch: [
				`${ prefix }/**/*.json`,
				`${ prefix }/**/*.js`,
				`!${ prefix }/**/*.min.js`,
				`!${ prefix }/**/{vendor,node_modules}/**/*.js`,
			],
			output: './',
		},
	};
}

function parseDefaults( config, defaults ) {
	const parsedConfig = { ...defaults, ...config };

	if ( ! parsedConfig.paths ) {
		parsedConfig.paths = getGlobs( parsedConfig.subdirs );
	}

	return parsedConfig;
}

// =========================
// ! Boilerplates
// =========================

function defaultBoilerplate( config = {} ) {
	config = parseDefaults( config, {
		watchOptions: {
			ignoreinitial: false,
			events: [ 'add', 'change' ],
			usePolling: true,
		},
	} );

	const { paths, watchOptions, syncStartPath, syncBaseDir = '' } = config;
	let { postcssPlugins, postcssPresetEnvConfig, cssoConfig, rollupPlugins, syncWatchFiles } = config;

	if ( ! postcssPlugins ) {
		postcssPlugins = [
			postcssPresetEnv( postcssPresetEnvConfig ),
			csso( cssoConfig ),
		];
	}

	if ( ! rollupPlugins ) {
		rollupPlugins = [
			replace( {
				ENVIRONMENT: JSON.stringify( 'production' ),
				'process.env.NODE_ENV': JSON.stringify( 'production' ),
				preventAssignment: true,
			} ),
			nodeResolve( {
				browser: true,
			} ),
			commonjs( {
				include: 'node_modules/**',
			} ),
			babel( {
				babelHelpers: 'runtime',
				exclude: 'node_modules/**',
			} ),
			json( {
				preferConst: true,
				compact: true,
			} ),
			terser(),
		];
	}

	if ( ! syncWatchFiles ) {
		syncWatchFiles = [
			`img/**`,
			`*.css`,
			`*.min.js`,
		];
	}

	const gulpSrc = {
		dot: true,
		cwdbase: true,
	};

	// =========================
	// ! Style Handling
	// =========================


	function compileStyles() {
		return src( paths.styles.input, { ...gulpSrc, sourcemaps: true } )
			.pipe( log( 'checking %s' ) )
			// Exclude those that haven't been modified (including dependencies)
			.pipe( checkDependencies( compileStyles ) )
			// Print the filename for reference
			.pipe( log( 'Compiling %s' ) )
			// With Dart Sass
			.pipe( sass() )
			.on( 'error', sass.logError )
			// With PostCSS Preset Env + CSS NANO
			.pipe( postcss( postcssPlugins ) )
			// Save to ../css
			.pipe( rename( output => {
				output.dirname = output.dirname.replace( 'scss', 'css' );
			} ) )
			.pipe( log( 'Compiled %s' ) )
			// Save sourcemaps to same folder
			.pipe( mtime() )
			.pipe( dest( paths.styles.output, { sourcemaps: '.' } ) );
	}

	// =========================
	// ! Script Handling
	// =========================

	function validateScripts() {
		// Check all watchable scripts
		return src( paths.scripts.lint, { ...gulpSrc, ...sinceLastTask( validateScripts ) } )
			// Print the filename for reference
			.pipe( log( 'Linting %s' ) )
			// Lint and display issues
			.pipe( eslint() )
			.pipe( eslint.formatEach() );
	}

	function compileScripts() {
		return src( paths.scripts.input, { ...gulpSrc, sourcemaps: true } )
			// Exclude those that haven't been modified (including dependencies)
			.pipe( checkDependencies( compileScripts ) )
			// Print the filename for reference
			.pipe( log( 'Bundling %s' ) )
			// Transpile and Bundle
			.pipe( rollupEach(
				{
					plugins: rollupPlugins,
					// Suppress empty chunk and circular dependency warnings
					onwarn( warning, rollupWarn ) {
						if ( warning.code !== 'EMPTY_BUNDLE' && warning.code !== 'CIRCULAR_DEPENDENCY' ) {
							rollupWarn( warning );
						}
					},
				},
				{
					format: 'iife',
				},
				rollup
			) )
			// Save to ../dist if in /src
			.pipe( rename( output => {
				output.dirname = output.dirname.replace(
					path.join( 'js', 'src' ),
					path.join( 'js', 'dist' ),
				);
				output.basename = output.basename + '.min';
			} ) )
			.pipe( log( 'Bundled %s', 'green' ) )
			.pipe( mtime() )
			.pipe( dest( paths.scripts.output, { sourcemaps: '.' } ) );
	}

	// =========================
	// ! Sync Handling
	// =========================

	function startSync() {
		const browserSync = require( 'browser-sync' );

		if ( browserSync.active ) {
			browserSync.reload();
		} else {
			browserSync.init( {
				startPath: syncStartPath,
				ghostMode: false,
				server: {
					baseDir: `./${ syncBaseDir }`,
				},
				files: syncWatchFiles,
				port: 5759,
			} );
		}
	}

	// =========================
	// ! Watchers
	// =========================

	function watchStyles() {
		sinceWatching = sinceWatching || Date.now();

		return watch( paths.styles.watch, watchOptions, compileStyles );
	}

	function watchScripts() {
		sinceWatching = sinceWatching || Date.now();

		return watch( paths.scripts.watch, watchOptions, series( validateScripts, compileScripts ) );
	}

	return {
		compileStyles,
		validateScripts,
		compileScripts,
		watchStyles,
		watchScripts,
		startSync,
		compileAll: parallel( compileStyles, series( validateScripts, compileScripts ) ),
		watchAll: parallel( startSync, watchStyles, watchScripts ),
	};
}

function wordpressBoilerplate( config = {} ) {
	config = parseDefaults( config, {
		subdirs: '{mu-plugins,themes}',
	} );

	const { themeId } = config;

	return defaultBoilerplate( {
		syncStartPath: 'mockup',
		syncBaseDir: `themes/${ themeId }`,
		syncWatchFiles: [
			// Only watch theme and mockup assets
			`./themes/${ themeId }/assets/img/**`,
			`./themes/${ themeId }/assets/css/theme.css`,
			`./themes/${ themeId }/assets/js/dist/theme.min.js`,
			`./themes/${ themeId }/mockup/*.html`,
			`./themes/${ themeId }/mockup/*.css`,
			`./themes/${ themeId }/mockup/*.js`,
		],
		...config,
	} );
};

// =========================
// ! API
// =========================

module.exports = function( template, config ) {
	if ( typeof template === 'object' ) {
		config = template;
		template = 'default';
	}

	let boilerplate = defaultBoilerplate;

	switch ( template ) {
		case 'wordpress':
			boilerplate = wordpressBoilerplate;
			break;
	}

	return boilerplate( config );
};
