import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class AddFeedbackCommentDto {
  @IsNotEmpty({ message: 'Subject employee id is required.' })
  @IsString({ message: 'Subject employee id must be a string.' })
  subjectEmployeeId: string;

  @IsNotEmpty({ message: 'Feedback id is required.' })
  @IsString({ message: 'Feedback id must be a string.' })
  feedbackId: string;

  @IsNotEmpty({ message: 'Comment body is required.' })
  @IsString({ message: 'Comment body must be a string.' })
  @MaxLength(5000, { message: 'Comment body must be at most 5000 characters.' })
  body: string;
}
