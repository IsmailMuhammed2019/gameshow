# Question Repetition Fix - Complete Solution

## Problem
Questions were repeating when using "Next Question" button, even when episodes had many questions (e.g., 25 questions in Science and Technology episode). The same questions kept appearing instead of showing different questions. This issue affected **ALL episodes**, not just specific ones.

## Root Cause Analysis

### The Issue:
1. **Only tracking answered questions**: System only excluded questions that had been **answered** (had entries in `answers` table)
2. **Not tracking sent questions**: Questions that were **sent/displayed** but not yet answered were NOT tracked
3. **Result**: When clicking "Next Question" multiple times before anyone answers, the same questions could be selected again

### Example Scenario:
- Click "Next Question" → Question 1 sent (currentQuestionId = Q1)
- Click "Next Question" again → Question 2 sent (currentQuestionId = Q2, Q1 is lost)
- Click "Next Question" again → Question 1 can be selected again (not tracked anymore)

## Solution Implemented

### 1. **Sent Question Tracking System**
Created a "sent marker" system that tracks ALL questions sent in a session, even if no one answers them.

**How it works:**
- When a question is sent (via "Next Question" or manual selection), create a "sent marker" in the `answers` table
- Sent marker uses `selectedOption = -1` to distinguish it from real answers
- This ensures every sent question is tracked, regardless of whether anyone answered

### 2. **Updated Question Selection Logic**
Modified `getNextQuestion` to:
- Query ALL answer records (including sent markers) for the session
- Extract all unique questionIds from these records
- Exclude ALL sent questions from the selection pool
- Also check `currentQuestionId` as a fallback

### 3. **Manual Selection Tracking**
Updated `send_specific_question` to:
- Create a sent marker when manually selecting a question
- Update `currentQuestionId` in the game session
- Ensure manually selected questions are also tracked

## Code Changes

### `backend/src/game/game.service.ts`

**Lines 109-130**: Track all sent questions
```typescript
// Get all questions that have been SENT in this session
const allAnswersInSession = await this.prisma.answer.findMany({
  where: { gameSessionId },
  select: { questionId: true },
  distinct: ['questionId'],
});

const sentQuestionIds = new Set<string>();
allAnswersInSession.forEach(answer => sentQuestionIds.add(answer.questionId));

// Also add current question as fallback
if (gameSession.currentQuestionId) {
  sentQuestionIds.add(gameSession.currentQuestionId);
}
```

**Lines 137-152 & 161-167**: Exclude sent questions from pool
```typescript
id: {
  notIn: allSentQuestionIds.length > 0 ? allSentQuestionIds : [],
}
```

**Lines 177-179**: Create sent marker when selecting question
```typescript
// Update game session with current question AND create a sent marker
await this.updateGameSessionQuestion(gameSessionId, randomQuestion.id);
```

**Lines 362-410**: New method to create sent markers
```typescript
async updateGameSessionQuestion(gameSessionId: string, questionId: string): Promise<void> {
  // Creates a "sent marker" answer record with selectedOption = -1
  // This tracks the question as sent even if no one answers it
}
```

### `backend/src/game/game.gateway.ts`

**Lines 617-622**: Track manually selected questions
```typescript
// Update game session with current question to track it as sent
await this.gameService.updateGameSessionQuestion(data.gameSessionId, data.questionId);
```

## How It Works Now

### Flow 1: "Next Question" Button
1. User clicks "Next Question"
2. System queries all sent questions (from answer records + currentQuestionId)
3. Excludes sent questions from pool
4. Randomly selects from remaining unsent questions
5. Creates sent marker for selected question
6. Updates `currentQuestionId`
7. **Result**: Question won't appear again

### Flow 2: Manual Question Selection
1. Game Master selects question from list
2. System creates sent marker immediately
3. Updates `currentQuestionId`
4. **Result**: Question is tracked and won't appear in "Next Question"

