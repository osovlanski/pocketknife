/**
 * Seed script for CuratedProblem table
 * Migrates hardcoded problems from curatedProblems.ts (Blind 75, NeetCode 150, Grind 75)
 */

import { PrismaClient } from '@prisma/client';

interface CuratedProblemData {
  id: string;
  title: string;
  titleSlug: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  category: string;
  tags: string[];
  companies: string[];
  url: string;
  isPremium?: boolean;
}

// Blind 75 - The most popular interview prep list
const BLIND_75: CuratedProblemData[] = [
  // Arrays & Hashing
  { id: 'b75-1', title: 'Two Sum', titleSlug: 'two-sum', difficulty: 'Easy', category: 'Arrays & Hashing', tags: ['Array', 'Hash Table'], companies: ['Google', 'Amazon', 'Meta', 'Apple', 'Microsoft'], url: 'https://leetcode.com/problems/two-sum/' },
  { id: 'b75-2', title: 'Contains Duplicate', titleSlug: 'contains-duplicate', difficulty: 'Easy', category: 'Arrays & Hashing', tags: ['Array', 'Hash Table', 'Sorting'], companies: ['Amazon', 'Apple', 'Microsoft'], url: 'https://leetcode.com/problems/contains-duplicate/' },
  { id: 'b75-3', title: 'Valid Anagram', titleSlug: 'valid-anagram', difficulty: 'Easy', category: 'Arrays & Hashing', tags: ['Hash Table', 'String', 'Sorting'], companies: ['Amazon', 'Google', 'Microsoft'], url: 'https://leetcode.com/problems/valid-anagram/' },
  { id: 'b75-4', title: 'Group Anagrams', titleSlug: 'group-anagrams', difficulty: 'Medium', category: 'Arrays & Hashing', tags: ['Array', 'Hash Table', 'String', 'Sorting'], companies: ['Amazon', 'Meta', 'Google'], url: 'https://leetcode.com/problems/group-anagrams/' },
  { id: 'b75-5', title: 'Top K Frequent Elements', titleSlug: 'top-k-frequent-elements', difficulty: 'Medium', category: 'Arrays & Hashing', tags: ['Array', 'Hash Table', 'Heap', 'Bucket Sort'], companies: ['Amazon', 'Meta', 'Google', 'Apple'], url: 'https://leetcode.com/problems/top-k-frequent-elements/' },
  { id: 'b75-6', title: 'Product of Array Except Self', titleSlug: 'product-of-array-except-self', difficulty: 'Medium', category: 'Arrays & Hashing', tags: ['Array', 'Prefix Sum'], companies: ['Amazon', 'Meta', 'Apple', 'Microsoft'], url: 'https://leetcode.com/problems/product-of-array-except-self/' },
  { id: 'b75-7', title: 'Encode and Decode Strings', titleSlug: 'encode-and-decode-strings', difficulty: 'Medium', category: 'Arrays & Hashing', tags: ['String', 'Design'], companies: ['Google', 'Meta'], url: 'https://leetcode.com/problems/encode-and-decode-strings/', isPremium: true },
  { id: 'b75-8', title: 'Longest Consecutive Sequence', titleSlug: 'longest-consecutive-sequence', difficulty: 'Medium', category: 'Arrays & Hashing', tags: ['Array', 'Hash Table', 'Union Find'], companies: ['Google', 'Amazon', 'Meta'], url: 'https://leetcode.com/problems/longest-consecutive-sequence/' },
  
  // Two Pointers
  { id: 'b75-9', title: 'Valid Palindrome', titleSlug: 'valid-palindrome', difficulty: 'Easy', category: 'Two Pointers', tags: ['Two Pointers', 'String'], companies: ['Meta', 'Microsoft', 'Apple'], url: 'https://leetcode.com/problems/valid-palindrome/' },
  { id: 'b75-10', title: '3Sum', titleSlug: '3sum', difficulty: 'Medium', category: 'Two Pointers', tags: ['Array', 'Two Pointers', 'Sorting'], companies: ['Amazon', 'Meta', 'Google', 'Apple', 'Microsoft'], url: 'https://leetcode.com/problems/3sum/' },
  { id: 'b75-11', title: 'Container With Most Water', titleSlug: 'container-with-most-water', difficulty: 'Medium', category: 'Two Pointers', tags: ['Array', 'Two Pointers', 'Greedy'], companies: ['Amazon', 'Meta', 'Google'], url: 'https://leetcode.com/problems/container-with-most-water/' },
  
  // Sliding Window
  { id: 'b75-12', title: 'Best Time to Buy and Sell Stock', titleSlug: 'best-time-to-buy-and-sell-stock', difficulty: 'Easy', category: 'Sliding Window', tags: ['Array', 'Dynamic Programming'], companies: ['Amazon', 'Meta', 'Microsoft', 'Apple', 'Google'], url: 'https://leetcode.com/problems/best-time-to-buy-and-sell-stock/' },
  { id: 'b75-13', title: 'Longest Substring Without Repeating Characters', titleSlug: 'longest-substring-without-repeating-characters', difficulty: 'Medium', category: 'Sliding Window', tags: ['Hash Table', 'String', 'Sliding Window'], companies: ['Amazon', 'Meta', 'Google', 'Apple', 'Microsoft'], url: 'https://leetcode.com/problems/longest-substring-without-repeating-characters/' },
  { id: 'b75-14', title: 'Longest Repeating Character Replacement', titleSlug: 'longest-repeating-character-replacement', difficulty: 'Medium', category: 'Sliding Window', tags: ['Hash Table', 'String', 'Sliding Window'], companies: ['Google', 'Amazon'], url: 'https://leetcode.com/problems/longest-repeating-character-replacement/' },
  { id: 'b75-15', title: 'Minimum Window Substring', titleSlug: 'minimum-window-substring', difficulty: 'Hard', category: 'Sliding Window', tags: ['Hash Table', 'String', 'Sliding Window'], companies: ['Meta', 'Amazon', 'Google', 'Apple'], url: 'https://leetcode.com/problems/minimum-window-substring/' },
  
  // Stack
  { id: 'b75-16', title: 'Valid Parentheses', titleSlug: 'valid-parentheses', difficulty: 'Easy', category: 'Stack', tags: ['String', 'Stack'], companies: ['Amazon', 'Meta', 'Google', 'Microsoft'], url: 'https://leetcode.com/problems/valid-parentheses/' },
  
  // Binary Search
  { id: 'b75-17', title: 'Find Minimum in Rotated Sorted Array', titleSlug: 'find-minimum-in-rotated-sorted-array', difficulty: 'Medium', category: 'Binary Search', tags: ['Array', 'Binary Search'], companies: ['Amazon', 'Meta', 'Microsoft'], url: 'https://leetcode.com/problems/find-minimum-in-rotated-sorted-array/' },
  { id: 'b75-18', title: 'Search in Rotated Sorted Array', titleSlug: 'search-in-rotated-sorted-array', difficulty: 'Medium', category: 'Binary Search', tags: ['Array', 'Binary Search'], companies: ['Amazon', 'Meta', 'Google', 'Microsoft', 'Apple'], url: 'https://leetcode.com/problems/search-in-rotated-sorted-array/' },
  
  // Linked List
  { id: 'b75-19', title: 'Reverse Linked List', titleSlug: 'reverse-linked-list', difficulty: 'Easy', category: 'Linked List', tags: ['Linked List', 'Recursion'], companies: ['Amazon', 'Microsoft', 'Apple'], url: 'https://leetcode.com/problems/reverse-linked-list/' },
  { id: 'b75-20', title: 'Merge Two Sorted Lists', titleSlug: 'merge-two-sorted-lists', difficulty: 'Easy', category: 'Linked List', tags: ['Linked List', 'Recursion'], companies: ['Amazon', 'Microsoft', 'Apple', 'Meta'], url: 'https://leetcode.com/problems/merge-two-sorted-lists/' },
  { id: 'b75-21', title: 'Reorder List', titleSlug: 'reorder-list', difficulty: 'Medium', category: 'Linked List', tags: ['Linked List', 'Two Pointers', 'Stack', 'Recursion'], companies: ['Amazon', 'Meta'], url: 'https://leetcode.com/problems/reorder-list/' },
  { id: 'b75-22', title: 'Remove Nth Node From End of List', titleSlug: 'remove-nth-node-from-end-of-list', difficulty: 'Medium', category: 'Linked List', tags: ['Linked List', 'Two Pointers'], companies: ['Amazon', 'Meta', 'Microsoft'], url: 'https://leetcode.com/problems/remove-nth-node-from-end-of-list/' },
  { id: 'b75-23', title: 'Linked List Cycle', titleSlug: 'linked-list-cycle', difficulty: 'Easy', category: 'Linked List', tags: ['Linked List', 'Two Pointers'], companies: ['Amazon', 'Microsoft'], url: 'https://leetcode.com/problems/linked-list-cycle/' },
  { id: 'b75-24', title: 'Merge K Sorted Lists', titleSlug: 'merge-k-sorted-lists', difficulty: 'Hard', category: 'Linked List', tags: ['Linked List', 'Divide and Conquer', 'Heap', 'Merge Sort'], companies: ['Amazon', 'Meta', 'Google', 'Microsoft'], url: 'https://leetcode.com/problems/merge-k-sorted-lists/' },
  
  // Trees
  { id: 'b75-25', title: 'Invert Binary Tree', titleSlug: 'invert-binary-tree', difficulty: 'Easy', category: 'Trees', tags: ['Tree', 'DFS', 'BFS', 'Binary Tree'], companies: ['Google', 'Amazon'], url: 'https://leetcode.com/problems/invert-binary-tree/' },
  { id: 'b75-26', title: 'Maximum Depth of Binary Tree', titleSlug: 'maximum-depth-of-binary-tree', difficulty: 'Easy', category: 'Trees', tags: ['Tree', 'DFS', 'BFS', 'Binary Tree'], companies: ['Amazon', 'Microsoft'], url: 'https://leetcode.com/problems/maximum-depth-of-binary-tree/' },
  { id: 'b75-27', title: 'Same Tree', titleSlug: 'same-tree', difficulty: 'Easy', category: 'Trees', tags: ['Tree', 'DFS', 'BFS', 'Binary Tree'], companies: ['Amazon', 'Microsoft'], url: 'https://leetcode.com/problems/same-tree/' },
  { id: 'b75-28', title: 'Subtree of Another Tree', titleSlug: 'subtree-of-another-tree', difficulty: 'Easy', category: 'Trees', tags: ['Tree', 'DFS', 'Binary Tree', 'String Matching', 'Hash Function'], companies: ['Amazon', 'Meta'], url: 'https://leetcode.com/problems/subtree-of-another-tree/' },
  { id: 'b75-29', title: 'Lowest Common Ancestor of a Binary Search Tree', titleSlug: 'lowest-common-ancestor-of-a-binary-search-tree', difficulty: 'Medium', category: 'Trees', tags: ['Tree', 'DFS', 'Binary Search Tree', 'Binary Tree'], companies: ['Amazon', 'Meta', 'Microsoft'], url: 'https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-search-tree/' },
  { id: 'b75-30', title: 'Binary Tree Level Order Traversal', titleSlug: 'binary-tree-level-order-traversal', difficulty: 'Medium', category: 'Trees', tags: ['Tree', 'BFS', 'Binary Tree'], companies: ['Amazon', 'Meta', 'Microsoft'], url: 'https://leetcode.com/problems/binary-tree-level-order-traversal/' },
  { id: 'b75-31', title: 'Validate Binary Search Tree', titleSlug: 'validate-binary-search-tree', difficulty: 'Medium', category: 'Trees', tags: ['Tree', 'DFS', 'Binary Search Tree', 'Binary Tree'], companies: ['Amazon', 'Meta', 'Microsoft'], url: 'https://leetcode.com/problems/validate-binary-search-tree/' },
  { id: 'b75-32', title: 'Kth Smallest Element in a BST', titleSlug: 'kth-smallest-element-in-a-bst', difficulty: 'Medium', category: 'Trees', tags: ['Tree', 'DFS', 'Binary Search Tree', 'Binary Tree'], companies: ['Amazon', 'Meta'], url: 'https://leetcode.com/problems/kth-smallest-element-in-a-bst/' },
  { id: 'b75-33', title: 'Construct Binary Tree from Preorder and Inorder Traversal', titleSlug: 'construct-binary-tree-from-preorder-and-inorder-traversal', difficulty: 'Medium', category: 'Trees', tags: ['Array', 'Hash Table', 'Divide and Conquer', 'Tree', 'Binary Tree'], companies: ['Amazon', 'Meta', 'Microsoft'], url: 'https://leetcode.com/problems/construct-binary-tree-from-preorder-and-inorder-traversal/' },
  { id: 'b75-34', title: 'Binary Tree Maximum Path Sum', titleSlug: 'binary-tree-maximum-path-sum', difficulty: 'Hard', category: 'Trees', tags: ['Dynamic Programming', 'Tree', 'DFS', 'Binary Tree'], companies: ['Meta', 'Amazon', 'Google'], url: 'https://leetcode.com/problems/binary-tree-maximum-path-sum/' },
  { id: 'b75-35', title: 'Serialize and Deserialize Binary Tree', titleSlug: 'serialize-and-deserialize-binary-tree', difficulty: 'Hard', category: 'Trees', tags: ['String', 'Tree', 'DFS', 'BFS', 'Design', 'Binary Tree'], companies: ['Meta', 'Amazon', 'Google', 'Microsoft'], url: 'https://leetcode.com/problems/serialize-and-deserialize-binary-tree/' },
  
  // Tries
  { id: 'b75-36', title: 'Implement Trie (Prefix Tree)', titleSlug: 'implement-trie-prefix-tree', difficulty: 'Medium', category: 'Tries', tags: ['Hash Table', 'String', 'Design', 'Trie'], companies: ['Amazon', 'Google', 'Microsoft'], url: 'https://leetcode.com/problems/implement-trie-prefix-tree/' },
  { id: 'b75-37', title: 'Design Add and Search Words Data Structure', titleSlug: 'design-add-and-search-words-data-structure', difficulty: 'Medium', category: 'Tries', tags: ['String', 'DFS', 'Design', 'Trie'], companies: ['Meta', 'Amazon'], url: 'https://leetcode.com/problems/design-add-and-search-words-data-structure/' },
  { id: 'b75-38', title: 'Word Search II', titleSlug: 'word-search-ii', difficulty: 'Hard', category: 'Tries', tags: ['Array', 'String', 'Backtracking', 'Trie', 'Matrix'], companies: ['Amazon', 'Google', 'Microsoft'], url: 'https://leetcode.com/problems/word-search-ii/' },
  
  // Heap / Priority Queue
  { id: 'b75-39', title: 'Find Median from Data Stream', titleSlug: 'find-median-from-data-stream', difficulty: 'Hard', category: 'Heap', tags: ['Two Pointers', 'Design', 'Sorting', 'Heap', 'Data Stream'], companies: ['Amazon', 'Meta', 'Google', 'Microsoft'], url: 'https://leetcode.com/problems/find-median-from-data-stream/' },
  
  // Backtracking
  { id: 'b75-40', title: 'Combination Sum', titleSlug: 'combination-sum', difficulty: 'Medium', category: 'Backtracking', tags: ['Array', 'Backtracking'], companies: ['Amazon', 'Meta', 'Apple'], url: 'https://leetcode.com/problems/combination-sum/' },
  { id: 'b75-41', title: 'Word Search', titleSlug: 'word-search', difficulty: 'Medium', category: 'Backtracking', tags: ['Array', 'Backtracking', 'Matrix'], companies: ['Amazon', 'Meta', 'Microsoft'], url: 'https://leetcode.com/problems/word-search/' },
  
  // Graphs
  { id: 'b75-42', title: 'Number of Islands', titleSlug: 'number-of-islands', difficulty: 'Medium', category: 'Graphs', tags: ['Array', 'DFS', 'BFS', 'Union Find', 'Matrix'], companies: ['Amazon', 'Meta', 'Google', 'Microsoft'], url: 'https://leetcode.com/problems/number-of-islands/' },
  { id: 'b75-43', title: 'Clone Graph', titleSlug: 'clone-graph', difficulty: 'Medium', category: 'Graphs', tags: ['Hash Table', 'DFS', 'BFS', 'Graph'], companies: ['Amazon', 'Meta', 'Google'], url: 'https://leetcode.com/problems/clone-graph/' },
  { id: 'b75-44', title: 'Pacific Atlantic Water Flow', titleSlug: 'pacific-atlantic-water-flow', difficulty: 'Medium', category: 'Graphs', tags: ['Array', 'DFS', 'BFS', 'Matrix'], companies: ['Amazon', 'Google'], url: 'https://leetcode.com/problems/pacific-atlantic-water-flow/' },
  { id: 'b75-45', title: 'Course Schedule', titleSlug: 'course-schedule', difficulty: 'Medium', category: 'Graphs', tags: ['DFS', 'BFS', 'Graph', 'Topological Sort'], companies: ['Amazon', 'Meta', 'Google', 'Microsoft'], url: 'https://leetcode.com/problems/course-schedule/' },
  { id: 'b75-46', title: 'Number of Connected Components in an Undirected Graph', titleSlug: 'number-of-connected-components-in-an-undirected-graph', difficulty: 'Medium', category: 'Graphs', tags: ['DFS', 'BFS', 'Union Find', 'Graph'], companies: ['Amazon', 'Google'], url: 'https://leetcode.com/problems/number-of-connected-components-in-an-undirected-graph/', isPremium: true },
  { id: 'b75-47', title: 'Graph Valid Tree', titleSlug: 'graph-valid-tree', difficulty: 'Medium', category: 'Graphs', tags: ['DFS', 'BFS', 'Union Find', 'Graph'], companies: ['Amazon', 'Google', 'Meta'], url: 'https://leetcode.com/problems/graph-valid-tree/', isPremium: true },
  
  // Advanced Graphs
  { id: 'b75-48', title: 'Alien Dictionary', titleSlug: 'alien-dictionary', difficulty: 'Hard', category: 'Advanced Graphs', tags: ['Array', 'String', 'DFS', 'BFS', 'Graph', 'Topological Sort'], companies: ['Meta', 'Amazon', 'Google', 'Apple'], url: 'https://leetcode.com/problems/alien-dictionary/', isPremium: true },
  
  // Dynamic Programming
  { id: 'b75-49', title: 'Climbing Stairs', titleSlug: 'climbing-stairs', difficulty: 'Easy', category: 'Dynamic Programming', tags: ['Math', 'Dynamic Programming', 'Memoization'], companies: ['Amazon', 'Microsoft', 'Apple'], url: 'https://leetcode.com/problems/climbing-stairs/' },
  { id: 'b75-50', title: 'House Robber', titleSlug: 'house-robber', difficulty: 'Medium', category: 'Dynamic Programming', tags: ['Array', 'Dynamic Programming'], companies: ['Amazon', 'Google', 'Microsoft'], url: 'https://leetcode.com/problems/house-robber/' },
  { id: 'b75-51', title: 'House Robber II', titleSlug: 'house-robber-ii', difficulty: 'Medium', category: 'Dynamic Programming', tags: ['Array', 'Dynamic Programming'], companies: ['Amazon', 'Google'], url: 'https://leetcode.com/problems/house-robber-ii/' },
  { id: 'b75-52', title: 'Longest Palindromic Substring', titleSlug: 'longest-palindromic-substring', difficulty: 'Medium', category: 'Dynamic Programming', tags: ['String', 'Dynamic Programming'], companies: ['Amazon', 'Meta', 'Microsoft'], url: 'https://leetcode.com/problems/longest-palindromic-substring/' },
  { id: 'b75-53', title: 'Palindromic Substrings', titleSlug: 'palindromic-substrings', difficulty: 'Medium', category: 'Dynamic Programming', tags: ['String', 'Dynamic Programming'], companies: ['Meta', 'Amazon'], url: 'https://leetcode.com/problems/palindromic-substrings/' },
  { id: 'b75-54', title: 'Decode Ways', titleSlug: 'decode-ways', difficulty: 'Medium', category: 'Dynamic Programming', tags: ['String', 'Dynamic Programming'], companies: ['Meta', 'Amazon', 'Google'], url: 'https://leetcode.com/problems/decode-ways/' },
  { id: 'b75-55', title: 'Coin Change', titleSlug: 'coin-change', difficulty: 'Medium', category: 'Dynamic Programming', tags: ['Array', 'Dynamic Programming', 'BFS'], companies: ['Amazon', 'Meta', 'Google', 'Microsoft'], url: 'https://leetcode.com/problems/coin-change/' },
  { id: 'b75-56', title: 'Maximum Product Subarray', titleSlug: 'maximum-product-subarray', difficulty: 'Medium', category: 'Dynamic Programming', tags: ['Array', 'Dynamic Programming'], companies: ['Amazon', 'Google', 'Microsoft'], url: 'https://leetcode.com/problems/maximum-product-subarray/' },
  { id: 'b75-57', title: 'Word Break', titleSlug: 'word-break', difficulty: 'Medium', category: 'Dynamic Programming', tags: ['Array', 'Hash Table', 'String', 'Dynamic Programming', 'Trie', 'Memoization'], companies: ['Amazon', 'Meta', 'Google', 'Apple'], url: 'https://leetcode.com/problems/word-break/' },
  { id: 'b75-58', title: 'Longest Increasing Subsequence', titleSlug: 'longest-increasing-subsequence', difficulty: 'Medium', category: 'Dynamic Programming', tags: ['Array', 'Binary Search', 'Dynamic Programming'], companies: ['Amazon', 'Google', 'Microsoft'], url: 'https://leetcode.com/problems/longest-increasing-subsequence/' },
  
  // 2-D DP
  { id: 'b75-59', title: 'Unique Paths', titleSlug: 'unique-paths', difficulty: 'Medium', category: '2-D Dynamic Programming', tags: ['Math', 'Dynamic Programming', 'Combinatorics'], companies: ['Amazon', 'Meta', 'Google'], url: 'https://leetcode.com/problems/unique-paths/' },
  { id: 'b75-60', title: 'Longest Common Subsequence', titleSlug: 'longest-common-subsequence', difficulty: 'Medium', category: '2-D Dynamic Programming', tags: ['String', 'Dynamic Programming'], companies: ['Amazon', 'Google'], url: 'https://leetcode.com/problems/longest-common-subsequence/' },
  
  // Greedy
  { id: 'b75-61', title: 'Maximum Subarray', titleSlug: 'maximum-subarray', difficulty: 'Medium', category: 'Greedy', tags: ['Array', 'Divide and Conquer', 'Dynamic Programming'], companies: ['Amazon', 'Meta', 'Microsoft', 'Apple'], url: 'https://leetcode.com/problems/maximum-subarray/' },
  { id: 'b75-62', title: 'Jump Game', titleSlug: 'jump-game', difficulty: 'Medium', category: 'Greedy', tags: ['Array', 'Dynamic Programming', 'Greedy'], companies: ['Amazon', 'Meta', 'Microsoft'], url: 'https://leetcode.com/problems/jump-game/' },
  
  // Intervals
  { id: 'b75-63', title: 'Insert Interval', titleSlug: 'insert-interval', difficulty: 'Medium', category: 'Intervals', tags: ['Array'], companies: ['Amazon', 'Google', 'Meta'], url: 'https://leetcode.com/problems/insert-interval/' },
  { id: 'b75-64', title: 'Merge Intervals', titleSlug: 'merge-intervals', difficulty: 'Medium', category: 'Intervals', tags: ['Array', 'Sorting'], companies: ['Amazon', 'Meta', 'Google', 'Microsoft', 'Apple'], url: 'https://leetcode.com/problems/merge-intervals/' },
  { id: 'b75-65', title: 'Non-overlapping Intervals', titleSlug: 'non-overlapping-intervals', difficulty: 'Medium', category: 'Intervals', tags: ['Array', 'Dynamic Programming', 'Greedy', 'Sorting'], companies: ['Amazon', 'Meta'], url: 'https://leetcode.com/problems/non-overlapping-intervals/' },
  { id: 'b75-66', title: 'Meeting Rooms', titleSlug: 'meeting-rooms', difficulty: 'Easy', category: 'Intervals', tags: ['Array', 'Sorting'], companies: ['Amazon', 'Meta', 'Google'], url: 'https://leetcode.com/problems/meeting-rooms/', isPremium: true },
  { id: 'b75-67', title: 'Meeting Rooms II', titleSlug: 'meeting-rooms-ii', difficulty: 'Medium', category: 'Intervals', tags: ['Array', 'Two Pointers', 'Greedy', 'Sorting', 'Heap'], companies: ['Amazon', 'Meta', 'Google', 'Microsoft'], url: 'https://leetcode.com/problems/meeting-rooms-ii/', isPremium: true },
  
  // Math & Geometry
  { id: 'b75-68', title: 'Rotate Image', titleSlug: 'rotate-image', difficulty: 'Medium', category: 'Math & Geometry', tags: ['Array', 'Math', 'Matrix'], companies: ['Amazon', 'Microsoft', 'Apple'], url: 'https://leetcode.com/problems/rotate-image/' },
  { id: 'b75-69', title: 'Spiral Matrix', titleSlug: 'spiral-matrix', difficulty: 'Medium', category: 'Math & Geometry', tags: ['Array', 'Matrix', 'Simulation'], companies: ['Amazon', 'Meta', 'Microsoft', 'Apple'], url: 'https://leetcode.com/problems/spiral-matrix/' },
  { id: 'b75-70', title: 'Set Matrix Zeroes', titleSlug: 'set-matrix-zeroes', difficulty: 'Medium', category: 'Math & Geometry', tags: ['Array', 'Hash Table', 'Matrix'], companies: ['Amazon', 'Meta', 'Microsoft'], url: 'https://leetcode.com/problems/set-matrix-zeroes/' },
  
  // Bit Manipulation
  { id: 'b75-71', title: 'Number of 1 Bits', titleSlug: 'number-of-1-bits', difficulty: 'Easy', category: 'Bit Manipulation', tags: ['Divide and Conquer', 'Bit Manipulation'], companies: ['Apple', 'Microsoft'], url: 'https://leetcode.com/problems/number-of-1-bits/' },
  { id: 'b75-72', title: 'Counting Bits', titleSlug: 'counting-bits', difficulty: 'Easy', category: 'Bit Manipulation', tags: ['Dynamic Programming', 'Bit Manipulation'], companies: ['Amazon', 'Microsoft'], url: 'https://leetcode.com/problems/counting-bits/' },
  { id: 'b75-73', title: 'Reverse Bits', titleSlug: 'reverse-bits', difficulty: 'Easy', category: 'Bit Manipulation', tags: ['Divide and Conquer', 'Bit Manipulation'], companies: ['Apple'], url: 'https://leetcode.com/problems/reverse-bits/' },
  { id: 'b75-74', title: 'Missing Number', titleSlug: 'missing-number', difficulty: 'Easy', category: 'Bit Manipulation', tags: ['Array', 'Hash Table', 'Math', 'Binary Search', 'Bit Manipulation', 'Sorting'], companies: ['Amazon', 'Microsoft'], url: 'https://leetcode.com/problems/missing-number/' },
  { id: 'b75-75', title: 'Sum of Two Integers', titleSlug: 'sum-of-two-integers', difficulty: 'Medium', category: 'Bit Manipulation', tags: ['Math', 'Bit Manipulation'], companies: ['Meta', 'Amazon'], url: 'https://leetcode.com/problems/sum-of-two-integers/' }
];

