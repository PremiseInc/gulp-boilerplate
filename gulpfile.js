const { compileAll } = require( './index.js' )( {
	subdirs: 'test',
} );

exports.default = compileAll;
