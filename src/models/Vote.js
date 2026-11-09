import mongoose from 'mongoose';

const voteSchema = new mongoose.Schema(
  {
    pollId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Poll',
      required: true,
      index: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    selectedOption: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    votedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// A student can vote on a given poll exactly once — enforced at the DB level.
voteSchema.index({ pollId: 1, studentId: 1 }, { unique: true });

const Vote = mongoose.model('Vote', voteSchema);

export default Vote;
