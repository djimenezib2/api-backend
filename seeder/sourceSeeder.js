const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Source = require('../models/sourceModel');
const slugify = require('slugify');

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

async function run() {
  console.log('start...');
  await connecToMongo();

  sources = [
    {
      name: 'Plataforma de Contratación del Sector Público',
      country: 'Spain',
      url: 'https://contrataciondelestado.es/',
    },
    {
      name: 'Boletín Oficial del Estado',
      country: 'Spain',
      url: 'https://www.boe.es/',
    },
    {
      name: 'Contratos Menores',
      country: 'Spain',
      url: 'https://contrataciondelestado.es/',
    },
    {
      name: 'Diário da República Electrónico',
      country: 'Portugal',
      url: 'https://dre.pt/',
    },
    {
      name: 'Tenders Electronic Daily',
      country: 'Europe',
      url: 'https://ted.europa.eu/',
    },
  ];

  for (const source of sources) {
    source.slug = slugify(source.name, { lower: true });
    await Source.create(source);
  }

  console.log('Sources created...');

  mongoose.connection.close();
  console.log('...success');
}

run();
