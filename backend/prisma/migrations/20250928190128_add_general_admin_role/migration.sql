-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('MULTIPLE_CHOICE', 'YES_NO');

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'GENERAL_ADMIN';

-- AlterTable
ALTER TABLE "questions" ADD COLUMN     "questionType" "QuestionType" NOT NULL DEFAULT 'MULTIPLE_CHOICE';
