const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Country = require('../models/countryModel');
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
  const countries = JSON.parse(
    fs.readFileSync(`${__dirname}/data/countries.json`, 'utf-8')
  );

  // Save to DB
  for (const country of countries) {
    await Country.create({
      slug: slugify(country.name.split('"es":')[1].split('"')[1], {
        lower: true,
      }),
      name: country.name.split('"es":')[1].split('"')[1],
      code: country.code,
      isoCode: country.iso_code,
    });
  }

  mongoose.connection.close();
  console.log('...success');
});

run();
