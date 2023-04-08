const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Currency = require('../models/currencyModel');
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
  const currencies = JSON.parse(
    fs.readFileSync(`${__dirname}/data/currencies.json`, 'utf-8')
  );

  // Save to DB
  for (const currency of currencies) {
    await Currency.create({
      slug: slugify(currency.name, {
        lower: true,
      }),
      name: currency.name,
      priority: currency.priority,
      isoCode: currency.iso_code,
      symbol: currency.symbol,
      subunit: currency.subunit,
      subunitToUnit: currency.subunit_to_unit,
      symbolFirst: currency.symbol_first,
      htmlEntity: currency.html_entity,
      decimalMark: currency.decimal_mark,
      thousandsSeparator: currency.thousands_separator,
      isoNumeric: currency.iso_numeric,
    });
  }

  mongoose.connection.close();
  console.log('...success');
});

run();
