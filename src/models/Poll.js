import mongoose from 'mongoose';

const optionSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true, maxlength: 200 },
  },
  { _id: true }
);

const pollSchema = new mongoose.Schema(
  {
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: true,
      index: true,
    },
    question: {
      type: String,
      required: [true, 'Poll question is required'],
      trim: true,
      maxlength: 300,
    },
    options: {
      type: [optionSchema],
      validate: {
        validator: (opts) => Array.isArray(opts) && opts.length >= 2,
        message: 'A poll must have at least 2 options',
      },
    },
    status: {
      type: String,
      enum: ['draft', 'live', 'ended'],
      default: 'draft',
      index: true,
    },
    allowResult: {
      type: Boolean,
      default: true, // whether students can see live results while poll is active
    },
    startTime: { type: Date, default: null },
    endTime: { type: Date, default: null },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

const Poll = mongoose.model('Poll', pollSchema);

export default Poll;
