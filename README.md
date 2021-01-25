
# Second-Order Matching

An implementation of the Huet-Lang algorithm in JavaScript

## Usage

- Install with `npm i second-order-matching`.
- [Detailed source code docs are here.](https://lurchmath.github.io/second-order-matching/docs/)

## Current state (January 2021)

- As far as the rather extensive test suite has revealed, this module works as intended.
- The code assumes you want to use OpenMath expressions by default, but you can import
  just the matching portion of the code and provide your own expression class if you are
  willing to write a thin API to connect your class to this package.  See the docs linked
  to above for details.
- [To-do list of small remaining tasks.](to-dos.md)

## Developing

1. Clone/download the repo and set up with `npm install`.
2. After making changes, run `npm test` to ensure they didn't break anything.
   (And, of course, add tests of any new functionality.)
3. If changes were made to source code documentation, run `npm run docs` to rebuild the
   docs, which are also part of the repo, because they are served online by GitHub,
   as you can see at the link above.
