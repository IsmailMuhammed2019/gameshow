import { IsString, IsArray, IsNumber, Min, Max, ArrayMinSize, ArrayMaxSize } from 'class-validator';

export class CreateQuestionDto {
  @IsString()
  question: string;

  @IsArray()
  @ArrayMinSize(4)
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
}
