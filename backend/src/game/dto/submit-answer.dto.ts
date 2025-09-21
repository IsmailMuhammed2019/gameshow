import { IsString, IsNumber, Min, Max } from 'class-validator';

export class SubmitAnswerDto {
  @IsString()
  questionId: string;

  @IsString()
  gameSessionId: string;

  @IsNumber()
  @Min(0)
  @Max(3)
  selectedOption: number;
}
