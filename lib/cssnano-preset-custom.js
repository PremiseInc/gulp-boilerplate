const autoprefixer = require('autoprefixer');
const cssDeclarationSorter = require('css-declaration-sorter');
const postcssCalc = require('postcss-calc');
const postcssColormin = require('postcss-colormin');
const postcssDiscardComments = require('postcss-discard-comments');
const postcssDiscardDuplicates = require('postcss-discard-duplicates');
const postcssDiscardEmpty = require('postcss-discard-empty');
const postcssDiscardOverridden = require('postcss-discard-overridden');
const postcssDiscardUnused = require('postcss-discard-unused');
const postcssMergeIdents = require('postcss-merge-idents');
const postcssMergeLonghand = require('postcss-merge-longhand');
const postcssMergeRules = require('postcss-merge-rules');
const postcssMinifyFontValues = require('postcss-minify-font-values');
const postcssMinifyGradients = require('postcss-minify-gradients');
const postcssMinifyParams = require('postcss-minify-params');
const postcssMinifySelectors = require('postcss-minify-selectors');
const postcssNormalizeCharset = require('postcss-normalize-charset');
const postcssNormalizeDisplayValues = require('postcss-normalize-display-values');
const postcssNormalizePositions = require('postcss-normalize-positions');
const postcssNormalizeRepeatStyle = require('postcss-normalize-repeat-style');
const postcssNormalizeString = require('postcss-normalize-string');
const postcssNormalizeTimingFunctions = require('postcss-normalize-timing-functions');
const postcssNormalizeUnicode = require('postcss-normalize-unicode');
const postcssNormalizeUrl = require('postcss-normalize-url');
const postcssNormalizeWhitespace = require('postcss-normalize-whitespace');
const postcssOrderedValues = require('postcss-ordered-values');
const postcssReduceIdents = require('postcss-reduce-idents');
const postcssReduceInitial = require('postcss-reduce-initial');
const postcssReduceTransforms = require('postcss-reduce-transforms');
const postcssSvgo = require('postcss-svgo');
const postcssUniqueSelectors = require('postcss-unique-selectors');
const postcssZindex = require('postcss-zindex');
const { rawCache } = require('cssnano-utils');

const pluginModules = {
	autoprefixer,
	cssDeclarationSorter,
	calc: postcssCalc,
	colormin: postcssColormin,
	discardComments: postcssDiscardComments,
	discardDuplicates: postcssDiscardDuplicates,
	discardEmpty: postcssDiscardEmpty,
	discardOverridden: postcssDiscardOverridden,
	discardUnused: postcssDiscardUnused,
	mergeIdents: postcssMergeIdents,
	mergeLonghand: postcssMergeLonghand,
	mergeRules: postcssMergeRules,
	minifyFontValues: postcssMinifyFontValues,
	minifyGradients: postcssMinifyGradients,
	minifyParams: postcssMinifyParams,
	minifySelectors: postcssMinifySelectors,
	normalizeCharset: postcssNormalizeCharset,
	normalizeDisplayValues: postcssNormalizeDisplayValues,
	normalizePositions: postcssNormalizePositions,
	normalizeRepeatStyle: postcssNormalizeRepeatStyle,
	normalizeString: postcssNormalizeString,
	normalizeTimingFunctions: postcssNormalizeTimingFunctions,
	normalizeUnicode: postcssNormalizeUnicode,
	normalizeUrl: postcssNormalizeUrl,
	normalizeWhitespace: postcssNormalizeWhitespace,
	orderedValues: postcssOrderedValues,
	reduceIdents: postcssReduceIdents,
	reduceInitial: postcssReduceInitial,
	reduceTransforms: postcssReduceTransforms,
	svgo: postcssSvgo,
	uniqueSelectors: postcssUniqueSelectors,
	zindex: postcssZindex,
	rawCache,
};

const defaultConfig = {
	autoprefixer: {
		// https://github.com/postcss/autoprefixer#options
	},
	cssDeclarationSorter: {
		enabled: true,
		// https://github.com/Siilwyn/css-declaration-sorter#api
		keepOverrides: true,
	},
	calc: {
		enabled: true,
		// https://github.com/postcss/postcss-calc#options
	},
	colormin: {
		enabled: true,
	},
	convertValues: {
		// https://github.com/cssnano/cssnano/tree/master/packages/postcss-convert-values#api
	},
	discardComments: {
		enabled: true,
		// https://github.com/cssnano/cssnano/tree/master/packages/postcss-discard-comments#api
	},
	discardDuplicates: {
		enabled: true,
	},
	discardEmpty: {
		enabled: true,
	},
	discardOverridden: {
		enabled: true,
	},
	discardUnused: {
		// https://github.com/cssnano/cssnano/tree/master/packages/postcss-discard-unused#api
	},
	mergeIdents: {},
	mergeLonghand: {
		enabled: true,
	},
	mergeRules: {
		enabled: true,
	},
	minifyFontValues: {
		// https://github.com/cssnano/cssnano/tree/master/packages/postcss-minify-font-values#api
	},
	minifyGradients: {
		enabled: true,
	},
	minifyParams: {
		enabled: true,
	},
	minifySelectors: {
		enabled: true,
	},
	normalizeCharset: {
		enabled: true,
		// https://github.com/cssnano/cssnano/tree/master/packages/postcss-normalize-charset#api
		add: false,
	},
	normalizeDisplayValues: {
		enabled: true,
	},
	normalizePositions: {
		enabled: true,
	},
	normalizeRepeatStyle: {
		enabled: true,
	},
	normalizeString: {
		enabled: true,
		// https://github.com/cssnano/cssnano/tree/master/packages/postcss-normalize-string#api
	},
	normalizeTimingFunctions: {
		enabled: true,
	},
	normalizeUnicode: {
		enabled: true,
	},
	normalizeUrl: {
		enabled: true,
	},
	normalizeWhitespace: {
		enabled: true,
	},
	orderedValues: {
		enabled: true,
	},
	reduceIdents: {
		// https://github.com/cssnano/cssnano/tree/master/packages/postcss-reduce-idents#api
	},
	reduceInitial: {
		enabled: true,
		// https://github.com/cssnano/cssnano/tree/master/packages/postcss-reduce-initial#api
	},
	reduceTransforms: {
		enabled: true,
	},
	svgo: {
		enabled: true,
		// https://github.com/cssnano/cssnano/tree/master/packages/postcss-svgo#api
	},
	uniqueSelectors: {
		enabled: true,
	},
	zindex: {
		// https://github.com/cssnano/cssnano/tree/master/packages/postcss-zindex#api
	},
	rawCache: {
		enabled: true,
	}
};

function customPreset( config = {} ) {
	const preset = Object.assign( {}, defaultConfig, config );

	const plugins = [];
	for ( const [ name, conf ] of Object.entries( preset ) ) {
		const plugin = pluginModules[ name ];
		if ( plugin ) {
			const { enabled = false, ...options } = conf;
			if ( enabled ) {
				plugins.push( [ plugin, options ] );
			}
		}
	}

	return { plugins };
}

module.exports = customPreset;
