/**
 * Test cases for formatDescription function
 * 
 * This file documents all expected input formats and verifies the parsing logic.
 * Run these mentally or in a test runner to verify the solution works.
 */

// Test input formats that should be handled:

export const TEST_CASES = {
  // ============================================================================
  // EXAMPLE HEADERS
  // ============================================================================
  exampleHeaders: [
    { input: 'Example 1:', expected: 'styled as cyan header' },
    { input: '**Example 1:**', expected: 'styled as cyan header (** stripped)' },
    { input: 'Example:', expected: 'styled as cyan header' },
    { input: 'Example 2', expected: 'styled as cyan header' },
    { input: '**Example 2**', expected: 'styled as cyan header (** stripped)' },
  ],

  // ============================================================================
  // INPUT/OUTPUT SECTIONS
  // ============================================================================
  inputOutput: [
    { input: 'Input: nums = [1,2,3]', expected: 'green border box' },
    { input: '**Input:** nums = [1,2,3]', expected: 'green border box (** stripped)' },
    { input: 'Output: 6', expected: 'blue border box' },
    { input: '**Output:** 6', expected: 'blue border box (** stripped)' },
    { input: 'Explanation: Add all numbers', expected: 'italic with 💬' },
    { input: '**Explanation:** Add all numbers', expected: 'italic with 💬 (** stripped)' },
  ],

  // ============================================================================
  // CONSTRAINTS
  // ============================================================================
  constraints: [
    { input: 'Constraints:', expected: 'amber header with 📋' },
    { input: '**Constraints:**', expected: 'amber header with 📋 (** stripped)' },
    { input: 'Constraints', expected: 'amber header with 📋' },
    { input: '• 1 <= nums.length <= 10^5', expected: 'amber constraint box with ⚡' },
    { input: '- 0 <= arr.length <= 1000', expected: 'amber constraint box with ⚡' },
    { input: '* -10^9 <= nums[i] <= 10^9', expected: 'amber constraint box with ⚡' },
  ],

  // ============================================================================
  // BULLET POINTS / LISTS
  // ============================================================================
  lists: [
    { input: '- Regular list item', expected: 'bullet list' },
    { input: '• Another item', expected: 'bullet list' },
    { input: '* Third item', expected: 'bullet list' },
    { input: '1. Numbered item', expected: 'bullet list' },
    { input: '2. Second numbered', expected: 'bullet list' },
  ],

  // ============================================================================
  // CODE BLOCKS
  // ============================================================================
  codeBlocks: [
    { 
      input: '```\nfunction solve() {\n  return 42;\n}\n```', 
      expected: 'dark code block with green text' 
    },
    { 
      input: '```javascript\nconst x = 1;\n```', 
      expected: 'dark code block with green text' 
    },
  ],

  // ============================================================================
  // INLINE MARKDOWN
  // ============================================================================
  inlineMarkdown: [
    { input: 'Use `nums.length` to get size', expected: 'inline code styled pink' },
    { input: 'This is **bold** text', expected: 'bold rendered as white semibold' },
    { input: 'This is *italic* text', expected: 'italic rendered' },
    { input: 'Mix of `code` and **bold** and *italic*', expected: 'all three styled' },
  ],

  // ============================================================================
  // REGULAR PARAGRAPHS
  // ============================================================================
  paragraphs: [
    { input: 'Regular paragraph text', expected: 'slate-200 text' },
    { input: 'Multiple sentences. In one paragraph.', expected: 'slate-200 text' },
  ],

  // ============================================================================
  // EDGE CASES
  // ============================================================================
  edgeCases: [
    { input: '', expected: 'null (no render)' },
    { input: '   ', expected: 'skipped (empty after trim)' },
    { input: 'Just text no special format', expected: 'regular paragraph' },
    { input: '**Just bold line**', expected: 'paragraph with bold stripped for clean text' },
    { input: 'Input without colon', expected: 'regular paragraph (not input section)' },
  ],
};

/**
 * Verification checklist:
 * 
 * ✅ Pattern Matching Strategy:
 *    - cleanLine (with ** stripped) is used ONLY for pattern detection
 *    - trimmedLine (original) is used for content extraction to preserve markdown
 *    - This ensures section headers are detected while inline markdown is rendered
 * 
 * ✅ Section Detection (uses cleanLine):
 *    - Example headers: /^example\s*\d*:?/i
 *    - Input: /^input:/i
 *    - Output: /^output:/i
 *    - Explanation: /^explanation:/i
 *    - Constraints: /^constraints:?/i
 * 
 * ✅ Content Extraction (uses trimmedLine):
 *    - Input/Output/Explanation values: regex removes both **Label:** and Label: prefixes
 *    - Bullet list content: preserves inline markdown for rendering
 *    - Regular paragraphs: uses trimmedLine for full markdown support
 * 
 * ✅ List Detection:
 *    - Bullet: /^[-•*]\s/
 *    - Numbered: /^\d+\.\s/
 *    - Constraint detection: /[<>≤≥]/ or comparison operators
 * 
 * ✅ Code Block Detection:
 *    - Starts/ends with ```
 *    - Preserves content between (uses line, not trimmedLine)
 * 
 * ✅ Inline Markdown (renderInlineMarkdown):
 *    - Backticks: /`([^`]+)`/ → pink code style
 *    - Bold: /\*\*([^*]+)\*\*/ → white semibold
 *    - Italic: /(?<!\*)\*([^*]+)\*(?!\*)/ → slate italic
 * 
 * ✅ Fallback:
 *    - Unmatched non-empty lines become paragraphs with markdown support
 *    - Empty result falls back to plain text display
 */

// Export for potential test runner integration
export default TEST_CASES;

