const path = require( 'path' );

const getDependencies = require( './lib/dependencies' )();

const file = process.argv[2] || null;

if ( file ) {
	console.log( getDependencies( path.resolve( file ) ) );
} else {
	console.warn( 'Please specify a file to scan' );
}
