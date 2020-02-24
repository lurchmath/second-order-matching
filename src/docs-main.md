
## Second-Order Matching

This repository provides an implementation in JavaScript of the Huet-Lang
algorithm for second-order pattern matching.  You can read a summary of the
algorithm [in this paper](https://dl.acm.org/doi/10.1145/1637837.1637839),
and a summary of that paper in [a PDF file in this repository](https://github.com/lurchmath/second-order-matching/blob/master/Summary%20of%20Moore%20on%20Huet-Lang.pdf).

This implementation was written by George Tillisch in Summer 2019 and is
maintained by Nathan Carter since then.

Working with this code assumes knowledge of the JavaScript implementation of
[the OpenMath standard](https://www.openmath.org/standard/om20-2019-07-01/),
which you can find [here](https://github.com/lurchmath/openmath-js).

See the classes and files listed on the right for more information on each.

Example usage:

```js
import * as M from './index.js';

const pattern = M.OM.simple( 'f(x,y)' )
M.setMetavariable( pattern.children[2] ) // y is now a metavariable

const expression = M.OM.simple( 'f(x,3)' )

const MC = new M.MatchingChallenge( [ pattern, expression ] )
const sols = MC.getSolutions()
console.log( sols.length ) // prints 1
const sol = sols[0]
console.log( sol.contents.length ) // prints 1
const pair = sol.contents[0]

console.log( pair.pattern.simpleEncode(), 'maps to',
             pair.expression.simpleEncode() ) // prints y maps to 3
```

