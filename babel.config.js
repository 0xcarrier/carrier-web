module.exports = {
  sourceType: 'unambiguous',
  sourceMaps: false,
  presets: [
    [
      '@babel/preset-env',
      {
        useBuiltIns: 'usage',
        corejs: '3.9.0',
      },
    ],
  ],
  plugins: ['@babel/plugin-transform-parameters', '@babel/plugin-transform-object-assign'],
};
