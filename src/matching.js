
"use strict"

import {
    setAPI, isExpressionFunction, makeExpressionFunction,
    isExpressionFunctionApplication, makeExpressionFunctionApplication,
    canApplyExpressionFunctionApplication,
    applyExpressionFunctionApplication, getNewVariableRelativeTo,
    replaceWithoutCapture, alphaConvert, alphaEquivalent, betaReduce,
    makeConstantExpression, makeProjectionExpression, makeImitationExpression,
    CASES, Constraint, ConstraintList, MatchingChallenge
} from './matching-without-om.js';
import { API } from './openmath-api.js';
export { API };
setAPI( API );
export {
    setAPI, isExpressionFunction, makeExpressionFunction,
    isExpressionFunctionApplication, makeExpressionFunctionApplication,
    canApplyExpressionFunctionApplication,
    applyExpressionFunctionApplication, getNewVariableRelativeTo,
    replaceWithoutCapture, alphaConvert, alphaEquivalent, betaReduce,
    makeConstantExpression, makeProjectionExpression, makeImitationExpression,
    CASES, Constraint, ConstraintList, MatchingChallenge
};
