const fs = require( 'fs' );
const path = require( 'path' );

const jsSearchConfig = {
	parsers: [
		// Match any un-commented import/export statements that mention a local path
		/(?:^|[\r\n])(?:import|export)\s+[\s\S]*?("(?:\.[^"]+)"|'(?:\.[^']+)');/g,
		// unwrap quotes
		/"([^"]+)"|'([^']+)'/g,
	],
	resolvers: [
		// Try with .js extension
		filename => filename + '.js',
		// Try with .mjs extension
		filename => filename + '.mjs',
	],
};

const defaultSearchConfig = {
	'.js': jsSearchConfig,
	'.mjs': jsSearchConfig,
	'.scss': {
		parsers: [
			// Match un-indented @use/@forward, un-commented @import, as well as un-commented @include meta.load-css paths (not URLs)
			/(?:(?:^|[\r\n])@(?:use|forward)\s+("(?:[^"]+)"|'(?:[^']+)')|(?:^|[^\/])@import\s+("(?:[^"]+)"|'(?:[^']+)');|(?:^|[^\/])@include\s+(?:meta\.)?load-css\(\s*("(?:[^"]+)"|'(?:[^']+)')\s*\))/g,
			// unwrap quotes
			/"([^"]+)"|'([^']+)'|url\((?:"([^"]+)"|'([^']+)'|([^)]+))\)/g,
		],
		resolvers: [
			// Try with .scss extension
			filename => filename + '.scss',
			// Try with SASS partial file name structure
			filename => filename.replace( /([\w\-]+)$/, '_$1.scss' ),
			// Try with SASS index filename
			filename => path.join( filename, '_index.scss' ),
		],
	},
};

const dependencyCache = {};
const resolverCache = {};

function findDependencyReferences( inputs, parser ) {
	const results = [];

	if ( parser instanceof Function ) {
		// Run each input through parser,
		// Add match to results if it matches
		for ( const input of inputs ) {
			const match = parser( input );

			if ( match ) {
				results.push( match );
			}
		}
	} else {
		// Run each input through (assumed) regex pattern,
		// Add each non-empty group match to the results
		for ( const input of inputs ) {
			let match;
			do {
				match = parser.exec( input );
				if ( ! match ) {
					break;
				}
				for ( let i = 1; i < match.length; i++ ) {
					if ( match[ i ] ) {
						results.push( match[ i ] );
					}
				}
			} while ( match );
		}
	}

	return results;
}

function resolveDependencyReference( input, resolvers ) {
	// File with exact name exists, use that
	if ( fs.existsSync( input ) && fs.statSync( input ).isFile() ) {
		return input;
	}

	// Run through each resolver,
	// Return the first valid file found
	for ( const resolver of resolvers ) {
		const resolvedPath = resolver( input );
		if ( fs.existsSync( resolvedPath ) && fs.statSync( resolvedPath ).isFile() ) {
			return resolvedPath;
		}
	}

	return false;
}

module.exports = function( searchConfig ) {
	searchConfig = searchConfig || defaultSearchConfig;

	function getDependencies( filename ) {
		const results = new Set();

		const ext = path.extname( filename );
		const directory = path.dirname( filename );
		const { parsers = [], resolvers = [] } = searchConfig[ ext ] || {};

		const stats = fs.statSync( filename );
		const cacheKey = `${ filename }@${ stats.mtimeMs }`;
		let dependencies = dependencyCache[ cacheKey ];

		if ( ! dependencies ) {
			const content = fs.readFileSync( filename, { encoding: 'utf-8' } );

			// Start with the file content
			dependencies = [ content ];

			// Run through each parser to extract the references,
			// updating the original list to allow multiple passes
			for ( const parser of parsers ) {
				dependencies = findDependencyReferences( dependencies, parser );
			}

			dependencyCache[ cacheKey ] = dependencies;
		}

		// Resolve each dependency, add it to the list,
		// as well as any of it's dependencies
		for ( const dep of dependencies ) {
			const depPath = path.resolve( directory, dep );

			let dependency = resolverCache[ depPath ];
			if ( ! dependency ) {
				dependency = resolveDependencyReference( depPath, resolvers );

				// Skip if not found
				if ( ! dependency ) {
					continue;
				}

				// Cache the result
				resolverCache[ depPath ] = dependency;
			}

			// Add to the list and get it's child dependencies
			results.add( dependency );
			getDependencies( dependency ).forEach( childDep => results.add( childDep ) );
		}

		return results;
	}

	return getDependencies;
};

module.exports.defaultSearchConfig = defaultSearchConfig;
