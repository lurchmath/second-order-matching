# Second-Order Matching

## Current state (July 2019)

As far as testing has revealed, this module works as intended. New instances of the `MatchingChallenge` can be constructed, constraints can be added, and `getSolutions` will return the result of running the Huet-Lang algorithm on the matching challenge.

Unfortunately, the code requires some cleanup and modification to be ready for maintenance free release. In no particular order, the required modifications are:

- Remove debugging helpers in `second-order-matching` once they are no longer needed.
- Look over docstrings once code is finalised ready for documentation generation.
- Properly 'modularize' `second-order-matching.js` ready for distribution and different running environments, e.g. running in browser and running in a webworker.
- Address the following `FIXME: this doesn't seem like the best way to get new variables` in `replaceWithoutCapture`. The suggested fix is a class for generating new variable streams. However, this may not be necessary since the actual `solve` function calls `alphaConvert` (in `CASE_SIMPLIFICATION`/3) with a guaranteed new variable relative to the current constraint list.

There are currently three variations of the solve routine. 

- The original is currently called `solveRecursive` and is a faithful implementation of the algorithm described in the summary paper. 
- The second, called `solve`, is a modification of the original function which uses iteration where possible in order to speed up the solve routine. The test `the speed of iterative vs recursive solve` has a commented results section which shows a 2 second speed-up for the iterative solve on a challenge with 256 solutions. This is probably not a great enough speedup to justify replacing the recursive version with the iterative version because the recursive version is simpler to understand, maintain, debug, and modify.
- The third, called `solveGenerator`, is an attempt to provide an iterator-style interface that uses `yield` to produce solutions. It is currently unfinished and only partly working. This function returns a generator function (using the `function*` syntax), which the user can then call `next` on (see `test('solve with yield')` for the current use). It is very simple to modify the iterative version of solve to work with `yield` - but not for `CASE_EFA`/4. For case 4 subcases A and B, using `yield* temp_mc_A/B.solveGenerator();` returns solutions as expected ([see `yield*` documentation](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/yield*)). This will not work for subcase C, however, because the solutions require modification _before_ they are yielded. One idea for a workaround is as follows:
        - Wrap the subcase C `getSolutions()` and modification code in a new generator function. Call `next()` on `temp_mc_C`, make any necessary modifications to the result and `yield` it inside the new generator function.
        - Then call `yield*` on this generator function, just as with cases A and B.    
- Another possible workaround is to simply calculate the solutions for case 4 as normal and then call `yield` on the resulting solutions list. This would provide the correct behaviour for the end user. However, this ruins the performance gains which come from using an iterator since we are only _returning_ one solution at a time rather than _calculating_ one solution at a time.

For simplicity and further maintence/development, it would be best either to have only one version of the solve routine, or to have one version which uses an iterator and one which does not. There could then be two methods in the `MatchingChallenge` class: `getAllSolutions` and `getNextSolution`/`getSolutionIterator`(which the user then calls `next` on).