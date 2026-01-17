/**
 * Coding Patterns and Cheat Sheet Data
 * 
 * Contains common algorithmic patterns, techniques, and problem-solving approaches
 * used in coding interviews at top tech companies.
 */

export interface CodingPattern {
  id: string;
  name: string;
  category: 'array' | 'string' | 'tree' | 'graph' | 'dp' | 'math' | 'design' | 'binary' | 'linkedlist' | 'stack';
  difficulty: 'Easy' | 'Medium' | 'Hard';
  description: string;
  whenToUse: string[];
  keyIndicators: string[];
  timeComplexity: string;
  spaceComplexity: string;
  template: {
    javascript: string;
    python: string;
    java?: string;
  };
  examples: Array<{
    problem: string;
    hint: string;
  }>;
  relatedPatterns: string[];
  commonMistakes: string[];
  tips: string[];
}

export const CODING_PATTERNS: CodingPattern[] = [
  // === ARRAY PATTERNS ===
  {
    id: 'two-pointers',
    name: 'Two Pointers',
    category: 'array',
    difficulty: 'Easy',
    description: 'Use two pointers to traverse array from both ends or at different speeds. Reduces nested loops to single pass.',
    whenToUse: [
      'Searching pairs in sorted array',
      'Removing duplicates in-place',
      'Reversing array/string',
      'Finding target sum in sorted array',
      'Comparing strings'
    ],
    keyIndicators: [
      '"sorted array"',
      '"find pairs"',
      '"in-place modification"',
      '"reverse"',
      '"palindrome"'
    ],
    timeComplexity: 'O(n)',
    spaceComplexity: 'O(1)',
    template: {
      javascript: `function twoPointers(arr, target) {
  let left = 0;
  let right = arr.length - 1;
  
  while (left < right) {
    const current = arr[left] + arr[right];
    
    if (current === target) {
      return [left, right]; // Found!
    } else if (current < target) {
      left++;  // Need larger sum
    } else {
      right--; // Need smaller sum
    }
  }
  
  return [-1, -1]; // Not found
}`,
      python: `def two_pointers(arr: List[int], target: int) -> List[int]:
    left, right = 0, len(arr) - 1
    
    while left < right:
        current = arr[left] + arr[right]
        
        if current == target:
            return [left, right]  # Found!
        elif current < target:
            left += 1  # Need larger sum
        else:
            right -= 1  # Need smaller sum
    
    return [-1, -1]  # Not found`
    },
    examples: [
      { problem: 'Two Sum II (Sorted Array)', hint: 'Start from both ends, move based on sum comparison' },
      { problem: 'Valid Palindrome', hint: 'Compare chars from both ends, skip non-alphanumeric' },
      { problem: 'Container With Most Water', hint: 'Move pointer with smaller height' },
      { problem: 'Remove Duplicates from Sorted Array', hint: 'Slow/fast pointer for unique elements' }
    ],
    relatedPatterns: ['sliding-window', 'fast-slow-pointers'],
    commonMistakes: [
      'Forgetting array must be sorted for sum problems',
      'Off-by-one errors in loop condition',
      'Not handling empty array case'
    ],
    tips: [
      'Always check if problem requires sorted array first',
      'Consider if you need both pointers moving same direction (fast/slow)',
      'Can reduce O(n²) brute force to O(n)'
    ]
  },
  {
    id: 'sliding-window',
    name: 'Sliding Window',
    category: 'array',
    difficulty: 'Medium',
    description: 'Maintain a window that slides through array to find optimal subarray/substring. Essential for contiguous subarray problems.',
    whenToUse: [
      'Maximum/minimum sum subarray of size K',
      'Longest substring with K distinct characters',
      'Finding anagrams/permutations in string',
      'Consecutive elements meeting condition',
      'Maximum of all subarrays of size K'
    ],
    keyIndicators: [
      '"contiguous subarray"',
      '"substring"',
      '"window"',
      '"consecutive"',
      '"length K"'
    ],
    timeComplexity: 'O(n)',
    spaceComplexity: 'O(1) or O(k)',
    template: {
      javascript: `// Fixed size window
function fixedWindow(arr, k) {
  let windowSum = 0;
  let maxSum = -Infinity;
  
  for (let i = 0; i < arr.length; i++) {
    windowSum += arr[i];
    
    if (i >= k - 1) {
      maxSum = Math.max(maxSum, windowSum);
      windowSum -= arr[i - k + 1]; // Remove leftmost
    }
  }
  return maxSum;
}

// Variable size window
function variableWindow(s, k) {
  const charCount = new Map();
  let left = 0;
  let maxLength = 0;
  
  for (let right = 0; right < s.length; right++) {
    // Expand window
    charCount.set(s[right], (charCount.get(s[right]) || 0) + 1);
    
    // Shrink window if invalid
    while (charCount.size > k) {
      charCount.set(s[left], charCount.get(s[left]) - 1);
      if (charCount.get(s[left]) === 0) charCount.delete(s[left]);
      left++;
    }
    
    maxLength = Math.max(maxLength, right - left + 1);
  }
  return maxLength;
}`,
      python: `# Fixed size window
def fixed_window(arr: List[int], k: int) -> int:
    window_sum = 0
    max_sum = float('-inf')
    
    for i in range(len(arr)):
        window_sum += arr[i]
        
        if i >= k - 1:
            max_sum = max(max_sum, window_sum)
            window_sum -= arr[i - k + 1]  # Remove leftmost
    
    return max_sum

# Variable size window
def variable_window(s: str, k: int) -> int:
    char_count = {}
    left = 0
    max_length = 0
    
    for right in range(len(s)):
        # Expand window
        char_count[s[right]] = char_count.get(s[right], 0) + 1
        
        # Shrink window if invalid
        while len(char_count) > k:
            char_count[s[left]] -= 1
            if char_count[s[left]] == 0:
                del char_count[s[left]]
            left += 1
        
        max_length = max(max_length, right - left + 1)
    
    return max_length`
    },
    examples: [
      { problem: 'Maximum Sum Subarray of Size K', hint: 'Fixed window, track sum while sliding' },
      { problem: 'Longest Substring Without Repeating Chars', hint: 'Variable window with Set for uniqueness' },
      { problem: 'Minimum Window Substring', hint: 'Expand to include all, shrink to minimize' },
      { problem: 'Permutation in String', hint: 'Fixed window with char frequency map' }
    ],
    relatedPatterns: ['two-pointers', 'hash-map-counting'],
    commonMistakes: [
      'Not properly shrinking window when condition violated',
      'Forgetting to update result after shrinking',
      'Confusion between fixed vs variable window'
    ],
    tips: [
      'Fixed window: Know size K in advance',
      'Variable window: Expand right, shrink left based on condition',
      'Use HashMap/Set for character frequency tracking'
    ]
  },
  {
    id: 'prefix-sum',
    name: 'Prefix Sum',
    category: 'array',
    difficulty: 'Easy',
    description: 'Precompute cumulative sums to answer range sum queries in O(1). Essential for subarray sum problems.',
    whenToUse: [
      'Range sum queries',
      'Subarray sum equals K',
      'Count subarrays with specific sum',
      'Finding equilibrium index',
      '2D matrix sum queries'
    ],
    keyIndicators: [
      '"subarray sum"',
      '"range sum"',
      '"sum equals K"',
      '"contiguous sum"',
      '"matrix region sum"'
    ],
    timeComplexity: 'O(n) build, O(1) query',
    spaceComplexity: 'O(n)',
    template: {
      javascript: `// Basic prefix sum
function buildPrefixSum(arr) {
  const prefix = [0];
  for (let i = 0; i < arr.length; i++) {
    prefix.push(prefix[i] + arr[i]);
  }
  return prefix;
}

// Range sum [i, j] inclusive
function rangeSum(prefix, i, j) {
  return prefix[j + 1] - prefix[i];
}

// Count subarrays with sum = target
function subarraySum(nums, target) {
  const prefixCount = new Map([[0, 1]]);
  let sum = 0;
  let count = 0;
  
  for (const num of nums) {
    sum += num;
    // If (sum - target) exists, we found subarrays
    if (prefixCount.has(sum - target)) {
      count += prefixCount.get(sum - target);
    }
    prefixCount.set(sum, (prefixCount.get(sum) || 0) + 1);
  }
  
  return count;
}`,
      python: `# Basic prefix sum
def build_prefix_sum(arr: List[int]) -> List[int]:
    prefix = [0]
    for num in arr:
        prefix.append(prefix[-1] + num)
    return prefix

# Range sum [i, j] inclusive
def range_sum(prefix: List[int], i: int, j: int) -> int:
    return prefix[j + 1] - prefix[i]

# Count subarrays with sum = target
def subarray_sum(nums: List[int], target: int) -> int:
    prefix_count = {0: 1}
    current_sum = 0
    count = 0
    
    for num in nums:
        current_sum += num
        # If (sum - target) exists, we found subarrays
        if current_sum - target in prefix_count:
            count += prefix_count[current_sum - target]
        prefix_count[current_sum] = prefix_count.get(current_sum, 0) + 1
    
    return count`
    },
    examples: [
      { problem: 'Subarray Sum Equals K', hint: 'HashMap to store prefix sums, check if (sum-k) exists' },
      { problem: 'Range Sum Query - Immutable', hint: 'Build prefix array, query O(1)' },
      { problem: 'Continuous Subarray Sum', hint: 'Store remainders, check for multiples' },
      { problem: 'Product of Array Except Self', hint: 'Prefix and suffix products' }
    ],
    relatedPatterns: ['hash-map-counting', 'sliding-window'],
    commonMistakes: [
      'Off-by-one in range calculation',
      'Forgetting to initialize with 0 for empty prefix',
      'Not handling negative numbers correctly'
    ],
    tips: [
      'prefix[i] = sum of elements from 0 to i-1',
      'range(i,j) = prefix[j+1] - prefix[i]',
      'For count problems, use HashMap to store seen prefix sums'
    ]
  },

  // === BINARY SEARCH PATTERNS ===
  {
    id: 'binary-search',
    name: 'Binary Search',
    category: 'binary',
    difficulty: 'Medium',
    description: 'Divide and conquer to find target in sorted array. Also applies to search space problems.',
    whenToUse: [
      'Finding element in sorted array',
      'Finding insertion position',
      'Minimizing/maximizing under constraints',
      'Finding boundary (first/last occurrence)',
      'Search in rotated sorted array'
    ],
    keyIndicators: [
      '"sorted array"',
      '"O(log n)"',
      '"find minimum/maximum that satisfies"',
      '"search"',
      '"rotated"'
    ],
    timeComplexity: 'O(log n)',
    spaceComplexity: 'O(1)',
    template: {
      javascript: `// Standard binary search
function binarySearch(arr, target) {
  let left = 0;
  let right = arr.length - 1;
  
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    
    if (arr[mid] === target) return mid;
    if (arr[mid] < target) left = mid + 1;
    else right = mid - 1;
  }
  
  return -1;
}

// Find first occurrence (lower bound)
function lowerBound(arr, target) {
  let left = 0;
  let right = arr.length;
  
  while (left < right) {
    const mid = Math.floor((left + right) / 2);
    if (arr[mid] < target) left = mid + 1;
    else right = mid;
  }
  
  return left;
}

// Binary search on answer (minimize)
function minimizeAnswer(arr, condition) {
  let left = minPossible;
  let right = maxPossible;
  
  while (left < right) {
    const mid = Math.floor((left + right) / 2);
    if (condition(mid)) right = mid;
    else left = mid + 1;
  }
  
  return left;
}`,
      python: `# Standard binary search
def binary_search(arr: List[int], target: int) -> int:
    left, right = 0, len(arr) - 1
    
    while left <= right:
        mid = (left + right) // 2
        
        if arr[mid] == target:
            return mid
        if arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    
    return -1

# Find first occurrence (lower bound)
def lower_bound(arr: List[int], target: int) -> int:
    left, right = 0, len(arr)
    
    while left < right:
        mid = (left + right) // 2
        if arr[mid] < target:
            left = mid + 1
        else:
            right = mid
    
    return left

# Binary search on answer (minimize)
def minimize_answer(min_possible, max_possible, condition):
    left, right = min_possible, max_possible
    
    while left < right:
        mid = (left + right) // 2
        if condition(mid):
            right = mid
        else:
            left = mid + 1
    
    return left`
    },
    examples: [
      { problem: 'Search in Rotated Sorted Array', hint: 'Find which half is sorted, then standard binary search' },
      { problem: 'Find Minimum in Rotated Sorted Array', hint: 'Binary search comparing mid with right' },
      { problem: 'Capacity to Ship Packages Within D Days', hint: 'Binary search on answer (capacity)' },
      { problem: 'Koko Eating Bananas', hint: 'Binary search on eating speed' }
    ],
    relatedPatterns: ['two-pointers', 'binary-search-tree'],
    commonMistakes: [
      'Integer overflow with (left + right) / 2 - use left + (right - left) / 2',
      'Infinite loops from wrong boundary updates',
      'Confusing left <= right vs left < right'
    ],
    tips: [
      'left <= right: Find exact match, return mid',
      'left < right: Find boundary, return left',
      'Binary search on answer: when direct search is hard but checking is easy'
    ]
  },

  // === DYNAMIC PROGRAMMING PATTERNS ===
  {
    id: 'dp-knapsack',
    name: '0/1 Knapsack',
    category: 'dp',
    difficulty: 'Medium',
    description: 'Choose items with constraints to optimize value. Fundamental DP pattern for subset selection problems.',
    whenToUse: [
      'Subset with target sum',
      'Partition equal subset sum',
      'Maximum value with weight limit',
      'Count ways to reach target',
      'Minimum coins to make amount'
    ],
    keyIndicators: [
      '"subset"',
      '"target sum"',
      '"partition"',
      '"choose/not choose"',
      '"capacity limit"'
    ],
    timeComplexity: 'O(n × capacity)',
    spaceComplexity: 'O(capacity)',
    template: {
      javascript: `// 0/1 Knapsack (can use each item once)
function knapsack(values, weights, capacity) {
  const n = values.length;
  const dp = new Array(capacity + 1).fill(0);
  
  for (let i = 0; i < n; i++) {
    // IMPORTANT: Traverse backwards to avoid using same item twice
    for (let w = capacity; w >= weights[i]; w--) {
      dp[w] = Math.max(dp[w], dp[w - weights[i]] + values[i]);
    }
  }
  
  return dp[capacity];
}

// Subset Sum (can we reach target?)
function canPartition(nums, target) {
  const dp = new Array(target + 1).fill(false);
  dp[0] = true;
  
  for (const num of nums) {
    // Traverse backwards for 0/1 (each number once)
    for (let j = target; j >= num; j--) {
      dp[j] = dp[j] || dp[j - num];
    }
  }
  
  return dp[target];
}

// Unbounded Knapsack (can use each item unlimited times)
function unboundedKnapsack(values, weights, capacity) {
  const dp = new Array(capacity + 1).fill(0);
  
  for (let w = 1; w <= capacity; w++) {
    for (let i = 0; i < values.length; i++) {
      if (weights[i] <= w) {
        dp[w] = Math.max(dp[w], dp[w - weights[i]] + values[i]);
      }
    }
  }
  
  return dp[capacity];
}`,
      python: `# 0/1 Knapsack (can use each item once)
def knapsack(values: List[int], weights: List[int], capacity: int) -> int:
    dp = [0] * (capacity + 1)
    
    for i in range(len(values)):
        # IMPORTANT: Traverse backwards to avoid using same item twice
        for w in range(capacity, weights[i] - 1, -1):
            dp[w] = max(dp[w], dp[w - weights[i]] + values[i])
    
    return dp[capacity]

# Subset Sum (can we reach target?)
def can_partition(nums: List[int], target: int) -> bool:
    dp = [False] * (target + 1)
    dp[0] = True
    
    for num in nums:
        # Traverse backwards for 0/1 (each number once)
        for j in range(target, num - 1, -1):
            dp[j] = dp[j] or dp[j - num]
    
    return dp[target]

# Unbounded Knapsack (can use each item unlimited times)
def unbounded_knapsack(values: List[int], weights: List[int], capacity: int) -> int:
    dp = [0] * (capacity + 1)
    
    for w in range(1, capacity + 1):
        for i in range(len(values)):
            if weights[i] <= w:
                dp[w] = max(dp[w], dp[w - weights[i]] + values[i])
    
    return dp[capacity]`
    },
    examples: [
      { problem: 'Partition Equal Subset Sum', hint: 'Check if subset sum = total/2 exists' },
      { problem: 'Coin Change', hint: 'Unbounded knapsack - minimize coins' },
      { problem: 'Target Sum', hint: 'Transform to subset sum with math' },
      { problem: 'Last Stone Weight II', hint: 'Minimize diff = partition problem' }
    ],
    relatedPatterns: ['dp-unbounded', 'dp-subsequence'],
    commonMistakes: [
      'Forward iteration in 0/1 (uses item multiple times)',
      'Not handling edge cases (empty array, target=0)',
      'Confusing 0/1 vs unbounded knapsack'
    ],
    tips: [
      '0/1: Iterate capacity backwards',
      'Unbounded: Iterate capacity forwards',
      'Space optimization: 1D array instead of 2D'
    ]
  },
  {
    id: 'dp-subsequence',
    name: 'Longest Subsequence DP',
    category: 'dp',
    difficulty: 'Medium',
    description: 'Find longest increasing, common, or palindromic subsequence. Classic DP pattern for sequence problems.',
    whenToUse: [
      'Longest Increasing Subsequence (LIS)',
      'Longest Common Subsequence (LCS)',
      'Longest Palindromic Subsequence',
      'Edit distance between strings',
      'Number of distinct subsequences'
    ],
    keyIndicators: [
      '"subsequence"',
      '"increasing/decreasing"',
      '"common between two strings"',
      '"palindromic"',
      '"longest"'
    ],
    timeComplexity: 'O(n²) or O(n log n) for LIS',
    spaceComplexity: 'O(n) or O(n²)',
    template: {
      javascript: `// Longest Increasing Subsequence - O(n²)
function LIS(nums) {
  const n = nums.length;
  const dp = new Array(n).fill(1);
  
  for (let i = 1; i < n; i++) {
    for (let j = 0; j < i; j++) {
      if (nums[j] < nums[i]) {
        dp[i] = Math.max(dp[i], dp[j] + 1);
      }
    }
  }
  
  return Math.max(...dp);
}

// Longest Common Subsequence
function LCS(text1, text2) {
  const m = text1.length, n = text2.length;
  const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (text1[i-1] === text2[j-1]) {
        dp[i][j] = dp[i-1][j-1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i-1][j], dp[i][j-1]);
      }
    }
  }
  
  return dp[m][n];
}

// Longest Palindromic Subsequence
function longestPalindromeSubseq(s) {
  const n = s.length;
  const dp = Array(n).fill(null).map(() => Array(n).fill(0));
  
  // Base case: single chars are palindromes of length 1
  for (let i = 0; i < n; i++) dp[i][i] = 1;
  
  // Fill for increasing lengths
  for (let len = 2; len <= n; len++) {
    for (let i = 0; i <= n - len; i++) {
      const j = i + len - 1;
      if (s[i] === s[j]) {
        dp[i][j] = dp[i+1][j-1] + 2;
      } else {
        dp[i][j] = Math.max(dp[i+1][j], dp[i][j-1]);
      }
    }
  }
  
  return dp[0][n-1];
}`,
      python: `# Longest Increasing Subsequence - O(n²)
def LIS(nums: List[int]) -> int:
    n = len(nums)
    dp = [1] * n
    
    for i in range(1, n):
        for j in range(i):
            if nums[j] < nums[i]:
                dp[i] = max(dp[i], dp[j] + 1)
    
    return max(dp)

# Longest Common Subsequence
def LCS(text1: str, text2: str) -> int:
    m, n = len(text1), len(text2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if text1[i-1] == text2[j-1]:
                dp[i][j] = dp[i-1][j-1] + 1
            else:
                dp[i][j] = max(dp[i-1][j], dp[i][j-1])
    
    return dp[m][n]

# Longest Palindromic Subsequence
def longest_palindrome_subseq(s: str) -> int:
    n = len(s)
    dp = [[0] * n for _ in range(n)]
    
    # Base case: single chars
    for i in range(n):
        dp[i][i] = 1
    
    # Fill for increasing lengths
    for length in range(2, n + 1):
        for i in range(n - length + 1):
            j = i + length - 1
            if s[i] == s[j]:
                dp[i][j] = dp[i+1][j-1] + 2
            else:
                dp[i][j] = max(dp[i+1][j], dp[i][j-1])
    
    return dp[0][n-1]`
    },
    examples: [
      { problem: 'Longest Increasing Subsequence', hint: 'dp[i] = max LIS ending at i' },
      { problem: 'Longest Common Subsequence', hint: 'Match chars, else take max of excluding either' },
      { problem: 'Edit Distance', hint: 'Similar to LCS but with insert/delete/replace' },
      { problem: 'Distinct Subsequences', hint: 'Count ways to form t from s' }
    ],
    relatedPatterns: ['dp-knapsack', 'dp-intervals'],
    commonMistakes: [
      'Not initializing base cases correctly',
      'Wrong recurrence relation for match/no-match',
      'Off-by-one errors in indexing'
    ],
    tips: [
      'LIS: Binary search can reduce to O(n log n)',
      'LCS: Can be space-optimized to O(min(m,n))',
      'Palindrome: LPS = LCS(s, reverse(s))'
    ]
  },

  // === GRAPH PATTERNS ===
  {
    id: 'bfs',
    name: 'Breadth-First Search (BFS)',
    category: 'graph',
    difficulty: 'Medium',
    description: 'Level-by-level graph traversal. Optimal for shortest path in unweighted graphs.',
    whenToUse: [
      'Shortest path in unweighted graph',
      'Level order tree traversal',
      'Finding connected components',
      'Minimum steps/moves problems',
      'Multi-source BFS'
    ],
    keyIndicators: [
      '"shortest path"',
      '"minimum steps"',
      '"level by level"',
      '"nearest"',
      '"unweighted graph"'
    ],
    timeComplexity: 'O(V + E)',
    spaceComplexity: 'O(V)',
    template: {
      javascript: `// BFS for shortest path
function bfs(graph, start, target) {
  const queue = [[start, 0]]; // [node, distance]
  const visited = new Set([start]);
  
  while (queue.length > 0) {
    const [node, dist] = queue.shift();
    
    if (node === target) return dist;
    
    for (const neighbor of graph[node] || []) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push([neighbor, dist + 1]);
      }
    }
  }
  
  return -1; // Not reachable
}

// BFS for grid (4 directions)
function bfsGrid(grid, startRow, startCol) {
  const rows = grid.length, cols = grid[0].length;
  const queue = [[startRow, startCol, 0]];
  const visited = new Set([\`\${startRow},\${startCol}\`]);
  const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
  
  while (queue.length > 0) {
    const [row, col, dist] = queue.shift();
    
    if (isTarget(row, col)) return dist;
    
    for (const [dr, dc] of directions) {
      const newRow = row + dr;
      const newCol = col + dc;
      const key = \`\${newRow},\${newCol}\`;
      
      if (newRow >= 0 && newRow < rows && 
          newCol >= 0 && newCol < cols && 
          !visited.has(key) && grid[newRow][newCol] !== 1) {
        visited.add(key);
        queue.push([newRow, newCol, dist + 1]);
      }
    }
  }
  
  return -1;
}`,
      python: `from collections import deque

# BFS for shortest path
def bfs(graph: Dict[int, List[int]], start: int, target: int) -> int:
    queue = deque([(start, 0)])  # (node, distance)
    visited = {start}
    
    while queue:
        node, dist = queue.popleft()
        
        if node == target:
            return dist
        
        for neighbor in graph.get(node, []):
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append((neighbor, dist + 1))
    
    return -1  # Not reachable

# BFS for grid (4 directions)
def bfs_grid(grid: List[List[int]], start_row: int, start_col: int) -> int:
    rows, cols = len(grid), len(grid[0])
    queue = deque([(start_row, start_col, 0)])
    visited = {(start_row, start_col)}
    directions = [(0, 1), (1, 0), (0, -1), (-1, 0)]
    
    while queue:
        row, col, dist = queue.popleft()
        
        if is_target(row, col):
            return dist
        
        for dr, dc in directions:
            new_row, new_col = row + dr, col + dc
            
            if (0 <= new_row < rows and 
                0 <= new_col < cols and 
                (new_row, new_col) not in visited and 
                grid[new_row][new_col] != 1):
                visited.add((new_row, new_col))
                queue.append((new_row, new_col, dist + 1))
    
    return -1`
    },
    examples: [
      { problem: 'Shortest Path in Binary Matrix', hint: 'BFS from (0,0), 8 directions' },
      { problem: 'Rotting Oranges', hint: 'Multi-source BFS from all rotten oranges' },
      { problem: 'Word Ladder', hint: 'BFS where edges are one-char-different words' },
      { problem: 'Binary Tree Level Order Traversal', hint: 'BFS tracking level sizes' }
    ],
    relatedPatterns: ['dfs', 'topological-sort', 'dijkstra'],
    commonMistakes: [
      'Adding to visited after popping instead of before pushing',
      'Using list instead of deque (O(n) popleft)',
      'Not handling disconnected components'
    ],
    tips: [
      'Always mark visited BEFORE adding to queue',
      'Use deque for O(1) popleft',
      'For multi-source BFS, add all sources to queue initially'
    ]
  },
  {
    id: 'dfs',
    name: 'Depth-First Search (DFS)',
    category: 'graph',
    difficulty: 'Medium',
    description: 'Explore as deep as possible before backtracking. Essential for path finding and tree traversal.',
    whenToUse: [
      'Finding all paths',
      'Cycle detection',
      'Topological sorting',
      'Connected components',
      'Tree traversal (preorder, inorder, postorder)'
    ],
    keyIndicators: [
      '"all paths"',
      '"cycle"',
      '"connected"',
      '"traversal"',
      '"backtracking"'
    ],
    timeComplexity: 'O(V + E)',
    spaceComplexity: 'O(V) for recursion stack',
    template: {
      javascript: `// DFS recursive
function dfs(graph, node, visited = new Set()) {
  if (visited.has(node)) return;
  visited.add(node);
  
  console.log(node); // Process node
  
  for (const neighbor of graph[node] || []) {
    dfs(graph, neighbor, visited);
  }
}

// DFS iterative with stack
function dfsIterative(graph, start) {
  const stack = [start];
  const visited = new Set();
  
  while (stack.length > 0) {
    const node = stack.pop();
    
    if (visited.has(node)) continue;
    visited.add(node);
    
    console.log(node); // Process node
    
    for (const neighbor of graph[node] || []) {
      if (!visited.has(neighbor)) {
        stack.push(neighbor);
      }
    }
  }
}

// DFS for cycle detection (directed graph)
function hasCycle(graph, n) {
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Array(n).fill(WHITE);
  
  function dfs(node) {
    color[node] = GRAY;
    
    for (const neighbor of graph[node] || []) {
      if (color[neighbor] === GRAY) return true; // Back edge = cycle
      if (color[neighbor] === WHITE && dfs(neighbor)) return true;
    }
    
    color[node] = BLACK;
    return false;
  }
  
  for (let i = 0; i < n; i++) {
    if (color[i] === WHITE && dfs(i)) return true;
  }
  
  return false;
}`,
      python: `# DFS recursive
def dfs(graph: Dict[int, List[int]], node: int, visited: Set[int] = None):
    if visited is None:
        visited = set()
    
    if node in visited:
        return
    visited.add(node)
    
    print(node)  # Process node
    
    for neighbor in graph.get(node, []):
        dfs(graph, neighbor, visited)

# DFS iterative with stack
def dfs_iterative(graph: Dict[int, List[int]], start: int):
    stack = [start]
    visited = set()
    
    while stack:
        node = stack.pop()
        
        if node in visited:
            continue
        visited.add(node)
        
        print(node)  # Process node
        
        for neighbor in graph.get(node, []):
            if neighbor not in visited:
                stack.append(neighbor)

# DFS for cycle detection (directed graph)
def has_cycle(graph: Dict[int, List[int]], n: int) -> bool:
    WHITE, GRAY, BLACK = 0, 1, 2
    color = [WHITE] * n
    
    def dfs(node: int) -> bool:
        color[node] = GRAY
        
        for neighbor in graph.get(node, []):
            if color[neighbor] == GRAY:  # Back edge = cycle
                return True
            if color[neighbor] == WHITE and dfs(neighbor):
                return True
        
        color[node] = BLACK
        return False
    
    for i in range(n):
        if color[i] == WHITE and dfs(i):
            return True
    
    return False`
    },
    examples: [
      { problem: 'Number of Islands', hint: 'DFS to mark connected land cells as visited' },
      { problem: 'Clone Graph', hint: 'DFS with HashMap for cloned nodes' },
      { problem: 'Course Schedule', hint: 'Cycle detection in directed graph' },
      { problem: 'All Paths From Source to Target', hint: 'DFS with backtracking to find all paths' }
    ],
    relatedPatterns: ['bfs', 'backtracking', 'topological-sort'],
    commonMistakes: [
      'Stack overflow with very deep recursion',
      'Forgetting to mark visited before recursing',
      'Not handling disconnected components'
    ],
    tips: [
      'Use 3-color for cycle detection in directed graphs',
      'Iterative DFS can handle deeper graphs than recursive',
      'For all paths, backtrack by removing from visited after recursion'
    ]
  },

  // === TREE PATTERNS ===
  {
    id: 'tree-recursion',
    name: 'Tree Recursion',
    category: 'tree',
    difficulty: 'Medium',
    description: 'Solve tree problems by recursively processing subtrees and combining results.',
    whenToUse: [
      'Tree height/depth calculations',
      'Subtree operations',
      'Path sums',
      'Tree validation (BST, balanced)',
      'Lowest Common Ancestor'
    ],
    keyIndicators: [
      '"binary tree"',
      '"subtree"',
      '"path"',
      '"height/depth"',
      '"ancestor"'
    ],
    timeComplexity: 'O(n)',
    spaceComplexity: 'O(h) where h is height',
    template: {
      javascript: `// Tree height
function maxDepth(root) {
  if (!root) return 0;
  return 1 + Math.max(maxDepth(root.left), maxDepth(root.right));
}

// Path sum check
function hasPathSum(root, targetSum) {
  if (!root) return false;
  
  // Leaf node check
  if (!root.left && !root.right) {
    return root.val === targetSum;
  }
  
  const remaining = targetSum - root.val;
  return hasPathSum(root.left, remaining) || hasPathSum(root.right, remaining);
}

// Lowest Common Ancestor
function lowestCommonAncestor(root, p, q) {
  if (!root || root === p || root === q) return root;
  
  const left = lowestCommonAncestor(root.left, p, q);
  const right = lowestCommonAncestor(root.right, p, q);
  
  if (left && right) return root;  // p and q are in different subtrees
  return left || right;
}

// Validate BST
function isValidBST(root, min = -Infinity, max = Infinity) {
  if (!root) return true;
  
  if (root.val <= min || root.val >= max) return false;
  
  return isValidBST(root.left, min, root.val) && 
         isValidBST(root.right, root.val, max);
}`,
      python: `# Tree height
def max_depth(root: Optional[TreeNode]) -> int:
    if not root:
        return 0
    return 1 + max(max_depth(root.left), max_depth(root.right))

# Path sum check
def has_path_sum(root: Optional[TreeNode], target_sum: int) -> bool:
    if not root:
        return False
    
    # Leaf node check
    if not root.left and not root.right:
        return root.val == target_sum
    
    remaining = target_sum - root.val
    return has_path_sum(root.left, remaining) or has_path_sum(root.right, remaining)

# Lowest Common Ancestor
def lowest_common_ancestor(root: TreeNode, p: TreeNode, q: TreeNode) -> TreeNode:
    if not root or root == p or root == q:
        return root
    
    left = lowest_common_ancestor(root.left, p, q)
    right = lowest_common_ancestor(root.right, p, q)
    
    if left and right:  # p and q are in different subtrees
        return root
    return left or right

# Validate BST
def is_valid_bst(root: Optional[TreeNode], min_val=float('-inf'), max_val=float('inf')) -> bool:
    if not root:
        return True
    
    if root.val <= min_val or root.val >= max_val:
        return False
    
    return (is_valid_bst(root.left, min_val, root.val) and 
            is_valid_bst(root.right, root.val, max_val))`
    },
    examples: [
      { problem: 'Maximum Depth of Binary Tree', hint: 'Return 1 + max of left/right depth' },
      { problem: 'Symmetric Tree', hint: 'Compare left subtree with mirror of right' },
      { problem: 'Diameter of Binary Tree', hint: 'Max path goes through some node as root' },
      { problem: 'Invert Binary Tree', hint: 'Swap left and right, recurse' }
    ],
    relatedPatterns: ['bfs', 'dfs', 'tree-construction'],
    commonMistakes: [
      'Not handling null/None base case',
      'Wrong return type from recursion',
      'Confusing root value with subtree result'
    ],
    tips: [
      'Think: What info do I need from left/right subtrees?',
      'Consider: What should I return/compute at current node?',
      'Pass down: min/max bounds for BST validation'
    ]
  },

  // === BACKTRACKING PATTERNS ===
  {
    id: 'backtracking',
    name: 'Backtracking',
    category: 'array',
    difficulty: 'Hard',
    description: 'Explore all possible solutions by making choices, then undoing them. Essential for permutation and combination problems.',
    whenToUse: [
      'Generate all permutations',
      'Generate all subsets',
      'N-Queens problem',
      'Sudoku solver',
      'Word search in grid'
    ],
    keyIndicators: [
      '"all possible"',
      '"permutations"',
      '"combinations"',
      '"subsets"',
      '"generate"',
      '"find all"'
    ],
    timeComplexity: 'O(n!) for permutations, O(2^n) for subsets',
    spaceComplexity: 'O(n) for recursion',
    template: {
      javascript: `// Generate all permutations
function permute(nums) {
  const result = [];
  const used = new Array(nums.length).fill(false);
  
  function backtrack(current) {
    if (current.length === nums.length) {
      result.push([...current]);
      return;
    }
    
    for (let i = 0; i < nums.length; i++) {
      if (used[i]) continue;
      
      // Make choice
      current.push(nums[i]);
      used[i] = true;
      
      // Explore
      backtrack(current);
      
      // Undo choice (backtrack)
      current.pop();
      used[i] = false;
    }
  }
  
  backtrack([]);
  return result;
}

// Generate all subsets
function subsets(nums) {
  const result = [];
  
  function backtrack(start, current) {
    result.push([...current]);
    
    for (let i = start; i < nums.length; i++) {
      current.push(nums[i]);
      backtrack(i + 1, current);
      current.pop();
    }
  }
  
  backtrack(0, []);
  return result;
}

// Combinations (n choose k)
function combine(n, k) {
  const result = [];
  
  function backtrack(start, current) {
    if (current.length === k) {
      result.push([...current]);
      return;
    }
    
    // Pruning: need k - current.length more elements
    for (let i = start; i <= n - (k - current.length) + 1; i++) {
      current.push(i);
      backtrack(i + 1, current);
      current.pop();
    }
  }
  
  backtrack(1, []);
  return result;
}`,
      python: `# Generate all permutations
def permute(nums: List[int]) -> List[List[int]]:
    result = []
    used = [False] * len(nums)
    
    def backtrack(current: List[int]):
        if len(current) == len(nums):
            result.append(current[:])
            return
        
        for i in range(len(nums)):
            if used[i]:
                continue
            
            # Make choice
            current.append(nums[i])
            used[i] = True
            
            # Explore
            backtrack(current)
            
            # Undo choice (backtrack)
            current.pop()
            used[i] = False
    
    backtrack([])
    return result

# Generate all subsets
def subsets(nums: List[int]) -> List[List[int]]:
    result = []
    
    def backtrack(start: int, current: List[int]):
        result.append(current[:])
        
        for i in range(start, len(nums)):
            current.append(nums[i])
            backtrack(i + 1, current)
            current.pop()
    
    backtrack(0, [])
    return result

# Combinations (n choose k)
def combine(n: int, k: int) -> List[List[int]]:
    result = []
    
    def backtrack(start: int, current: List[int]):
        if len(current) == k:
            result.append(current[:])
            return
        
        # Pruning: need k - len(current) more elements
        for i in range(start, n - (k - len(current)) + 2):
            current.append(i)
            backtrack(i + 1, current)
            current.pop()
    
    backtrack(1, [])
    return result`
    },
    examples: [
      { problem: 'Permutations', hint: 'Track used elements, backtrack after recursion' },
      { problem: 'Subsets', hint: 'Include/exclude each element, no used array needed' },
      { problem: 'Letter Combinations of Phone', hint: 'Backtrack through digit mappings' },
      { problem: 'N-Queens', hint: 'Track cols, diagonals, anti-diagonals used' }
    ],
    relatedPatterns: ['dfs', 'recursion'],
    commonMistakes: [
      'Forgetting to copy current solution before adding to result',
      'Not properly undoing the choice',
      'Wrong start index causing duplicates'
    ],
    tips: [
      'Always undo choice after recursive call',
      'Use start index for combinations (no duplicates)',
      'Add pruning to reduce search space'
    ]
  },

  // === STACK PATTERNS ===
  {
    id: 'monotonic-stack',
    name: 'Monotonic Stack',
    category: 'stack',
    difficulty: 'Medium',
    description: 'Maintain a stack with elements in increasing or decreasing order. Powerful for next greater/smaller element problems.',
    whenToUse: [
      'Next greater element',
      'Previous smaller element',
      'Largest rectangle in histogram',
      'Daily temperatures',
      'Stock span problem'
    ],
    keyIndicators: [
      '"next greater"',
      '"previous smaller"',
      '"spanning"',
      '"rectangle"',
      '"histogram"'
    ],
    timeComplexity: 'O(n)',
    spaceComplexity: 'O(n)',
    template: {
      javascript: `// Next Greater Element (right side)
function nextGreaterElements(nums) {
  const n = nums.length;
  const result = new Array(n).fill(-1);
  const stack = []; // Store indices
  
  for (let i = 0; i < n; i++) {
    // Pop elements smaller than current
    while (stack.length > 0 && nums[stack[stack.length - 1]] < nums[i]) {
      const idx = stack.pop();
      result[idx] = nums[i];
    }
    stack.push(i);
  }
  
  return result;
}

// Previous Smaller Element
function previousSmaller(nums) {
  const n = nums.length;
  const result = new Array(n).fill(-1);
  const stack = []; // Store indices
  
  for (let i = 0; i < n; i++) {
    // Pop elements >= current
    while (stack.length > 0 && nums[stack[stack.length - 1]] >= nums[i]) {
      stack.pop();
    }
    
    if (stack.length > 0) {
      result[i] = stack[stack.length - 1];
    }
    
    stack.push(i);
  }
  
  return result;
}

// Largest Rectangle in Histogram
function largestRectangleArea(heights) {
  const stack = [-1]; // Store indices, -1 as sentinel
  let maxArea = 0;
  
  for (let i = 0; i < heights.length; i++) {
    while (stack[stack.length - 1] !== -1 && 
           heights[stack[stack.length - 1]] >= heights[i]) {
      const h = heights[stack.pop()];
      const w = i - stack[stack.length - 1] - 1;
      maxArea = Math.max(maxArea, h * w);
    }
    stack.push(i);
  }
  
  // Process remaining elements
  while (stack[stack.length - 1] !== -1) {
    const h = heights[stack.pop()];
    const w = heights.length - stack[stack.length - 1] - 1;
    maxArea = Math.max(maxArea, h * w);
  }
  
  return maxArea;
}`,
      python: `# Next Greater Element (right side)
def next_greater_elements(nums: List[int]) -> List[int]:
    n = len(nums)
    result = [-1] * n
    stack = []  # Store indices
    
    for i in range(n):
        # Pop elements smaller than current
        while stack and nums[stack[-1]] < nums[i]:
            idx = stack.pop()
            result[idx] = nums[i]
        stack.append(i)
    
    return result

# Previous Smaller Element
def previous_smaller(nums: List[int]) -> List[int]:
    n = len(nums)
    result = [-1] * n
    stack = []  # Store indices
    
    for i in range(n):
        # Pop elements >= current
        while stack and nums[stack[-1]] >= nums[i]:
            stack.pop()
        
        if stack:
            result[i] = stack[-1]
        
        stack.append(i)
    
    return result

# Largest Rectangle in Histogram
def largest_rectangle_area(heights: List[int]) -> int:
    stack = [-1]  # Store indices, -1 as sentinel
    max_area = 0
    
    for i in range(len(heights)):
        while stack[-1] != -1 and heights[stack[-1]] >= heights[i]:
            h = heights[stack.pop()]
            w = i - stack[-1] - 1
            max_area = max(max_area, h * w)
        stack.append(i)
    
    # Process remaining elements
    while stack[-1] != -1:
        h = heights[stack.pop()]
        w = len(heights) - stack[-1] - 1
        max_area = max(max_area, h * w)
    
    return max_area`
    },
    examples: [
      { problem: 'Daily Temperatures', hint: 'Monotonic decreasing stack, find next warmer' },
      { problem: 'Next Greater Element II', hint: 'Circular array - iterate twice' },
      { problem: 'Largest Rectangle in Histogram', hint: 'Find left/right boundaries for each bar' },
      { problem: 'Trapping Rain Water', hint: 'Use stack or two-pointer approach' }
    ],
    relatedPatterns: ['two-pointers', 'dp-subsequence'],
    commonMistakes: [
      'Confusion about increasing vs decreasing stack',
      'Not handling empty stack case',
      'Forgetting to process remaining elements'
    ],
    tips: [
      'Decreasing stack: find next greater',
      'Increasing stack: find next smaller',
      'Store indices, not values, for flexibility'
    ]
  },

  // === LINKED LIST PATTERNS ===
  {
    id: 'fast-slow-pointers',
    name: 'Fast & Slow Pointers',
    category: 'linkedlist',
    difficulty: 'Easy',
    description: 'Use two pointers moving at different speeds. Essential for cycle detection and finding middle.',
    whenToUse: [
      'Detect cycle in linked list',
      'Find cycle start',
      'Find middle of list',
      'Check palindrome linked list',
      'Find nth node from end'
    ],
    keyIndicators: [
      '"cycle"',
      '"middle"',
      '"palindrome"',
      '"nth from end"',
      '"linked list"'
    ],
    timeComplexity: 'O(n)',
    spaceComplexity: 'O(1)',
    template: {
      javascript: `// Detect cycle
function hasCycle(head) {
  let slow = head;
  let fast = head;
  
  while (fast && fast.next) {
    slow = slow.next;
    fast = fast.next.next;
    
    if (slow === fast) return true;
  }
  
  return false;
}

// Find cycle start
function detectCycleStart(head) {
  let slow = head;
  let fast = head;
  
  // Find meeting point
  while (fast && fast.next) {
    slow = slow.next;
    fast = fast.next.next;
    
    if (slow === fast) break;
  }
  
  if (!fast || !fast.next) return null;
  
  // Move slow to head, both move at same speed
  slow = head;
  while (slow !== fast) {
    slow = slow.next;
    fast = fast.next;
  }
  
  return slow;
}

// Find middle
function findMiddle(head) {
  let slow = head;
  let fast = head;
  
  while (fast && fast.next) {
    slow = slow.next;
    fast = fast.next.next;
  }
  
  return slow; // For even length, this is the second middle
}

// Check palindrome
function isPalindrome(head) {
  // Find middle
  let slow = head, fast = head;
  while (fast && fast.next) {
    slow = slow.next;
    fast = fast.next.next;
  }
  
  // Reverse second half
  let prev = null;
  while (slow) {
    const next = slow.next;
    slow.next = prev;
    prev = slow;
    slow = next;
  }
  
  // Compare halves
  let left = head, right = prev;
  while (right) {
    if (left.val !== right.val) return false;
    left = left.next;
    right = right.next;
  }
  
  return true;
}`,
      python: `# Detect cycle
def has_cycle(head: Optional[ListNode]) -> bool:
    slow = fast = head
    
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        
        if slow == fast:
            return True
    
    return False

# Find cycle start
def detect_cycle_start(head: Optional[ListNode]) -> Optional[ListNode]:
    slow = fast = head
    
    # Find meeting point
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        
        if slow == fast:
            break
    
    if not fast or not fast.next:
        return None
    
    # Move slow to head, both move at same speed
    slow = head
    while slow != fast:
        slow = slow.next
        fast = fast.next
    
    return slow

# Find middle
def find_middle(head: Optional[ListNode]) -> Optional[ListNode]:
    slow = fast = head
    
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
    
    return slow  # For even length, this is the second middle

# Check palindrome
def is_palindrome(head: Optional[ListNode]) -> bool:
    # Find middle
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
    
    # Reverse second half
    prev = None
    while slow:
        slow.next, prev, slow = prev, slow, slow.next
    
    # Compare halves
    left, right = head, prev
    while right:
        if left.val != right.val:
            return False
        left, right = left.next, right.next
    
    return True`
    },
    examples: [
      { problem: 'Linked List Cycle', hint: 'Fast moves 2x, if cycle they will meet' },
      { problem: 'Linked List Cycle II', hint: 'After meeting, move one to head, same speed' },
      { problem: 'Middle of the Linked List', hint: 'When fast reaches end, slow is at middle' },
      { problem: 'Reorder List', hint: 'Find middle, reverse second half, merge' }
    ],
    relatedPatterns: ['two-pointers', 'linkedlist-reversal'],
    commonMistakes: [
      'Not handling empty list or single node',
      'Wrong initialization of slow/fast',
      'Infinite loop when cycle detection fails'
    ],
    tips: [
      'Fast goes 2x speed, slow goes 1x',
      'For cycle start: math proof - distance from head = distance from meet',
      'To find middle: when fast reaches end, slow is at middle'
    ]
  }
];

