
# To-dos

- The generator/iterator-based solution `solveGenerator()` in
  `MatchingChallenge` is incomplete.  Do this:
   - Finish it and ensure it passes all tests.
   - Rename it to `getSolutionsIterator()`, which is more accurate.
   - Delete `solve()`, `solveRecursive()`, and `getSolutions()`.
   - Write `getOneSolution()`, which calls `getSolutionsIterator()` and then
     just asks for its first value, which may be undefined.  It should set the
     value of `solvable` to true/false rather than undefined, but it should not
     alter the value of `solutions`.
   - Write `getAllSolutions()` which does one of three things:
      - If `solutions` is defined, return it as the cached value.
      - If `solvable` is false, return an empty list.
      - Otherwise, call `getSolutionsIterator()`, iterate to get all its values,
        store them as an array in `solutions`, and set `solvable` to be whether
        there were any (even if it already had a true value, because this tiny
        redundancy doesn't matter).
   - Update the `isSolvable()` function to use the cached value `solvable` if
     it's defined, and if it's not, call `getOneSolution()`, discard its return
     value, then return `solvable`, which will then be defined.
   - Update `numSolutions()` to just return the length of `getAllSolutions()`.
- Ensure that this package can be loaded as an ES6 module in the Node, the
  browser, and a WebWorker. Currently, it works as an ES6 module in Node, but
  has not been tested in the other two environments. This may require upgrading
  the OpenMath module to ES6 rather than CommonJS.
- Proofread all documentation strings to see if the docs we're generating with
  JSDoc look good.
- The `replaceWithoutCapture` function in [language.js](src/language.js) has a
  "FIXME" comment in case 5. It generates new variables relative to an
  expression in a suboptimal way. One optimal fix would be a class for
  generating new variable streams. But this may not be necessary, since the
  `solve` function calls `alphaConvert` (in the `SIMPLIFICATION` case) with a
  guaranteed new variable relative to the current constraint list, so
  investigate to determine whether this needs fixing or not.
