// const variables = require('@cgds/styles').default;
const variables = {};

const simpleVars = require('postcss-simple-vars');
const mixins = require('postcss-mixins');

// const typography = require.resolve('@cgds/styles/mixins/typography.css');
// const elevation = require.resolve('@cgds/styles/mixins/elevation.css');
// const motion = require.resolve('@cgds/styles/mixins/motion.css');
// const focus = require.resolve('@cgds/styles/mixins/focus.css');

/* eslint-disable global-require */
module.exports = {
  plugins: [
    mixins({
      mixinsFiles: [
        // typography, elevation, motion, focus
      ],
    }),
    require('postcss-nested'),
    simpleVars({
      variables: Object.entries(variables).reduce(
        (all, [name, value]) => ({ ...all, [`$${name}`]: value }),
        {}
      ),
    }),
  ],
};
