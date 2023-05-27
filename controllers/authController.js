const jwt = require('jsonwebtoken');
const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');

const createSendToken = (user, statusCode, res) => {
  const token = jwt.sign(
    { id: user._id, role: user.role, name: user.name },
    process.env.JWT_SECRET
  );

  user.password = undefined;

  res.cookie('jwt', token).status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

const verifyToken = (req, res, next) => {
  const { token } = req.body;

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // The token is valid, and the user information is available in the decoded object
    req.user = decoded;
    next();
  });
};

exports.checkAuth = (req, res, next) => {
  verifyToken(req, res, () => {
    res.status(200).json({ role: req.user.role, name: req.user.name });
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    role: req.body.role,
  });

  createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  console.log(req);
  const email = req.body.email;
  const password = req.body.password;

  // 1) Check if email and password exist
  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }

  // 2) Check if user exists && password is correct
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(
      new AppError('Incorrect email or password, please try again', 401)
    );
  }

  // 3) If everything ok, send token to client
  createSendToken(user, 200, res);
});
