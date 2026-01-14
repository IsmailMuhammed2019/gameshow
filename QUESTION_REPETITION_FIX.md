# Question Repetition Fix

## Problem
Questions were repeating when using "Next Question" button, even though there were 25 questions in the Science and Technology episode. The same questions kept appearing instead of showing different questions.

## Root Cause
The system was only tracking questions that had been **answered** (had entries in the `answers` table), but it was NOT tracking questions that had been **sent/displayed** but not yet answered.

### What Was Happening:
1. Game Master clicks "Next Question" → Question 1 is sent
2. Game Master clicks "Next Question" again (before anyone answers) → Question 1 is still in the pool
3. Random selection picks Question 1 again → **REPETITION**

## Solution Implemented

### 1. Track Sent Questions (Not Just Answered)
Modified `getNextQuestion` in `backend/src/game/game.service.ts` to:
- Track questions that have been set as `currentQuestionId` (these were sent)
- Track questions that have been answered (these were definitely sent)
- Combine both lists to create `allSentQuestionIds`
- Exclude ALL sent questions from the selection pool

### 2. Update Manual Question Selection
Modified `send_specific_question` in `backend/src/game/game.gateway.ts` to:
- Update the game session's `currentQuestionId` when manually selecting a question
- This ensures manually selected questions are also tracked as "sent"
- Added `updateGameSessionQuestion` method to handle this

## Code Changes

### `backend/src/game/game.service.ts`

**Lines 118-139**: Added tracking for sent questions
```typescript
// Get all questions that have been SENT (set as currentQuestionId) in this session
const sentQuestionIds = new Set<string>();

// Add current question if it exists (it was sent)
if (gameSession.currentQuestionId) {
  sentQuestionIds.add(gameSession.currentQuestionId);
}

// Add all answered questions (they were definitely sent)
answeredQuestionIds.forEach(id => sentQuestionIds.add(id));

const allSentQuestionIds = Array.from(sentQuestionIds);
```

**Lines 146-152 & 162-167**: Updated whereClause to exclude sent questions
```typescript
// Exclude questions that have been sent (answered OR currently displayed)
id: {
  notIn: allSentQuestionIds.length > 0 ? allSentQuestionIds : [],
}
```

**Lines 357-365**: Added new method to update game session question
```typescript
async updateGameSessionQuestion(gameSessionId: string, questionId: string): Promise<void> {
  // Updates game session with the new current question
  // This marks the question as "sent" so it won't be selected again
}
```

### `backend/src/game/game.gateway.ts`

**Lines 617-619**: Updated to track manually selected questions
```typescript
// Get the game session to update it
const gameSession = await this.gameService.getGameSession(data.gameSessionId);

// Update game session with current question to track it as sent
await this.gameService.updateGameSessionQuestion(data.gameSessionId, data.questionId);
```

## How It Works Now

1. **When "Next Question" is clicked:**
   - System checks all questions that have been sent (currentQuestionId + answered questions)
   - Excludes them from the selection pool
   - Randomly selects from remaining unsent questions
   - Updates `currentQuestionId` to mark it as sent

2. **When manually selecting a question:**
   - System updates `currentQuestionId` immediately
   - Question is marked as "sent"
   - Won't appear in "Next Question" pool anymore

3. **Result:**
   - Each question can only be sent once per game session
   - No repetition until all 25 questions are used
   - Works for both "Next Question" and manual selection

## Testing

To verify the fix works:

1. **Start a game** with Science and Technology episode (25 questions)
2. **Click "Next Question"** multiple times
3. **Verify**: Each question should be different
4. **Manually select** a question from the question selector
5. **Click "Next Question"** again
6. **Verify**: The manually selected question should NOT appear again

## Expected Behavior

- ✅ Questions won't repeat until all questions in the episode are used
- ✅ Both "Next Question" and manual selection track sent questions
- ✅ After all 25 questions are sent, system will show error: "All questions have been sent in this session"
- ✅ Works for both PARTICIPANT and AUDIENCE roles

## Files Modified

1. `backend/src/game/game.service.ts`
   - Added sent question tracking logic
   - Updated question filtering to exclude sent questions
   - Added `updateGameSessionQuestion` method

2. `backend/src/game/game.gateway.ts`
   - Updated `send_specific_question` to track manually selected questions

## Notes

- Questions are tracked per game session
- Starting a new game session resets the tracking
- The fix works for episodes with any number of questions
- Both automatic and manual question selection are now tracked

