
# To-dos

- Ensure that this package can be loaded as an ES6 module in the Node, the
  browser, and a WebWorker. Currently, it works as an ES6 module in Node, but
  has not been tested in the other two environments. This may require upgrading
  the OpenMath module to ES6 rather than CommonJS.
- Since some ES6 features are being used to implement iterators, the whole repo
  now assumes ES6.  Consequently, a lot of code that was written in ES5 style
  can be made much slicker (for example, lots of `for` loops with actual
  index-based counters, etc.).
- Proofread all documentation strings to see if the docs we're generating with
  JSDoc look good.
- Update the documentation site to have a more user-friendly landing page.
  (Right now it says "Home" with a giant blank area.)
- Publish this repository to npm so it's easy to use in other projects.
- The `replaceWithoutCapture` function in [language.js](src/language.js) has a
  "FIXME" comment in case 5. It generates new variables relative to an
  expression in a suboptimal way. One optimal fix would be a class for
  generating new variable streams. But this may not be necessary, since the
  `solve` function calls `alphaConvert` (in the `SIMPLIFICATION` case) with a
  guaranteed new variable relative to the current constraint list, so
  investigate to determine whether this needs fixing or not.