export async function seedCuratedProblems(prisma: PrismaClient): Promise<number> {
  let count = 0;

  // Seed Blind 75
  for (let i = 0; i < BLIND_75.length; i++) {
    const problem = BLIND_75[i];
    try {
      await (prisma as any).curatedProblem.upsert({
        where: {
          externalId_listName: {
            externalId: problem.titleSlug,
            listName: 'blind75'
          }
        },
        update: {
          title: problem.title,
          url: problem.url,
          difficulty: problem.difficulty,
          category: problem.category,
          tags: problem.tags,
          companies: problem.companies,
          isActive: true
        },
        create: {
          externalId: problem.titleSlug,
          source: 'leetcode',
          title: problem.title,
          titleSlug: problem.titleSlug,
          url: problem.url,
          difficulty: problem.difficulty,
          category: problem.category,
          tags: problem.tags,
          companies: problem.companies,
          listName: 'blind75',
          listOrder: i + 1,
          isActive: true
        }
      });
      count++;
    } catch (error) {
      console.warn(`Failed to seed problem ${problem.title}:`, error);
    }
  }

  // Seed Grind 75 (subset of Blind 75)
  const grind75Titles = [
    'Two Sum', 'Valid Parentheses', 'Merge Two Sorted Lists', 'Best Time to Buy and Sell Stock',
    'Valid Palindrome', 'Invert Binary Tree', 'Valid Anagram', 'Linked List Cycle',
    '3Sum', 'Product of Array Except Self', 'Coin Change', 'Number of Islands',
    'Clone Graph', 'Course Schedule', 'Merge Intervals', 'Binary Tree Level Order Traversal',
    'Climbing Stairs', 'Maximum Subarray', 'Word Break', 'LRU Cache'
  ];

  for (let i = 0; i < grind75Titles.length; i++) {
    const problem = BLIND_75.find(p => p.title === grind75Titles[i]);
    if (!problem) continue;

    try {
      await (prisma as any).curatedProblem.upsert({
        where: {
          externalId_listName: {
            externalId: problem.titleSlug,
            listName: 'grind75'
          }
        },
        update: {
          title: problem.title,
          url: problem.url,
          difficulty: problem.difficulty,
          category: problem.category,
          tags: problem.tags,
          companies: problem.companies,
          isActive: true
        },
        create: {
          externalId: problem.titleSlug,
          source: 'leetcode',
          title: problem.title,
          titleSlug: problem.titleSlug,
          url: problem.url,
          difficulty: problem.difficulty,
          category: problem.category,
          tags: problem.tags,
          companies: problem.companies,
          listName: 'grind75',
          listOrder: i + 1,
          isActive: true
        }
      });
      count++;
    } catch (error) {
      console.warn(`Failed to seed grind75 problem ${problem.title}:`, error);
    }
  }

  return count;
}
