
# To-dos

## General

- Ensure that this package can be loaded as an ES6 module in the browser
  and a WebWorker. Currently, it works as an ES6 module in Node, but
  has not been tested in those other two environments. This may require upgrading
  the OpenMath module to ES6 rather than CommonJS.
- Since some ES6 features are being used to implement iterators, the whole repo
  now assumes ES6.  Consequently, a lot of code that was written in ES5 style
  can be made much slicker (for example, lots of `for` loops with actual
  index-based counters, etc.).
- Proofread all documentation strings to see if the docs we're generating with
  JSDoc look good.
- Publish this repository to npm so it's easy to use in other projects.
- The `replaceWithoutCapture` function in [language.js](src/language.js) has a
  "FIXME" comment in case 5. It generates new variables relative to an
  expression in a suboptimal way. One optimal fix would be a class for
  generating new variable streams. But this may not be necessary, since the
  `solve` function calls `alphaConvert` (in the `SIMPLIFICATION` case) with a
  guaranteed new variable relative to the current constraint list, so
  investigate to determine whether this needs fixing or not.

## Moving beyond OpenMath

- Ensure that the docs build correctly after all these changes.
- Rework the `language.js` file so that it doesn't import the new API, but
  rather exposes a function by which it expects to be provided such an API.
  Rework the new API file so that it exposes the API in a way that could be
  passed to `language.js`.  Have `constraints.js` import the API and hand it to
  `language.js`.
- Ensure that `constraints.js` doesn't use any OM-specific functionality either,
  but also accesses OM only through the new API.  This may require only updating
  `constraints.js`, or it may require extending the API.  Hopefully it is only
  the former.
- Rework the `constraints.js` file so that it doesn't import the new API, but
  rather exposes a function by which it expects to be provided such an API, just
  as `language.js` does.  Have `matching.js` import the API and pass it to
  `constraints.js`, which, in turn, passes it to `language.js`.
- Ensure that `matching.js` doesn't use any OM-specific functionality either,
  but also accesses OM only through the new API.  This may require only updating
  `matching.js`, or it may require extending the API.  Hopefully it is only the
  former.
- Copy `matching.js` to `matching-without-om.js`.  Change that file so that,
  rather than importing OM, it exposes a function by which it expects to be
  provided such an API, just as `constraints.js` does.  It should then pass that
  API to `constraints.js` as well.  Create a new file, `matching.js`, that
  imports `matching-without-om.js` and OM and passes the latter to the former.
- Create a new test file in which you import only `matching-without-om.js` and
  provide a simple OM alternative, then ensure that a subset of the original
  test suite still passes in that new paradigm.