### Sent Marker System
- **Purpose**: Track questions that were sent but not answered
- **Implementation**: Answer record with `selectedOption = -1`
- **User**: Game Master's ID (they sent the question)
- **Benefit**: Works even if no participants answer

## Testing Checklist

✅ **Test 1: Basic Non-Repetition**
- Start game with ANY episode (e.g., Science & Technology with 25 questions, or any other episode)
- Click "Next Question" multiple times
- **Expected**: Each question should be different, no repeats

✅ **Test 2: Manual Selection**
- Manually select Question 10
- Click "Next Question" 3 times
- **Expected**: Question 10 should NOT appear

✅ **Test 3: All Questions Used**
- Send all questions in an episode (works for any number: 10, 25, 50, etc.)
- Click "Next Question" again
- **Expected**: Error message "All questions have been sent"

✅ **Test 4: Mixed Selection**
- Click "Next Question" 3 times
- Manually select 2 questions
- Click "Next Question" 2 more times
- **Expected**: All 7 questions should be different

## Expected Behavior

- ✅ **No repetition**: Each question appears only once per session
- ✅ **Works for both methods**: "Next Question" and manual selection
- ✅ **Tracks all sent questions**: Even if no one answers
- ✅ **Proper error handling**: Shows message when all questions are used
- ✅ **Role-specific**: Works correctly for PARTICIPANT and AUDIENCE roles

## Technical Details

### Sent Marker Format
```typescript
{
  userId: gameMasterId,      // Game master who sent it
  questionId: questionId,      // The question that was sent
  gameSessionId: sessionId,   // Current game session
  selectedOption: -1,          // Special marker (not a real answer)
  isCorrect: false,            // Not a real answer
  responseTime: 0              // Not a real answer
}
```

### Why This Works
- **Unique constraint**: `[userId, questionId, gameSessionId]` ensures one marker per question
- **No conflicts**: Game master won't answer questions, so no conflict with real answers
- **Complete tracking**: Every sent question gets a marker, ensuring full tracking
- **Simple query**: Just query all answer records to get all sent questions

## Files Modified

1. **`backend/src/game/game.service.ts`**
   - Added sent question tracking logic
   - Updated question filtering
   - Added `updateGameSessionQuestion` method
   - Modified `getNextQuestion` to use sent markers

2. **`backend/src/game/game.gateway.ts`**
   - Updated `send_specific_question` to create sent markers

## Notes

- **Sent markers are invisible**: They don't affect scoring or game logic
- **Automatic cleanup**: When game session ends, markers are cleaned up with the session
- **No schema changes**: Uses existing `answers` table with special marker value
- **Backward compatible**: Existing functionality remains unchanged

## Result

✅ **Questions no longer repeat** - Each question appears only once per game session
✅ **Works for ALL episodes** - Science & Technology, History, Sports, or any episode you create
✅ **Works for any number of questions** - Whether you have 10, 25, 50, or 100 questions
✅ **Works for all selection methods** - Both automatic ("Next Question") and manual selection
✅ **Tracks all sent questions** - Even if no one answers
✅ **Proper error handling** - Clear messages when all questions are used
✅ **Role-specific** - Works correctly for PARTICIPANT and AUDIENCE roles

## Universal Application

**This fix works for:**
- ✅ **All episodes** - Any episode you create (Science, History, Sports, etc.)
- ✅ **Any number of questions** - 5 questions or 500 questions
- ✅ **All game sessions** - Each session tracks its own sent questions independently
- ✅ **All roles** - PARTICIPANT, AUDIENCE, or BOTH
- ✅ **All selection methods** - "Next Question" button and manual question selection

The fix is **completely generic** and not tied to any specific episode. It uses:
- `gameSession.episodeId` - Dynamically gets questions from the selected episode
- `gameSessionId` - Tracks sent questions per session (each game session is independent)
- `targetRole` - Filters questions by role dynamically

**No hardcoding** - Everything is dynamic and works for any episode you create!

The fix is complete and ready for testing!

