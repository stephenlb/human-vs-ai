'use strict';

// Coding challenges. Everyone sees `examples`; the judge additionally sees `hidden`.
// `call` is a JS expression (or short script) and `expect` is the expected value.
const CHALLENGES = [
  // ---- Super Easy: one-line warm-ups ----
  {
    id: 'add',
    title: 'Add Two Numbers',
    difficulty: 'Super Easy',
    signature: 'function add(a, b)',
    summary: 'Return the sum of the two numbers a and b.',
    examples: [
      { call: 'add(2, 3)', expect: '5' },
      { call: 'add(10, -4)', expect: '6' },
    ],
    hidden: [
      { call: 'add(0, 0)', expect: '0' },
      { call: 'add(-5, -7)', expect: '-12' },
      { call: 'add(100, 250)', expect: '350' },
    ],
  },
  {
    id: 'is-even',
    title: 'Is It Even?',
    difficulty: 'Super Easy',
    signature: 'function isEven(n)',
    summary: 'Return true if the integer n is even, otherwise false. Zero is even, and negative numbers count too.',
    examples: [
      { call: 'isEven(4)', expect: 'true' },
      { call: 'isEven(7)', expect: 'false' },
    ],
    hidden: [
      { call: 'isEven(0)', expect: 'true' },
      { call: 'isEven(-2)', expect: 'true' },
      { call: 'isEven(-9)', expect: 'false' },
    ],
  },
  {
    id: 'greet',
    title: 'Say Hello',
    difficulty: 'Super Easy',
    signature: 'function greet(name)',
    summary: 'Return the greeting "Hello, NAME!" where NAME is the given name.',
    examples: [
      { call: 'greet("Sam")', expect: '"Hello, Sam!"' },
      { call: 'greet("World")', expect: '"Hello, World!"' },
    ],
    hidden: [
      { call: 'greet("")', expect: '"Hello, !"' },
      { call: 'greet("Ada Lovelace")', expect: '"Hello, Ada Lovelace!"' },
      { call: 'greet("x")', expect: '"Hello, x!"' },
    ],
  },
  {
    id: 'square',
    title: 'Square a Number',
    difficulty: 'Super Easy',
    signature: 'function square(n)',
    summary: 'Return n multiplied by itself.',
    examples: [
      { call: 'square(3)', expect: '9' },
      { call: 'square(-4)', expect: '16' },
    ],
    hidden: [
      { call: 'square(0)', expect: '0' },
      { call: 'square(1)', expect: '1' },
      { call: 'square(12)', expect: '144' },
    ],
  },
  {
    id: 'max-of-two',
    title: 'Bigger Number',
    difficulty: 'Super Easy',
    signature: 'function maxOfTwo(a, b)',
    summary: 'Return the larger of the two numbers a and b. If they are equal, return that value.',
    examples: [
      { call: 'maxOfTwo(3, 8)', expect: '8' },
      { call: 'maxOfTwo(10, 2)', expect: '10' },
    ],
    hidden: [
      { call: 'maxOfTwo(5, 5)', expect: '5' },
      { call: 'maxOfTwo(-3, -8)', expect: '-3' },
      { call: 'maxOfTwo(0, -1)', expect: '0' },
    ],
  },
  {
    id: 'shout',
    title: 'Shout It',
    difficulty: 'Super Easy',
    signature: 'function shout(s)',
    summary: 'Return the string s in UPPERCASE with an exclamation mark "!" added to the end.',
    examples: [
      { call: 'shout("hello")', expect: '"HELLO!"' },
      { call: 'shout("Hi there")', expect: '"HI THERE!"' },
    ],
    hidden: [
      { call: 'shout("")', expect: '"!"' },
      { call: 'shout("ALREADY")', expect: '"ALREADY!"' },
      { call: 'shout("a1b2")', expect: '"A1B2!"' },
    ],
  },
  {
    id: 'first-element',
    title: 'First Element',
    difficulty: 'Super Easy',
    signature: 'function firstElement(arr)',
    summary: 'Return the first element of the array, or null if the array is empty.',
    examples: [
      { call: 'firstElement([5, 6, 7])', expect: '5' },
      { call: 'firstElement(["a", "b"])', expect: '"a"' },
    ],
    hidden: [
      { call: 'firstElement([])', expect: 'null' },
      { call: 'firstElement([0])', expect: '0' },
      { call: 'firstElement([[1, 2], 3])', expect: '[1,2]' },
    ],
  },
  {
    id: 'sum-array',
    title: 'Sum of an Array',
    difficulty: 'Super Easy',
    signature: 'function sumArray(nums)',
    summary: 'Return the sum of all numbers in the array. The sum of an empty array is 0.',
    examples: [
      { call: 'sumArray([1, 2, 3])', expect: '6' },
      { call: 'sumArray([10, -4])', expect: '6' },
    ],
    hidden: [
      { call: 'sumArray([])', expect: '0' },
      { call: 'sumArray([7])', expect: '7' },
      { call: 'sumArray([-1, -2, -3])', expect: '-6' },
    ],
  },
  {
    id: 'is-adult',
    title: 'Old Enough?',
    difficulty: 'Super Easy',
    signature: 'function isAdult(age)',
    summary: 'Return true if age is 18 or more, otherwise false.',
    examples: [
      { call: 'isAdult(30)', expect: 'true' },
      { call: 'isAdult(12)', expect: 'false' },
    ],
    hidden: [
      { call: 'isAdult(18)', expect: 'true' },
      { call: 'isAdult(17)', expect: 'false' },
      { call: 'isAdult(0)', expect: 'false' },
    ],
  },
  {
    id: 'to-fahrenheit',
    title: 'Celsius to Fahrenheit',
    difficulty: 'Super Easy',
    signature: 'function toFahrenheit(celsius)',
    summary: 'Convert a temperature from Celsius to Fahrenheit using F = C × 9 / 5 + 32.',
    examples: [
      { call: 'toFahrenheit(0)', expect: '32' },
      { call: 'toFahrenheit(100)', expect: '212' },
    ],
    hidden: [
      { call: 'toFahrenheit(-40)', expect: '-40' },
      { call: 'toFahrenheit(20)', expect: '68' },
      { call: 'toFahrenheit(10)', expect: '50' },
    ],
  },
  // ---- Easy ----
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
    id: 'count-vowels',
    title: 'Count Vowels',
    difficulty: 'Easy',
    signature: 'function countVowels(s)',
    summary: 'Return how many vowels (a, e, i, o, u) the string contains, ignoring case. The letter "y" is not a vowel.',
    examples: [
      { call: 'countVowels("hello")', expect: '2' },
      { call: 'countVowels("Rhythm")', expect: '0' },
    ],
    hidden: [
      { call: 'countVowels("")', expect: '0' },
      { call: 'countVowels("AEIOU")', expect: '5' },
      { call: 'countVowels("Programming is fun!")', expect: '5' },
    ],
  },
  {
    id: 'is-anagram',
    title: 'Valid Anagram',
    difficulty: 'Easy',
    signature: 'function isAnagram(a, b)',
    summary: 'Return true if b is an anagram of a: both use exactly the same letters the same number of times. Ignore case and ignore spaces.',
    examples: [
      { call: 'isAnagram("listen", "silent")', expect: 'true' },
      { call: 'isAnagram("rat", "car")', expect: 'false' },
    ],
    hidden: [
      { call: 'isAnagram("", "")', expect: 'true' },
      { call: 'isAnagram("Dormitory", "dirty room")', expect: 'true' },
      { call: 'isAnagram("aab", "abb")', expect: 'false' },
      { call: 'isAnagram("abc", "abcd")', expect: 'false' },
    ],
  },
  {
    id: 'is-prime',
    title: 'Prime Check',
    difficulty: 'Easy',
    signature: 'function isPrime(n)',
    summary: 'Return true if the integer n is a prime number (greater than 1 and divisible only by 1 and itself). Numbers below 2 are not prime.',
    examples: [
      { call: 'isPrime(7)', expect: 'true' },
      { call: 'isPrime(9)', expect: 'false' },
    ],
    hidden: [
      { call: 'isPrime(2)', expect: 'true' },
      { call: 'isPrime(1)', expect: 'false' },
      { call: 'isPrime(0)', expect: 'false' },
      { call: 'isPrime(-7)', expect: 'false' },
      { call: 'isPrime(97)', expect: 'true' },
    ],
  },
  {
    id: 'fibonacci',
    title: 'Fibonacci Number',
    difficulty: 'Easy',
    signature: 'function fib(n)',
    summary: 'Return the n-th Fibonacci number, where fib(0) = 0, fib(1) = 1, and every later number is the sum of the previous two. n is at most 30.',
    examples: [
      { call: 'fib(6)', expect: '8' },
      { call: 'fib(10)', expect: '55' },
    ],
    hidden: [
      { call: 'fib(0)', expect: '0' },
      { call: 'fib(1)', expect: '1' },
      { call: 'fib(2)', expect: '1' },
      { call: 'fib(30)', expect: '832040' },
    ],
  },
  {
    id: 'second-largest',
    title: 'Second Largest',
    difficulty: 'Easy',
    signature: 'function secondLargest(nums)',
    summary: 'Return the second largest distinct value in the array. If there are fewer than two distinct values, return null.',
    examples: [
      { call: 'secondLargest([3, 1, 4, 2])', expect: '3' },
      { call: 'secondLargest([5, 5, 4])', expect: '4' },
    ],
    hidden: [
      { call: 'secondLargest([])', expect: 'null' },
      { call: 'secondLargest([9])', expect: 'null' },
      { call: 'secondLargest([7, 7, 7])', expect: 'null' },
      { call: 'secondLargest([-1, -5, -3])', expect: '-3' },
    ],
  },
  {
    id: 'unique',
    title: 'Remove Duplicates',
    difficulty: 'Easy',
    signature: 'function unique(arr)',
    summary: 'Return a new array with duplicate values removed, keeping the first occurrence of each value in its original order. The values are numbers or strings; 1 and "1" are different. Do not mutate the input.',
    examples: [
      { call: 'unique([1, 2, 2, 3, 1])', expect: '[1,2,3]' },
      { call: 'unique(["a", "b", "a"])', expect: '["a","b"]' },
    ],
    hidden: [
      { call: 'unique([])', expect: '[]' },
      { call: 'unique([4, 4, 4])', expect: '[4]' },
      { call: 'unique([1, "1", 1])', expect: '[1,"1"]' },
    ],
  },
  {
    id: 'title-case',
    title: 'Title Case',
    difficulty: 'Easy',
    signature: 'function titleCase(s)',
    summary: 'Capitalise the first letter of every word and lowercase the rest of it. Words are separated by single spaces.',
    examples: [
      { call: 'titleCase("hello world")', expect: '"Hello World"' },
      { call: 'titleCase("tHE qUICK bROWN fox")', expect: '"The Quick Brown Fox"' },
    ],
    hidden: [
      { call: 'titleCase("")', expect: '""' },
      { call: 'titleCase("a")', expect: '"A"' },
      { call: 'titleCase("ALREADY LOUD")', expect: '"Already Loud"' },
    ],
  },
  {
    id: 'missing-number',
    title: 'Missing Number',
    difficulty: 'Easy',
    signature: 'function missingNumber(nums)',
    summary: 'The array holds n distinct integers taken from the range 0..n, so exactly one number in that range is missing. Return the missing number.',
    examples: [
      { call: 'missingNumber([3, 0, 1])', expect: '2' },
      { call: 'missingNumber([0, 1])', expect: '2' },
    ],
    hidden: [
      { call: 'missingNumber([1])', expect: '0' },
      { call: 'missingNumber([0])', expect: '1' },
      { call: 'missingNumber([9, 6, 4, 2, 3, 5, 7, 0, 1])', expect: '8' },
    ],
  },
  {
    id: 'longest-word',
    title: 'Longest Word',
    difficulty: 'Easy',
    signature: 'function longestWord(s)',
    summary: 'Return the longest word in the string. Words are separated by spaces. If several words tie for longest, return the first one. Return "" if there are no words.',
    examples: [
      { call: 'longestWord("the quick brown fox")', expect: '"quick"' },
      { call: 'longestWord("I love programming")', expect: '"programming"' },
    ],
    hidden: [
      { call: 'longestWord("")', expect: '""' },
      { call: 'longestWord("a bb cc d")', expect: '"bb"' },
      { call: 'longestWord("  spaced   out  ")', expect: '"spaced"' },
    ],
  },
  {
    id: 'chunk',
    title: 'Chunk Array',
    difficulty: 'Easy',
    signature: 'function chunk(arr, size)',
    summary: 'Split the array into consecutive groups of length size and return the array of groups. The last group may be shorter. size is a positive integer. Do not mutate the input.',
    examples: [
      { call: 'chunk([1, 2, 3, 4, 5], 2)', expect: '[[1,2],[3,4],[5]]' },
      { call: 'chunk(["a", "b", "c"], 3)', expect: '[["a","b","c"]]' },
    ],
    hidden: [
      { call: 'chunk([], 3)', expect: '[]' },
      { call: 'chunk([1, 2, 3], 5)', expect: '[[1,2,3]]' },
      { call: 'chunk([1, 2, 3, 4], 1)', expect: '[[1],[2],[3],[4]]' },
    ],
  },
  // ---- Medium ----
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
