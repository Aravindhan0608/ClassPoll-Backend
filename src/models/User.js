import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: 2,
      maxlength: 60,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 8,
      select: false, // never returned by default queries
    },
    role: {
      type: String,
      enum: ['student', 'teacher', 'admin'],
      required: true,
      default: 'student',
    },
    profileImage: {
      type: String,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    refreshToken: {
      type: String,
      select: false,
    },
    previousRefreshToken: {
      type: String,
      select: false,
    },
    tokenRotatedAt: {
      type: Date,
      select: false,
    },
    studentProfile: {
      rollNumber: {
        type: String,
        trim: true,
        maxlength: 30,
        default: null,
      },
      department: {
        type: String,
        trim: true,
        maxlength: 100,
        default: null,
      },
      year: {
        type: String,
        trim: true,
        maxlength: 20,
        default: null,
      },
      section: {
        type: String,
        trim: true,
        maxlength: 20,
        default: null,
      },
      collegeName: {
        type: String,
        trim: true,
        maxlength: 150,
        default: null,
      },
    },
  },
  { timestamps: true }
);

userSchema.index({ role: 1 });
// Roll number must be unique across all students who have set one, while safely
// allowing multiple users with null/missing rollNumber without duplicate-key errors.
userSchema.index(
  { 'studentProfile.rollNumber': 1 },
  {
    unique: true,
    partialFilterExpression: { 'studentProfile.rollNumber': { $type: 'string' } },
  }
);

// Hash password only when it has been created/changed.
userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

// Strip sensitive fields whenever a user document is serialized to JSON.
userSchema.methods.toSafeJSON = function toSafeJSON() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshToken;
  delete obj.previousRefreshToken;
  delete obj.tokenRotatedAt;
  delete obj.__v;
  return obj;
};

const User = mongoose.model('User', userSchema);

export default User;
