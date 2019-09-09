module.exports = {
  presets: [
    // Compile to environments listed in .browserslistrc
    "@babel/env",
    "@babel/preset-react",
    "@babel/typescript",
  ],
  plugins: [
    "macros",
    // class { handleThing = () => { } }
    "@babel/proposal-class-properties",
    // { ...spread }
    "@babel/proposal-object-rest-spread",
  ],
}