// Helper function to get patterns by category
export const getPatternsByCategory = (category: CodingPattern['category']): CodingPattern[] => {
  return CODING_PATTERNS.filter(p => p.category === category);
};

// Helper function to get patterns by difficulty
export const getPatternsByDifficulty = (difficulty: CodingPattern['difficulty']): CodingPattern[] => {
  return CODING_PATTERNS.filter(p => p.difficulty === difficulty);
};

// Helper function to search patterns
export const searchPatterns = (query: string): CodingPattern[] => {
  const lowerQuery = query.toLowerCase();
  return CODING_PATTERNS.filter(p => 
    p.name.toLowerCase().includes(lowerQuery) ||
    p.description.toLowerCase().includes(lowerQuery) ||
    p.keyIndicators.some(k => k.toLowerCase().includes(lowerQuery)) ||
    p.whenToUse.some(w => w.toLowerCase().includes(lowerQuery))
  );
};

// Get all unique categories
export const getAllCategories = (): string[] => {
  return [...new Set(CODING_PATTERNS.map(p => p.category))];
};

// Get related patterns
export const getRelatedPatterns = (patternId: string): CodingPattern[] => {
  const pattern = CODING_PATTERNS.find(p => p.id === patternId);
  if (!pattern) return [];
  
  return CODING_PATTERNS.filter(p => pattern.relatedPatterns.includes(p.id));
};

export default CODING_PATTERNS;
