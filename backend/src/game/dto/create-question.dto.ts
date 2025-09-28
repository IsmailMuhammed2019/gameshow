import { IsString, IsArray, IsNumber, Min, Max, ArrayMinSize, ArrayMaxSize, IsOptional, IsEnum } from 'class-validator';

export class CreateQuestionDto {
  @IsString()
  question: string;

  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(4)
  @IsString({ each: true })
  options: string[];

  @IsNumber()
  @Min(0)
  @Max(3)
  correctAnswer: number;

  @IsNumber()
  @Min(1)
  @Max(15)
  difficulty: number;

  @IsOptional()
  @IsEnum(['MULTIPLE_CHOICE', 'YES_NO'])
  questionType?: 'MULTIPLE_CHOICE' | 'YES_NO';
}
