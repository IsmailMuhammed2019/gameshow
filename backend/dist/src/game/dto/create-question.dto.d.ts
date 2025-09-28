export declare class CreateQuestionDto {
    question: string;
    options: string[];
    correctAnswer: number;
    difficulty: number;
    questionType?: 'MULTIPLE_CHOICE' | 'YES_NO';
}
