const { watchAll } = require( './index.js' )( {
	subdirs: 'test',
	syncBaseDir: 'test',
} );

exports.default = watchAll;
