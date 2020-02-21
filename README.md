
# Second-Order Matching

Setup:

- Clone/Download the repo and run `npm install`. To run tests use
  `npm run test`.

## Current state (February 2020)

As far as testing has revealed, this module works as intended. New instances of
the `MatchingChallenge` can be constructed, constraints can be added, and
`getSolutions` will return the result of running the Huet-Lang algorithm on the
matching challenge.

[See to-do list for what still needs to be done.](to-dos.md)

There are currently three variations of the solve routine.

- The original is currently called `solveRecursive` and is a faithful
  implementation of the algorithm described in the summary paper.
- The second, called `solve`, is a modification of the original function which
  uses iteration where possible in order to speed up the solve routine. The test
  `the speed of iterative vs recursive solve` has a commented results section
  which shows a 2 second speed-up for the iterative solve on a challenge with
  256 solutions. This is probably not a great enough speedup to justify
  replacing the recursive version with the iterative version because the
  recursive version is simpler to understand, maintain, debug, and modify.
- The third, called `solveGenerator`, is an attempt to provide an iterator-style
  interface that uses `yield` to produce solutions. It is currently unfinished
  and only partly working. This function returns a generator function (using the
  `function*` syntax), which the user can then call `next` on (see `test('solve
  with yield')` for the current use).

Later we will keep only one version of the solve routine; see [the to-do
list](to-dos.md).
