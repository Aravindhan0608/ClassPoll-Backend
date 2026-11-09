import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema(
  {
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: true,
      index: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    question: {
      type: String,
      required: [true, 'Question text is required'],
      trim: true,
      maxlength: 1000,
    },
    answer: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: null,
    },
    answeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    status: {
      type: String,
      enum: ['pending', 'answered'],
      default: 'pending',
      index: true,
    },
  },
  { timestamps: true }
);

const Question = mongoose.model('Question', questionSchema);

export default Question;
