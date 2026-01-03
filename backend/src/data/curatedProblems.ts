/**
 * Curated Problem Lists
 * 
 * Contains popular interview preparation lists:
 * - Blind 75: Top 75 LeetCode problems asked at FAANG
 * - NeetCode 150: Expanded curated list
 * - Grind 75: Optimized study plan
 */

export interface CuratedProblem {
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
export const BLIND_75: CuratedProblem[] = [
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
  
  // 1-D Dynamic Programming
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
  
  // 2-D Dynamic Programming
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
  { id: 'b75-75', title: 'Sum of Two Integers', titleSlug: 'sum-of-two-integers', difficulty: 'Medium', category: 'Bit Manipulation', tags: ['Math', 'Bit Manipulation'], companies: ['Meta', 'Amazon'], url: 'https://leetcode.com/problems/sum-of-two-integers/' },
];

// NeetCode 150 - Extended curated list (additional 75 problems beyond Blind 75)
export const NEETCODE_EXTRA: CuratedProblem[] = [
  // Arrays & Hashing (additional)
  { id: 'nc-1', title: 'Valid Sudoku', titleSlug: 'valid-sudoku', difficulty: 'Medium', category: 'Arrays & Hashing', tags: ['Array', 'Hash Table', 'Matrix'], companies: ['Amazon', 'Microsoft', 'Apple'], url: 'https://leetcode.com/problems/valid-sudoku/' },
  
  // Two Pointers (additional)
  { id: 'nc-2', title: 'Two Sum II - Input Array Is Sorted', titleSlug: 'two-sum-ii-input-array-is-sorted', difficulty: 'Medium', category: 'Two Pointers', tags: ['Array', 'Two Pointers', 'Binary Search'], companies: ['Amazon', 'Microsoft'], url: 'https://leetcode.com/problems/two-sum-ii-input-array-is-sorted/' },
  { id: 'nc-3', title: 'Trapping Rain Water', titleSlug: 'trapping-rain-water', difficulty: 'Hard', category: 'Two Pointers', tags: ['Array', 'Two Pointers', 'Dynamic Programming', 'Stack', 'Monotonic Stack'], companies: ['Amazon', 'Meta', 'Google', 'Microsoft', 'Apple'], url: 'https://leetcode.com/problems/trapping-rain-water/' },
  
  // Sliding Window (additional)
  { id: 'nc-4', title: 'Permutation in String', titleSlug: 'permutation-in-string', difficulty: 'Medium', category: 'Sliding Window', tags: ['Hash Table', 'Two Pointers', 'String', 'Sliding Window'], companies: ['Amazon', 'Microsoft'], url: 'https://leetcode.com/problems/permutation-in-string/' },
  { id: 'nc-5', title: 'Sliding Window Maximum', titleSlug: 'sliding-window-maximum', difficulty: 'Hard', category: 'Sliding Window', tags: ['Array', 'Queue', 'Sliding Window', 'Heap', 'Monotonic Queue'], companies: ['Amazon', 'Google', 'Microsoft'], url: 'https://leetcode.com/problems/sliding-window-maximum/' },
  
  // Stack (additional)
  { id: 'nc-6', title: 'Min Stack', titleSlug: 'min-stack', difficulty: 'Medium', category: 'Stack', tags: ['Stack', 'Design'], companies: ['Amazon', 'Meta', 'Microsoft'], url: 'https://leetcode.com/problems/min-stack/' },
  { id: 'nc-7', title: 'Evaluate Reverse Polish Notation', titleSlug: 'evaluate-reverse-polish-notation', difficulty: 'Medium', category: 'Stack', tags: ['Array', 'Math', 'Stack'], companies: ['Amazon', 'Google'], url: 'https://leetcode.com/problems/evaluate-reverse-polish-notation/' },
  { id: 'nc-8', title: 'Generate Parentheses', titleSlug: 'generate-parentheses', difficulty: 'Medium', category: 'Stack', tags: ['String', 'Dynamic Programming', 'Backtracking'], companies: ['Amazon', 'Meta', 'Google'], url: 'https://leetcode.com/problems/generate-parentheses/' },
  { id: 'nc-9', title: 'Daily Temperatures', titleSlug: 'daily-temperatures', difficulty: 'Medium', category: 'Stack', tags: ['Array', 'Stack', 'Monotonic Stack'], companies: ['Amazon', 'Meta'], url: 'https://leetcode.com/problems/daily-temperatures/' },
  { id: 'nc-10', title: 'Car Fleet', titleSlug: 'car-fleet', difficulty: 'Medium', category: 'Stack', tags: ['Array', 'Stack', 'Sorting', 'Monotonic Stack'], companies: ['Google'], url: 'https://leetcode.com/problems/car-fleet/' },
  { id: 'nc-11', title: 'Largest Rectangle in Histogram', titleSlug: 'largest-rectangle-in-histogram', difficulty: 'Hard', category: 'Stack', tags: ['Array', 'Stack', 'Monotonic Stack'], companies: ['Amazon', 'Google', 'Microsoft'], url: 'https://leetcode.com/problems/largest-rectangle-in-histogram/' },
  
  // Binary Search (additional)
  { id: 'nc-12', title: 'Binary Search', titleSlug: 'binary-search', difficulty: 'Easy', category: 'Binary Search', tags: ['Array', 'Binary Search'], companies: ['Amazon', 'Microsoft'], url: 'https://leetcode.com/problems/binary-search/' },
  { id: 'nc-13', title: 'Search a 2D Matrix', titleSlug: 'search-a-2d-matrix', difficulty: 'Medium', category: 'Binary Search', tags: ['Array', 'Binary Search', 'Matrix'], companies: ['Amazon', 'Microsoft'], url: 'https://leetcode.com/problems/search-a-2d-matrix/' },
  { id: 'nc-14', title: 'Koko Eating Bananas', titleSlug: 'koko-eating-bananas', difficulty: 'Medium', category: 'Binary Search', tags: ['Array', 'Binary Search'], companies: ['Amazon', 'Google'], url: 'https://leetcode.com/problems/koko-eating-bananas/' },
  { id: 'nc-15', title: 'Time Based Key-Value Store', titleSlug: 'time-based-key-value-store', difficulty: 'Medium', category: 'Binary Search', tags: ['Hash Table', 'String', 'Binary Search', 'Design'], companies: ['Google', 'Amazon'], url: 'https://leetcode.com/problems/time-based-key-value-store/' },
  { id: 'nc-16', title: 'Median of Two Sorted Arrays', titleSlug: 'median-of-two-sorted-arrays', difficulty: 'Hard', category: 'Binary Search', tags: ['Array', 'Binary Search', 'Divide and Conquer'], companies: ['Amazon', 'Meta', 'Google', 'Microsoft', 'Apple'], url: 'https://leetcode.com/problems/median-of-two-sorted-arrays/' },
  
  // Linked List (additional)
  { id: 'nc-17', title: 'Copy List with Random Pointer', titleSlug: 'copy-list-with-random-pointer', difficulty: 'Medium', category: 'Linked List', tags: ['Hash Table', 'Linked List'], companies: ['Amazon', 'Meta', 'Microsoft'], url: 'https://leetcode.com/problems/copy-list-with-random-pointer/' },
  { id: 'nc-18', title: 'Add Two Numbers', titleSlug: 'add-two-numbers', difficulty: 'Medium', category: 'Linked List', tags: ['Linked List', 'Math', 'Recursion'], companies: ['Amazon', 'Meta', 'Microsoft', 'Apple'], url: 'https://leetcode.com/problems/add-two-numbers/' },
  { id: 'nc-19', title: 'Find The Duplicate Number', titleSlug: 'find-the-duplicate-number', difficulty: 'Medium', category: 'Linked List', tags: ['Array', 'Two Pointers', 'Binary Search', 'Bit Manipulation'], companies: ['Amazon', 'Google'], url: 'https://leetcode.com/problems/find-the-duplicate-number/' },
  { id: 'nc-20', title: 'LRU Cache', titleSlug: 'lru-cache', difficulty: 'Medium', category: 'Linked List', tags: ['Hash Table', 'Linked List', 'Design', 'Doubly-Linked List'], companies: ['Amazon', 'Meta', 'Google', 'Microsoft', 'Apple'], url: 'https://leetcode.com/problems/lru-cache/' },
  { id: 'nc-21', title: 'Reverse Nodes in k-Group', titleSlug: 'reverse-nodes-in-k-group', difficulty: 'Hard', category: 'Linked List', tags: ['Linked List', 'Recursion'], companies: ['Amazon', 'Meta', 'Microsoft'], url: 'https://leetcode.com/problems/reverse-nodes-in-k-group/' },
  
  // Heap (additional)
  { id: 'nc-22', title: 'Kth Largest Element in a Stream', titleSlug: 'kth-largest-element-in-a-stream', difficulty: 'Easy', category: 'Heap', tags: ['Tree', 'Design', 'Binary Search Tree', 'Heap', 'Binary Tree', 'Data Stream'], companies: ['Amazon'], url: 'https://leetcode.com/problems/kth-largest-element-in-a-stream/' },
  { id: 'nc-23', title: 'Last Stone Weight', titleSlug: 'last-stone-weight', difficulty: 'Easy', category: 'Heap', tags: ['Array', 'Heap'], companies: ['Amazon'], url: 'https://leetcode.com/problems/last-stone-weight/' },
  { id: 'nc-24', title: 'K Closest Points to Origin', titleSlug: 'k-closest-points-to-origin', difficulty: 'Medium', category: 'Heap', tags: ['Array', 'Math', 'Divide and Conquer', 'Geometry', 'Sorting', 'Heap', 'Quickselect'], companies: ['Amazon', 'Meta', 'Google'], url: 'https://leetcode.com/problems/k-closest-points-to-origin/' },
  { id: 'nc-25', title: 'Task Scheduler', titleSlug: 'task-scheduler', difficulty: 'Medium', category: 'Heap', tags: ['Array', 'Hash Table', 'Greedy', 'Sorting', 'Heap', 'Counting'], companies: ['Meta', 'Amazon', 'Microsoft'], url: 'https://leetcode.com/problems/task-scheduler/' },
  { id: 'nc-26', title: 'Design Twitter', titleSlug: 'design-twitter', difficulty: 'Medium', category: 'Heap', tags: ['Hash Table', 'Linked List', 'Design', 'Heap'], companies: ['Amazon', 'Twitter'], url: 'https://leetcode.com/problems/design-twitter/' },
  
  // Backtracking (additional)
  { id: 'nc-27', title: 'Subsets', titleSlug: 'subsets', difficulty: 'Medium', category: 'Backtracking', tags: ['Array', 'Backtracking', 'Bit Manipulation'], companies: ['Amazon', 'Meta', 'Google'], url: 'https://leetcode.com/problems/subsets/' },
  { id: 'nc-28', title: 'Subsets II', titleSlug: 'subsets-ii', difficulty: 'Medium', category: 'Backtracking', tags: ['Array', 'Backtracking', 'Bit Manipulation'], companies: ['Amazon', 'Meta'], url: 'https://leetcode.com/problems/subsets-ii/' },
  { id: 'nc-29', title: 'Combination Sum II', titleSlug: 'combination-sum-ii', difficulty: 'Medium', category: 'Backtracking', tags: ['Array', 'Backtracking'], companies: ['Amazon', 'Apple'], url: 'https://leetcode.com/problems/combination-sum-ii/' },
  { id: 'nc-30', title: 'Permutations', titleSlug: 'permutations', difficulty: 'Medium', category: 'Backtracking', tags: ['Array', 'Backtracking'], companies: ['Amazon', 'Meta', 'Microsoft'], url: 'https://leetcode.com/problems/permutations/' },
  { id: 'nc-31', title: 'Letter Combinations of a Phone Number', titleSlug: 'letter-combinations-of-a-phone-number', difficulty: 'Medium', category: 'Backtracking', tags: ['Hash Table', 'String', 'Backtracking'], companies: ['Amazon', 'Meta', 'Microsoft'], url: 'https://leetcode.com/problems/letter-combinations-of-a-phone-number/' },
  { id: 'nc-32', title: 'N-Queens', titleSlug: 'n-queens', difficulty: 'Hard', category: 'Backtracking', tags: ['Array', 'Backtracking'], companies: ['Amazon', 'Meta', 'Google'], url: 'https://leetcode.com/problems/n-queens/' },
  { id: 'nc-33', title: 'Palindrome Partitioning', titleSlug: 'palindrome-partitioning', difficulty: 'Medium', category: 'Backtracking', tags: ['String', 'Dynamic Programming', 'Backtracking'], companies: ['Amazon', 'Meta'], url: 'https://leetcode.com/problems/palindrome-partitioning/' },
  
  // Graphs (additional)
  { id: 'nc-34', title: 'Max Area of Island', titleSlug: 'max-area-of-island', difficulty: 'Medium', category: 'Graphs', tags: ['Array', 'DFS', 'BFS', 'Union Find', 'Matrix'], companies: ['Amazon', 'Meta', 'Google'], url: 'https://leetcode.com/problems/max-area-of-island/' },
  { id: 'nc-35', title: 'Rotting Oranges', titleSlug: 'rotting-oranges', difficulty: 'Medium', category: 'Graphs', tags: ['Array', 'BFS', 'Matrix'], companies: ['Amazon', 'Meta', 'Microsoft'], url: 'https://leetcode.com/problems/rotting-oranges/' },
  { id: 'nc-36', title: 'Walls and Gates', titleSlug: 'walls-and-gates', difficulty: 'Medium', category: 'Graphs', tags: ['Array', 'BFS', 'Matrix'], companies: ['Meta', 'Google'], url: 'https://leetcode.com/problems/walls-and-gates/', isPremium: true },
  { id: 'nc-37', title: 'Surrounded Regions', titleSlug: 'surrounded-regions', difficulty: 'Medium', category: 'Graphs', tags: ['Array', 'DFS', 'BFS', 'Union Find', 'Matrix'], companies: ['Amazon', 'Google'], url: 'https://leetcode.com/problems/surrounded-regions/' },
  { id: 'nc-38', title: 'Course Schedule II', titleSlug: 'course-schedule-ii', difficulty: 'Medium', category: 'Graphs', tags: ['DFS', 'BFS', 'Graph', 'Topological Sort'], companies: ['Amazon', 'Meta', 'Google'], url: 'https://leetcode.com/problems/course-schedule-ii/' },
  { id: 'nc-39', title: 'Redundant Connection', titleSlug: 'redundant-connection', difficulty: 'Medium', category: 'Graphs', tags: ['DFS', 'BFS', 'Union Find', 'Graph'], companies: ['Amazon', 'Google'], url: 'https://leetcode.com/problems/redundant-connection/' },
  { id: 'nc-40', title: 'Word Ladder', titleSlug: 'word-ladder', difficulty: 'Hard', category: 'Graphs', tags: ['Hash Table', 'String', 'BFS'], companies: ['Amazon', 'Meta', 'Google'], url: 'https://leetcode.com/problems/word-ladder/' },
];

// Grind 75 - Optimized study plan (subset with focus on most important)
export const GRIND_75: CuratedProblem[] = [
  // Week 1 (Easy)
  ...BLIND_75.filter(p => ['Two Sum', 'Valid Parentheses', 'Merge Two Sorted Lists', 'Best Time to Buy and Sell Stock', 'Valid Palindrome', 'Invert Binary Tree', 'Valid Anagram', 'Binary Search', 'Linked List Cycle', 'Implement Queue using Stacks'].includes(p.title)),
  // Week 2-4 (Medium)
  ...BLIND_75.filter(p => ['3Sum', 'Product of Array Except Self', 'Coin Change', 'Number of Islands', 'Clone Graph', 'Course Schedule', 'LRU Cache', 'Merge Intervals'].includes(p.title)),
];

// Helper function to get all curated problems
export const getAllCuratedProblems = (): CuratedProblem[] => {
  return [...BLIND_75, ...NEETCODE_EXTRA];
};

// Helper function to get problems by company
export const getProblemsByCompany = (company: string): CuratedProblem[] => {
  const normalizedCompany = company.toLowerCase();
  return getAllCuratedProblems().filter(p => 
    p.companies.some(c => c.toLowerCase().includes(normalizedCompany))
  );
};

// Helper function to get problems by category
export const getProblemsByCategory = (category: string): CuratedProblem[] => {
  const normalizedCategory = category.toLowerCase();
  return getAllCuratedProblems().filter(p => 
    p.category.toLowerCase().includes(normalizedCategory)
  );
};

// Helper function to get problems by tag
export const getProblemsByTag = (tag: string): CuratedProblem[] => {
  const normalizedTag = tag.toLowerCase();
  return getAllCuratedProblems().filter(p => 
    p.tags.some(t => t.toLowerCase().includes(normalizedTag))
  );
};


