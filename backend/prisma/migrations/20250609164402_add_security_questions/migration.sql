-- CreateEnum
CREATE TYPE "SecurityQuestionType" AS ENUM ('FIRST_PET_NAME', 'MOTHER_MAIDEN_NAME', 'FIRST_SCHOOL', 'CHILDHOOD_FRIEND', 'BIRTH_CITY', 'FIRST_CAR', 'FAVORITE_TEACHER', 'FIRST_JOB', 'CHILDHOOD_STREET', 'FATHER_MIDDLE_NAME');

-- CreateTable
CREATE TABLE "security_questions" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "question" "SecurityQuestionType" NOT NULL,
    "answerHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "security_questions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "security_questions_userId_idx" ON "security_questions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "security_questions_userId_question_key" ON "security_questions"("userId", "question");

-- AddForeignKey
ALTER TABLE "security_questions" ADD CONSTRAINT "security_questions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
