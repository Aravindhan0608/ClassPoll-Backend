import mongoose from 'mongoose';
import crypto from 'crypto';

const classSchema = new mongoose.Schema(
  {
    className: {
      type: String,
      required: [true, 'Class name is required'],
      trim: true,
      maxlength: 100,
    },
    classCode: {
      type: String,
      unique: true,
      uppercase: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    students: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

/**
 * Generates a short, human-shareable, collision-checked join code
 * (e.g. "7F3K9A") before the class is first saved.
 */
classSchema.statics.generateUniqueClassCode = async function generateUniqueClassCode() {
  const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous 0/O/1/I
  let code;
  let exists = true;

  while (exists) {
    code = Array.from({ length: 6 }, () => CHARS[crypto.randomInt(0, CHARS.length)]).join('');
    // eslint-disable-next-line no-await-in-loop
    exists = await this.exists({ classCode: code });
  }

  return code;
};

const Class = mongoose.model('Class', classSchema);

export default Class;
