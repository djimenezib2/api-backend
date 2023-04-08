const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Language = require('../models/languageModel');
const fs = require('fs');
const slugify = require('slugify');
const catchAsync = require('./../utils/catchAsync');

// Read config from .env file
dotenv.config({ path: './../.env' });

const connecToMongo = async () => {
  // Set database config
  const DB =
    process.env.NODE_ENV === 'development'
      ? process.env.DATABASE.replace(
          '<PASSWORD>',
          process.env.DATABASE_PASSWORD
        )
      : process.env.DATABASE;

  // Connect to database
  mongoose
    .connect(DB, {
      useNewUrlParser: true,
    })
    .then(() => {
      console.log('DB connection successful!');
    });
};

const run = catchAsync(async () => {
  console.log('start...');
  await connecToMongo();

  // Read file
  const languages = JSON.parse(
    fs.readFileSync(`${__dirname}/data/languages.json`, 'utf-8')
  );

  // Save to DB
  for (const language of languages) {
    await Language.create({
      slug: slugify(language.language, {
        lower: true,
      }),
      name: language.language,
      code: language.code,
    });
  }

  mongoose.connection.close();
  console.log('...success');
});

run();
