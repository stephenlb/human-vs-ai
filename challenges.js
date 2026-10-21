'use strict';

// Coding challenges. Everyone sees `examples`; the judge additionally sees `hidden`.
// `call` is a JS expression (or short script) and `expect` is the expected value.
const CHALLENGES = [
  {
    id: 'fizzbuzz',
    title: 'FizzBuzz',
    difficulty: 'Easy',
    signature: 'function fizzBuzz(n)',
    summary: 'Return an array of strings for the numbers 1..n. Use "Fizz" for multiples of 3, "Buzz" for multiples of 5, "FizzBuzz" for multiples of both, otherwise the number as a string.',
    examples: [
      { call: 'fizzBuzz(5)', expect: '["1","2","Fizz","4","Buzz"]' },
      { call: 'fizzBuzz(15)[14]', expect: '"FizzBuzz"' },
    ],
    hidden: [
      { call: 'fizzBuzz(0)', expect: '[]' },
      { call: 'fizzBuzz(3)', expect: '["1","2","Fizz"]' },
      { call: 'fizzBuzz(10)[9]', expect: '"Buzz"' },
    ],
  },
  {
    id: 'palindrome',
    title: 'Valid Palindrome',
    difficulty: 'Easy',
    signature: 'function isPalindrome(s)',
    summary: 'Return true if the string reads the same forwards and backwards, considering only letters and digits and ignoring case.',
    examples: [
      { call: 'isPalindrome("A man, a plan, a canal: Panama")', expect: 'true' },
      { call: 'isPalindrome("race a car")', expect: 'false' },
    ],
    hidden: [
      { call: 'isPalindrome("")', expect: 'true' },
      { call: 'isPalindrome("0P")', expect: 'false' },
      { call: 'isPalindrome("No \'x\' in Nixon")', expect: 'true' },
    ],
  },
  {
    id: 'reverse-words',
    title: 'Reverse Words',
    difficulty: 'Easy',
    signature: 'function reverseWords(s)',
    summary: 'Reverse the order of the words in a string. Words are separated by one or more spaces. The result has single spaces between words and no leading or trailing spaces.',
    examples: [
      { call: 'reverseWords("the sky is blue")', expect: '"blue is sky the"' },
      { call: 'reverseWords("  hello   world  ")', expect: '"world hello"' },
    ],
    hidden: [
      { call: 'reverseWords("a")', expect: '"a"' },
      { call: 'reverseWords("")', expect: '""' },
      { call: 'reverseWords("one two three")', expect: '"three two one"' },
    ],
  },
  {
    id: 'two-sum',
    title: 'Two Sum',
    difficulty: 'Easy',
    signature: 'function twoSum(nums, target)',
    summary: 'Return the indices [i, j] with i < j of the two numbers in nums that add up to target. Exactly one solution exists, and the same element cannot be used twice.',
    examples: [
      { call: 'twoSum([2,7,11,15], 9)', expect: '[0,1]' },
      { call: 'twoSum([3,2,4], 6)', expect: '[1,2]' },
    ],
    hidden: [
      { call: 'twoSum([3,3], 6)', expect: '[0,1]' },
      { call: 'twoSum([-1,-2,-3,-4,-5], -8)', expect: '[2,4]' },
      { call: 'twoSum([0,4,3,0], 0)', expect: '[0,3]' },
    ],
  },
  {
    id: 'valid-parentheses',
    title: 'Valid Parentheses',
    difficulty: 'Medium',
    signature: 'function isValid(s)',
    summary: 'The string contains only the characters ()[]{}. Return true if every bracket is closed by the same type of bracket in the correct order.',
    examples: [
      { call: 'isValid("()[]{}")', expect: 'true' },
      { call: 'isValid("(]")', expect: 'false' },
    ],
    hidden: [
      { call: 'isValid("([{}])")', expect: 'true' },
      { call: 'isValid("((")', expect: 'false' },
      { call: 'isValid("")', expect: 'true' },
      { call: 'isValid("]")', expect: 'false' },
    ],
  },
  {
    id: 'roman-to-int',
    title: 'Roman to Integer',
    difficulty: 'Medium',
    signature: 'function romanToInt(s)',
    summary: 'Convert a valid Roman numeral (1 to 3999) to an integer. Remember the subtractive forms: IV, IX, XL, XC, CD, CM.',
    examples: [
      { call: 'romanToInt("III")', expect: '3' },
      { call: 'romanToInt("LVIII")', expect: '58' },
      { call: 'romanToInt("MCMXCIV")', expect: '1994' },
    ],
    hidden: [
      { call: 'romanToInt("IV")', expect: '4' },
      { call: 'romanToInt("XL")', expect: '40' },
      { call: 'romanToInt("MMMCMXCIX")', expect: '3999' },
    ],
  },
  {
    id: 'group-anagrams',
    title: 'Group Anagrams',
    difficulty: 'Medium',
    signature: 'function groupAnagrams(words)',
    summary: 'Group words that are anagrams of each other. Return an array of groups, ordered by the first appearance of each group, with the words inside a group in their original input order.',
    examples: [
      { call: 'groupAnagrams(["eat","tea","tan","ate","nat","bat"])', expect: '[["eat","tea","ate"],["tan","nat"],["bat"]]' },
    ],
    hidden: [
      { call: 'groupAnagrams([""])', expect: '[[""]]' },
      { call: 'groupAnagrams(["a"])', expect: '[["a"]]' },
      { call: 'groupAnagrams([])', expect: '[]' },
      { call: 'groupAnagrams(["ab","ba","ab"])', expect: '[["ab","ba","ab"]]' },
    ],
  },
  {
    id: 'merge-intervals',
    title: 'Merge Intervals',
    difficulty: 'Medium',
    signature: 'function merge(intervals)',
    summary: 'Merge all overlapping [start, end] intervals (intervals that merely touch, like [1,4] and [4,5], overlap). Return the merged intervals sorted by start. The input may be unsorted.',
    examples: [
      { call: 'merge([[1,3],[2,6],[8,10],[15,18]])', expect: '[[1,6],[8,10],[15,18]]' },
      { call: 'merge([[1,4],[4,5]])', expect: '[[1,5]]' },
    ],
    hidden: [
      { call: 'merge([])', expect: '[]' },
      { call: 'merge([[5,6],[1,2],[2,3]])', expect: '[[1,3],[5,6]]' },
      { call: 'merge([[1,10],[2,3]])', expect: '[[1,10]]' },
    ],
  },
  {
    id: 'flatten',
    title: 'Flatten Array',
    difficulty: 'Medium',
    signature: 'function flatten(arr, depth = 1)',
    summary: 'Implement Array.prototype.flat yourself: flatten nested arrays up to `depth` levels (Infinity flattens fully). Do not use .flat() or .flatMap(). Do not mutate the input.',
    examples: [
      { call: 'flatten([1,[2,[3,[4]]]])', expect: '[1,2,[3,[4]]]' },
      { call: 'flatten([1,[2,[3,[4]]]], 2)', expect: '[1,2,3,[4]]' },
      { call: 'flatten([1,[2,[3,[4]]]], Infinity)', expect: '[1,2,3,4]' },
    ],
    hidden: [
      { call: 'flatten([])', expect: '[]' },
      { call: 'flatten([[],[[]]], Infinity)', expect: '[]' },
      { call: 'flatten([1,2,3], 0)', expect: '[1,2,3]' },
    ],
  },
  {
    id: 'deep-equal',
    title: 'Deep Equal',
    difficulty: 'Hard',
    signature: 'function deepEqual(a, b)',
    summary: 'Return true if two values are deeply equal. Support primitives, arrays and plain objects (key order does not matter). NaN equals NaN. An array never equals a plain object, and null never equals an object. A key whose value is undefined is NOT the same as a missing key.',
    examples: [
      { call: 'deepEqual({a:1,b:[1,2]}, {b:[1,2],a:1})', expect: 'true' },
      { call: 'deepEqual([1,2], [1,2,3])', expect: 'false' },
    ],
    hidden: [
      { call: 'deepEqual(NaN, NaN)', expect: 'true' },
      { call: 'deepEqual(null, {})', expect: 'false' },
      { call: 'deepEqual([], {})', expect: 'false' },
      { call: 'deepEqual({a:undefined}, {})', expect: 'false' },
      { call: 'deepEqual({a:{b:{c:[1,{d:2}]}}}, {a:{b:{c:[1,{d:2}]}}})', expect: 'true' },
    ],
  },
  {
    id: 'lru-cache',
    title: 'LRU Cache',
    difficulty: 'Hard',
    signature: 'class LRUCache { constructor(capacity) {} get(key) {} put(key, value) {} }',
    summary: 'Implement a least-recently-used cache. get(key) returns the value, or -1 if missing, and marks the key as most recently used. put(key, value) inserts or updates (also marking it most recently used) and evicts the least recently used key when capacity is exceeded. Both operations should run in O(1).',
    examples: [
      {
        call: 'c = new LRUCache(2); c.put(1,1); c.put(2,2); c.get(1); c.put(3,3); c.get(2); c.put(4,4); c.get(1); c.get(3); c.get(4)',
        expect: 'get results in order: 1, -1, -1, 3, 4',
      },
    ],
    hidden: [
      { call: 'c = new LRUCache(1); c.put(1,1); c.put(2,2); c.get(1); c.get(2)', expect: 'get results: -1, 2' },
      { call: 'c = new LRUCache(2); c.put(1,1); c.put(2,2); c.put(1,10); c.put(3,3); c.get(1); c.get(2)', expect: 'get results: 10, -1' },
      { call: 'c = new LRUCache(2); c.get(5)', expect: '-1' },
    ],
  },
];

function challengeById(id) {
  return CHALLENGES.find(c => c.id === id) || null;
}
